'use client';

import { useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useEditor360, EditorMode, CustomConfig } from '@/hooks/useEditor360';
import { extractCubemapFace, extractPerspectiveView, CUBEMAP_FACES } from '@/lib/video360';
import OptionsPanel360 from '@/components/editor360/OptionsPanel360';
import CanvasPlayer360 from '@/components/editor360/CanvasPlayer360';
import Timeline360 from '@/components/editor360/Timeline360';

// Toolbar component
function Toolbar360({ videoFileName, hasVideo }: { videoFileName: string; hasVideo: boolean }) {
    return (
        <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4">
            <div className="flex items-center gap-3">
                <span className="text-indigo-400 font-semibold text-sm">360° Editor</span>
                {hasVideo && (
                    <>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-300 text-sm">{videoFileName}</span>
                    </>
                )}
            </div>
        </div>
    );
}

// Processing Overlay component
function ProcessingOverlay({ isProcessing, progress }: { isProcessing: boolean; progress: number }) {
    if (!isProcessing) return null;

    return (
        <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg">Exporting Frames</h3>
                        <p className="text-gray-400 text-sm">Please wait while we prepare your files...</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Progress text */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                        {progress < 100 ? 'Processing frames...' : 'Finalizing ZIP...'}
                    </span>
                    <span className="text-indigo-400 font-mono font-semibold">{progress}%</span>
                </div>

                {/* Note */}
                <p className="mt-6 text-xs text-gray-500 text-center">
                    This may take a few moments depending on the number of frames.
                </p>
            </div>
        </div>
    );
}

/**
 * Parse URL params into configuration
 */
function parseUrlConfig(searchParams: URLSearchParams): {
    mode?: EditorMode;
    config?: Partial<CustomConfig>;
} {
    const result: { mode?: EditorMode; config?: Partial<CustomConfig> } = {};

    const mode = searchParams.get('mode');
    if (mode === 'skybox' || mode === 'custom') {
        result.mode = mode;
    }

    const frameCount = searchParams.get('frames');
    const rigPitch = searchParams.get('pitch');
    const startAngle = searchParams.get('angle');
    const fov = searchParams.get('fov');

    if (frameCount || rigPitch || startAngle || fov) {
        result.config = {};
        if (frameCount) result.config.frameCount = parseInt(frameCount, 10);
        if (rigPitch) result.config.rigPitch = parseFloat(rigPitch);
        if (startAngle) result.config.startAngle = parseFloat(startAngle);
        if (fov) result.config.fov = parseFloat(fov);
    }

    return result;
}

/**
 * Generate URL params from configuration
 */
function generateUrlParams(mode: EditorMode, config: CustomConfig): string {
    const params = new URLSearchParams();
    params.set('mode', mode);

    if (mode === 'custom') {
        params.set('frames', config.frameCount.toString());
        params.set('pitch', config.rigPitch.toString());
        params.set('angle', config.startAngle.toString());
        params.set('fov', config.fov.toString());
    }

    return params.toString();
}

/**
 * Inner component that uses useSearchParams
 */
