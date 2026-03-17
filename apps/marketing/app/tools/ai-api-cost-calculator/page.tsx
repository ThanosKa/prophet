'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const MODELS = {
  'claude-haiku': { name: 'Claude Haiku 4.5', provider: 'Anthropic', input: 1, output: 5 },
  'claude-sonnet': { name: 'Claude Sonnet 4.6', provider: 'Anthropic', input: 3, output: 15 },
  'claude-opus': { name: 'Claude Opus 4.6', provider: 'Anthropic', input: 5, output: 25 },
  'gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', input: 2.5, output: 10 },
  'gpt-4.5': { name: 'GPT-4.5', provider: 'OpenAI', input: 75, output: 150 },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'Google', input: 1.25, output: 10 },
} as const

type ModelKey = keyof typeof MODELS

const PROPHET_MARKUP = 1.20

const AVG_TOKENS_MAP = {
  short: { input: 200, output: 300 },
  medium: { input: 500, output: 800 },
  long: { input: 1500, output: 2000 },
} as const

export default function AiApiCostCalculatorPage() {
  const [model, setModel] = useState<ModelKey>('claude-sonnet')
  const [inputMode, setInputMode] = useState<'tokens' | 'messages'>('tokens')
  const [inputTokens, setInputTokens] = useState(1000)
  const [outputTokens, setOutputTokens] = useState(500)
  const [messageCount, setMessageCount] = useState(10)
  const [avgLength, setAvgLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [requestsPerDay, setRequestsPerDay] = useState(10)

  const effectiveTokens = useMemo(() => {
    if (inputMode === 'tokens') {
      return { input: inputTokens, output: outputTokens }
    }
    const avg = AVG_TOKENS_MAP[avgLength]
    return { input: avg.input, output: avg.output }
  }, [inputMode, inputTokens, outputTokens, avgLength])

  const pricing = MODELS[model]

  const rawCostPerRequest = useMemo(() => {
    const inputCost = (effectiveTokens.input / 1_000_000) * pricing.input
    const outputCost = (effectiveTokens.output / 1_000_000) * pricing.output
    return inputCost + outputCost
  }, [effectiveTokens, pricing])

  const prophetCostPerRequest = rawCostPerRequest * PROPHET_MARKUP

  const effectiveRequestsPerDay = inputMode === 'messages' ? messageCount : requestsPerDay

  const rawMonthlyCost = rawCostPerRequest * effectiveRequestsPerDay * 30
  const prophetMonthlyCost = prophetCostPerRequest * effectiveRequestsPerDay * 30

  const formatUSD = (val: number) => {
    if (val < 0.001) return `$${val.toFixed(6)}`
    if (val < 0.01) return `$${val.toFixed(4)}`
    return `$${val.toFixed(2)}`
  }

  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">AI API Cost Calculator</h1>
            <p className="text-lg text-muted-foreground">
              Calculate the exact cost of AI API calls across major providers.
            </p>
            <p className="text-xs text-muted-foreground mt-2">Last updated: March 2026</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={(v) => setModel(v as ModelKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODELS).map(([key, m]) => (
                        <SelectItem key={key} value={key}>
                          {m.name} ({m.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Input method</Label>
                  <Select value={inputMode} onValueChange={(v) => setInputMode(v as 'tokens' | 'messages')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tokens">Token count</SelectItem>
                      <SelectItem value="messages">Message count + length</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inputMode === 'tokens' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Input tokens per request</Label>
                      <Input
                        type="number"
                        min={0}
                        value={inputTokens}
                        onChange={(e) => setInputTokens(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Output tokens per request</Label>
                      <Input
                        type="number"
                        min={0}
                        value={outputTokens}
                        onChange={(e) => setOutputTokens(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Requests per day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={requestsPerDay}
                        onChange={(e) => setRequestsPerDay(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Messages per day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={messageCount}
                        onChange={(e) => setMessageCount(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Average message length</Label>
                      <Select value={avgLength} onValueChange={(v) => setAvgLength(v as 'short' | 'medium' | 'long')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short (~200 in / ~300 out tokens)</SelectItem>
                          <SelectItem value="medium">Medium (~500 in / ~800 out tokens)</SelectItem>
                          <SelectItem value="long">Long (~1,500 in / ~2,000 out tokens)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Input tokens</TableCell>
                      <TableCell className="text-right font-mono">{effectiveTokens.input.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Output tokens</TableCell>
                      <TableCell className="text-right font-mono">{effectiveTokens.output.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Input price</TableCell>
                      <TableCell className="text-right font-mono">${pricing.input}/MTok</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Output price</TableCell>
                      <TableCell className="text-right font-mono">${pricing.output}/MTok</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-right">Raw API</TableHead>
                      <TableHead className="text-right">With Prophet (20%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Per request</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(rawCostPerRequest)}</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(prophetCostPerRequest)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Monthly ({effectiveRequestsPerDay}/day)</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(rawMonthlyCost)}</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(prophetMonthlyCost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Prophet vs Claude Pro Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">With Prophet</p>
                  <p className="text-2xl font-bold">{formatUSD(prophetMonthlyCost)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Pay only for what you use</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Claude Pro Subscription</p>
                  <p className="text-2xl font-bold">$20.00<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Fixed monthly fee with usage limits</p>
                </div>
              </div>
              {prophetMonthlyCost < 20 ? (
                <p className="text-sm text-muted-foreground mt-4">
                  At your current usage, Prophet saves you <strong className="text-foreground">{formatUSD(20 - prophetMonthlyCost)}/mo</strong> compared to a Claude Pro subscription.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-4">
                  At this usage level, a Claude Pro subscription may be more cost-effective. Prophet is best for light to moderate use.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">All Models: Cost per Request</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Input $/MTok</TableHead>
                    <TableHead className="text-right">Output $/MTok</TableHead>
                    <TableHead className="text-right">Cost/Request</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(MODELS).map(([key, m]) => {
                    const reqCost = (effectiveTokens.input / 1_000_000) * m.input + (effectiveTokens.output / 1_000_000) * m.output
                    const monthly = reqCost * PROPHET_MARKUP * effectiveRequestsPerDay * 30
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-muted-foreground">{m.provider}</TableCell>
                        <TableCell className="text-right font-mono">${m.input}</TableCell>
                        <TableCell className="text-right font-mono">${m.output}</TableCell>
                        <TableCell className="text-right font-mono">{formatUSD(reqCost * PROPHET_MARKUP)}</TableCell>
                        <TableCell className="text-right font-mono">{formatUSD(monthly)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                Costs include Prophet&apos;s 20% platform fee. Based on {effectiveTokens.input.toLocaleString()} input + {effectiveTokens.output.toLocaleString()} output tokens per request, {effectiveRequestsPerDay} requests/day.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Start using these models in your browser with Prophet</h2>
          <p className="text-muted-foreground mb-6">
            Access Claude Haiku, Sonnet, and Opus directly in your browser side panel. Free plan included.
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
