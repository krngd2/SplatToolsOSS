'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, Scissors, Sparkles, Zap, Film } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Professional Video Frame Extraction
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-[1.1]">
              Extract Perfect
              <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Sharp Frames
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-lg">
              Precision video frame extraction powered by sharpness detection and AI Mask generation.
              Get cinema-quality stills with HDR support—right in your browser.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
              <Link href="/editor">
                <Button size="lg" className="px-8 py-7 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-0 shadow-lg shadow-indigo-600/30 group">
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Open Editor
                </Button>
              </Link>
              <Link href="/editor360">
                <Button size="lg" className="px-8 py-7 text-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 border-0 shadow-lg shadow-cyan-600/30 group relative">
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Open 360 Editor
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-semibold bg-cyan-400 text-gray-900 rounded-full">
                    Beta
                  </span>
                </Button>
              </Link>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Zap, text: 'Real-time Analysis' },
                { icon: Film, text: 'HDR Video Support' },
                { icon: Sparkles, text: '10-bit Color' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/50 text-gray-400 text-sm">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Editor preview mockup */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-xl overflow-hidden border border-gray-800 shadow-2xl shadow-indigo-900/20">
              {/* Mock editor interface */}
              <div className="bg-gray-900">
                {/* Title bar */}
                <div className="h-10 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-4 text-xs text-gray-500">SplatTools Editor</span>
                </div>

                {/* Preview area */}
                <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20" />
                  <div className="z-10 text-gray-600 flex flex-col items-center gap-3">
                    <Film className="w-12 h-12" />
                    <span className="text-sm">Video Preview</span>
                  </div>
                </div>

                {/* Timeline mockup */}
                <div className="h-24 bg-gray-950 border-t border-gray-800 p-3">
                  <div className="h-full bg-gray-900 rounded-md overflow-hidden relative">
                    {/* Sharpness bars */}
                    <div className="absolute inset-0 flex items-end">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const height = 20 + Math.random() * 70;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-indigo-600/60 to-indigo-400/60"
                            style={{ height: `${height}%` }}
                          />
                        );
                      })}
                    </div>
                    {/* Playhead */}
                    <div className="absolute top-0 bottom-0 left-1/3 w-0.5 bg-white z-10">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                    </div>
                    {/* Threshold line */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500/50 border-dashed" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl blur-xl opacity-20" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-cyan-500 to-indigo-500 rounded-xl blur-xl opacity-20" />
          </div>
        </div>
      </div>
    </section>
  );
}
