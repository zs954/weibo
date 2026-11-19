import { ANGLES, generateLocalCopy, posterCaption } from "./copy"
import { resolveTheme } from "./format"
import { buildCoverPrompt } from "./prompts"
import { PALETTES, makeThumb, renderPoster } from "./posters"
import { nicknameOf } from "./presets"
import { randomSeed, shuffle } from "./rng"
import { remoteImageSelected, remoteTextSelected, requestCopy, requestImage } from "../providers/remote"
import type { EnvStatus, PostDraft, ProviderSettings, StudioForm } from "../types"

export interface ProgressState {
  phase: "copy" | "image" | "topics"
  detail: string
  index: number
  total: number
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("已取消", "AbortError"))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("已取消", "AbortError"))
      },
      { once: true },
    )
  })
}

async function paint(post: PostDraft, theme: string, hot: string[], seal: string, index: number): Promise<PostDraft> {
  const imageDataUrl = await renderPoster({
    hook: post.hook,
    kicker: post.kicker,
    theme: posterCaption(theme, hot),
    layout: post.layout,
    palette: post.palette,
    seed: post.seed,
    index,
    seal,
  })
  const thumbDataUrl = await makeThumb(imageDataUrl)
  return { ...post, imageDataUrl, thumbDataUrl }
}

function localPost(input: {
  form: StudioForm
  theme: string
  angleId: string
  seed: number
  layout: number
  palette: number
  copySource: string
  imageSource: string
}): PostDraft {
  const generated = generateLocalCopy({
    positionId: input.form.positionId,
    theme: input.theme,
    tone: input.form.tone,
    fixedTopics: input.form.fixedTopics,
    hotTopics: input.form.hotPicks,
    angleId: input.angleId,
    seed: input.seed,
  })
  return {
    id: crypto.randomUUID(),
    ...generated,
    seed: input.seed,
    layout: input.layout,
    palette: input.palette,
    copySource: input.copySource,
    imageSource: input.imageSource,
  }
}

export async function runBatch(options: {
  form: StudioForm
  settings: ProviderSettings
  env: EnvStatus
  signal: AbortSignal
  onProgress: (progress: ProgressState) => void
}): Promise<{ posts: PostDraft[]; notices: string[] }> {
  const { form, settings, env, signal, onProgress } = options
  const theme = resolveTheme(form.theme, form.hotPicks)
  const total = form.count
  const notices: string[] = []
  let textRemote = remoteTextSelected(settings, env)
  let imageRemote = remoteImageSelected(settings, env)
  if (settings.textProviderId !== "local" && !textRemote) {
    notices.push("未检测到可用的文案密钥。请先在「模型设置」填写，或配置服务器环境变量。本批文案已使用本地模板。")
  }
  if (settings.imageProviderId !== "local" && !imageRemote) {
    notices.push("未检测到可用的配图密钥。请先在「模型设置」填写，或配置服务器环境变量。本批配图已使用本地海报。")
  }
  const seed = randomSeed()
  const angles = shuffle(ANGLES, seed)
  const seal = nicknameOf(form.positionId, form.positionCustom).slice(0, 1) || "微"
  const posts: PostDraft[] = []
  const openings: string[] = []

  for (let index = 0; index < total; index += 1) {
    if (signal.aborted) throw new DOMException("已取消", "AbortError")
    const angle = angles[index % angles.length] ?? ANGLES[0]
    const itemSeed = (seed + index * 97) >>> 0
    onProgress({
      phase: "copy",
      detail: textRemote ? `正在写第 ${index + 1} / ${total} 条` : "正在组织不同的开头和结构",
      index,
      total,
    })
    let post = localPost({
      form,
      theme,
      angleId: angle.id,
      seed: itemSeed,
      layout: (index * 5 + seed) % 6,
      palette: (index * 3 + Math.floor(seed / 5)) % PALETTES.length,
      copySource: textRemote ? settings.textProviderId : settings.textProviderId === "local" ? "local" : "local-fallback",
      imageSource: "local",
    })
    if (textRemote) {
      const remote = await requestCopy({
        settings,
        form,
        theme,
        angleId: angle.id,
        avoid: openings,
        signal,
      })
      if (remote.ok) {
        post = { ...post, copy: remote.copy, topics: remote.topics, hook: remote.hook, kicker: remote.kicker, copySource: settings.textProviderId }
      } else {
        textRemote = false
        post = { ...post, copySource: "local-fallback", note: remote.error }
        notices.push(`写到第 ${index + 1} 条时文案接口不可用（${remote.error}）。这一条和后面的文案已改用本地模板。`)
      }
    }
    openings.push(post.copy.slice(0, 14))
    posts.push(post)
  }

  if (settings.textProviderId === "local") await delay(420, signal)

  for (let index = 0; index < posts.length; index += 1) {
    if (signal.aborted) throw new DOMException("已取消", "AbortError")
    const current = posts[index]
    if (!current) continue
    onProgress({
      phase: "image",
      detail: imageRemote ? `正在生成第 ${index + 1} / ${total} 张配图` : `正在绘制第 ${index + 1} / ${total} 张海报`,
      index,
      total,
    })
    if (imageRemote) {
      const remote = await requestImage({
        settings,
        prompt: buildCoverPrompt(current.hook, theme, current.kicker, current.palette, form.hotPicks),
        signal,
      })
      if (remote.ok) {
        posts[index] = { ...current, imageDataUrl: remote.imageDataUrl, thumbDataUrl: remote.thumbDataUrl, imageSource: settings.imageProviderId }
        continue
      }
      imageRemote = false
      notices.push(`画到第 ${index + 1} 张时配图接口不可用（${remote.error}）。这一张和后面的配图已改用本地海报。`)
      posts[index] = await paint(
        { ...current, imageSource: "local-fallback", note: current.note || remote.error },
        theme,
        form.hotPicks,
        seal,
        index + 1,
      )
      continue
    }
    const source = settings.imageProviderId === "local" ? "local" : "local-fallback"
    posts[index] = await paint({ ...current, imageSource: source }, theme, form.hotPicks, seal, index + 1)
  }

  onProgress({ phase: "topics", detail: "正在整理话题", index: total, total })
  await delay(settings.textProviderId === "local" && settings.imageProviderId === "local" ? 280 : 160, signal)
  return { posts, notices }
}

