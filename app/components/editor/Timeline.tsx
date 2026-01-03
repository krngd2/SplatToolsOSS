'use client';

import { useRef, useState, useEffect, useCallback, RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Trash2, Ban, Wand2, X, Sparkles } from 'lucide-react';
import type { FrameData, TimelineRange, RangeAction } from '@/hooks/useEditor';

interface TimelineProps {
    duration: number;
    currentTime: number;
    frameData: FrameData[];
    threshold: number;
    zoom: number;
    ranges: TimelineRange[];
    selectedRangeId: string | null;
    videoRef: RefObject<HTMLVideoElement | null>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    onSeek: (time: number) => void;
    onThresholdChange: (threshold: number) => void;
    onZoomChange: (zoom: number) => void;
    onAddRange: (start: number, end: number) => string;
    onUpdateRange: (id: string, updates: Partial<Omit<TimelineRange, 'id'>>) => void;
    onRemoveRange: (id: string) => void;
    onSelectRange: (id: string | null) => void;
    onSetRangeAction: (id: string, action: RangeAction) => void;
    onClearAllRanges: () => void;
}

const RANGE_ACTIONS: { value: RangeAction; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'exclude', label: 'Exclude', icon: <Ban className="h-3 w-3" />, color: 'bg-red-500/30 border-red-500' },
    { value: 'mask_generation', label: 'Mask Generation', icon: <Wand2 className="h-3 w-3" />, color: 'bg-purple-500/30 border-purple-500' },
    { value: 'highlight', label: 'Highlight', icon: <Wand2 className="h-3 w-3" />, color: 'bg-green-500/30 border-green-500' },
];

