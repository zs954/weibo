import type { PositionId, Tone } from "../types"

export interface PositionOption {
  id: PositionId
  label: string
  nickname: string
}

export const POSITIONS: PositionOption[] = [
  { id: "data", label: "数商/数据服务", nickname: "数商研究所" },
  { id: "lifestyle", label: "生活种草", nickname: "日常标本" },
  { id: "career", label: "职场干货", nickname: "效率手记" },
  { id: "local", label: "本地生活", nickname: "街角记录" },
  { id: "tech", label: "科技观察", nickname: "信号笔记" },
  { id: "custom", label: "自定义", nickname: "内容工坊" },
]

export const TONES: Tone[] = ["专业", "亲和", "犀利", "故事"]

export interface ThemePreset {
  id: string
  title: string
  blurb: string
  positionId: PositionId
  theme: string
  tone: Tone
  topics: string[]
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "data",
    title: "数据要素 / 数商服务",
    blurb: "专业口径，写给还在把数据当材料的团队",
    positionId: "data",
    theme: "数据要素市场化，企业如何把数据变成可交付的服务",
    tone: "专业",
    topics: ["数据要素"],
  },
  {
    id: "work",
    title: "职场效率",
    blurb: "亲和语气，留一个明天上午用得上的方法",
    positionId: "career",
    theme: "碎片时间里把重要的事做完",
    tone: "亲和",
    topics: ["职场效率"],
  },
  {
    id: "city",
    title: "本地生活",
    blurb: "故事语气，写一条真的走得下去的城市路线",
    positionId: "local",
    theme: "周末在城里慢慢走，发现还值得再去的小店",
    tone: "故事",
    topics: ["本地生活", "城市散步"],
  },
]

export function positionLabel(positionId: PositionId, custom: string): string {
  if (positionId === "custom") return custom.trim() || "自定义定位"
  return POSITIONS.find((item) => item.id === positionId)?.label ?? "自定义定位"
}

export function nicknameOf(positionId: PositionId, custom: string): string {
  if (positionId === "custom") {
    const name = custom.trim()
    return name ? Array.from(name).slice(0, 12).join("") : "内容工坊"
  }
  return POSITIONS.find((item) => item.id === positionId)?.nickname ?? "内容工坊"
}
