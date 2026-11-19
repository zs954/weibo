import { clipChars } from "./format"
import { mulberry32 } from "./rng"

export const POSTER_W = 1080
export const POSTER_H = 1440

export interface Palette {
  bg: string
  fg: string
  accent: string
  muted: string
  panel: string
  hint: string
}

export const PALETTES: Palette[] = [
  { bg: "#1a120e", fg: "#f6efe4", accent: "#e23b2f", muted: "#cbbba6", panel: "#2a211b", hint: "墨色底，朱砂红印章，米色大字。" },
  { bg: "#14241c", fg: "#f3f6f1", accent: "#d6b15e", muted: "#b7c4b8", panel: "#1d3328", hint: "松绿色底，淡金线条，象牙色标题。" },
  { bg: "#141a2e", fg: "#f4f1ea", accent: "#ffb085", muted: "#b7bfd4", panel: "#1e2744", hint: "靛蓝夜色，杏色标题，细白线。" },
  { bg: "#f3eadc", fg: "#1c1612", accent: "#c2410c", muted: "#7a6a5a", panel: "#e7d8c4", hint: "宣纸米色底，柿红色重点，墨色标题。" },
  { bg: "#2a1218", fg: "#f8efe8", accent: "#f0a7b5", muted: "#d7b7be", panel: "#3d1c26", hint: "绛紫底，浅粉色标题，细金线。" },
  { bg: "#0f2c33", fg: "#f2f7f6", accent: "#7ddec8", muted: "#b5ccc8", panel: "#164049", hint: "石青色底，浅青色强调，白字。" },
  { bg: "#221e1a", fg: "#fbf6ee", accent: "#e4c27a", muted: "#c9bfb0", panel: "#312b25", hint: "炭黑底，金色小字，暖白大标题。" },
  { bg: "#f7f1ea", fg: "#1e2430", accent: "#d3542c", muted: "#6d7380", panel: "#efe4d8", hint: "霜色纸底，柿子红块，深墨标题。" },
]

export interface PosterSpec {
  hook: string
  kicker: string
  theme: string
  layout: number
  palette: number
  seed: number
  index: number
  seal: string
}

const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif'
const SERIF = '"Noto Serif SC", "Noto Sans SC", "Songti SC", "WenQuanYi Micro Hei", "Droid Sans Fallback", serif'

async function prepareFonts(sample: string) {
  const faces = [`400 32px ${SANS}`, `500 28px ${SANS}`, `700 80px ${SANS}`, `700 96px ${SERIF}`]
  await Promise.all(faces.map((face) => document.fonts.load(face, sample).catch(() => [])))
  await document.fonts.ready
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ""
  for (const char of Array.from(text)) {
    const next = line + char
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = char
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function titleSize(text: string): number {
  const length = Array.from(text).length
  if (length <= 6) return 112
  if (length <= 8) return 96
  if (length <= 12) return 80
  return 68
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  color: string,
  align: CanvasTextAlign,
): number {
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = "top"
  ctx.font = `700 ${titleSize(text)}px ${SERIF}`
  const lines = wrap(ctx, text, maxWidth).slice(0, 3)
  const gap = titleSize(text) + 12
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * gap))
  return y + lines.length * gap
}

function drawTheme(
  ctx: CanvasRenderingContext2D,
  theme: string,
  x: number,
  y: number,
  maxWidth: number,
  color: string,
): number {
  ctx.fillStyle = color
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.font = `500 34px ${SANS}`
  const lines = wrap(ctx, clipChars(theme.replace(/\s+/g, ""), 32), maxWidth).slice(0, 2)
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * 50))
  return y + lines.length * 50
}