export async function rebuildPost(options: {
  post: PostDraft
  form: StudioForm
  settings: ProviderSettings
  env: EnvStatus
  theme: string
  signal: AbortSignal
  badgeIndex: number
}): Promise<{ post: PostDraft; notice?: string }> {
  const { post, form, settings, env, theme, signal, badgeIndex } = options
  const seed = randomSeed()
  const angle = ANGLES.filter((item) => item.id !== post.angleId)[seed % Math.max(1, ANGLES.length - 1)] ?? ANGLES[0]
  let next = localPost({
    form,
    theme,
    angleId: angle.id,
    seed,
    layout: (post.layout + 1) % 6,
    palette: (post.palette + 3) % PALETTES.length,
    copySource: "local",
    imageSource: "local",
  })
  next = { ...next, id: post.id, demoPublishedAt: undefined }
  const notices: string[] = []
  if (remoteTextSelected(settings, env)) {
    const remote = await requestCopy({ settings, form, theme, angleId: angle.id, avoid: [post.copy.slice(0, 14)], signal })
    if (remote.ok) {
      next = { ...next, copy: remote.copy, topics: remote.topics, hook: remote.hook, kicker: remote.kicker, copySource: settings.textProviderId }
    } else {
      next = { ...next, copySource: "local-fallback", note: remote.error }
      notices.push(`这一条文案接口不可用（${remote.error}），已改用本地模板。`)
    }
  } else if (settings.textProviderId !== "local") {
    next = { ...next, copySource: "local-fallback" }
    notices.push("未检测到文案密钥，这一条已改用本地模板。")
  }
  const seal = nicknameOf(form.positionId, form.positionCustom).slice(0, 1) || "微"
  if (remoteImageSelected(settings, env)) {
    const remote = await requestImage({
      settings,
      prompt: buildCoverPrompt(next.hook, theme, next.kicker, next.palette, form.hotPicks),
      signal,
    })
    if (remote.ok) {
      return {
        post: { ...next, imageDataUrl: remote.imageDataUrl, thumbDataUrl: remote.thumbDataUrl, imageSource: settings.imageProviderId },
        notice: notices[0],
      }
    }
    notices.push(`配图接口不可用（${remote.error}），已改用本地海报。`)
    const painted = await paint({ ...next, imageSource: "local-fallback" }, theme, form.hotPicks, seal, badgeIndex)
    return { post: painted, notice: notices.filter(Boolean).join("") }
  }
  if (settings.imageProviderId !== "local") notices.push("未检测到配图密钥，这一张已改用本地海报。")
  const painted = await paint(
    { ...next, imageSource: settings.imageProviderId === "local" ? "local" : "local-fallback" },
    theme,
    form.hotPicks,
    seal,
    badgeIndex,
  )
  return { post: painted, notice: notices.filter(Boolean).join("") || undefined }
}
