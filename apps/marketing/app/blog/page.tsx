import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | Prophet',
  description: 'News, updates, and insights from the Prophet team.',
}

const posts = [
  {
    title: 'Introducing Prophet: AI Assistant in Your Browser',
    excerpt: 'We\'re excited to announce the launch of Prophet, bringing Claude AI directly to your Chrome browser.',
    date: 'January 15, 2026',
    category: 'Announcement',
    slug: 'introducing-prophet',
  },
  {
    title: 'How to Get the Most Out of Prophet',
    excerpt: 'Tips and tricks for using Prophet effectively to boost your productivity.',
    date: 'January 10, 2026',
    category: 'Tutorial',
    slug: 'how-to-get-most-out-of-prophet',
  },
  {
    title: 'Understanding the Credit System',
    excerpt: 'A detailed explanation of how Prophet\'s credit-based pricing works and why it\'s fair.',
    date: 'January 5, 2026',
    category: 'Guide',
    slug: 'understanding-credit-system',
  },
]

export default function BlogPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Blog</h1>
            <p className="text-lg text-muted-foreground">
              News, updates, and insights from the Prophet team
            </p>
          </div>

          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.slug} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
                    <span className="text-sm text-muted-foreground">{post.date}</span>
                  </div>
                  <CardTitle className="text-2xl">{post.title}</CardTitle>
                  <CardDescription className="text-base">{post.excerpt}</CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={`/blog/${post.slug}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Read more →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center text-muted-foreground">
            <p>More blog posts coming soon!</p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