function seal(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, char: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(x, y, 54, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, 42, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = `700 46px ${SERIF}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(clipChars(char || "微", 1), x, y + 2)
  ctx.restore()
}

function grain(ctx: CanvasRenderingContext2D, seed: number) {
  const rand = mulberry32(seed || 1)
  ctx.save()
  for (let index = 0; index < 700; index += 1) {
    ctx.globalAlpha = 0.05 + rand() * 0.08
    ctx.fillStyle = rand() > 0.5 ? "#ffffff" : "#000000"
    ctx.fillRect(rand() * POSTER_W, rand() * POSTER_H, 2, 2)
  }
  ctx.restore()
}

function footer(ctx: CanvasRenderingContext2D, color: string, indexLabel: string, y = POSTER_H - 86) {
  ctx.fillStyle = color
  ctx.font = `500 26px ${SANS}`
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText("微博内容工坊", 88, y)
  ctx.textAlign = "right"
  ctx.fillText(indexLabel, POSTER_W - 88, y)
}

function kicker(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.font = `700 28px ${SANS}`
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(text, x, y)
  const width = ctx.measureText(text).width
  ctx.fillRect(x + width + 16, y - 16, 36, 4)
}

type Draw = (ctx: CanvasRenderingContext2D, palette: Palette, spec: PosterSpec) => void

const DRAW: Draw[] = [
  (ctx, palette, spec) => {
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    ctx.fillStyle = palette.accent
    ctx.fillRect(0, 0, 22, POSTER_H)
    kicker(ctx, spec.kicker, 88, 150, palette.accent)
    const y = drawTitle(ctx, spec.hook, 88, 210, 860, palette.fg, "left")
    ctx.strokeStyle = palette.muted
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(88, y + 20)
    ctx.lineTo(420, y + 20)
    ctx.stroke()
    drawTheme(ctx, spec.theme, 88, y + 52, 820, palette.muted)
    seal(ctx, 160, POSTER_H - 230, palette.accent, spec.seal)
    footer(ctx, palette.muted, String(spec.index).padStart(2, "0"))
  },
  (ctx, palette, spec) => {
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    ctx.fillStyle = palette.accent
    ctx.fillRect(0, 0, POSTER_W, 560)
    ctx.fillStyle = palette.bg
    ctx.font = `700 28px ${SANS}`
    ctx.textAlign = "left"
    ctx.fillText(spec.kicker, 88, 120)
    const y = drawTitle(ctx, spec.hook, 88, 620, 900, palette.fg, "left")
    drawTheme(ctx, spec.theme, 88, y + 28, 860, palette.muted)
    ctx.fillStyle = palette.panel
    ctx.beginPath()
    ctx.arc(920, 180, 120, 0, Math.PI * 2)
    ctx.fill()
    seal(ctx, 920, 1180, palette.accent, spec.seal)
    footer(ctx, palette.muted, String(spec.index).padStart(2, "0"))
  },
  (ctx, palette, spec) => {
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    ctx.strokeStyle = palette.panel
    ctx.lineWidth = 2
    for (const radius of [180, 280, 400]) {
      ctx.beginPath()
      ctx.arc(POSTER_W / 2, 430, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    seal(ctx, POSTER_W / 2, 430, palette.accent, spec.seal)
    ctx.textAlign = "center"
    ctx.fillStyle = palette.accent
    ctx.font = `700 28px ${SANS}`
    ctx.fillText(spec.kicker, POSTER_W / 2, 620)
    const y = drawTitle(ctx, spec.hook, POSTER_W / 2, 680, 820, palette.fg, "center")
    ctx.textAlign = "left"
    drawTheme(ctx, spec.theme, 140, y + 36, 800, palette.muted)
    footer(ctx, palette.muted, String(spec.index).padStart(2, "0"))
  },
  (ctx, palette, spec) => {
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    ctx.save()
    ctx.translate(760, 180)
    ctx.rotate(-0.35)
    ctx.fillStyle = palette.panel
    ctx.fillRect(0, 0, 760, 280)
    ctx.restore()
    ctx.fillStyle = palette.accent
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(280, 0)
    ctx.lineTo(0, 280)
    ctx.fill()
    kicker(ctx, spec.kicker, 88, 430, palette.accent)
    const y = drawTitle(ctx, spec.hook, 88, 490, 860, palette.fg, "left")
    drawTheme(ctx, spec.theme, 88, y + 30, 780, palette.muted)
    ctx.fillStyle = palette.panel
    ctx.font = `700 220px ${SERIF}`
    ctx.textAlign = "right"
    ctx.globalAlpha = 0.35
    ctx.fillText(String(spec.index).padStart(2, "0"), POSTER_W - 40, 1280)
    ctx.globalAlpha = 1
    footer(ctx, palette.muted, String(spec.index).padStart(2, "0"))
  },
  (ctx, palette, spec) => {
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    ctx.fillStyle = palette.panel
    ctx.font = `700 520px ${SERIF}`
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText(String(spec.index).padStart(2, "0"), 40, 80)
    ctx.fillStyle = palette.bg
    roundRect(ctx, 80, 520, 920, 760, 36)
    ctx.fill()
    kicker(ctx, spec.kicker, 140, 640, palette.accent)
    const y = drawTitle(ctx, spec.hook, 140, 700, 780, palette.fg, "left")
    drawTheme(ctx, spec.theme, 140, y + 24, 760, palette.muted)
    seal(ctx, 860, 1120, palette.accent, spec.seal)
    footer(ctx, palette.muted, "内容工坊")
  },
  (ctx, palette, spec) => {
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    ctx.fillStyle = palette.accent
    ctx.font = `700 180px ${SERIF}`
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText("「", 70, 120)
    kicker(ctx, spec.kicker, 88, 360, palette.accent)
    const y = drawTitle(ctx, spec.hook, 88, 420, 880, palette.fg, "left")
    ctx.strokeStyle = palette.accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(88, y + 16)
    ctx.lineTo(280, y + 16)
    ctx.stroke()
    drawTheme(ctx, spec.theme, 88, y + 48, 860, palette.muted)
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = palette.accent
      ctx.globalAlpha = 0.35 + index * 0.1
      ctx.fillRect(88 + index * 28, POSTER_H - 180, 12, 48)
    }
    ctx.globalAlpha = 1
    footer(ctx, palette.muted, String(spec.index).padStart(2, "0"))
  },
]

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function paletteHint(index: number): string {
  return PALETTES[index % PALETTES.length]?.hint ?? PALETTES[0].hint
}

export async function renderPoster(spec: PosterSpec): Promise<string> {
  const sample = `${spec.hook}${spec.theme}${spec.kicker}微博内容工坊${spec.seal}`
  await prepareFonts(sample)
  const canvas = document.createElement("canvas")
  canvas.width = POSTER_W
  canvas.height = POSTER_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("无法创建画布")
  const palette = PALETTES[spec.palette % PALETTES.length] ?? PALETTES[0]
  const draw = DRAW[spec.layout % DRAW.length] ?? DRAW[0]
  draw(ctx, palette, spec)
  grain(ctx, spec.seed)
  return canvas.toDataURL("image/png")
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片无法读取"))
    image.src = src
  })
}

export async function toPngDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:image/png")) return src
  const image = await loadImage(src)
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext("2d")
  if (!ctx || canvas.width === 0) return src
  ctx.drawImage(image, 0, 0)
  return canvas.toDataURL("image/png")
}

export async function makeThumb(src: string, max = 360): Promise<string> {
  try {
    const image = await loadImage(src)
    const scale = Math.min(1, max / Math.max(image.width, image.height, 1))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) return src
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.72)
  } catch {
    return src
  }
}
