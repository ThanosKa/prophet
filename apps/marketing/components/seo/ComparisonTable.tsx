import { Check, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ComparisonTableProps {
  features: Array<{ feature: string; prophet: string; competitor: string }>
  competitorName: string
}

function CellContent({ value }: { value: string }) {
  if (value === 'true' || value === 'yes') {
    return <Check className="h-5 w-5 text-primary" />
  }
  if (value === 'false' || value === 'no') {
    return <X className="h-5 w-5 text-muted-foreground" />
  }
  return <span>{value}</span>
}

export function ComparisonTable({ features, competitorName }: ComparisonTableProps) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Feature</TableHead>
                <TableHead className="w-[30%]">Prophet</TableHead>
                <TableHead className="w-[30%]">{competitorName}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  <TableCell>
                    <CellContent value={row.prophet} />
                  </TableCell>
                  <TableCell>
                    <CellContent value={row.competitor} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}
