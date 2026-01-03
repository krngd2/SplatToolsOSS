import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://splat.tools';
    const currentDate = new Date();

    return [
        {
            url: siteUrl,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${siteUrl}/editor`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.9,
        }
    ];
}
