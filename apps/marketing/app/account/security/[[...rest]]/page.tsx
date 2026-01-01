'use client'

import { motion } from 'framer-motion'
import { UserProfile } from "@clerk/nextjs"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

export default function SecurityPage() {
  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="flex flex-col gap-2" variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight">Security & Settings</h2>
        <p className="text-muted-foreground">
          Manage your account security, passwords, and active sessions.
        </p>
      </motion.div>

      <motion.div
        className="flex justify-center border rounded-lg bg-card p-4 overflow-hidden"
        variants={itemVariants}
      >
        <UserProfile
          path="/account/security"
          routing="path"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-none w-full max-w-none",
              navbar: "hidden md:flex",
              scrollBox: "rounded-none",
            },
            variables: {
              borderRadius: '0.5rem',
            }
          }}
        />
      </motion.div>
    </motion.div>
  )
}

