import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://safedocs.com';

    const routes = [
        '',
        '/auth',
        '/pricing',
        '/contact',
        '/faq',
        '/privacy',
        '/terms',
    ].map((route) => ({
        url: `${appUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    return routes;
}
