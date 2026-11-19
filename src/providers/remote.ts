import { buildTopics, generateLocalCopy, mergeTopics } from "../lib/copy"
import { countChars, hasChinese } from "../lib/format"
import { buildTextMessages } from "../lib/prompts"
import { makeThumb, toPngDataUrl } from "../lib/posters"
import type { EnvStatus, ProviderSettings, StudioForm } from "../types"

export function remoteTextSelected(settings: ProviderSettings, env: EnvStatus): boolean {
  if (settings.textProviderId === "local") return false
  if (settings.textProviderId === "deepseek") return Boolean(settings.deepseek.apiKey.trim() || env.deepseek)
  return Boolean(settings.openaiChat.apiKey.trim() || env.openaiChat)
}

export function remoteImageSelected(settings: ProviderSettings, env: EnvStatus): boolean {
  if (settings.imageProviderId === "local") return false
  if (settings.imageProviderId === "doubao") return Boolean(settings.doubao.apiKey.trim() || env.doubao)
  return Boolean(settings.openaiImage.apiKey.trim() || env.openaiImage)
}

function authForText(settings: ProviderSettings) {
  return settings.textProviderId === "openai-chat" ? settings.openaiChat : settings.deepseek
}

function authForImage(settings: ProviderSettings) {
  return settings.imageProviderId === "openai-image" ? settings.openaiImage : settings.doubao
}

function parsePayload(content: string): { copy: string; topics: string[]; hook: string; kicker: string } | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1] ?? content
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as {
      copy?: unknown
      topics?: unknown
      hook?: unknown
      kicker?: unknown
    }
    const copy = typeof json.copy === "string" ? json.copy.trim() : ""
    if (!hasChinese(copy) || countChars(copy) < 40 || countChars(copy) > 400) return null
    const topics = Array.isArray(json.topics) ? json.topics.filter((item): item is string => typeof item === "string") : []
    return {
      copy,
      topics,
      hook: typeof json.hook === "string" ? json.hook.trim() : "",
      kicker: typeof json.kicker === "string" ? json.kicker.trim() : "",
    }
  } catch {
    return null
  }
}

export async function requestCopy(input: {
  settings: ProviderSettings
  form: StudioForm
  theme: string
  angleId: string
  avoid: string[]
  signal?: AbortSignal
}): Promise<{ ok: true; copy: string; topics: string[]; hook: string; kicker: string } | { ok: false; error: string }> {
  const auth = authForText(input.settings)
  try {
    const response = await fetch("/api/providers/text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: input.signal,
      body: JSON.stringify({
        providerId: input.settings.textProviderId,
        apiKey: auth.apiKey,
        model: auth.model,
        baseUrl: auth.baseUrl,
        messages: buildTextMessages({
          form: input.form,
          theme: input.theme,
          angleId: input.angleId,
          avoid: input.avoid,
        }),
      }),
    })
    const data = (await response.json()) as { ok?: boolean; content?: string; error?: string }
    if (!data.ok || !data.content) return { ok: false, error: data.error || "文案接口没有返回内容" }
    const parsed = parsePayload(data.content)
    if (!parsed) return { ok: false, error: "文案格式无法识别" }
    const local = generateLocalCopy({
      positionId: input.form.positionId,
      theme: input.theme,
      tone: input.form.tone,
      fixedTopics: input.form.fixedTopics,
      hotTopics: input.form.hotPicks,
      angleId: input.angleId,
      seed: 1,
    })
    const hook = countChars(parsed.hook) >= 4 && countChars(parsed.hook) <= 12 ? parsed.hook : local.hook
    const kicker = countChars(parsed.kicker) >= 2 && countChars(parsed.kicker) <= 4 ? parsed.kicker : local.kicker
    return {
      ok: true,
      copy: parsed.copy,
      topics: mergeTopics(parsed.topics, local.topics, input.form.fixedTopics, input.form.hotPicks),
      hook,
      kicker,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return { ok: false, error: "没有连上本地代理，或网络中断" }
  }
}

export async function requestImage(input: {
  settings: ProviderSettings
  prompt: string
  signal?: AbortSignal
}): Promise<{ ok: true; imageDataUrl: string; thumbDataUrl: string } | { ok: false; error: string }> {
  const auth = authForImage(input.settings)
  try {
    const response = await fetch("/api/providers/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: input.signal,
      body: JSON.stringify({
        providerId: input.settings.imageProviderId,
        apiKey: auth.apiKey,
        model: auth.model,
        baseUrl: auth.baseUrl,
        prompt: input.prompt,
      }),
    })
    const data = (await response.json()) as { ok?: boolean; base64?: string; mime?: string; error?: string }
    if (!data.ok || !data.base64) return { ok: false, error: data.error || "配图接口没有返回图片" }
    const mime = data.mime || "image/png"
    const png = await toPngDataUrl(`data:${mime};base64,${data.base64}`)
    const thumb = await makeThumb(png)
    return { ok: true, imageDataUrl: png, thumbDataUrl: thumb }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return { ok: false, error: "没有连上本地代理，或网络中断" }
  }
}

export function localTopicFallback(form: StudioForm, theme: string, angleId: string, seed: number) {
  return buildTopics({
    theme,
    positionId: form.positionId,
    angleId,
    fixed: form.fixedTopics,
    hot: form.hotPicks,
    seed,
  })
}
