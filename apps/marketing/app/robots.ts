import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/private/', '/account/', '/auth-success', '/sign-in/', '/sign-up/'],
        },
        sitemap: 'https://prophetchrome.com/sitemap.xml',
    }
}
