'use client';

import { useRef, useEffect, useCallback } from 'react';

interface CanvasPlayerProps {
    videoSrc: string | null;
    isPlaying: boolean;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    onVideoLoaded: (video: HTMLVideoElement) => void;
    setVideoRef: (video: HTMLVideoElement | null) => void;
    setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

export default function CanvasPlayer({
    videoSrc,
    isPlaying,
    currentTime,
    onTimeUpdate,
    onVideoLoaded,
    setVideoRef,
    setCanvasRef,
}: CanvasPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Set refs for parent - use callback ref pattern
    useEffect(() => {
        setVideoRef(videoRef.current);
        setCanvasRef(canvasRef.current);

        return () => {
            setVideoRef(null);
            setCanvasRef(null);
        };
    }, [setVideoRef, setCanvasRef]);

    // Update refs when videoSrc changes (elements should now be available)
    useEffect(() => {
        if (videoSrc && videoRef.current && canvasRef.current) {
            setVideoRef(videoRef.current);
            setCanvasRef(canvasRef.current);
        }
    }, [videoSrc, setVideoRef, setCanvasRef]);

    // Draw current frame to canvas
    const drawFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match canvas size to video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0);
    }, []);

    // Handle video loaded
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            onVideoLoaded(video);
            // Also update refs after video is loaded
            setVideoRef(video);
            if (canvasRef.current) {
                setCanvasRef(canvasRef.current);
            }

            // Seek to first frame and draw it
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

    // Animation loop for playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const animate = () => {
            if (video.paused || video.ended) {
                animationRef.current = null;
                return;
            }

            drawFrame();

            // Update time
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

        // Only seek if the difference is significant
        if (Math.abs(video.currentTime - currentTime) > 0.05) {
            video.currentTime = currentTime;

            const handleSeeked = () => {
                drawFrame();
                video.removeEventListener('seeked', handleSeeked);
            };
            video.addEventListener('seeked', handleSeeked);
        }
    }, [currentTime, isPlaying, drawFrame]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg">
            {/* Video element - always rendered but hidden */}
            <video
                ref={videoRef}
                src={videoSrc || undefined}
                className="hidden"
                crossOrigin="anonymous"
                preload="metadata"
            />

            {/* Canvas for rendering - always rendered */}
            <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full object-contain ${!videoSrc ? 'hidden' : ''}`}
                style={{ imageRendering: 'auto' }}
            />

            {/* Placeholder when no video */}
            {!videoSrc && (
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Import a video to begin</p>
                </div>
            )}
        </div>
    );
}

