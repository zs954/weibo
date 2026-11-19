import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { providerPlugin } from "./server/plugin.ts"

export default defineConfig({
  plugins: [react(), tailwindcss(), providerPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 4317,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4317,
    strictPort: true,
  },
})
