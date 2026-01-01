'use client'

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { UsageRecord } from "@prophet/shared"

const ITEMS_PER_PAGE = 10

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1) + 'K'
  }
  return tokens.toString()
}

export default function UsagePage() {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchUsage = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (fromFilter) params.append("from", fromFilter)
    if (toFilter) params.append("to", toFilter)

    try {
      const response = await fetch(`/api/usage?${params.toString()}`)
      const data = await response.json()
      if (data.data) {
        setRecords(data.data.records)
        setCurrentPage(1)
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
    if (fromFilter) params.append("from", fromFilter)
    if (toFilter) params.append("to", toFilter)
    window.location.href = `/api/usage/export?${params.toString()}`
  }

  const handleReset = () => {
    setFromFilter("")
    setToFilter("")
    setCurrentPage(1)
    fetchUsage()
  }

  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE)

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
            Monitor your AI credit consumption and token usage.
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          className="transition-all duration-200 hover:shadow-md active:scale-95"
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
        <Card className="border hover:shadow-sm transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium">From</label>
                <Input
                  type="date"
                  value={fromFilter}
                  onChange={(e) => setFromFilter(e.target.value)}
                  className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium">To</label>
                <Input
                  type="date"
                  value={toFilter}
                  onChange={(e) => setToFilter(e.target.value)}
                  className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={fetchUsage}
                  className="transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Filter
                </Button>
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="icon"
                  className="transition-all duration-200 hover:bg-muted active:scale-95"
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
        <Card className="border hover:shadow-sm transition-shadow duration-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens (In/Out)</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
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
                  paginatedRecords.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-muted/50 transition-colors duration-150"
                    >
                      <TableCell className="font-medium text-xs">
                        {new Date(record.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/5">
                          {record.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatTokens(record.inputTokens)} / {formatTokens(record.outputTokens)}
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
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, records.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, records.length)} of {records.length} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="transition-all duration-200 hover:shadow-sm active:scale-95 disabled:opacity-50"
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
                    className="transition-all duration-200 hover:shadow-sm active:scale-95 disabled:opacity-50"
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
