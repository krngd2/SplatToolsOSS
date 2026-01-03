'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                </svg>
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-white">SplatTools</span>
                        </Link>
                        <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">
                            Professional image preprocessing tools for 3D Gaussian Splatting and photorealistic 3D reconstruction.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/editor" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    Editor
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
