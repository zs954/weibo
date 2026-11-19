export type Tone = "专业" | "亲和" | "犀利" | "故事"

export type PositionId = "data" | "lifestyle" | "career" | "local" | "tech" | "custom"

export type TextProviderId = "local" | "deepseek" | "openai-chat"

export type ImageProviderId = "local" | "doubao" | "openai-image"

export type HotSourceId = "baidu" | "weibo" | "custom" | "sample"

export interface RemoteAuth {
  apiKey: string
  model: string
  baseUrl: string
}

export interface ProviderSettings {
  textProviderId: TextProviderId
  imageProviderId: ImageProviderId
  deepseek: RemoteAuth
  openaiChat: RemoteAuth
  doubao: RemoteAuth
  openaiImage: RemoteAuth
  hotSource: HotSourceId
  hotUrl: string
  hotApiKey: string
}

export interface StudioForm {
  positionId: PositionId
  positionCustom: string
  theme: string
  tone: Tone
  count: number
  fixedTopics: string[]
  hotPicks: string[]
}

export interface PostDraft {
  id: string
  copy: string
  topics: string[]
  hook: string
  kicker: string
  seed: number
  layout: number
  palette: number
  angleId: string
  copySource: string
  imageSource: string
  imageDataUrl?: string
  thumbDataUrl?: string
  demoPublishedAt?: number
  note?: string
}

export interface HistoryItem {
  id: string
  copy: string
  topics: string[]
  hook: string
  kicker: string
  seed: number
  layout: number
  palette: number
  nickname: string
  publishedAt: number
  thumbDataUrl?: string
}

export interface HotItem {
  title: string
  heat: string
  url: string
  source: string
}

export interface EnvStatus {
  proxy: boolean
  deepseek: boolean
  openaiChat: boolean
  doubao: boolean
  openaiImage: boolean
  hotCustom: boolean
}

export interface BatchNotice {
  id: string
  text: string
}

export const TEXT_PROVIDERS: { id: TextProviderId; label: string; hint: string }[] = [
  { id: "local", label: "本地模板", hint: "不需要密钥" },
  { id: "deepseek", label: "DeepSeek", hint: "推荐的文案模型" },
  { id: "openai-chat", label: "兼容接口", hint: "千问、Kimi 或其他 OpenAI 兼容地址" },
]

export const IMAGE_PROVIDERS: { id: ImageProviderId; label: string; hint: string }[] = [
  { id: "local", label: "本地海报", hint: "浏览器里绘制，不需要密钥" },
  { id: "doubao", label: "豆包", hint: "火山方舟 Seedream" },
  { id: "openai-image", label: "兼容文生图", hint: "OpenAI Images 兼容地址" },
]

export const HOT_SOURCES: { id: HotSourceId; label: string }[] = [
  { id: "baidu", label: "百度热搜" },
  { id: "weibo", label: "微博热搜" },
  { id: "custom", label: "自定义接口" },
  { id: "sample", label: "离线样本" },
]

export const defaultSettings = (): ProviderSettings => ({
  textProviderId: "local",
  imageProviderId: "local",
  deepseek: {
    apiKey: "",
    model: "deepseek-flash",
    baseUrl: "https://api.deepseek.com",
  },
  openaiChat: { apiKey: "", model: "", baseUrl: "" },
  doubao: {
    apiKey: "",
    model: "doubao-seedream-5-5-261028",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  },
  openaiImage: { apiKey: "", model: "", baseUrl: "" },
  hotSource: "baidu",
  hotUrl: "",
  hotApiKey: "",
})

export const defaultForm = (): StudioForm => ({
  positionId: "data",
  positionCustom: "",
  theme: "",
  tone: "专业",
  count: 6,
  fixedTopics: [],
  hotPicks: [],
})
