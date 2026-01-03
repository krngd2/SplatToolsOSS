'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { checkHDR, checkHDRCanvas } from 'hdr-canvas';

export interface FrameData {
    time: number;
    variance: number;
}

export type RangeAction = 'exclude' | 'mask_generation' | 'highlight' | null;

export interface TimelineRange {
    id: string;
    start: number;
    end: number;
    action: RangeAction;
    maskPrompt?: string;
}

export interface EditorState {
    // Video
    videoSrc: string | null;
    videoFileName: string;
    videoDuration: number;
    videoWidth: number;
    videoHeight: number;

    // Playback
    isPlaying: boolean;
    currentTime: number;

    // Timeline
    timelineZoom: number;
    ranges: TimelineRange[];
    selectedRangeId: string | null;

    // Analysis
    isProcessing: boolean;
    progress: number;
    frameData: FrameData[];
    fps: number;
    exportFps: number;
    threshold: number;

    // HDR
    hdrSupport: string;
    hdrDisplay: boolean;
    hdrCanvasSupported: boolean;
}

const initialState: EditorState = {
    videoSrc: null,
    videoFileName: 'video',
    videoDuration: 0,
    videoWidth: 0,
    videoHeight: 0,
    isPlaying: false,
    currentTime: 0,
    timelineZoom: 1,
    ranges: [],
    selectedRangeId: null,
    isProcessing: false,
    progress: 0,
    frameData: [],
    fps: 6,
    exportFps: 6,
    threshold: 300,
    hdrSupport: 'Unknown',
    hdrDisplay: false,
    hdrCanvasSupported: false,
};

