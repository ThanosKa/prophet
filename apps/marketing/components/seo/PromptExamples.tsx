'use client'

import { useState } from 'react'
import { Copy, CheckCheck } from 'lucide-react'

interface PromptExamplesProps {
  prompts: string[]
}

export function PromptExamples({ prompts }: PromptExamplesProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  async function handleCopy(prompt: string, index: number) {
    await navigator.clipboard.writeText(prompt)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
          Example Prompts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleCopy(prompt, index)}
              className="group relative p-4 rounded-lg bg-card border text-left transition-colors hover:bg-muted/50"
            >
              <p className="text-sm pr-8">{prompt}</p>
              <div className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition-colors">
                {copiedIndex === index ? (
                  <CheckCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
