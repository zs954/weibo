import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { providerPlugin } from "./server/plugin.ts"

const DEV_PORT = 4317

function portFromEnv(fallback: number): number {
  const raw = process.env.PORT
  if (raw === undefined || raw.trim() === "") return fallback
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback
  return port
}

export default defineConfig({
  plugins: [react(), tailwindcss(), providerPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: DEV_PORT,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: portFromEnv(DEV_PORT),
    strictPort: true,
    // Vite rejects unknown Host headers. Render's proxy uses *.onrender.com,
    // and gmailchao.xyz is the intended custom domain. localhost and IP hosts
    // stay allowed by Vite's defaults.
    allowedHosts: [".onrender.com", ".gmailchao.xyz"],
  },
})
