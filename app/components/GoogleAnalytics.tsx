'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { getConsentStatus } from './CookieConsent';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default function GoogleAnalytics() {
    const [hasConsent, setHasConsent] = useState(false);

    useEffect(() => {
        // Check consent status on mount
        setHasConsent(getConsentStatus() === 'accepted');
    }, []);

    // Don't load analytics in development mode or without consent
    if (!GA_MEASUREMENT_ID || !hasConsent || !IS_PRODUCTION) {
        return null;
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
            </Script>
        </>
    );
}