export default function Timeline({
    duration,
    currentTime,
    frameData,
    threshold,
    zoom,
    ranges,
    selectedRangeId,
    videoRef,
    canvasRef,
    onSeek,
    onThresholdChange,
    onZoomChange,
    onAddRange,
    onUpdateRange,
    onRemoveRange,
    onSelectRange,
    onSetRangeAction,
    onClearAllRanges,
}: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [isDraggingThreshold, setIsDraggingThreshold] = useState(false);
    const [isCreatingRange, setIsCreatingRange] = useState(false);
    const [rangeCreationStart, setRangeCreationStart] = useState<number | null>(null);
    const [tempRangeEnd, setTempRangeEnd] = useState<number | null>(null);
    const [showMaskModal, setShowMaskModal] = useState(false);

    const maxVariance = frameData.reduce((max, item) => Math.max(max, item.variance), 0) || 1;
    const effectiveThreshold = Math.min(threshold, maxVariance);
    const thresholdRatio = maxVariance > 0 ? Math.min(1, Math.max(0, effectiveThreshold / maxVariance)) : 0;

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

    // Generate time ruler ticks
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

    const getRangeColor = (range: TimelineRange, isSelected: boolean) => {
        if (range.action === 'exclude') return isSelected ? 'bg-red-500/50 border-red-400' : 'bg-red-500/30 border-red-500/50';
        if (range.action === 'mask_generation') return isSelected ? 'bg-purple-500/50 border-purple-400' : 'bg-purple-500/30 border-purple-500/50';
        if (range.action === 'highlight') return isSelected ? 'bg-green-500/50 border-green-400' : 'bg-green-500/30 border-green-500/50';
        return isSelected ? 'bg-indigo-500/50 border-indigo-400' : 'bg-indigo-500/30 border-indigo-500/50';
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;

        // Check if clicking on an existing range
        const target = e.target as HTMLElement;
        if (target.closest('[data-range-id]')) {
            return; // Let the range click handler deal with it
        }

        // If there's a selected range with no action, remove it
        if (selectedRangeId) {
            const currentSelectedRange = ranges.find(r => r.id === selectedRangeId);
            if (currentSelectedRange && currentSelectedRange.action === null) {
                onRemoveRange(selectedRangeId);
            }
        }

        // Start creating a new range
        setIsCreatingRange(true);
        const time = positionToTime(e.clientX);
        setRangeCreationStart(time);
        setTempRangeEnd(time);
        onSelectRange(null); // Deselect any selected range
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingPlayhead) {
            onSeek(positionToTime(e.clientX));
        }
        if (isCreatingRange && rangeCreationStart !== null) {
            setTempRangeEnd(positionToTime(e.clientX));
        }
        if (isDraggingThreshold && trackRef.current) {
            const rect = trackRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const percentage = 1 - Math.max(0, Math.min(1, relativeY / rect.height));
            onThresholdChange(percentage * maxVariance);
        }
    }, [isDraggingPlayhead, isCreatingRange, isDraggingThreshold, rangeCreationStart, maxVariance, onSeek, onThresholdChange]);

    const handleMouseUp = useCallback(() => {
        // Finalize range creation
        if (isCreatingRange && rangeCreationStart !== null && tempRangeEnd !== null) {
            const start = Math.min(rangeCreationStart, tempRangeEnd);
            const end = Math.max(rangeCreationStart, tempRangeEnd);
            // Only create range if it's at least 0.1 seconds
            if (end - start > 0.1) {
                onAddRange(start, end);
            }
        }

        setIsDraggingPlayhead(false);
        setIsCreatingRange(false);
        setRangeCreationStart(null);
        setTempRangeEnd(null);
        setIsDraggingThreshold(false);
    }, [isCreatingRange, rangeCreationStart, tempRangeEnd, onAddRange]);

    useEffect(() => {
        if (isDraggingPlayhead || isCreatingRange || isDraggingThreshold) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingPlayhead, isCreatingRange, isDraggingThreshold, handleMouseMove, handleMouseUp]);

    const selectedRange = ranges.find(r => r.id === selectedRangeId);

    return (
        <div className="h-full bg-gray-900 flex flex-col">
            {/* Toolbar */}
            <div className="h-10 border-b border-gray-800 flex items-center px-4 gap-4">
                {/* Range actions - shown when a range is selected */}
                {selectedRange && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Action:</span>
                        {RANGE_ACTIONS.map(({ value, label, icon }) => (
                            <Button
                                key={value}
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-xs gap-1 ${selectedRange.action === value
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                                onClick={() => {
                                    if (value === 'mask_generation') {
                                        setShowMaskModal(true);
                                    } else {
                                        onSetRangeAction(selectedRange.id, value);
                                        onUpdateRange(selectedRange.id, { maskPrompt: undefined });
                                    }
                                }}
                            >
                                {icon}
                                {label}
                                {value === 'mask_generation' && selectedRange.action === 'mask_generation' && selectedRange.maskPrompt && (
                                    <span className="ml-1 text-purple-400">✓</span>
                                )}
                            </Button>
                        ))}
                        <div className="w-px h-5 bg-gray-700 mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-gray-800"
                            onClick={() => onRemoveRange(selectedRange.id)}
                            title="Delete range"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {!selectedRange && ranges.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{ranges.length} range{ranges.length !== 1 ? 's' : ''}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 gap-1"
                            onClick={onClearAllRanges}
                        >
                            <X className="h-3 w-3" />
                            Clear All
                        </Button>
                    </div>
                )}

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
                        {/* Sharpness chart overlay */}
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

                        {/* Threshold drag handle - left side with red background label */}
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
                                {/* Red line */}
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-red-500" />

                                {/* Left handle with value label */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-r-md flex items-center gap-1 shadow-lg hover:bg-red-400 transition-colors">
                                    <span>Threshold - {Math.round(effectiveThreshold)}</span>
                                </div>
                            </div>
                        )}

                        {/* Existing ranges */}
                        {ranges.map((range) => {
                            const isSelected = range.id === selectedRangeId;
                            return (
                                <div
                                    key={range.id}
                                    data-range-id={range.id}
                                    className={`absolute top-0 bottom-0 border-x cursor-pointer transition-colors ${getRangeColor(range, isSelected)}`}
                                    style={{
                                        left: `${timeToPosition(range.start)}%`,
                                        width: `${timeToPosition(range.end - range.start)}%`,
                                        zIndex: isSelected ? 5 : 1,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectRange(isSelected ? null : range.id);
                                    }}
                                >
                                    {/* Range label */}
                                    {range.action && (
                                        <div className="absolute top-1 left-1 text-[9px] font-medium text-white/80 uppercase tracking-wide">
                                            {range.action.replace('_', ' ')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Temporary range being created */}
                        {isCreatingRange && rangeCreationStart !== null && tempRangeEnd !== null && (
                            <div
                                className="absolute top-0 bottom-0 bg-indigo-500/40 border-x border-indigo-400 pointer-events-none"
                                style={{
                                    left: `${timeToPosition(Math.min(rangeCreationStart, tempRangeEnd))}%`,
                                    width: `${timeToPosition(Math.abs(tempRangeEnd - rangeCreationStart))}%`,
                                    zIndex: 6,
                                }}
                            />
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
                <span>Click and drag to create ranges</span>
                <div className="flex-1" />
                {frameData.length > 0 && (
                    <>
                        <span className="mr-4">Frames: {frameData.length}</span>
                        <span className="mr-4">Above threshold: {frameData.filter(f => f.variance >= effectiveThreshold).length}</span>
                    </>
                )}
                <span>Duration: {formatTime(duration)}</span>
            </div>
        </div>
    );
}

