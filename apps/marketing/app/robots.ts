import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // /sign-in and /sign-up themselves stay crawlable so Googlebot can read their
            // noindex tag; only the Clerk catch-all sub-routes are blocked.
            disallow: ['/api/', '/account/', '/auth-success', '/sign-in/', '/sign-up/'],
        },
        sitemap: 'https://prophetchrome.com/sitemap.xml',
    }
}
