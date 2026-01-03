'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, Play, ChevronDown, ChevronRight, Check, X, Box, Grid3X3, RotateCcw } from 'lucide-react';
import type { EditorMode, CustomConfig, Detection360Result, FrameView } from '@/hooks/useEditor360';
import Config3DPreview from './Config3DPreview';

interface OptionsPanel360Props {
    // Video state
    hasVideo: boolean;
    is360Detected: boolean;
    detection360Result: Detection360Result | null;
    is360ModeEnabled: boolean;

    // Mode & config
    editorMode: EditorMode;
    customConfig: CustomConfig;
    frameViews: FrameView[];

    // Processing
    isProcessing: boolean;
    progress: number;
    fps: number;

    // Callbacks
    onImport: (file: File) => void;
    onSet360ModeEnabled: (enabled: boolean) => void;
    onSetEditorMode: (mode: EditorMode) => void;
    onSetCustomConfig: (config: Partial<CustomConfig>) => void;
    onFpsChange: (fps: number) => void;
    onRunAnalysis: () => void;
    activeFrameViewId?: string | null;
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

interface SliderInputProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
    disabled?: boolean;
}

function SliderInput({ label, value, min, max, step = 1, unit = '', onChange, disabled }: SliderInputProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-300 font-medium">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
            />
        </div>
    );
}

export default function OptionsPanel360({
    hasVideo,
    is360Detected,
    detection360Result,
    is360ModeEnabled,
    editorMode,
    customConfig,
    frameViews,
    isProcessing,
    progress,
    fps,
    onImport,
    onSet360ModeEnabled,
    onSetEditorMode,
    onSetCustomConfig,
    onFpsChange,
    onRunAnalysis,
    activeFrameViewId,
}: OptionsPanel360Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    const activeFrameView = frameViews.find(v => v.frameData.length > 0);
    const totalFramesAnalyzed = activeFrameView?.frameData.length || 0;

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
                        Select 360° Video
                    </Button>
                </Section>

                {/* 360 Detection Status */}
                {hasVideo && (
                    <Section title="360° Detection">
                        <div className="space-y-3">
                            {/* Detection result */}
                            <div className="flex items-center gap-2">
                                {is360Detected ? (
                                    <div className="flex items-center gap-2 text-green-400">
                                        <Check className="h-4 w-4" />
                                        <span className="text-sm">360° video detected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-yellow-400">
                                        <X className="h-4 w-4" />
                                        <span className="text-sm">Not detected as 360°</span>
                                    </div>
                                )}
                            </div>

                            {detection360Result && (
                                <p className="text-[11px] text-gray-500">
                                    {detection360Result.reason} (Confidence: {detection360Result.confidence})
                                </p>
                            )}

                            {/* Manual override toggle */}
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-gray-400">Force 360° Mode</span>
                                <button
                                    onClick={() => onSet360ModeEnabled(!is360ModeEnabled)}
                                    className={`w-10 h-5 rounded-full transition-colors ${is360ModeEnabled
                                        ? 'bg-indigo-600'
                                        : 'bg-gray-700'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${is360ModeEnabled
                                        ? 'translate-x-5'
                                        : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>
                        </div>
                    </Section>
                )}

                {/* Editor Mode */}
                {hasVideo && is360ModeEnabled && (
                    <Section title="Editor Mode">
                        <div className="flex gap-2">
                            <button
                                onClick={() => onSetEditorMode('skybox')}
                                disabled={isProcessing}
                                className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-lg border transition-colors ${editorMode === 'skybox'
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Box className="h-5 w-5" />
                                <span className="text-xs font-medium">Skybox</span>
                            </button>
                            <button
                                onClick={() => onSetEditorMode('custom')}
                                disabled={isProcessing}
                                className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-lg border transition-colors ${editorMode === 'custom'
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Grid3X3 className="h-5 w-5" />
                                <span className="text-xs font-medium">Custom</span>
                            </button>
                        </div>

                        {editorMode === 'skybox' && (
                            <>
                                <p className="text-[11px] text-gray-500 mt-2">
                                    Exports 6 cubemap faces (px, nx, py, ny, pz, nz) per frame
                                </p>
                                {/* 3D Preview for Skybox */}
                                <div className="mt-4 flex justify-center">
                                    <Config3DPreview
                                        frameViews={frameViews}
                                        activeFrameViewId={activeFrameViewId || null}
                                        size={180}
                                    />
                                </div>
                            </>
                        )}
                    </Section>
                )}

                {/* Custom Mode Configuration */}
                {hasVideo && is360ModeEnabled && editorMode === 'custom' && (
                    <Section title="Custom Configuration">
                        <div className="space-y-4">
                            <SliderInput
                                label="Frame Count"
                                value={customConfig.frameCount}
                                min={1}
                                max={12}
                                onChange={(v) => onSetCustomConfig({ frameCount: v })}
                                disabled={isProcessing}
                            />
                            <SliderInput
                                label="Rig Pitch"
                                value={customConfig.rigPitch}
                                min={-45}
                                max={45}
                                unit="°"
                                onChange={(v) => onSetCustomConfig({ rigPitch: v })}
                                disabled={isProcessing}
                            />
                            <SliderInput
                                label="Start Angle"
                                value={customConfig.startAngle}
                                min={0}
                                max={360}
                                step={15}
                                unit="°"
                                onChange={(v) => onSetCustomConfig({ startAngle: v })}
                                disabled={isProcessing}
                            />
                            <SliderInput
                                label="Field of View"
                                value={customConfig.fov}
                                min={30}
                                max={120}
                                unit="°"
                                onChange={(v) => onSetCustomConfig({ fov: v })}
                                disabled={isProcessing}
                            />
                        </div>

                        {/* 3D Preview for Custom mode */}
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-400">
                                    View Configuration Preview
                                </span>
                                <button
                                    onClick={() => onSetCustomConfig({ ...customConfig })}
                                    disabled={isProcessing}
                                    className="text-[10px] text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                                    title="Reset views to default positions"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </button>
                            </div>
                            <div className="flex justify-center">
                                <Config3DPreview
                                    frameViews={frameViews}
                                    activeFrameViewId={activeFrameViewId || null}
                                    size={200}
                                />
                            </div>
                        </div>

                        {/* Frame views angles list */}
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <span className="text-xs text-gray-400 block mb-2">
                                Views: {frameViews.length}
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {frameViews.map((view, i) => (
                                    <span
                                        key={view.id}
                                        className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-400"
                                    >
                                        {Math.round(view.yaw)}°
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Section>
                )}

                {/* Analysis Settings */}
                {hasVideo && is360ModeEnabled && (
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
                                    Higher = more frames, longer analysis
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
                )}

                {/* Results */}
                {totalFramesAnalyzed > 0 && (
                    <Section title="Results">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Frames Analyzed</span>
                                <span className="text-white font-medium">{totalFramesAnalyzed}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Views</span>
                                <span className="text-indigo-400 font-medium">{frameViews.length}</span>
                            </div>
                        </div>
                    </Section>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-800 px-4 py-3">
                <p className="text-[10px] text-gray-600 text-center">
                    URL params update as you configure
                </p>
            </div>
        </div>
    );
}
