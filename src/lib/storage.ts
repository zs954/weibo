import { defaultForm, defaultSettings, type HistoryItem, type PostDraft, type ProviderSettings, type StudioForm } from "../types"

const STUDIO_KEY = "weibo-studio.v1"
const SETTINGS_KEY = "weibo-studio.providers.v1"

export interface StudioSnapshot {
  form: StudioForm
  posts: PostDraft[]
  history: HistoryItem[]
}

function canUseStorage() {
  return typeof localStorage !== "undefined"
}

export function loadStudio(): StudioSnapshot | null {
  if (!canUseStorage()) return null
  try {
    const raw = localStorage.getItem(STUDIO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StudioSnapshot>
    const base = defaultForm()
    return {
      form: { ...base, ...parsed.form, count: clampCount(parsed.form?.count ?? base.count) },
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch {
    return null
  }
}

export function saveStudio(snapshot: StudioSnapshot) {
  if (!canUseStorage()) return
  const slim: StudioSnapshot = {
    ...snapshot,
    posts: snapshot.posts.map((post) => ({ ...post, imageDataUrl: undefined })),
  }
  try {
    localStorage.setItem(STUDIO_KEY, JSON.stringify(slim))
  } catch {
    const smaller: StudioSnapshot = {
      ...slim,
      posts: slim.posts.map((post) => ({ ...post, thumbDataUrl: undefined })),
      history: slim.history.map((item) => ({ ...item, thumbDataUrl: undefined })),
    }
    try {
      localStorage.setItem(STUDIO_KEY, JSON.stringify(smaller))
    } catch {
      /* 配额不足时放弃写入，不打断编辑。 */
    }
  }
}

export function loadSettings(): ProviderSettings {
  const base = defaultSettings()
  if (!canUseStorage()) return base
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>
    return {
      ...base,
      ...parsed,
      deepseek: { ...base.deepseek, ...parsed.deepseek },
      openaiChat: { ...base.openaiChat, ...parsed.openaiChat },
      doubao: { ...base.doubao, ...parsed.doubao },
      openaiImage: { ...base.openaiImage, ...parsed.openaiImage },
    }
  } catch {
    return base
  }
}

export function saveSettings(settings: ProviderSettings) {
  if (!canUseStorage()) return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 6
  return Math.min(12, Math.max(1, Math.round(value)))
}
