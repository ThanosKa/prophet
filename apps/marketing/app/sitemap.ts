import { MetadataRoute } from 'next'
import { getAllBlogPosts } from '@/lib/blog'

const baseUrl = 'https://prophetchrome.com'

async function loadSlugs(modulePath: string): Promise<string[]> {
    try {
        const mod = await import(`@/lib/seo/${modulePath}`)
        const dataArray = Object.values(mod).find((v) => Array.isArray(v)) as
            | Array<{ slug: string }>
            | undefined
        return dataArray?.map((item) => item.slug) ?? []
    } catch {
        return []
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [
        useCaseSlugs,
        professionSlugs,
        comparisonSlugs,
        guideSlugs,
        integrationSlugs,
        industrySlugs,
    ] = await Promise.all([
        loadSlugs('use-cases'),
        loadSlugs('professions'),
        loadSlugs('comparisons'),
        loadSlugs('guides'),
        loadSlugs('integrations'),
        loadSlugs('industries'),
    ])

    const staticPages: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/pricing.md`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
        { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/alternatives`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/use-cases`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/for`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/integrations`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/industries`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/best-ai-chrome-extensions`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/best-ai-sidebar-extensions`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/best-claude-chrome-extensions`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/tools`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/tools/ai-api-cost-calculator`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ai-model-comparison`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ai-pricing-comparison`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ]

    const dynamicPages: MetadataRoute.Sitemap = [
        ...useCaseSlugs.map((slug) => ({
            url: `${baseUrl}/use-cases/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
        ...professionSlugs.map((slug) => ({
            url: `${baseUrl}/for/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
        ...comparisonSlugs.map((slug) => ({
            url: `${baseUrl}/compare/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
        ...guideSlugs.map((slug) => ({
            url: `${baseUrl}/guides/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        ...integrationSlugs.map((slug) => ({
            url: `${baseUrl}/integrations/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        ...industrySlugs.map((slug) => ({
            url: `${baseUrl}/industries/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        ...getAllBlogPosts().map((post) => ({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: new Date(post.date),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
    ]

    return [...staticPages, ...dynamicPages]
}