export function useEditor() {
    const [state, setState] = useState<EditorState>(initialState);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);

    // Initialize HDR detection
    useEffect(() => {
        try {
            const displayHdr = checkHDR() || window.matchMedia('(dynamic-range: high)').matches;
            const canvasHdr = checkHDRCanvas();

            setState(prev => ({
                ...prev,
                hdrDisplay: displayHdr,
                hdrCanvasSupported: canvasHdr,
                hdrSupport: canvasHdr && displayHdr
                    ? 'Yes (HDR pipeline ready)'
                    : displayHdr
                        ? 'HDR display detected (canvas limited)'
                        : 'SDR only'
            }));
        } catch (e) {
            console.warn('HDR capability probe failed:', e);
        }
    }, []);

    const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
        videoRef.current = video;
    }, []);

    const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
        canvasRef.current = canvas;
    }, []);

    const loadVideo = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

        setState(prev => ({
            ...prev,
            videoSrc: url,
            videoFileName: nameWithoutExt,
            frameData: [],
            progress: 0,
            splits: [],
            selectedRange: null,
            currentTime: 0,
        }));
    }, []);

    const onVideoLoaded = useCallback((video: HTMLVideoElement) => {
        setState(prev => ({
            ...prev,
            videoDuration: video.duration,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
        }));
    }, []);

    const play = useCallback(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
    }, []);

    const pause = useCallback(() => {
        setState(prev => ({ ...prev, isPlaying: false }));
    }, []);

    const togglePlay = useCallback(() => {
        setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }, []);

    const seek = useCallback((time: number) => {
        setState(prev => ({
            ...prev,
            currentTime: Math.max(0, Math.min(time, prev.videoDuration)),
        }));
    }, []);

    const setCurrentTime = useCallback((time: number) => {
        setState(prev => ({ ...prev, currentTime: time }));
    }, []);

    const setTimelineZoom = useCallback((zoom: number) => {
        setState(prev => ({ ...prev, timelineZoom: Math.max(0.1, Math.min(10, zoom)) }));
    }, []);

    const setFps = useCallback((fps: number) => {
        setState(prev => ({ ...prev, fps }));
    }, []);

    const setExportFps = useCallback((exportFps: number) => {
        setState(prev => ({ ...prev, exportFps: Math.max(1, Math.min(60, exportFps)) }));
    }, []);

    const setThreshold = useCallback((threshold: number) => {
        setState(prev => ({ ...prev, threshold }));
    }, []);

    // Range management functions
    const generateRangeId = () => `range_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addRange = useCallback((start: number, end: number, action: RangeAction = null) => {
        const newRange: TimelineRange = {
            id: generateRangeId(),
            start: Math.min(start, end),
            end: Math.max(start, end),
            action,
        };
        setState(prev => ({
            ...prev,
            ranges: [...prev.ranges, newRange],
            selectedRangeId: newRange.id,
        }));
        return newRange.id;
    }, []);

    const updateRange = useCallback((id: string, updates: Partial<Omit<TimelineRange, 'id'>>) => {
        setState(prev => ({
            ...prev,
            ranges: prev.ranges.map(range =>
                range.id === id ? { ...range, ...updates } : range
            ),
        }));
    }, []);

    const removeRange = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            ranges: prev.ranges.filter(range => range.id !== id),
            selectedRangeId: prev.selectedRangeId === id ? null : prev.selectedRangeId,
        }));
    }, []);

    const selectRange = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, selectedRangeId: id }));
    }, []);

    const setRangeAction = useCallback((id: string, action: RangeAction) => {
        setState(prev => ({
            ...prev,
            ranges: prev.ranges.map(range =>
                range.id === id ? { ...range, action } : range
            ),
        }));
    }, []);

    const clearAllRanges = useCallback(() => {
        setState(prev => ({
            ...prev,
            ranges: [],
            selectedRangeId: null,
        }));
    }, []);

    const setProgress = useCallback((progress: number) => {
        setState(prev => ({ ...prev, progress }));
    }, []);

    const setFrameData = useCallback((frameData: FrameData[]) => {
        setState(prev => ({ ...prev, frameData }));
    }, []);

    const setIsProcessing = useCallback((isProcessing: boolean) => {
        setState(prev => ({ ...prev, isProcessing }));
    }, []);

    const computeLaplacianVariance = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number): number => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const grayData = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        const laplacianData = new Float32Array(width * height);
        let sum = 0;
        let count = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                const north = grayData[i - width];
                const south = grayData[i + width];
                const west = grayData[i - 1];
                const east = grayData[i + 1];
                const center = grayData[i];
                const val = north + south + west + east - 4 * center;
                laplacianData[i] = val;
                sum += val;
                count++;
            }
        }

        const mean = sum / count;
        let varianceSum = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                varianceSum += Math.pow(laplacianData[i] - mean, 2);
            }
        }

        return varianceSum / count;
    }, []);

    const runAnalysis = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        setIsProcessing(true);
        setFrameData([]);
        setProgress(0);

        const duration = video.duration;
        const interval = 1 / state.fps;
        const totalFrames = Math.floor(duration * state.fps);
        const results: FrameData[] = [];

        const originalTime = video.currentTime;
        video.pause();

        try {
            for (let i = 0; i <= totalFrames; i++) {
                const time = i * interval;
                if (time > duration) break;

                video.currentTime = time;
                await new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                let width = video.videoWidth;
                let height = video.videoHeight;
                const maxDim = 1080;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) throw new Error('Failed to get canvas context');

                ctx.drawImage(video, 0, 0, width, height);
                const variance = computeLaplacianVariance(ctx, width, height);
                results.push({ time, variance });
                setFrameData([...results]);
                setProgress(Math.round(((i + 1) / totalFrames) * 100));

                await new Promise(r => setTimeout(r, 0));
            }
        } catch (error) {
            console.error('Error processing video:', error);
        } finally {
            setIsProcessing(false);
            video.currentTime = originalTime;
        }
    }, [state.fps, computeLaplacianVariance, setIsProcessing, setFrameData, setProgress]);

    return {
        state,
        videoRef,
        canvasRef,
        setVideoRef,
        setCanvasRef,
        loadVideo,
        onVideoLoaded,
        play,
        pause,
        togglePlay,
        seek,
        setCurrentTime,
        setTimelineZoom,
        setFps,
        setExportFps,
        setThreshold,
        addRange,
        updateRange,
        removeRange,
        selectRange,
        setRangeAction,
        clearAllRanges,
        runAnalysis,
        setProgress,
        setFrameData,
        setIsProcessing,
    };
}

