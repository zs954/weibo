import "@fontsource/noto-sans-sc/chinese-simplified-400.css"
import "@fontsource/noto-sans-sc/chinese-simplified-500.css"
import "@fontsource/noto-sans-sc/chinese-simplified-700.css"
import "@fontsource/noto-sans-sc/latin-400.css"
import "@fontsource/noto-sans-sc/latin-700.css"
import "@fontsource/noto-serif-sc/chinese-simplified-700.css"
import "@fontsource/noto-serif-sc/latin-700.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "sonner/dist/styles.css"
import App from "./App.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
