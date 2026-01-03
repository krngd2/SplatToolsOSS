'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Download, Play, Pause } from 'lucide-react';
import type { FrameView, FrameData } from '@/hooks/useEditor360';

interface Timeline360Props {
    duration: number;
    currentTime: number;
    frameViews: FrameView[];
    activeFrameViewId: string | null;
    zoom: number;
    isProcessing: boolean;
    onSeek: (time: number) => void;
    onZoomChange: (zoom: number) => void;
    onFrameViewSelect: (id: string) => void;
    onThresholdChange: (viewId: string, threshold: number) => void;
    onRenameFrameView: (id: string, name: string) => void;
    onAddRange: (viewId: string, start: number, end: number) => string;
    onUpdateRange: (viewId: string, rangeId: string, updates: object) => void;
    onRemoveRange: (viewId: string, rangeId: string) => void;
    onClearAllRanges: (viewId: string) => void;
    onDownload: () => void;
}

export default function Timeline360({
    duration,
    currentTime,
    frameViews,
    activeFrameViewId,
    zoom,
    isProcessing,
    onSeek,
    onZoomChange,
    onFrameViewSelect,
    onThresholdChange,
    onRenameFrameView,
    onAddRange,
    onUpdateRange,
    onRemoveRange,
    onClearAllRanges,
    onDownload,
}: Timeline360Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [isDraggingThreshold, setIsDraggingThreshold] = useState(false);
    const [editingViewId, setEditingViewId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const activeView = frameViews.find(v => v.id === activeFrameViewId);
    const frameData = activeView?.frameData || [];
    const threshold = activeView?.threshold || 300;
    const maxVariance = frameData.reduce((max, item) => Math.max(max, item.variance), 0) || 1;
    const effectiveThreshold = Math.min(threshold, maxVariance);
    const thresholdRatio = maxVariance > 0 ? Math.min(1, Math.max(0, effectiveThreshold / maxVariance)) : 0;
    const framesAboveThreshold = frameData.filter(f => f.variance >= effectiveThreshold).length;

    const timeToPosition = (time: number) => {
        if (!duration) return 0;
        return (time / duration) * 100;
    };

    const positionToTime = (clientX: number) => {
        if (!trackRef.current || !duration) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        return percentage * duration;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const generateTicks = () => {
        if (!duration) return [];
        const minTickSpacing = 80;
        const containerWidth = containerRef.current?.clientWidth || 800;
        const totalWidth = containerWidth * zoom;
        const tickCount = Math.max(2, Math.floor(totalWidth / minTickSpacing));
        const interval = duration / tickCount;
        const niceIntervals = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
        const niceInterval = niceIntervals.find(i => i >= interval) || 600;
        const ticks = [];
        for (let t = 0; t <= duration; t += niceInterval) {
            ticks.push(t);
        }
        return ticks;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDraggingPlayhead(true);
        onSeek(positionToTime(e.clientX));
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingPlayhead) {
            onSeek(positionToTime(e.clientX));
        }
        if (isDraggingThreshold && trackRef.current && activeFrameViewId) {
            const rect = trackRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const percentage = 1 - Math.max(0, Math.min(1, relativeY / rect.height));
            onThresholdChange(activeFrameViewId, percentage * maxVariance);
        }
    }, [isDraggingPlayhead, isDraggingThreshold, maxVariance, activeFrameViewId, onSeek, onThresholdChange]);

    const handleMouseUp = useCallback(() => {
        setIsDraggingPlayhead(false);
        setIsDraggingThreshold(false);
    }, []);

    useEffect(() => {
        if (isDraggingPlayhead || isDraggingThreshold) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingPlayhead, isDraggingThreshold, handleMouseMove, handleMouseUp]);

    const handleViewDoubleClick = (view: FrameView) => {
        setEditingViewId(view.id);
        setEditName(view.name);
    };

    const handleRenameSubmit = () => {
        if (editingViewId && editName.trim()) {
            onRenameFrameView(editingViewId, editName.trim());
        }
        setEditingViewId(null);
        setEditName('');
    };

    return (
        <div className="h-48 bg-gray-900 flex flex-col">
            {/* View tabs */}
            <div className="h-10 border-b border-gray-800 flex items-center px-4 gap-2 overflow-x-auto">
                {frameViews.map((view) => (
                    <button
                        key={view.id}
                        onClick={() => onFrameViewSelect(view.id)}
                        onDoubleClick={() => handleViewDoubleClick(view)}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${activeFrameViewId === view.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        {editingViewId === view.id ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleRenameSubmit}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                                className="w-16 bg-transparent border-b border-white text-white text-xs outline-none"
                                autoFocus
                            />
                        ) : (
                            <>
                                {view.face ? view.face.toUpperCase() : view.name}
                                {view.frameData.length > 0 && (
                                    <span className="ml-1.5 text-[10px] opacity-60">
                                        ({view.frameData.filter(f => f.variance >= view.threshold).length})
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                ))}

                <div className="flex-1" />

                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => onZoomChange(zoom / 1.5)}
                        disabled={zoom <= 0.2}
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => onZoomChange(zoom * 1.5)}
                        disabled={zoom >= 10}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>

                {/* Export button */}
                <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
                    onClick={onDownload}
                    disabled={isProcessing || frameData.length === 0}
                >
                    <Download className="h-3.5 w-3.5" />
                    Export
                </Button>
            </div>

            {/* Time ruler */}
            <div className="h-6 bg-gray-850 border-b border-gray-800 relative overflow-hidden">
                <div
                    className="absolute inset-0 flex"
                    style={{ width: `${zoom * 100}%` }}
                >
                    {generateTicks().map((time) => (
                        <div
                            key={time}
                            className="absolute top-0 h-full flex flex-col items-center"
                            style={{ left: `${timeToPosition(time)}%` }}
                        >
                            <div className="w-px h-2 bg-gray-600" />
                            <span className="text-[10px] text-gray-500 mt-0.5">{formatTime(time)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Track area */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden"
            >
                <div
                    ref={trackRef}
                    className="absolute inset-0 cursor-crosshair"
                    style={{ width: `${zoom * 100}%` }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Video track background */}
                    <div className="absolute inset-x-0 top-2 bottom-2 mx-2 bg-gray-800 rounded-md overflow-hidden">
                        {/* Sharpness chart */}
                        {frameData.length > 0 && (
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                preserveAspectRatio="none"
                                viewBox={`0 0 ${frameData.length} 100`}
                            >
                                {frameData.map((frame, index) => {
                                    const height = (frame.variance / maxVariance) * 100;
                                    return (
                                        <rect
                                            key={index}
                                            x={index}
                                            y={100 - height}
                                            width={1}
                                            height={height}
                                            fill={frame.variance < effectiveThreshold ? 'rgba(147, 197, 253, 0.4)' : 'rgba(99, 102, 241, 0.6)'}
                                        />
                                    );
                                })}

                                {/* Threshold line */}
                                <line
                                    x1="0"
                                    y1={100 - (thresholdRatio * 100)}
                                    x2={frameData.length}
                                    y2={100 - (thresholdRatio * 100)}
                                    stroke="#ef4444"
                                    strokeWidth="1"
                                    strokeDasharray="4"
                                />
                            </svg>
                        )}

                        {/* Threshold drag handle */}
                        {frameData.length > 0 && (
                            <div
                                className="absolute left-0 right-0 cursor-ns-resize"
                                style={{
                                    bottom: `${thresholdRatio * 100}%`,
                                    transform: 'translateY(50%)',
                                    height: '16px',
                                    zIndex: 10,
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setIsDraggingThreshold(true);
                                }}
                            >
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-red-500" />
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-r-md shadow-lg hover:bg-red-400 transition-colors">
                                    {Math.round(effectiveThreshold)} ({framesAboveThreshold})
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-20 cursor-ew-resize"
                        style={{ left: `${timeToPosition(currentTime)}%` }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsDraggingPlayhead(true);
                        }}
                    >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                    </div>
                </div>
            </div>

            {/* Info bar */}
            <div className="h-6 border-t border-gray-800 flex items-center px-4 text-[11px] text-gray-500">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex-1" />
                {frameData.length > 0 && (
                    <>
                        <span className="mr-4">Frames: {frameData.length}</span>
                        <span className="mr-4">Above threshold: {framesAboveThreshold}</span>
                    </>
                )}
                <span>View: {activeView?.name || activeView?.face?.toUpperCase() || '-'}</span>
            </div>
        </div>
    );
}
