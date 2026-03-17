'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

const PROPHET_MARKUP = 1.20

const MODEL_OPTIONS = {
  'claude-haiku': { name: 'Claude Haiku 4.5', input: 1, output: 5 },
  'claude-sonnet': { name: 'Claude Sonnet 4.6', input: 3, output: 15 },
  'claude-opus': { name: 'Claude Opus 4.6', input: 5, output: 25 },
  'gpt-4o': { name: 'GPT-4o', input: 2.5, output: 10 },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', input: 1.25, output: 10 },
} as const

type ModelKey = keyof typeof MODEL_OPTIONS

const LENGTH_TOKENS = {
  short: { input: 200, output: 300, label: 'Short (~200 in / ~300 out tokens)' },
  medium: { input: 500, output: 800, label: 'Medium (~500 in / ~800 out tokens)' },
  long: { input: 1500, output: 2000, label: 'Long (~1,500 in / ~2,000 out tokens)' },
} as const

type LengthKey = keyof typeof LENGTH_TOKENS

interface Service {
  name: string
  monthly: number
  type: 'fixed' | 'usage'
  note: string
}

const SERVICES: Service[] = [
  { name: 'ChatGPT Plus', monthly: 20, type: 'fixed', note: 'GPT-4o with limits' },
  { name: 'Claude Pro', monthly: 20, type: 'fixed', note: 'Sonnet/Opus with limits' },
  { name: 'Gemini Advanced', monthly: 20, type: 'fixed', note: 'Gemini 2.5 Pro with limits' },
  { name: 'Perplexity Pro', monthly: 20, type: 'fixed', note: 'Search-focused AI' },
  {
    name: 'Prophet',
    monthly: 0,
    type: 'usage',
    note: 'Pay per use, no limits',
  },
]

export default function AiPricingComparisonPage() {
  const [messagesPerDay, setMessagesPerDay] = useState(15)
  const [msgLength, setMsgLength] = useState<LengthKey>('medium')
  const [selectedModel, setSelectedModel] = useState<ModelKey>('claude-sonnet')

  const tokens = LENGTH_TOKENS[msgLength]
  const model = MODEL_OPTIONS[selectedModel]

  const prophetMonthlyCost = useMemo(() => {
    const inputCost = (tokens.input / 1_000_000) * model.input
    const outputCost = (tokens.output / 1_000_000) * model.output
    const perRequest = (inputCost + outputCost) * PROPHET_MARKUP
    return perRequest * messagesPerDay * 30
  }, [messagesPerDay, tokens, model])

  const breakeven = useMemo(() => {
    const inputCost = (tokens.input / 1_000_000) * model.input
    const outputCost = (tokens.output / 1_000_000) * model.output
    const perRequest = (inputCost + outputCost) * PROPHET_MARKUP
    if (perRequest <= 0) return Infinity
    return Math.floor(20 / (perRequest * 30))
  }, [tokens, model])

  const services = useMemo(() => {
    return SERVICES.map((s) => ({
      ...s,
      cost: s.type === 'fixed' ? (s.monthly as number) : prophetMonthlyCost,
    })).sort((a, b) => a.cost - b.cost)
  }, [prophetMonthlyCost])

  const cheapest = services[0]?.cost ?? 0

  const formatUSD = (val: number) => {
    if (val < 0.01) return `$${val.toFixed(4)}`
    return `$${val.toFixed(2)}`
  }

  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">AI Subscription vs Pay-Per-Use</h1>
            <p className="text-lg text-muted-foreground">
              Find out whether a flat-rate subscription or pay-per-use pricing saves you more money.
            </p>
            <p className="text-xs text-muted-foreground mt-2">Last updated: March 2026</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Your Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Messages per day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={messagesPerDay}
                    onChange={(e) => setMessagesPerDay(Math.max(1, Math.min(500, Number(e.target.value))))}
                  />
                  <input
                    type="range"
                    min={1}
                    max={200}
                    value={messagesPerDay}
                    onChange={(e) => setMessagesPerDay(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Average message length</Label>
                  <Select value={msgLength} onValueChange={(v) => setMsgLength(v as LengthKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LENGTH_TOKENS).map(([key, t]) => (
                        <SelectItem key={key} value={key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred model (for Prophet)</Label>
                  <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ModelKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODEL_OPTIONS).map(([key, m]) => (
                        <SelectItem key={key} value={key}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Monthly Cost Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Monthly Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.name} className={s.cost === cheapest ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{s.name}</span>
                          <p className="text-xs text-muted-foreground">{s.note}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.type === 'fixed' ? 'outline' : 'secondary'}>
                          {s.type === 'fixed' ? 'Subscription' : 'Pay per use'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-base">
                        {formatUSD(s.cost)}
                      </TableCell>
                      <TableCell>
                        {s.cost === cheapest && (
                          <Badge variant="default">Cheapest</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Breakeven Point</CardTitle>
              </CardHeader>
              <CardContent>
                {breakeven === Infinity ? (
                  <p className="text-muted-foreground">Unable to calculate breakeven with current settings.</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold mb-2">{breakeven} messages/day</p>
                    <p className="text-sm text-muted-foreground">
                      Prophet is cheaper than a $20/mo subscription if you send fewer than {breakeven} {msgLength} messages per day using {model.name}.
                    </p>
                    {messagesPerDay < breakeven ? (
                      <p className="text-sm mt-3">
                        You send <strong>{messagesPerDay}</strong> messages/day, which is <strong>below</strong> the breakeven. Prophet saves you <strong>{formatUSD(20 - prophetMonthlyCost)}/mo</strong>.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-3">
                        At {messagesPerDay} messages/day, you are above the breakeven. A flat-rate subscription may be a better deal at this volume.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Prophet Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-2">{formatUSD(prophetMonthlyCost)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <Separator className="my-3" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{messagesPerDay} messages/day x 30 days = {messagesPerDay * 30} messages/mo</p>
                  <p>Model: {model.name}</p>
                  <p>~{tokens.input} input + ~{tokens.output} output tokens per message</p>
                  <p>Includes 20% platform fee</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">When is Prophet the Better Choice?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Fixed-price subscriptions like ChatGPT Plus and Claude Pro charge $20/mo regardless of how much you use them. This is great value for heavy users who send hundreds of messages daily, but most people use far less.
              </p>
              <p>
                Prophet&apos;s pay-per-use model means you only pay for the AI tokens you actually consume. For users sending fewer than {breakeven === Infinity ? 'many' : breakeven} {msgLength} messages/day with {model.name}, Prophet costs less than a subscription.
              </p>
              <p>
                Additionally, Prophet gives you browser automation capabilities that subscriptions do not include -- the AI can interact with web pages, fill forms, click buttons, and extract data directly from your browser.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Start with Prophet&apos;s free plan</h2>
          <p className="text-muted-foreground mb-6">
            Get $0.20 in free credits to try it out. No credit card required.
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
