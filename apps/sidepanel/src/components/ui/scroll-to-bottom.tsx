import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScrollToBottomButtonProps {
  show: boolean
  onClick: () => void
  className?: string
}

export function ScrollToBottomButton({
  show,
  onClick,
  className,
}: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn('absolute bottom-4 right-4', className)}
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={onClick}
            className="h-8 w-8 rounded-full shadow-lg"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
