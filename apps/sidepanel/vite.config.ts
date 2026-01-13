import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import manifest from "./manifest";

export default defineConfig({
  plugins: [tailwindcss(), react(), crx({ manifest })] as PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
    chunkSizeWarningLimit: 3000, // Clerk auth SDK is large but necessary for session management
    // rollupOptions: {
    //   output: {
    //     manualChunks: (id) => {
    //       if (!id.includes('node_modules')) {
    //         return
    //       }

    //       if (id.includes('react') || id.includes('react-dom')) {
    //         return 'vendor-react'
    //       }

    //       if (id.includes('@radix-ui')) {
    //         return 'vendor-radix'
    //       }

    //       if (id.includes('@clerk')) {
    //         return 'vendor-clerk'
    //       }

    //       if (id.includes('framer-motion')) {
    //         return 'vendor-framer'
    //       }

    //       if (
    //         id.includes('@tanstack') ||
    //         id.includes('zustand') ||
    //         id.includes('zod')
    //       ) {
    //         return 'vendor-state'
    //       }

    //       if (
    //         id.includes('lucide-react') ||
    //         id.includes('react-markdown') ||
    //         id.includes('react-syntax-highlighter') ||
    //         id.includes('remark-gfm')
    //       ) {
    //         return 'vendor-ui-utils'
    //       }

    //       return 'vendor-misc'
    //     },
    //   },
    // },
  },
});