function Editor360Content() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editor = useEditor360();
    const { state } = editor;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initializedRef = useRef(false);

    // Initialize from URL params on mount
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const urlConfig = parseUrlConfig(searchParams);

        if (urlConfig.mode) {
            editor.setEditorMode(urlConfig.mode);
        }

        if (urlConfig.config) {
            editor.setCustomConfig(urlConfig.config);
        }
    }, [searchParams, editor]);

    // Sync state changes back to URL
    useEffect(() => {
        if (!initializedRef.current) return;

        const newParams = generateUrlParams(state.editorMode, state.customConfig);
        const currentParams = searchParams.toString();

        if (newParams !== currentParams) {
            router.replace(`/editor360?${newParams}`, { scroll: false });
        }
    }, [state.editorMode, state.customConfig, router, searchParams]);

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

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            editor.loadVideo(file);
        }
    }, [editor]);

    const handleDownload = async () => {
        if (!editor.videoRef.current || !editor.canvasRef.current) return;

        const activeView = state.frameViews.find(v => v.id === state.activeFrameViewId);
        if (!activeView || activeView.frameData.length === 0) {
            alert('No frame data available. Please run analysis first.');
            return;
        }

        editor.setIsProcessing(true);
        const video = editor.videoRef.current;
        const faceSize = 1024;

        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}-${secs.toString().padStart(2, '0')}`;
        };

        try {
            const zip = new JSZip();
            let processedCount = 0;

            const excludedRanges = activeView.ranges.filter(r => r.action === 'exclude');
            const isTimeExcluded = (time: number) =>
                excludedRanges.some(range => time >= range.start && time <= range.end);

            const sharpFrames = activeView.frameData.filter(f =>
                f.variance >= activeView.threshold && !isTimeExcluded(f.time)
            );

            if (sharpFrames.length === 0) {
                alert('No frames meet the criteria.');
                editor.setIsProcessing(false);
                return;
            }

            const sourceCanvas = document.createElement('canvas');

            for (const frame of sharpFrames) {
                video.currentTime = frame.time;
                await new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                sourceCanvas.width = video.videoWidth;
                sourceCanvas.height = video.videoHeight;
                const sourceCtx = sourceCanvas.getContext('2d')!;
                sourceCtx.drawImage(video, 0, 0);

                const timeStr = formatTime(frame.time);

                if (state.editorMode === 'skybox') {
                    const frameFolder = zip.folder(`frame_${timeStr}`)!;

                    for (const { face } of CUBEMAP_FACES) {
                        const faceCanvas = extractCubemapFace(sourceCtx, face, faceSize);
                        const blob = await new Promise<Blob | null>(resolve =>
                            faceCanvas.toBlob(resolve, 'image/jpeg', 0.95)
                        );
                        if (blob) {
                            frameFolder.file(`${face}.jpg`, blob);
                        }
                    }
                } else {
                    for (const view of state.frameViews) {
                        const viewFolder = zip.folder(view.name) || zip.folder(view.name)!;

                        const viewCanvas = extractPerspectiveView(
                            sourceCtx,
                            view.yaw,
                            view.pitch,
                            view.fov,
                            faceSize,
                            faceSize
                        );

                        const blob = await new Promise<Blob | null>(resolve =>
                            viewCanvas.toBlob(resolve, 'image/jpeg', 0.95)
                        );
                        if (blob) {
                            viewFolder.file(`frame_${timeStr}_${Math.round(frame.variance)}.jpg`, blob);
                        }
                    }
                }

                processedCount++;
                editor.setProgress(Math.round((processedCount / sharpFrames.length) * 100));
                await new Promise(r => setTimeout(r, 0));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${state.videoFileName}_360_frames.zip`);


        } catch (error) {
            console.error('Error creating zip:', error);
            alert('Failed to create zip file.');
        } finally {
            editor.setIsProcessing(false);
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
            <Toolbar360
                videoFileName={state.videoFileName}
                hasVideo={!!state.videoSrc}
            />

            {/* Processing Overlay - blocks UI during export */}
            <ProcessingOverlay
                isProcessing={state.isProcessing}
                progress={state.progress}
            />

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Options Panel */}
                <div className="w-64 flex-shrink-0">
                    <OptionsPanel360
                        hasVideo={!!state.videoSrc}
                        is360Detected={state.is360Detected}
                        detection360Result={state.detection360Result}
                        is360ModeEnabled={state.is360ModeEnabled}
                        editorMode={state.editorMode}
                        customConfig={state.customConfig}
                        frameViews={state.frameViews}
                        activeFrameViewId={state.activeFrameViewId}
                        isProcessing={state.isProcessing}
                        progress={state.progress}
                        fps={state.fps}
                        onImport={editor.loadVideo}
                        onSet360ModeEnabled={editor.set360ModeEnabled}
                        onSetEditorMode={editor.setEditorMode}
                        onSetCustomConfig={editor.setCustomConfig}
                        onFpsChange={editor.setFps}
                        onRunAnalysis={editor.runMultiViewAnalysis}
                    />
                </div>

                {/* Canvas area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <CanvasPlayer360
                        videoSrc={state.videoSrc}
                        isPlaying={state.isPlaying}
                        currentTime={state.currentTime}
                        editorMode={state.editorMode}
                        frameViews={state.frameViews}
                        activeFrameViewId={state.activeFrameViewId}
                        sphereViewAngle={state.sphereViewAngle}
                        onTimeUpdate={editor.setCurrentTime}
                        onVideoLoaded={editor.onVideoLoaded}
                        onFrameViewSelect={editor.setActiveFrameView}
                        onSphereRotate={editor.setSphereViewAngle}
                        onUpdateActiveFrameView={editor.updateActiveFrameViewAngle}
                        setVideoRef={editor.setVideoRef}
                        setCanvasRef={editor.setCanvasRef}
                    />
                </div>
            </div>

            {/* Timeline */}
            <Timeline360
                duration={state.videoDuration}
                currentTime={state.currentTime}
                frameViews={state.frameViews}
                activeFrameViewId={state.activeFrameViewId}
                zoom={state.timelineZoom}
                isProcessing={state.isProcessing}
                onSeek={editor.seek}
                onZoomChange={editor.setTimelineZoom}
                onFrameViewSelect={editor.setActiveFrameView}
                onThresholdChange={editor.setThreshold}
                onRenameFrameView={editor.renameFrameView}
                onAddRange={editor.addRange}
                onUpdateRange={editor.updateRange}
                onRemoveRange={editor.removeRange}
                onClearAllRanges={editor.clearAllRanges}
                onDownload={handleDownload}
            />
        </div>
    );
}

/**
 * 360 Video Editor Page
 */
export default function Editor360Page() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-500">Loading 360° Editor...</p>
            </div>
        }>
            <Editor360Content />
        </Suspense>
    );
}
