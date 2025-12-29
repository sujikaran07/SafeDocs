import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://safedocs.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/dashboard/', '/settings/'],
        },
        sitemap: `${appUrl}/sitemap.xml`,
    };
}
