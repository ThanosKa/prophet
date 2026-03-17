export interface SEOPageData {
  slug: string
  title: string
  keyword: string
  h1: string
  description: string
}

export interface UseCaseData extends SEOPageData {
  painPoints: string[]
  features: string[]
  examplePrompts: string[]
  relatedSlugs: string[]
}

export interface ProfessionData extends SEOPageData {
  scenarios: Array<{ title: string; description: string }>
  relatedUseCases: string[]
  recommendedModel: 'haiku' | 'sonnet' | 'opus'
  typicalSessionCost: string
}

export interface ComparisonData extends SEOPageData {
  competitor: string
  featureMatrix: Array<{ feature: string; prophet: string; competitor: string }>
  prophetAdvantages: string[]
  competitorAdvantages: string[]
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

export const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif'
export const BASE_URL = 'https://prophetchrome.com'
