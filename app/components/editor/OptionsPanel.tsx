'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface OptionsPanelProps {
    fps: number;
    threshold: number;
    isProcessing: boolean;
    progress: number;
    hasVideo: boolean;
    hasFrameData: boolean;
    frameCount: number;
    framesAboveThreshold: number;
    hdrSupport: string;
    hdrCanvasSupported: boolean;
    hdrDisplay: boolean;
    onFpsChange: (fps: number) => void;
    onThresholdChange: (threshold: number) => void;
    onImport: (file: File) => void;
    onRunAnalysis: () => void;
}

interface SectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-gray-800">
            <button
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                {title}
            </button>
            {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
        </div>
    );
}

export default function OptionsPanel({
    fps,
    threshold,
    isProcessing,
    progress,
    hasVideo,
    hasFrameData,
    frameCount,
    framesAboveThreshold,
    hdrSupport,
    hdrCanvasSupported,
    hdrDisplay,
    onFpsChange,
    onThresholdChange,
    onImport,
    onRunAnalysis,
}: OptionsPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    return (
        <div className="h-full bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-10 border-b border-gray-800 flex items-center px-4">
                <span className="text-sm font-medium text-gray-300">Options</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Import Section */}
                <Section title="Import">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                    >
                        <Folder className="h-4 w-4" />
                        Select Video File
                    </Button>
                </Section>

                {/* Analysis Settings */}
                <Section title="Analysis Settings">
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs text-gray-400 mb-2 block">
                                Sample Rate (FPS)
                            </span>
                            <div className="flex gap-2">
                                {[3, 6, 12].map((fpsOption) => (
                                    <button
                                        key={fpsOption}
                                        onClick={() => onFpsChange(fpsOption)}
                                        disabled={isProcessing}
                                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border transition-colors ${fps === fpsOption
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                                            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {fpsOption}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1.5">
                                Higher = more frames analyzed
                            </p>
                        </div>
                    </div>

                    <Button
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                        onClick={onRunAnalysis}
                        disabled={!hasVideo || isProcessing}
                    >
                        <Play className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Analyzing...' : 'Run Analysis'}
                    </Button>

                    {/* Progress bar */}
                    {isProcessing && (
                        <div className="mt-3">
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1 text-right">{progress}%</p>
                        </div>
                    )}
                </Section>

                {/* Results */}
                {hasFrameData && (
                    <Section title="Results">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Frames Analyzed</span>
                                <span className="text-white font-medium">{frameCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Above Threshold</span>
                                <span className="text-indigo-400 font-medium">{framesAboveThreshold}</span>
                            </div>
                        </div>
                    </Section>
                )}

                {/* HDR Info */}
                <Section title="HDR Status" defaultOpen={false}>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`${hdrCanvasSupported && hdrDisplay ? 'text-green-400' : 'text-gray-400'}`}>
                                {hdrSupport}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Display</span>
                            <span className={hdrDisplay ? 'text-green-400' : 'text-gray-400'}>
                                {hdrDisplay ? 'HDR' : 'SDR'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Canvas</span>
                            <span className={hdrCanvasSupported ? 'text-green-400' : 'text-gray-400'}>
                                {hdrCanvasSupported ? 'Supported' : 'Limited'}
                            </span>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-800 px-4 py-3">
                <p className="text-[10px] text-gray-600 text-center">
                    Drag threshold line on timeline to adjust
                </p>
            </div>
        </div>
    );
}
