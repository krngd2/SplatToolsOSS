'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { extractCubemapFace, extractPerspectiveView, CubemapFace, CUBEMAP_FACES } from '@/lib/video360';
import type { FrameView, EditorMode } from '@/hooks/useEditor360';

interface CanvasPlayer360Props {
    videoSrc: string | null;
    isPlaying: boolean;
    currentTime: number;
    editorMode: EditorMode;
    frameViews: FrameView[];
    activeFrameViewId: string | null;
    sphereViewAngle: { yaw: number; pitch: number };
    onTimeUpdate: (time: number) => void;
    onVideoLoaded: (video: HTMLVideoElement) => void;
    onFrameViewSelect: (id: string) => void;
    onSphereRotate: (yaw: number, pitch: number) => void;
    onUpdateActiveFrameView?: (yaw: number, pitch: number) => void;
    setVideoRef: (video: HTMLVideoElement | null) => void;
    setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

const PREVIEW_SIZE = 128;
const FACE_SIZE = 256;
const SKYBOX_FACE_SIZE = 140;

// Helper component for skybox face preview in cross layout
interface SkyboxFacePreviewProps {
    view: FrameView | undefined;
    isActive: boolean;
    onClick: () => void;
    setPreviewCanvasRef: (id: string, canvas: HTMLCanvasElement | null) => void;
}

function SkyboxFacePreview({ view, isActive, onClick, setPreviewCanvasRef }: SkyboxFacePreviewProps) {
    if (!view) return <div className="w-[140px] h-[140px]" />;

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${isActive
                ? 'bg-indigo-600/20 ring-2 ring-indigo-500'
                : 'hover:bg-gray-800 bg-gray-900/50'
                }`}
        >
            <canvas
                ref={(canvas) => setPreviewCanvasRef(view.id, canvas)}
                width={SKYBOX_FACE_SIZE}
                height={SKYBOX_FACE_SIZE}
                className="rounded bg-gray-800"
                style={{ width: SKYBOX_FACE_SIZE, height: SKYBOX_FACE_SIZE }}
            />
            <span className="text-[10px] text-gray-400">
                {view.face?.toUpperCase()}
            </span>
        </button>
    );
}

export default function CanvasPlayer360({
    videoSrc,
    isPlaying,
    currentTime,
    editorMode,
    frameViews,
    activeFrameViewId,
    sphereViewAngle,
    onTimeUpdate,
    onVideoLoaded,
    onFrameViewSelect,
    onSphereRotate,
    onUpdateActiveFrameView,
    setVideoRef,
    setCanvasRef,
}: CanvasPlayer360Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const sphereCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Sphere drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

    // Set refs for parent
    useEffect(() => {
        setVideoRef(videoRef.current);
        setCanvasRef(mainCanvasRef.current);

        return () => {
            setVideoRef(null);
            setCanvasRef(null);
        };
    }, [setVideoRef, setCanvasRef]);

    // Update refs when videoSrc changes
    useEffect(() => {
        if (videoSrc && videoRef.current && mainCanvasRef.current) {
            setVideoRef(videoRef.current);
            setCanvasRef(mainCanvasRef.current);
        }
    }, [videoSrc, setVideoRef, setCanvasRef]);

    // Draw current frame and all previews
    const drawFrame = useCallback(() => {
        const video = videoRef.current;
        const mainCanvas = mainCanvasRef.current;
        if (!video || !mainCanvas || video.videoWidth === 0) return;

        // Draw equirectangular to main canvas
        const mainCtx = mainCanvas.getContext('2d');
        if (!mainCtx) return;

        if (mainCanvas.width !== video.videoWidth || mainCanvas.height !== video.videoHeight) {
            mainCanvas.width = video.videoWidth;
            mainCanvas.height = video.videoHeight;
        }
        mainCtx.drawImage(video, 0, 0);

        // Draw sphere preview
        const sphereCanvas = sphereCanvasRef.current;
        if (sphereCanvas) {
            const sphereSize = Math.min(sphereCanvas.clientWidth, sphereCanvas.clientHeight);
            if (sphereCanvas.width !== sphereSize || sphereCanvas.height !== sphereSize) {
                sphereCanvas.width = sphereSize;
                sphereCanvas.height = sphereSize;
            }

            const perspectiveView = extractPerspectiveView(
                mainCtx,
                sphereViewAngle.yaw,
                sphereViewAngle.pitch,
                90,
                sphereSize,
                sphereSize
            );

            const sphereCtx = sphereCanvas.getContext('2d');
            if (sphereCtx) {
                sphereCtx.drawImage(perspectiveView, 0, 0, sphereSize, sphereSize);
            }
        }

        // Draw preview thumbnails for each frame view
        for (const view of frameViews) {
            const previewCanvas = previewCanvasRefs.current.get(view.id);
            if (!previewCanvas) continue;

            // Use different sizes for skybox vs custom mode
            const previewSize = view.face ? SKYBOX_FACE_SIZE : PREVIEW_SIZE;

            if (previewCanvas.width !== previewSize || previewCanvas.height !== previewSize) {
                previewCanvas.width = previewSize;
                previewCanvas.height = previewSize;
            }

            let extracted: HTMLCanvasElement;
            if (view.face) {
                extracted = extractCubemapFace(mainCtx, view.face, previewSize);
            } else {
                extracted = extractPerspectiveView(mainCtx, view.yaw, view.pitch, view.fov, previewSize, previewSize);
            }

            const previewCtx = previewCanvas.getContext('2d');
            if (previewCtx) {
                previewCtx.drawImage(extracted, 0, 0);
            }
        }
    }, [frameViews, sphereViewAngle]);

    // Global mouse event handlers for dragging (so drag continues outside element)
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            const sensitivity = 0.5;
            let newYaw = dragStartRef.current.yaw + dx * sensitivity;
            let newPitch = dragStartRef.current.pitch - dy * sensitivity;

            newYaw = ((newYaw % 360) + 360) % 360;
            newPitch = Math.max(-90, Math.min(90, newPitch));

            onSphereRotate(newYaw, newPitch);
            // Also update active frame view configuration if in custom mode
            if (onUpdateActiveFrameView && editorMode === 'custom') {
                onUpdateActiveFrameView(newYaw, newPitch);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
            // Redraw all preview frames to reflect updated frame view configuration
            drawFrame();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onSphereRotate, onUpdateActiveFrameView, editorMode, drawFrame]);

    // Handle video loaded
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            onVideoLoaded(video);
            setVideoRef(video);
            if (mainCanvasRef.current) {
                setCanvasRef(mainCanvasRef.current);
            }

            video.currentTime = 0;
            const handleSeeked = () => {
                video.removeEventListener('seeked', handleSeeked);
                drawFrame();
            };
            video.addEventListener('seeked', handleSeeked);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, [onVideoLoaded, setVideoRef, setCanvasRef, drawFrame]);

    // Animation loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const animate = () => {
            if (video.paused || video.ended) {
                animationRef.current = null;
                return;
            }

            drawFrame();

            if (Math.abs(video.currentTime - lastTimeRef.current) > 0.01) {
                lastTimeRef.current = video.currentTime;
                onTimeUpdate(video.currentTime);
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            video.play().catch(console.error);
            animate();
        } else {
            video.pause();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, onTimeUpdate, drawFrame]);

    // Seek handling
    useEffect(() => {
        const video = videoRef.current;
        if (!video || isPlaying) return;

        if (Math.abs(video.currentTime - currentTime) > 0.05) {
            video.currentTime = currentTime;

            const handleSeeked = () => {
                drawFrame();
                video.removeEventListener('seeked', handleSeeked);
            };
            video.addEventListener('seeked', handleSeeked);
        }
    }, [currentTime, isPlaying, drawFrame]);

    // Redraw interactive view when angle changes (for when video is paused)
    useEffect(() => {
        const video = videoRef.current;
        const mainCanvas = mainCanvasRef.current;
        const sphereCanvas = sphereCanvasRef.current;

        if (!video || !mainCanvas || !sphereCanvas || video.videoWidth === 0) return;
        if (isPlaying) return; // Animation loop handles this when playing

        const mainCtx = mainCanvas.getContext('2d');
        if (!mainCtx) return;

        // Redraw from existing main canvas to sphere
        const sphereSize = Math.max(sphereCanvas.clientWidth, sphereCanvas.clientHeight, 400);
        if (sphereCanvas.width !== sphereSize || sphereCanvas.height !== sphereSize) {
            sphereCanvas.width = sphereSize;
            sphereCanvas.height = sphereSize;
        }

        const perspectiveView = extractPerspectiveView(
            mainCtx,
            sphereViewAngle.yaw,
            sphereViewAngle.pitch,
            90,
            sphereSize,
            sphereSize
        );

        const sphereCtx = sphereCanvas.getContext('2d');
        if (sphereCtx) {
            sphereCtx.drawImage(perspectiveView, 0, 0, sphereSize, sphereSize);
        }
    }, [sphereViewAngle, isPlaying]);

    // Sphere drag handler - just for starting
    const handleSphereMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            yaw: sphereViewAngle.yaw,
            pitch: sphereViewAngle.pitch
        };
    };

    // Register preview canvas refs
    const setPreviewCanvasRef = useCallback((id: string, canvas: HTMLCanvasElement | null) => {
        if (canvas) {
            previewCanvasRefs.current.set(id, canvas);
        } else {
            previewCanvasRefs.current.delete(id);
        }
    }, []);

    if (!videoSrc) {
        return (
            <div className="flex-1 bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Import a 360° video to begin</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
            {/* Frame view previews (top row) - only show for Custom mode */}
            {editorMode === 'custom' && (
                <div className="h-36 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-2 overflow-x-auto">
                    {frameViews.map((view) => (
                        <button
                            key={view.id}
                            onClick={() => {
                                onFrameViewSelect(view.id);
                                // Update interactive sphere view to match the selected frame's angle
                                onSphereRotate(view.yaw, view.pitch);
                            }}
                            className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${activeFrameViewId === view.id
                                ? 'bg-indigo-600/20 ring-2 ring-indigo-500'
                                : 'hover:bg-gray-800'
                                }`}
                        >
                            <canvas
                                ref={(canvas) => setPreviewCanvasRef(view.id, canvas)}
                                className="w-20 h-20 rounded bg-gray-800"
                            />
                            <span className="text-[10px] text-gray-400 max-w-20 truncate">
                                {view.face ? view.face.toUpperCase() : view.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main content: Different layout based on editor mode */}
            {editorMode === 'skybox' ? (
                // Skybox mode: Cross preview on left, Interactive view on right
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Cubemap cross layout */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 min-w-0">
                        <div className="text-xs text-gray-400 mb-3 text-center">
                            <span className="font-medium">Cubemap Cross View</span>
                            <span className="text-gray-500 ml-2">Click a face to select it</span>
                        </div>

                        {/* Cross layout for cubemap faces using CSS grid */}
                        <div
                            className="grid gap-1"
                            style={{
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gridTemplateRows: 'repeat(3, auto)',
                                gridTemplateAreas: `
                                    ". py . ."
                                    "nx pz px nz"
                                    ". ny . ."
                                `
                            }}
                        >
                            {/* PY (Top) - positioned in row 1, column 2 */}
                            <div style={{ gridArea: 'py' }}>
                                <SkyboxFacePreview
                                    view={frameViews.find(v => v.face === 'py')}
                                    isActive={activeFrameViewId === frameViews.find(v => v.face === 'py')?.id}
                                    onClick={() => {
                                        const view = frameViews.find(v => v.face === 'py');
                                        if (view) {
                                            onFrameViewSelect(view.id);
                                            onSphereRotate(view.yaw, view.pitch);
                                        }
                                    }}
                                    setPreviewCanvasRef={setPreviewCanvasRef}
                                />
                            </div>

                            {/* NX (Left) */}
                            <div style={{ gridArea: 'nx' }}>
                                <SkyboxFacePreview
                                    view={frameViews.find(v => v.face === 'nx')}
                                    isActive={activeFrameViewId === frameViews.find(v => v.face === 'nx')?.id}
                                    onClick={() => {
                                        const view = frameViews.find(v => v.face === 'nx');
                                        if (view) {
                                            onFrameViewSelect(view.id);
                                            onSphereRotate(view.yaw, view.pitch);
                                        }
                                    }}
                                    setPreviewCanvasRef={setPreviewCanvasRef}
                                />
                            </div>

                            {/* PZ (Front) - center */}
                            <div style={{ gridArea: 'pz' }}>
                                <SkyboxFacePreview
                                    view={frameViews.find(v => v.face === 'pz')}
                                    isActive={activeFrameViewId === frameViews.find(v => v.face === 'pz')?.id}
                                    onClick={() => {
                                        const view = frameViews.find(v => v.face === 'pz');
                                        if (view) {
                                            onFrameViewSelect(view.id);
                                            onSphereRotate(view.yaw, view.pitch);
                                        }
                                    }}
                                    setPreviewCanvasRef={setPreviewCanvasRef}
                                />
                            </div>

                            {/* PX (Right) */}
                            <div style={{ gridArea: 'px' }}>
                                <SkyboxFacePreview
                                    view={frameViews.find(v => v.face === 'px')}
                                    isActive={activeFrameViewId === frameViews.find(v => v.face === 'px')?.id}
                                    onClick={() => {
                                        const view = frameViews.find(v => v.face === 'px');
                                        if (view) {
                                            onFrameViewSelect(view.id);
                                            onSphereRotate(view.yaw, view.pitch);
                                        }
                                    }}
                                    setPreviewCanvasRef={setPreviewCanvasRef}
                                />
                            </div>

                            {/* NZ (Back) */}
                            <div style={{ gridArea: 'nz' }}>
                                <SkyboxFacePreview
                                    view={frameViews.find(v => v.face === 'nz')}
                                    isActive={activeFrameViewId === frameViews.find(v => v.face === 'nz')?.id}
                                    onClick={() => {
                                        const view = frameViews.find(v => v.face === 'nz');
                                        if (view) {
                                            onFrameViewSelect(view.id);
                                            onSphereRotate(view.yaw, view.pitch);
                                        }
                                    }}
                                    setPreviewCanvasRef={setPreviewCanvasRef}
                                />
                            </div>

                            {/* NY (Bottom) - positioned in row 3, column 2 */}
                            <div style={{ gridArea: 'ny' }}>
                                <SkyboxFacePreview
                                    view={frameViews.find(v => v.face === 'ny')}
                                    isActive={activeFrameViewId === frameViews.find(v => v.face === 'ny')?.id}
                                    onClick={() => {
                                        const view = frameViews.find(v => v.face === 'ny');
                                        if (view) {
                                            onFrameViewSelect(view.id);
                                            onSphereRotate(view.yaw, view.pitch);
                                        }
                                    }}
                                    setPreviewCanvasRef={setPreviewCanvasRef}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Interactive view */}
                    <div className="flex-1 p-4 min-w-0 border-l border-gray-800">
                        <div className="h-full flex flex-col">
                            <div className="text-xs text-gray-400 mb-2 flex justify-between">
                                <span className="font-medium">Interactive View</span>
                                <span className="text-gray-500">Yaw: {Math.round(sphereViewAngle.yaw)}° | Pitch: {Math.round(sphereViewAngle.pitch)}°</span>
                            </div>
                            <div
                                className={`flex-1 bg-black rounded-lg overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                onMouseDown={handleSphereMouseDown}
                            >
                                <canvas
                                    ref={sphereCanvasRef}
                                    className="w-full h-full"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                Drag to explore 360° view
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // Custom mode: Interactive View + Equirectangular source - 50/50 split
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Interactive view (configures active frame) */}
                    <div className="flex-1 p-4 min-w-0">
                        <div className="h-full flex flex-col">
                            <div className="text-xs text-gray-400 mb-2 flex justify-between">
                                <span className="font-medium">Interactive View</span>
                                <span className="text-gray-500">Yaw: {Math.round(sphereViewAngle.yaw)}° | Pitch: {Math.round(sphereViewAngle.pitch)}°</span>
                            </div>
                            <div
                                className={`flex-1 bg-black rounded-lg overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                onMouseDown={handleSphereMouseDown}
                            >
                                <canvas
                                    ref={sphereCanvasRef}
                                    className="w-full h-full"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                Drag to configure active frame view angle
                            </p>
                        </div>
                    </div>

                    {/* Right: Equirectangular source view */}
                    <div className="flex-1 p-4 min-w-0 border-l border-gray-800">
                        <div className="h-full flex flex-col">
                            <div className="text-xs text-gray-400 mb-2">
                                <span className="font-medium">Source (Equirectangular)</span>
                            </div>
                            <div className="flex-1 relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                <canvas
                                    ref={mainCanvasRef}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden main canvas for processing (always needed for extraction) */}
            {editorMode === 'skybox' && (
                <canvas
                    ref={mainCanvasRef}
                    className="hidden"
                />
            )}

            {/* Hidden video element */}
            <video
                ref={videoRef}
                src={videoSrc}
                className="hidden"
                crossOrigin="anonymous"
                preload="metadata"
            />
        </div>
    );
}
