import { MetadataRoute } from 'next'
import { getAllBlogPosts } from '@/lib/blog'
import { alternatives, comparisons } from '@/lib/seo/comparisons'
import { guides } from '@/lib/seo/guides'
import { industries } from '@/lib/seo/industries'
import { integrations } from '@/lib/seo/integrations'
import { professions } from '@/lib/seo/professions'
import { isPrunedPath } from '@/lib/seo/pruned.mjs'
import { redirectSources } from '@/lib/seo/redirects.mjs'
import { useCases } from '@/lib/seo/use-cases'

const baseUrl = 'https://prophetchrome.com'

const TEMPLATES_LAST_UPDATED = new Date('2026-07-29')

type Entry = MetadataRoute.Sitemap[number]

function collection({
    prefix,
    items,
    priority,
}: {
    prefix: string
    items: ReadonlyArray<{ slug: string }>
    priority: number
}): Entry[] {
    return items.map((item) => ({
        url: `${baseUrl}${prefix}/${item.slug}`,
        lastModified: TEMPLATES_LAST_UPDATED,
        changeFrequency: 'monthly' as const,
        priority,
    }))
}

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages: Entry[] = [
        { url: baseUrl, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 1 },
        { url: `${baseUrl}/pricing`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/how-it-works`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/best-ai-chrome-extensions`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/best-claude-chrome-extensions`, lastModified: new Date('2026-11-23'), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/best-ai-sidebar-extensions`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/free-claude-ai`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/compare`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/alternatives`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/use-cases`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/blog`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/guides`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/integrations`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/industries`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/for`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/faq`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/about`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/tools`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/tools/ai-api-cost-calculator`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ai-model-comparison`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ai-pricing-comparison`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/privacy`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/terms`, lastModified: TEMPLATES_LAST_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
    ]

    const dynamicPages: Entry[] = [
        ...collection({ prefix: '/compare', items: comparisons, priority: 0.8 }),
        ...collection({ prefix: '/alternatives', items: alternatives, priority: 0.7 }),
        ...collection({ prefix: '/use-cases', items: useCases, priority: 0.7 }),
        ...collection({ prefix: '/for', items: professions, priority: 0.6 }),
        ...collection({ prefix: '/guides', items: guides, priority: 0.6 }),
        ...collection({ prefix: '/integrations', items: integrations, priority: 0.6 }),
        ...collection({ prefix: '/industries', items: industries, priority: 0.6 }),
        ...getAllBlogPosts().map((post) => ({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: new Date(post.lastModified ?? post.date),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
    ]

    const seen = new Set<string>()
    return [...staticPages, ...dynamicPages].filter((entry) => {
        if (seen.has(entry.url)) return false
        seen.add(entry.url)
        const path = entry.url.slice(baseUrl.length)
        return !redirectSources.has(path) && !isPrunedPath(path)
    })
}
