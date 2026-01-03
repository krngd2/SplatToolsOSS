'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface Tool {
    name: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    status: 'free' | 'premium' | 'coming-soon' | 'beta';
}

const tools: Tool[] = [
    {
        name: 'Sharp Frame Extraction',
        description: 'Extract the sharpest frames from your videos with advanced blur detection and HDR support.',
        href: '/editor',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
        status: 'free',
    },
    {
        name: '360° Editor',
        description: 'Edit and extract rectilinear frames from 360-degree videos with interactive preview and timeline.',
        href: '/editor360',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
        ),
        status: 'beta',
    },
    {
        name: 'Mask Generation',
        description: 'Generate precise masks for your images with AI-powered segmentation.',
        href: '/editor',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        status: 'premium',
    },
];

function StatusBadge({ status }: { status: Tool['status'] }) {
    switch (status) {
        case 'free':
            return (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                    Free
                </Badge>
            );
        case 'beta':
            return (
                <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-0">
                    Beta
                </Badge>
            );
        case 'premium':
            return (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    Premium
                </Badge>
            );
        case 'coming-soon':
            return (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0">
                    Coming Soon
                </Badge>
            );
    }
}

export default function ToolsGrid() {
    return (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Our Tools
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Everything you need to prepare images for 3D Gaussian Splatting.
                        Process your data efficiently with our specialized tools.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool) => (
                        <Link
                            key={tool.name}
                            href={tool.status === 'coming-soon' ? '#' : tool.href}
                            className={`group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 transition-all duration-200 ${tool.status === 'coming-soon'
                                ? 'opacity-60 cursor-not-allowed'
                                : 'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none'
                                }`}
                            onClick={(e) => tool.status === 'coming-soon' && e.preventDefault()}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                                    {tool.icon}
                                </div>
                                <StatusBadge status={tool.status} />
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {tool.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {tool.description}
                            </p>

                            {tool.status !== 'coming-soon' && (
                                <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Try it now
                                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
