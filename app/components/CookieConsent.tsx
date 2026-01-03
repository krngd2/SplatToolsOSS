'use client';

import { useState, useEffect } from 'react';

const CONSENT_KEY = 'splat_cookie_consent';

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

/**
 * Get the current consent status from localStorage
 */
export function getConsentStatus(): ConsentStatus {
    if (typeof window === 'undefined') return 'pending';
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'declined') return stored;
    return 'pending';
}

/**
 * Set consent status in localStorage
 */
export function setConsentStatus(status: 'accepted' | 'declined'): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CONSENT_KEY, status);
}

/**
 * Check if analytics should be loaded based on consent
 */
export function hasAnalyticsConsent(): boolean {
    return getConsentStatus() === 'accepted';
}

/**
 * GDPR Cookie Consent Banner
 * Shows a consent popup for analytics cookies
 */
export default function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Check if consent has already been given
        const status = getConsentStatus();
        if (status === 'pending') {
            // Small delay for smoother page load experience
            const timer = setTimeout(() => {
                setShowBanner(true);
                setTimeout(() => setIsAnimating(true), 50);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        setConsentStatus('accepted');
        setIsAnimating(false);
        setTimeout(() => {
            setShowBanner(false);
            // Reload to enable analytics
            window.location.reload();
        }, 300);
    };

    const handleDecline = () => {
        setConsentStatus('declined');
        setIsAnimating(false);
        setTimeout(() => setShowBanner(false), 300);
    };

    if (!showBanner) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-[9999] p-4 transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'
                }`}
        >
            <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* Cookie Icon */}
                    <div className="hidden md:flex w-12 h-12 rounded-full bg-indigo-600/20 items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">
                            🍪 We value your privacy
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            We use cookies and similar technologies to enhance your experience, analyze site traffic,
                            and for analytics purposes. By clicking &quot;Accept&quot;, you consent to our use of cookies.
                            You can learn more in our{' '}
                            <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">
                                Privacy Policy
                            </a>.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 flex-shrink-0 w-full md:w-auto">
                        <button
                            onClick={handleDecline}
                            className="flex-1 md:flex-none px-5 py-2.5 text-sm font-medium text-gray-300 
                                     bg-gray-800 hover:bg-gray-700 border border-gray-600 
                                     rounded-lg transition-colors duration-200"
                        >
                            Decline
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex-1 md:flex-none px-5 py-2.5 text-sm font-medium text-white 
                                     bg-indigo-600 hover:bg-indigo-500 
                                     rounded-lg transition-colors duration-200"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
