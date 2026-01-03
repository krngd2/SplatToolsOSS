'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    detect360Video,
    Detection360Result,
    CubemapFace,
    CUBEMAP_FACES,
    extractCubemapFace,
    extractPerspectiveView,
    generateCustomViews
} from '@/lib/video360';

// Re-export types from video360
export type { CubemapFace, Detection360Result };

/**
 * Frame data for sharpness analysis
 */
export interface FrameData {
    time: number;
    variance: number;
}

/**
 * Range action types for timeline
 */
export type RangeAction = 'exclude' | 'mask_generation' | 'highlight' | null;

/**
 * Timeline range with action
 */
export interface TimelineRange {
    id: string;
    start: number;
    end: number;
    action: RangeAction;
    maskPrompt?: string;
}

/**
 * Individual frame view configuration with its own analysis data
 */
export interface FrameView {
    id: string;
    name: string;
    face?: CubemapFace;  // For skybox mode
    yaw: number;
    pitch: number;
    fov: number;
    frameData: FrameData[];
    threshold: number;
    ranges: TimelineRange[];
}

/**
 * Editor mode: skybox (6 fixed faces) or custom (user-defined views)
 */
export type EditorMode = 'skybox' | 'custom';

/**
 * Custom mode configuration
 */
export interface CustomConfig {
    frameCount: number;
    rigPitch: number;
    startAngle: number;
    fov: number;
}

/**
 * Main 360 Editor State
 */
export interface Editor360State {
    // Video
    videoSrc: string | null;
    videoFileName: string;
    videoDuration: number;
    videoWidth: number;
    videoHeight: number;

    // 360 Detection
    is360Detected: boolean;
    detection360Result: Detection360Result | null;
    is360ModeEnabled: boolean;

    // Editor Mode
    editorMode: EditorMode;

    // Frame Views
    frameViews: FrameView[];
    activeFrameViewId: string | null;

    // Custom mode configuration
    customConfig: CustomConfig;

    // Interactive sphere view angle
    sphereViewAngle: { yaw: number; pitch: number };

    // Playback
    isPlaying: boolean;
    currentTime: number;

    // Timeline
    timelineZoom: number;

    // Processing
    isProcessing: boolean;
    progress: number;

    // Analysis
    fps: number;
    exportFps: number;
}

const DEFAULT_CUSTOM_CONFIG: CustomConfig = {
    frameCount: 4,
    rigPitch: 0,
    startAngle: 0,
    fov: 90
};

/**
 * Generate default skybox frame views
 */
function createSkyboxFrameViews(): FrameView[] {
    return CUBEMAP_FACES.map(({ face, name, yaw, pitch }) => ({
        id: `skybox_${face}`,
        name: `${face.toUpperCase()} (${name})`,
        face,
        yaw,
        pitch,
        fov: 90,
        frameData: [],
        threshold: 300,
        ranges: []
    }));
}

/**
 * Generate custom frame views based on configuration
 */
function createCustomFrameViews(config: CustomConfig): FrameView[] {
    const views = generateCustomViews(
        config.frameCount,
        config.rigPitch,
        config.startAngle,
        config.fov
    );

    return views.map((v, i) => ({
        id: `custom_${i}`,
        name: v.name,
        yaw: v.yaw,
        pitch: v.pitch,
        fov: v.fov,
        frameData: [],
        threshold: 300,
        ranges: []
    }));
}

const initialState: Editor360State = {
    videoSrc: null,
    videoFileName: 'video',
    videoDuration: 0,
    videoWidth: 0,
    videoHeight: 0,
    is360Detected: false,
    detection360Result: null,
    is360ModeEnabled: true,
    editorMode: 'skybox',
    frameViews: createSkyboxFrameViews(),
    activeFrameViewId: 'skybox_pz',
    customConfig: DEFAULT_CUSTOM_CONFIG,
    sphereViewAngle: { yaw: 0, pitch: 0 },
    isPlaying: false,
    currentTime: 0,
    timelineZoom: 1,
    isProcessing: false,
    progress: 0,
    fps: 6,
    exportFps: 6
};

/**
 * Generate unique range ID
 */
