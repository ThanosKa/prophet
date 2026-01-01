'use client'

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, RotateCcw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import type { UsageRecord } from "@prophet/shared"

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 500] as const

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
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  const fetchUsage = useCallback(async (page: number = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.append("limit", rowsPerPage.toString())
    params.append("offset", ((page - 1) * rowsPerPage).toString())
    if (dateRange?.from) params.append("from", dateRange.from.toISOString())
    if (dateRange?.to) params.append("to", dateRange.to.toISOString())

    try {
      const response = await fetch(`/api/usage?${params.toString()}`)
      const data = await response.json()
      if (data.data) {
        setRecords(data.data.records)
        setTotalRecords(data.data.pagination?.total || data.data.records.length)
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err)
    } finally {
      setLoading(false)
    }
  }, [dateRange, rowsPerPage])

  useEffect(() => {
    fetchUsage(currentPage)
  }, [currentPage, fetchUsage])

  const handleExport = () => {
    const params = new URLSearchParams()
    if (dateRange?.from) params.append("from", dateRange.from.toISOString())
    if (dateRange?.to) params.append("to", dateRange.to.toISOString())
    window.location.href = `/api/usage/export?${params.toString()}`
  }

  const handleReset = () => {
    setDateRange(undefined)
    setCurrentPage(1)
  }

  const handleFilter = () => {
    setCurrentPage(1)
    fetchUsage(1)
  }

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value))
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalRecords / rowsPerPage)

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
            Monitor your API usage and costs.
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleFilter}>
                  Filter
                </Button>
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="icon"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: Math.min(rowsPerPage, 10) }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No usage records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border-b last:border-b-0"
                    >
                      <TableCell className="font-medium text-xs">
                        {format(new Date(record.createdAt), "MMMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/5">
                          {record.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatTokens(record.inputTokens + record.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        ${(record.costCents / 100).toFixed(4)}
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>

            {!loading && records.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.3 }}
                className="flex items-center justify-between border-t px-4 py-4"
              >
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * rowsPerPage + 1, totalRecords)}-{Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords} records
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                      <SelectTrigger className="w-[80px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROWS_PER_PAGE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option.toString()}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-20 text-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
