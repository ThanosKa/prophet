'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowUpDown } from 'lucide-react'

type Speed = 'Fast' | 'Medium' | 'Slow'

interface Model {
  name: string
  provider: string
  inputPrice: number
  outputPrice: number
  contextWindow: string
  contextWindowNum: number
  speed: Speed
  bestFor: string
}

const MODELS: Model[] = [
  {
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    inputPrice: 1,
    outputPrice: 5,
    contextWindow: '200K',
    contextWindowNum: 200000,
    speed: 'Fast',
    bestFor: 'Quick tasks, summarization, simple Q&A',
  },
  {
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: '200K',
    contextWindowNum: 200000,
    speed: 'Medium',
    bestFor: 'Balanced coding, analysis, writing',
  },
  {
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    inputPrice: 5,
    outputPrice: 25,
    contextWindow: '200K',
    contextWindowNum: 200000,
    speed: 'Slow',
    bestFor: 'Complex reasoning, research, deep analysis',
  },
  {
    name: 'GPT-4o',
    provider: 'OpenAI',
    inputPrice: 2.5,
    outputPrice: 10,
    contextWindow: '128K',
    contextWindowNum: 128000,
    speed: 'Fast',
    bestFor: 'General purpose, multimodal tasks',
  },
  {
    name: 'GPT-4.5',
    provider: 'OpenAI',
    inputPrice: 75,
    outputPrice: 150,
    contextWindow: '128K',
    contextWindowNum: 128000,
    speed: 'Slow',
    bestFor: 'Advanced reasoning, creative writing',
  },
  {
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    inputPrice: 1.25,
    outputPrice: 10,
    contextWindow: '1M',
    contextWindowNum: 1000000,
    speed: 'Medium',
    bestFor: 'Long context, large document analysis',
  },
  {
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    inputPrice: 0.15,
    outputPrice: 0.60,
    contextWindow: '1M',
    contextWindowNum: 1000000,
    speed: 'Fast',
    bestFor: 'High-volume tasks, low-cost inference',
  },
]

type SortKey = 'name' | 'provider' | 'inputPrice' | 'outputPrice' | 'contextWindowNum' | 'speed' | 'bestFor'

const speedOrder: Record<Speed, number> = { Fast: 0, Medium: 1, Slow: 2 }

export default function AiModelComparisonPage() {
  const [sortKey, setSortKey] = useState<SortKey>('inputPrice')
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sorted = useMemo(() => {
    return [...MODELS].sort((a, b) => {
      let cmp: number
      if (sortKey === 'speed') {
        cmp = speedOrder[a.speed] - speedOrder[b.speed]
      } else if (typeof a[sortKey] === 'number') {
        cmp = (a[sortKey] as number) - (b[sortKey] as number)
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]))
      }
      return sortAsc ? cmp : -cmp
    })
  }, [sortKey, sortAsc])

  const SortableHead = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {sortKey === field && (
          <span className="text-xs">{sortAsc ? '\u2191' : '\u2193'}</span>
        )}
      </span>
    </TableHead>
  )

  const speedVariant = (speed: Speed) => {
    if (speed === 'Fast') return 'default' as const
    if (speed === 'Medium') return 'secondary' as const
    return 'outline' as const
  }

  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">AI Model Comparison Table</h1>
            <p className="text-lg text-muted-foreground">
              Compare pricing, speed, and capabilities of major AI models. Click any column header to sort.
            </p>
            <p className="text-xs text-muted-foreground mt-2">Last updated: March 2026</p>
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Model" field="name" />
                  <SortableHead label="Provider" field="provider" />
                  <SortableHead label="Input $/MTok" field="inputPrice" />
                  <SortableHead label="Output $/MTok" field="outputPrice" />
                  <SortableHead label="Context" field="contextWindowNum" />
                  <SortableHead label="Speed" field="speed" />
                  <SortableHead label="Best For" field="bestFor" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m) => (
                  <TableRow key={m.name}>
                    <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.provider}</TableCell>
                    <TableCell className="font-mono">${m.inputPrice}</TableCell>
                    <TableCell className="font-mono">${m.outputPrice}</TableCell>
                    <TableCell className="font-mono">{m.contextWindow}</TableCell>
                    <TableCell>
                      <Badge variant={speedVariant(m.speed)}>{m.speed}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px]">{m.bestFor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Prices reflect published API rates as of March 2026. Actual costs may vary based on caching, batching, and provider-specific discounts.
          </p>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Use Claude models in your browser with Prophet</h2>
          <p className="text-muted-foreground mb-6">
            Access Claude Haiku, Sonnet, and Opus right in your browser side panel. Pay only for what you use.
          </p>
          <Button asChild>
            <Link href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif">
              Add to Chrome
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