function generateRangeId(): string {
    return `range_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for 360 video editor state management
 */
export function useEditor360() {
    const [state, setState] = useState<Editor360State>(initialState);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // ========== Video Refs ==========
    const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
        videoRef.current = video;
    }, []);

    const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
        canvasRef.current = canvas;
    }, []);

    // ========== Video Loading ==========
    const loadVideo = useCallback(async (file: File) => {
        const url = URL.createObjectURL(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

        setState(prev => ({
            ...prev,
            videoSrc: url,
            videoFileName: nameWithoutExt,
            currentTime: 0,
            // Reset frame data for all views
            frameViews: prev.frameViews.map(v => ({ ...v, frameData: [], ranges: [] })),
            progress: 0
        }));
    }, []);

    const onVideoLoaded = useCallback(async (video: HTMLVideoElement) => {
        // Run 360 detection
        const detectionResult = await detect360Video(video);

        setState(prev => ({
            ...prev,
            videoDuration: video.duration,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            is360Detected: detectionResult.is360,
            detection360Result: detectionResult,
            is360ModeEnabled: detectionResult.is360
        }));
    }, []);

    // ========== Mode & Configuration ==========
    const setEditorMode = useCallback((mode: EditorMode) => {
        setState(prev => {
            const newFrameViews = mode === 'skybox'
                ? createSkyboxFrameViews()
                : createCustomFrameViews(prev.customConfig);

            return {
                ...prev,
                editorMode: mode,
                frameViews: newFrameViews,
                activeFrameViewId: newFrameViews[0]?.id || null
            };
        });
    }, []);

    const set360ModeEnabled = useCallback((enabled: boolean) => {
        setState(prev => ({ ...prev, is360ModeEnabled: enabled }));
    }, []);

    const setCustomConfig = useCallback((config: Partial<CustomConfig>) => {
        setState(prev => {
            const newConfig = { ...prev.customConfig, ...config };
            const newFrameViews = prev.editorMode === 'custom'
                ? createCustomFrameViews(newConfig)
                : prev.frameViews;

            return {
                ...prev,
                customConfig: newConfig,
                frameViews: newFrameViews,
                activeFrameViewId: newFrameViews[0]?.id || prev.activeFrameViewId
            };
        });
    }, []);

    // ========== Frame View Management ==========
    const setActiveFrameView = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, activeFrameViewId: id }));
    }, []);

    const updateFrameView = useCallback((id: string, updates: Partial<Omit<FrameView, 'id'>>) => {
        setState(prev => ({
            ...prev,
            frameViews: prev.frameViews.map(v =>
                v.id === id ? { ...v, ...updates } : v
            )
        }));
    }, []);

    const renameFrameView = useCallback((id: string, name: string) => {
        updateFrameView(id, { name });
    }, [updateFrameView]);

    // ========== Sphere Interaction ==========
    const setSphereViewAngle = useCallback((yaw: number, pitch: number) => {
        setState(prev => ({
            ...prev,
            sphereViewAngle: { yaw, pitch }
        }));
    }, []);

    // Update active frame view's angle (for configuring via interactive view)
    const updateActiveFrameViewAngle = useCallback((yaw: number, pitch: number) => {
        setState(prev => {
            if (!prev.activeFrameViewId || prev.editorMode !== 'custom') return prev;

            return {
                ...prev,
                frameViews: prev.frameViews.map(v =>
                    v.id === prev.activeFrameViewId
                        ? { ...v, yaw, pitch }
                        : v
                )
            };
        });
    }, []);

    // ========== Playback Controls ==========
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
            currentTime: Math.max(0, Math.min(time, prev.videoDuration))
        }));
    }, []);

    const setCurrentTime = useCallback((time: number) => {
        setState(prev => ({ ...prev, currentTime: time }));
    }, []);

    // ========== Timeline ==========
    const setTimelineZoom = useCallback((zoom: number) => {
        setState(prev => ({
            ...prev,
            timelineZoom: Math.max(0.1, Math.min(10, zoom))
        }));
    }, []);

    // ========== Analysis Settings ==========
    const setFps = useCallback((fps: number) => {
        setState(prev => ({ ...prev, fps }));
    }, []);

    const setExportFps = useCallback((exportFps: number) => {
        setState(prev => ({
            ...prev,
            exportFps: Math.max(1, Math.min(60, exportFps))
        }));
    }, []);

    const setThreshold = useCallback((viewId: string, threshold: number) => {
        updateFrameView(viewId, { threshold });
    }, [updateFrameView]);

    // ========== Range Management ==========
    const addRange = useCallback((viewId: string, start: number, end: number, action: RangeAction = null): string => {
        const rangeId = generateRangeId();
        const newRange: TimelineRange = {
            id: rangeId,
            start: Math.min(start, end),
            end: Math.max(start, end),
            action
        };

        setState(prev => ({
            ...prev,
            frameViews: prev.frameViews.map(v =>
                v.id === viewId
                    ? { ...v, ranges: [...v.ranges, newRange] }
                    : v
            )
        }));

        return rangeId;
    }, []);

    const updateRange = useCallback((viewId: string, rangeId: string, updates: Partial<Omit<TimelineRange, 'id'>>) => {
        setState(prev => ({
            ...prev,
            frameViews: prev.frameViews.map(v =>
                v.id === viewId
                    ? {
                        ...v,
                        ranges: v.ranges.map(r =>
                            r.id === rangeId ? { ...r, ...updates } : r
                        )
                    }
                    : v
            )
        }));
    }, []);

    const removeRange = useCallback((viewId: string, rangeId: string) => {
        setState(prev => ({
            ...prev,
            frameViews: prev.frameViews.map(v =>
                v.id === viewId
                    ? { ...v, ranges: v.ranges.filter(r => r.id !== rangeId) }
                    : v
            )
        }));
    }, []);

    const clearAllRanges = useCallback((viewId: string) => {
        updateFrameView(viewId, { ranges: [] });
    }, [updateFrameView]);

    // ========== Processing State ==========
    const setProgress = useCallback((progress: number) => {
        setState(prev => ({ ...prev, progress }));
    }, []);

    const setIsProcessing = useCallback((isProcessing: boolean) => {
        setState(prev => ({ ...prev, isProcessing }));
    }, []);

    // ========== Laplacian Variance Calculation ==========
    const computeLaplacianVariance = useCallback((
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number
    ): number => {
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

    // ========== Multi-View Analysis ==========
    const runMultiViewAnalysis = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        setIsProcessing(true);
        setProgress(0);

        // Reset frame data for all views
        setState(prev => ({
            ...prev,
            frameViews: prev.frameViews.map(v => ({ ...v, frameData: [] }))
        }));

        const duration = video.duration;
        const interval = 1 / state.fps;
        const totalFrames = Math.floor(duration * state.fps);
        const totalOperations = totalFrames * state.frameViews.length;

        const originalTime = video.currentTime;
        video.pause();

        // Prepare a canvas for source frames
        const sourceCanvas = document.createElement('canvas');
        const faceSize = 512; // Size for each extracted face

        try {
            let operationCount = 0;

            for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
                const time = frameIdx * interval;
                if (time > duration) break;

                // Seek to frame
                video.currentTime = time;
                await new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                // Draw full frame to source canvas
                sourceCanvas.width = video.videoWidth;
                sourceCanvas.height = video.videoHeight;
                const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
                sourceCtx.drawImage(video, 0, 0);

                // Process each frame view
                for (const view of state.frameViews) {
                    // Extract the view from equirectangular
                    let viewCanvas: HTMLCanvasElement;

                    if (view.face) {
                        // Skybox mode: extract cubemap face
                        viewCanvas = extractCubemapFace(sourceCtx, view.face, faceSize);
                    } else {
                        // Custom mode: extract perspective view
                        viewCanvas = extractPerspectiveView(
                            sourceCtx,
                            view.yaw,
                            view.pitch,
                            view.fov,
                            faceSize,
                            faceSize
                        );
                    }

                    const viewCtx = viewCanvas.getContext('2d', { willReadFrequently: true })!;
                    const variance = computeLaplacianVariance(viewCtx, faceSize, faceSize);

                    // Update frame data for this view
                    setState(prev => ({
                        ...prev,
                        frameViews: prev.frameViews.map(v =>
                            v.id === view.id
                                ? { ...v, frameData: [...v.frameData, { time, variance }] }
                                : v
                        )
                    }));

                    operationCount++;
                    setProgress(Math.round((operationCount / totalOperations) * 100));
                }

                // Yield to prevent UI freeze
                await new Promise(r => setTimeout(r, 0));
            }
        } catch (error) {
            console.error('Error during multi-view analysis:', error);
        } finally {
            setIsProcessing(false);
            video.currentTime = originalTime;
        }
    }, [state.fps, state.frameViews, computeLaplacianVariance, setIsProcessing, setProgress]);

    return {
        state,
        videoRef,
        canvasRef,
        setVideoRef,
        setCanvasRef,
        loadVideo,
        onVideoLoaded,
        setEditorMode,
        set360ModeEnabled,
        setCustomConfig,
        setActiveFrameView,
        updateFrameView,
        renameFrameView,
        setSphereViewAngle,
        updateActiveFrameViewAngle,
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
        clearAllRanges,
        runMultiViewAnalysis,
        setProgress,
        setIsProcessing
    };
}
