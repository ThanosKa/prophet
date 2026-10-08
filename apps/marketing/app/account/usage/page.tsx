'use client'

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, RotateCcw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO } from "date-fns"
import { z } from "zod"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { dailyUsagePageSchema, type DailyUsagePage } from "@prophet/shared"

const DAYS_PER_PAGE_OPTIONS = [7, 14, 30, 90] as const

const usageResponseSchema = z.object({ data: dailyUsagePageSchema })

type UsageState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; page: DailyUsagePage }

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(1) + 'M'
  }
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1) + 'K'
  }
  return tokens.toString()
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageState>({ status: "loading" })
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [daysPerPage, setDaysPerPage] = useState<number>(DAYS_PER_PAGE_OPTIONS[0])
  // `before` cursors of every page newer than the one shown; empty on the newest page.
  const [cursors, setCursors] = useState<string[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const before = cursors.at(-1)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ days: daysPerPage.toString() })
    if (before) params.append("before", before)
    // The table groups by UTC day, so the days picked are sent as UTC days.
    if (dateRange?.from) params.append("from", format(dateRange.from, "yyyy-MM-dd"))
    if (dateRange?.to) params.append("to", format(dateRange.to, "yyyy-MM-dd"))

    async function loadUsage() {
      setUsage({ status: "loading" })
      try {
        const response = await fetch(`/api/usage?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Usage request failed with ${response.status}`)
        const body: unknown = await response.json()
        const parsed = usageResponseSchema.safeParse(body)
        if (!parsed.success) throw new Error("Usage response did not match the expected shape")
        setUsage({ status: "success", page: parsed.data.data })
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("Failed to fetch usage:", err)
        setUsage({ status: "error" })
      }
    }

    loadUsage()
    return () => controller.abort()
  }, [before, daysPerPage, dateRange, reloadKey])

  const showOlderDays = () => {
    if (usage.status !== "success" || !usage.page.nextBefore) return
    const nextBefore = usage.page.nextBefore
    setCursors(previous => [...previous, nextBefore])
  }

  const showNewerDays = () => setCursors(previous => previous.slice(0, -1))

  const handleExport = () => {
    const params = new URLSearchParams()
    if (dateRange?.from) params.append("from", dateRange.from.toISOString())
    if (dateRange?.to) params.append("to", dateRange.to.toISOString())
    window.location.href = `/api/usage/export?${params.toString()}`
  }

  const handleReset = () => {
    setDateRange(undefined)
    setCursors([])
  }

  const setQuickFilter = (days: number) => {
    const now = new Date()
    const from = new Date()
    from.setDate(now.getDate() - days)
    setDateRange({ from, to: now })
    setCursors([])
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    setCursors([])
  }

  const handleDaysPerPageChange = (value: string) => {
    setDaysPerPage(Number(value))
    setCursors([])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight">Usage History</h2>
          <p className="text-muted-foreground">
            Daily totals per model. Days are in UTC.
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-medium min-w-[200px]"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, y")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-1 border rounded-md p-1">
                  <Button
                    variant={dateRange?.from && Math.abs((dateRange.to?.getTime() || 0) - dateRange.from.getTime()) < 2 * 24 * 60 * 60 * 1000 ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setQuickFilter(1)}
                  >
                    1d
                  </Button>
                  <Button
                    variant={dateRange?.from && Math.abs((dateRange.to?.getTime() || 0) - dateRange.from.getTime()) >= 6 * 24 * 60 * 60 * 1000 && Math.abs((dateRange.to?.getTime() || 0) - dateRange.from.getTime()) < 8 * 24 * 60 * 60 * 1000 ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setQuickFilter(7)}
                  >
                    7d
                  </Button>
                  <Button
                    variant={dateRange?.from && Math.abs((dateRange.to?.getTime() || 0) - dateRange.from.getTime()) >= 29 * 24 * 60 * 60 * 1000 ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setQuickFilter(30)}
                  >
                    30d
                  </Button>
                </div>
                {dateRange && (
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Clear date range"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Day (UTC)</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Turns</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-busy={usage.status === "loading"}>
                {usage.status === "loading" ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : usage.status === "error" ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div role="alert" className="flex flex-col items-center gap-2 text-muted-foreground">
                        <p>We couldn&apos;t load your usage.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="active:bg-accent/70"
                          onClick={() => setReloadKey(key => key + 1)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                          Try again
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : usage.page.rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {dateRange
                        ? "No usage in this date range."
                        : "No usage yet. Your daily totals appear here after your first question."}
                    </TableCell>
                  </TableRow>
                ) : (
                  usage.page.rows.map((row, index) => (
                    <motion.tr
                      key={`${row.day}-${row.model}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.03 }}
                      className="border-b last:border-b-0"
                    >
                      <TableCell className="font-medium text-xs">
                        {format(parseISO(row.day), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/5">
                          {row.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {row.turns.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className="text-right text-xs font-medium"
                        title={`Input ${row.inputTokens.toLocaleString()} · Cache write ${row.cacheWriteTokens.toLocaleString()} · Cache read ${row.cacheReadTokens.toLocaleString()} · Output ${row.outputTokens.toLocaleString()}`}
                      >
                        {formatTokens(row.tokens)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {row.credits.toLocaleString()}
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>

            <nav
              aria-label="Usage pages"
              className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <span id="days-per-page-label" className="text-sm text-muted-foreground">Days per page:</span>
                <Select value={daysPerPage.toString()} onValueChange={handleDaysPerPageChange}>
                  <SelectTrigger className="w-[80px] h-8" aria-labelledby="days-per-page-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="active:bg-accent/70"
                  onClick={showNewerDays}
                  disabled={usage.status === "loading" || cursors.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Newer days
                </Button>
                <span className="text-sm font-medium w-16 text-center" aria-live="polite">
                  Page {cursors.length + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="active:bg-accent/70"
                  onClick={showOlderDays}
                  disabled={usage.status !== "success" || usage.page.nextBefore === null}
                >
                  Older days
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
