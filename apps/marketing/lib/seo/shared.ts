import type { UseCaseSlug } from './use-cases'

export interface SEOPageData {
  slug: string
  title: string
  keyword: string
  h1: string
  description: string
}

export interface ProfessionData extends SEOPageData {
  scenarios: Array<{ title: string; description: string }>
  /** Rendered as links to /use-cases/{slug}, so only real use-case slugs are valid. */
  relatedUseCases: UseCaseSlug[]
  recommendedModel: 'haiku' | 'sonnet' | 'opus'
  typicalSessionCost: string
}

export interface GuideData extends SEOPageData {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  steps: Array<{ title: string; description: string }>
  proTips: string[]
  examplePrompts: string[]
  relatedSlugs: string[]
}

export interface IntegrationData extends SEOPageData {
  platform: string
  tasks: string[]
  examplePrompts: string[]
}

export interface IndustryData extends SEOPageData {
  challenges: string[]
  workflows: Array<{ title: string; description: string }>
  relatedProfessions: string[]
  relatedUseCases: string[]
}

export { BASE_URL, CHROME_STORE_URL } from '../constants'
