import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://prophet.com' // TODO: Update domain

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 1,
        },
    ]
}
