'use client';

import { useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useEditor } from '@/hooks/useEditor';
import Toolbar from '@/components/editor/Toolbar';
import PlayerControls from '@/components/editor/PlayerControls';
import OptionsPanel from '@/components/editor/OptionsPanel';
import CanvasPlayer from '@/components/editor/CanvasPlayer';
import Timeline from '@/components/editor/Timeline';

export default function EditorPage() {
    const editor = useEditor();
    const { state } = editor;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const maxVariance = state.frameData.reduce((max, item) => Math.max(max, item.variance), 0) || 1;
    const effectiveThreshold = Math.min(state.threshold, maxVariance);
    const framesAboveThreshold = state.frameData.filter(f => f.variance >= effectiveThreshold).length;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    editor.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    editor.seek(state.currentTime - (e.shiftKey ? 5 : 1 / 30));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    editor.seek(state.currentTime + (e.shiftKey ? 5 : 1 / 30));
                    break;
                case 'Home':
                    e.preventDefault();
                    editor.seek(0);
                    break;
                case 'End':
                    e.preventDefault();
                    editor.seek(state.videoDuration);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editor, state.currentTime, state.videoDuration]);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            editor.loadVideo(file);
        }
    };

    const handleDownload = async () => {
        if (!editor.videoRef.current || !editor.canvasRef.current || state.frameData.length === 0) return;

        // Get excluded ranges and mask generation ranges
        const excludedRanges = state.ranges.filter(r => r.action === 'exclude');
        const maskRanges = state.ranges.filter(r => r.action === 'mask_generation' && r.maskPrompt);

        // Helper function to check if a time is within any excluded range
        const isTimeExcluded = (time: number) => {
            return excludedRanges.some(range => time >= range.start && time <= range.end);
        };

        // Helper to get mask prompt for a time (from any mask_generation range containing it)
        const getMaskPromptForTime = (time: number): string | null => {
            const range = maskRanges.find(r => time >= r.start && time <= r.end);
            return range?.maskPrompt || null;
        };

        // Filter frames: must meet threshold AND not be in excluded range
        const sharpFrames = state.frameData.filter(f =>
            f.variance >= effectiveThreshold && !isTimeExcluded(f.time)
        );

        if (sharpFrames.length === 0) {
            alert('No frames meet the criteria (above threshold and not excluded).');
            return;
        }

        editor.setIsProcessing(true);
        const video = editor.videoRef.current;
        const canvas = editor.canvasRef.current;
        const originalTime = video.currentTime;
        video.pause();

        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        try {
            const zip = new JSZip();
            let processedCount = 0;

            for (const frame of sharpFrames) {
                video.currentTime = frame.time;
                await new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                ctx.drawImage(video, 0, 0);

                const baseFileName = `frame_${formatTime(frame.time).replace(':', '-')}_${Math.round(frame.variance)}`;

                // Save the frame
                const blob = await new Promise<Blob | null>(resolve =>
                    canvas.toBlob(resolve, 'image/jpeg', 1.0)
                );

                if (blob) {
                    zip.file(`${baseFileName}.jpg`, blob);
                }

                // Check if this frame needs a mask
                const maskPrompt = getMaskPromptForTime(frame.time);
                if (maskPrompt) {
                    try {
                        // Get base64 of current frame
                        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

                        // Call Moondream API
                        // const result = await callMoondreamSegment(imageBase64, maskPrompt);

                        // if (result.path && result.bbox) {
                        //     // Generate mask from SVG path with bbox for proper positioning
                        //     const maskCanvas = generateMaskFromSVGPath(result.path, video.videoWidth, video.videoHeight, result.bbox);
                        //     const maskBlob = await canvasToPngBlob(maskCanvas);
                        //     zip.file(`${baseFileName}_mask.png`, maskBlob);
                        // }
                    } catch (maskError) {
                        console.error(`Failed to generate mask for frame at ${frame.time}:`, maskError);
                        // Continue with other frames even if one mask fails
                    }
                }

                processedCount++;
                editor.setProgress(Math.round((processedCount / sharpFrames.length) * 100));
                await new Promise(r => setTimeout(r, 0));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${state.videoFileName}_frames.zip`);

            // Track successful export
            const hasMasks = maskRanges.length > 0;

        } catch (error) {
            console.error('Error creating zip:', error);
            alert('Failed to create zip file.');
        } finally {
            editor.setIsProcessing(false);
            video.currentTime = originalTime;
            editor.setProgress(0);
        }
    };

    return (
        <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Toolbar */}
            <Toolbar
                videoFileName={state.videoFileName}
                hasVideo={!!state.videoSrc}
                hdrSupport={state.hdrSupport}
            />

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Options Panel */}
                <div className="w-64 flex-shrink-0">
                    <OptionsPanel
                        fps={state.fps}
                        threshold={state.threshold}
                        isProcessing={state.isProcessing}
                        progress={state.progress}
                        hasVideo={!!state.videoSrc}
                        hasFrameData={state.frameData.length > 0}
                        frameCount={state.frameData.length}
                        framesAboveThreshold={framesAboveThreshold}
                        hdrSupport={state.hdrSupport}
                        hdrCanvasSupported={state.hdrCanvasSupported}
                        hdrDisplay={state.hdrDisplay}
                        onFpsChange={editor.setFps}
                        onThresholdChange={editor.setThreshold}
                        onImport={editor.loadVideo}
                        onRunAnalysis={editor.runAnalysis}
                    />
                </div>

                {/* Canvas area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 p-4 min-h-0 overflow-hidden">
                        <CanvasPlayer
                            videoSrc={state.videoSrc}
                            isPlaying={state.isPlaying}
                            currentTime={state.currentTime}
                            onTimeUpdate={editor.setCurrentTime}
                            onVideoLoaded={editor.onVideoLoaded}
                            setVideoRef={editor.setVideoRef}
                            setCanvasRef={editor.setCanvasRef}
                        />
                    </div>

                    {/* Player Controls - below video */}
                    <PlayerControls
                        isPlaying={state.isPlaying}
                        isProcessing={state.isProcessing}
                        hasVideo={!!state.videoSrc}
                        hasFrameData={state.frameData.length > 0}
                        currentTime={state.currentTime}
                        duration={state.videoDuration}
                        exportFps={state.exportFps}
                        onTogglePlay={editor.togglePlay}
                        onStepBack={() => editor.seek(state.currentTime - 1)}
                        onStepForward={() => editor.seek(state.currentTime + 1)}
                        onExportFpsChange={editor.setExportFps}
                        onDownload={handleDownload}
                    />
                </div>
            </div>

            {/* Timeline */}
            <div className="h-48 flex-shrink-0">
                <Timeline
                    duration={state.videoDuration}
                    currentTime={state.currentTime}
                    frameData={state.frameData}
                    threshold={state.threshold}
                    zoom={state.timelineZoom}
                    ranges={state.ranges}
                    selectedRangeId={state.selectedRangeId}
                    videoRef={editor.videoRef}
                    canvasRef={editor.canvasRef}
                    onSeek={editor.seek}
                    onThresholdChange={editor.setThreshold}
                    onZoomChange={editor.setTimelineZoom}
                    onAddRange={editor.addRange}
                    onUpdateRange={editor.updateRange}
                    onRemoveRange={editor.removeRange}
                    onSelectRange={editor.selectRange}
                    onSetRangeAction={editor.setRangeAction}
                    onClearAllRanges={editor.clearAllRanges}
                />
            </div>
        </div>
    );
}
