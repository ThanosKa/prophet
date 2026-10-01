import { BASE_URL, CHROME_STORE_URL as CHROME_STORE_LISTING } from './constants'

const ORGANIZATION_ID = `${BASE_URL}/#organization`
const WEBSITE_ID = `${BASE_URL}/#website`
const SOFTWARE_ID = `${BASE_URL}/#software`

export const organizationRef = { '@id': ORGANIZATION_ID }

export const organizationNode = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Prophet',
  url: BASE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/logo.png`,
  },
  description:
    "Prophet is an open-source Chrome extension that runs Claude Haiku, Sonnet and Opus in the browser side panel with 18 browser-automation tools and pay-per-use credits.",
  foundingDate: '2025',
  founder: {
    '@type': 'Person',
    name: 'Thanos Kazakis',
    url: 'https://github.com/ThanosKa',
  },
  sameAs: [
    'https://x.com/KazakisThanos',
    'https://github.com/ThanosKa/prophet',
    'https://discord.gg/2YV53RbS',
    CHROME_STORE_LISTING,
  ],
}

export const websiteNode = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'Prophet',
  url: BASE_URL,
  description:
    'Claude AI in the Chrome side panel: streaming chat, 18 browser-automation tools, and pay-per-use credits billed at Anthropic API cost.',
  publisher: organizationRef,
  inLanguage: 'en-US',
}

/**
 * Google's Software App rich result additionally requires `aggregateRating`.
 * Prophet has no verified public review corpus yet, so no rating is emitted —
 * inventing one would violate Google's structured-data policy. The node is still
 * worth shipping: `offers` feeds price extraction and AI Overview grounding.
 */
export const softwareApplicationNode = {
  '@type': 'SoftwareApplication',
  '@id': SOFTWARE_ID,
  name: 'Prophet',
  alternateName: 'Prophet Chrome Extension',
  description:
    'Chrome side panel extension that runs Claude Haiku 4.5, Sonnet 5 and Opus 5 against the page you are on, with 18 browser-automation tools and pay-per-use credits.',
  applicationCategory: 'BrowserApplication',
  applicationSubCategory: 'AI Assistant',
  operatingSystem: 'Chrome OS, Windows, macOS, Linux',
  browserRequirements: 'Requires Google Chrome 114 or later',
  url: BASE_URL,
  downloadUrl: CHROME_STORE_LISTING,
  installUrl: CHROME_STORE_LISTING,
  screenshot: `${BASE_URL}/hero.jpg`,
  softwareHelp: `${BASE_URL}/faq`,
  isAccessibleForFree: true,
  author: organizationRef,
  publisher: organizationRef,
  featureList: [
    'Chrome side panel integration',
    'Streaming Claude responses',
    '18 browser-automation tools (click, type, navigate, extract)',
    'Claude Haiku 4.5, Sonnet 5 and Opus 5',
    'Accessibility-tree page reading instead of screenshots',
    'Pay-per-use credits billed at Anthropic API cost',
    'Persistent chat history',
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/pricing`,
      description: '$0.20 in Claude credits, all three models, no card required',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '9.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/pricing`,
      description: '$11 in Claude credits per month (+10% bonus)',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '9.99',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
        billingIncrement: 1,
      },
    },
    {
      '@type': 'Offer',
      name: 'Premium',
      price: '29.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/pricing`,
      description: '$35 in Claude credits per month (+17% bonus)',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '29.99',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
        billingIncrement: 1,
      },
    },
    {
      '@type': 'Offer',
      name: 'Ultra',
      price: '59.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/pricing`,
      description: '$70 in Claude credits per month (+17% bonus)',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '59.99',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
        billingIncrement: 1,
      },
    },
  ],
}

export function breadcrumbNode(items: Array<{ name: string; url: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return { '@context': 'https://schema.org', ...breadcrumbNode(items) }
}

export interface ListicleItem {
  position: number
  name: string
  description: string
  url: string
  /** Lowest advertised price for the product, as a decimal string. '0' for a real free tier. */
  price: string
}

/**
 * Emits an ordered ItemList in Google's "all items on one page" form: each
 * ListItem carries `position` plus a fully typed nested `item` and no per-item
 * URL, because every entry is described on this page rather than a separate one.
 * A bare name/url ListItem is not enough for Google to read a listicle as a
 * ranked set.
 */
export function listicleItemListNode(params: {
  name: string
  description: string
  url: string
  items: ListicleItem[]
}) {
  return {
    '@type': 'ItemList',
    name: params.name,
    description: params.description,
    url: params.url,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: params.items.length,
    itemListElement: params.items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      item: {
        '@type': 'SoftwareApplication',
        name: item.name,
        description: item.description,
        applicationCategory: 'BrowserApplication',
        operatingSystem: 'Chrome',
        url: item.url,
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  }
}

/**
 * For the free interactive calculators under /tools. WebApplication is the
 * accurate type — these run in the browser and require no install — and it
 * needs no rating, unlike the SoftwareApplication rich result.
 */
export function webToolNode(params: { name: string; description: string; path: string }) {
  return {
    '@type': 'WebApplication',
    name: params.name,
    description: params.description,
    url: `${BASE_URL}${params.path}`,
    applicationCategory: 'BusinessApplication',
    browserRequirements: 'Requires JavaScript',
    operatingSystem: 'All',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    publisher: organizationRef,
  }
}

export function blogPostingJsonLd(post: {
  slug: string
  title: string
  description: string
  date: string
  lastModified?: string
  category: string
  keywords: string[]
  content: string
}) {
  const url = `${BASE_URL}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.description,
    image: [`${BASE_URL}/og-image.png`],
    datePublished: post.date,
    dateModified: post.lastModified ?? post.date,
    author: {
      '@type': 'Person',
      name: 'Thanos Kazakis',
      url: 'https://github.com/ThanosKa',
    },
    publisher: organizationNode,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    articleSection: post.category,
    keywords: post.keywords.join(', '),
    wordCount: post.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'Blog', '@id': `${BASE_URL}/blog#blog`, name: 'Prophet Blog' },
  }
}

export function graphJsonLd(nodes: Array<Record<string, unknown>>) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}

export { BASE_URL, CHROME_STORE_LISTING }
