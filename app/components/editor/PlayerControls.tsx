'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, StepBack, StepForward, Download } from 'lucide-react';

interface PlayerControlsProps {
    isPlaying: boolean;
    isProcessing: boolean;
    hasVideo: boolean;
    hasFrameData: boolean;
    currentTime: number;
    duration: number;
    exportFps: number;
    onTogglePlay: () => void;
    onStepBack: () => void;
    onStepForward: () => void;
    onExportFpsChange: (fps: number) => void;
    onDownload: () => void;
}

export default function PlayerControls({
    isPlaying,
    isProcessing,
    hasVideo,
    hasFrameData,
    currentTime,
    duration,
    exportFps,
    onTogglePlay,
    onStepBack,
    onStepForward,
    onExportFpsChange,
    onDownload,
}: PlayerControlsProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * 30);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-12 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 flex items-center justify-center gap-4 px-4">
            {/* Playback controls */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                    onClick={onStepBack}
                    disabled={!hasVideo}
                    title="Step back (←)"
                >
                    <StepBack className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:bg-gray-800"
                    onClick={onTogglePlay}
                    disabled={!hasVideo}
                    title="Play/Pause (Space)"
                >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                    onClick={onStepForward}
                    disabled={!hasVideo}
                    title="Step forward (→)"
                >
                    <StepForward className="h-4 w-4" />
                </Button>
            </div>

            {/* Time display */}
            <div className="font-mono text-sm text-gray-400 min-w-[140px] text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Export FPS input + Export button */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                    <Input
                        type="number"
                        min="1"
                        max="60"
                        value={exportFps}
                        onChange={(e) => onExportFpsChange(parseInt(e.target.value) || 1)}
                        className="w-14 h-8 bg-gray-800 border-gray-700 text-white text-center text-sm px-2"
                        title="Frames per second to export"
                    />
                    <span className="text-xs text-gray-500">FPS</span>
                </div>
                <Button
                    variant="default"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    onClick={onDownload}
                    disabled={!hasFrameData || isProcessing}
                    title="Export sharp frames"
                >
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </div>
        </div>
    );
}
