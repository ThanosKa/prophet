'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, Filter, RotateCcw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface UsageRecord {
  id: string
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  createdAt: string
}

export default function UsagePage() {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modelFilter, setModelFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")

  const fetchUsage = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (modelFilter) params.append("model", modelFilter)
    if (fromFilter) params.append("from", fromFilter)
    if (toFilter) params.append("to", toFilter)

    try {
      const response = await fetch(`/api/usage?${params.toString()}`)
      const data = await response.json()
      if (data.data) {
        setRecords(data.data.records)
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [])

  const handleExport = () => {
    const params = new URLSearchParams()
    if (modelFilter) params.append("model", modelFilter)
    if (fromFilter) params.append("from", fromFilter)
    if (toFilter) params.append("to", toFilter)
    window.location.href = `/api/usage/export?${params.toString()}`
  }

  const handleReset = () => {
    setModelFilter("")
    setFromFilter("")
    setToFilter("")
    // Fetch will happen via useEffect if we add these as dependencies, but better to call manually
    fetchUsage()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight">Usage History</h2>
          <p className="text-muted-foreground">
            Monitor your AI credit consumption and token usage across different models.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Model</label>
              <Input
                placeholder="claude-..."
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">From</label>
              <Input
                type="date"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">To</label>
              <Input
                type="date"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchUsage} className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button onClick={handleReset} variant="ghost" size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tokens (In/Out)</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No usage records found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium text-xs">
                      {new Date(record.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {record.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {record.inputTokens.toLocaleString()} / {record.outputTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${(record.costCents / 100).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

