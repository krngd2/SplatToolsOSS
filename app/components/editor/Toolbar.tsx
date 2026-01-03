'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, User, Home } from 'lucide-react';

interface ToolbarProps {
    videoFileName: string;
    hasVideo: boolean;
    hdrSupport: string;
}

export default function Toolbar({
    videoFileName,
    hasVideo,
    hdrSupport,
}: ToolbarProps) {
    return (
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4">
            {/* Logo / Home */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                </div>
                <span className="font-semibold text-white text-sm">SplatTools</span>
            </Link>

            <div className="h-6 w-px bg-gray-700" />

            {/* File name */}
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 text-sm truncate max-w-[200px]">
                    {hasVideo ? videoFileName : 'No video'}
                </span>
                {hdrSupport.includes('HDR') && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-600/30 text-purple-300 rounded">
                        HDR
                    </span>
                )}
            </div>

            <div className="flex-1" />

            {/* User actions */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-800"
                    title="Notifications"
                >
                    <Bell className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-800"
                    title="Profile"
                >
                    <User className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
