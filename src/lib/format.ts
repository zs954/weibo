export function countChars(text: string): number {
  return Array.from(text.replace(/\s+/g, "")).length
}

export function clipChars(text: string, max: number): string {
  return Array.from(text).slice(0, max).join("")
}

export function unique(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

export function cleanTopic(raw: string): string {
  const text = raw
    .replace(/#/g, "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?:：；;「」"'“”]/g, "")
    .trim()
  return clipChars(text, 20)
}

export function parseTopicInput(raw: string): string[] {
  return unique(
    raw
      .split(/[#\s,，、]+/)
      .map((part) => cleanTopic(part))
      .filter((part) => countChars(part) >= 2),
  )
}

export function formatTopicLine(topics: string[]): string {
  return topics.map((topic) => `#${topic}#`).join(" ")
}

export function formatStamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function safeFilePart(text: string): string {
  const cleaned = text.replace(/[\\/:*?"<>|\s]+/g, "").trim()
  return clipChars(cleaned || "未命名", 24)
}

export function resolveTheme(theme: string, hotPicks: string[]): string {
  const typed = theme.trim()
  if (typed) return typed
  return hotPicks.join("、")
}

export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}
