import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { InstallCta } from '@/components/InstallCta'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { blogPostingJsonLd, breadcrumbNode, graphJsonLd } from '@/lib/structured-data'
import { faqNode } from '@/lib/faqs'
import { getBlogPost, getAllBlogPosts } from '@/lib/blog'
import { redirectedPaths } from '@/lib/seo/pruned.mjs'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  // `absolute` drops the "| Prophet" template suffix. Prophet has almost no brand
  // search volume, so those 10 characters are better spent on the query phrase
  // before Google truncates the SERP title at roughly 60 characters.
  return {
    title: { absolute: post.title },
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://prophetchrome.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/og-image.png'],
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const allOthers = getAllBlogPosts().filter(
    (p) => p.slug !== post.slug && !redirectedPaths.has(`/blog/${p.slug}`)
  )
  const sameCategory = allOthers.filter((p) => p.category === post.category)
  const sharedKeyword = (a: string[], b: string[]) => a.some((k) => b.includes(k))
  const byKeyword = allOthers.filter(
    (p) => p.category !== post.category && sharedKeyword(p.keywords, post.keywords)
  )
  const relatedPosts = [...sameCategory, ...byKeyword].slice(0, 4)

  const jsonLd = graphJsonLd([
    blogPostingJsonLd(post),
    breadcrumbNode([
      { name: 'Home', url: 'https://prophetchrome.com' },
      { name: 'Blog', url: 'https://prophetchrome.com/blog' },
      { name: post.title, url: `https://prophetchrome.com/blog/${post.slug}` },
    ]),
    ...(post.faq && post.faq.length > 0 ? [faqNode(post.faq)] : []),
  ])

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <article className="py-20 flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-8 text-sm text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <span className="mx-2">/</span>
            <span>{post.title}</span>
          </nav>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              <span className="text-sm text-muted-foreground">{post.readingTime}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</h1>
            <time className="text-sm text-muted-foreground" dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </header>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.faq && post.faq.length > 0 && (
            <section className="mt-16 pt-12 border-t">
              <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
              <div className="space-y-8">
                {post.faq.map((item) => (
                  <div key={item.question}>
                    <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <InstallCta
            className="mt-16 py-12"
            title="Try Prophet Free"
            description="Access Claude Haiku, Sonnet, and Opus directly in your browser side panel with pay-per-use pricing."
          />

          {relatedPosts.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedPosts.map((related) => (
                  <Link key={related.slug} href={`/blog/${related.slug}`} className="group">
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader>
                        <Badge variant="secondary" className="w-fit mb-2">{related.category}</Badge>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {related.title}
                        </CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {related.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
      <Footer />
    </main>
  )
}
