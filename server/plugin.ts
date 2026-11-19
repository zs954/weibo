import type { IncomingMessage, ServerResponse } from "node:http"
import { loadEnv, type Connect, type Plugin } from "vite"

type Env = Record<string, string>
type Body = Record<string, unknown>

function envValue(env: Env, key: string): string {
  return (process.env[key] || env[key] || "").trim()
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("content-type", "application/json; charset=utf-8")
  res.setHeader("cache-control", "no-store")
  res.end(JSON.stringify(body))
}

function readJson(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > 200_000) {
        reject(new Error("请求体过大"))
        req.destroy()
        return
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8")
      if (!text) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(text) as unknown
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("请求格式不正确"))
          return
        }
        resolve(parsed as Body)
      } catch {
        reject(new Error("请求格式不正确"))
      }
    })
    req.on("error", reject)
  })
}

function str(body: Body, key: string): string {
  const value = body[key]
  return typeof value === "string" ? value.trim() : ""
}

function redact(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/\s+/g, " ")
    .slice(0, 160)
}

function assertSafeUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("接口地址无法解析")
  }
  if (url.username || url.password) throw new Error("地址里不能带账号密码")
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("只接受 http 或 https")
  const host = url.hostname.toLowerCase()
  if (host === "169.254.169.254" || host.endsWith(".metadata.google.internal") || host === "metadata.google.internal") {
    throw new Error("该地址不允许访问")
  }
  if (/^169\.254\./.test(host) || host === "0.0.0.0") throw new Error("该地址不允许访问")
  return url
}

function joinEndpoint(base: string, path: string): string {
  const clean = base.replace(/\/+$/, "")
  return clean.endsWith(path) ? clean : `${clean}${path}`
}

async function readError(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const json = JSON.parse(text) as { error?: { message?: string } | string; message?: string }
    const message = typeof json.error === "string" ? json.error : json.error?.message || json.message
    if (typeof message === "string" && message.trim()) return redact(message)
  } catch {
    /* 不是 JSON 时走状态码。 */
  }
  if (response.status === 401 || response.status === 403) return "密钥无效、没有权限，或接口拒绝访问"
  if (response.status === 402) return "账户余额或配额不足"
  if (response.status === 429) return "请求过于频繁，稍后再试"
  if (response.status === 404) return "接口地址或模型不存在"
  return `接口返回 ${response.status}`
}

function messagesOf(body: Body): { role: "system" | "user"; content: string }[] {
  const value = body.messages
  if (!Array.isArray(value)) return []
  const messages: { role: "system" | "user"; content: string }[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if ((role !== "system" && role !== "user") || typeof content !== "string") continue
    messages.push({ role, content: content.slice(0, 8000) })
  }
  return messages.slice(0, 6)
}

async function chat(url: string, apiKey: string, payload: unknown): Promise<{ ok: true; content: string } | { ok: false; error: string; status: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(50_000),
  })
  if (!response.ok) return { ok: false, error: await readError(response), status: response.status }
  const json = (await response.json()) as { choices?: { message?: { content?: string | null } }[] }
  const content = json.choices?.[0]?.message?.content ?? ""
  if (!content.trim()) return { ok: false, error: "模型没有返回正文", status: 502 }
  return { ok: true, content }
}

async function generateText(env: Env, body: Body) {
  const providerId = str(body, "providerId")
  const isDeepseek = providerId === "deepseek"
  const apiKey = str(body, "apiKey") || envValue(env, isDeepseek ? "DEEPSEEK_API_KEY" : "OPENAI_COMPAT_TEXT_API_KEY")
  const model =
    str(body, "model") ||
    envValue(env, isDeepseek ? "DEEPSEEK_MODEL" : "OPENAI_COMPAT_TEXT_MODEL") ||
    (isDeepseek ? "deepseek-flash" : "")
  const baseUrl =
    str(body, "baseUrl") ||
    envValue(env, isDeepseek ? "DEEPSEEK_BASE_URL" : "OPENAI_COMPAT_TEXT_BASE_URL") ||
    (isDeepseek ? "https://api.deepseek.com" : "")
  if (!apiKey) return { ok: false, error: "未配置文案模型密钥" }
  if (!model || !baseUrl) return { ok: false, error: "还没有填写模型 ID 或 Base URL" }
  const endpoint = joinEndpoint(assertSafeUrl(baseUrl).toString().replace(/\/$/, ""), "/chat/completions")
  const messages = messagesOf(body)
  if (!messages.length) return { ok: false, error: "缺少提示词" }
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.8,
    max_tokens: 900,
    stream: false,
    response_format: { type: "json_object" },
  }
  if (isDeepseek) payload.thinking = { type: "disabled" }
  let result = await chat(endpoint, apiKey, payload)
  if (!result.ok && result.status === 400) {
    delete payload.response_format
    result = await chat(endpoint, apiKey, payload)
  }
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, content: result.content }
}

function mimeFromBase64(b64: string): string {
  if (b64.startsWith("iVBOR")) return "image/png"
  if (b64.startsWith("/9j/")) return "image/jpeg"
  if (b64.startsWith("UklGR")) return "image/webp"
  return "image/png"
}

async function pullImage(imageUrl: string, baseUrl: string): Promise<{ base64: string; mime: string }> {
  const url = assertSafeUrl(imageUrl)
  const baseHost = assertSafeUrl(baseUrl).hostname
  const host = url.hostname
  const allowed =
    host === baseHost ||
    host.endsWith(".volces.com") ||
    host.endsWith(".volcengine.com") ||
    host.endsWith(".byteimg.com") ||
    host.endsWith(".aliyuncs.com")
  if (!allowed) throw new Error("图片地址不在允许的范围内")
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error("图片下载失败")
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > 12_000_000) throw new Error("图片过大")
  const mime = response.headers.get("content-type")?.split(";")[0] || mimeFromBase64(bytes.toString("base64").slice(0, 12))
  return { base64: bytes.toString("base64"), mime }
}

async function imageCall(url: string, apiKey: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) return { ok: false as const, error: await readError(response), status: response.status }
  const json = (await response.json()) as { data?: { b64_json?: string; url?: string; output_format?: string }[]; error?: { message?: string } }
  if (json.error?.message) return { ok: false as const, error: redact(json.error.message), status: 502 }
  const first = json.data?.[0]
  if (first?.b64_json) {
    return { ok: true as const, base64: first.b64_json, mime: first.output_format === "jpeg" ? "image/jpeg" : mimeFromBase64(first.b64_json) }
  }
  if (first?.url) {
    const pulled = await pullImage(first.url, url)
    return { ok: true as const, ...pulled }
  }
  return { ok: false as const, error: "模型没有返回图片", status: 502 }
}

async function generateImage(env: Env, body: Body) {
  const providerId = str(body, "providerId")
  const doubao = providerId === "doubao"
  const apiKey = str(body, "apiKey") || envValue(env, doubao ? "ARK_API_KEY" : "OPENAI_COMPAT_IMAGE_API_KEY")
  const model =
    str(body, "model") ||
    envValue(env, doubao ? "ARK_MODEL" : "OPENAI_COMPAT_IMAGE_MODEL") ||
    (doubao ? "doubao-seedream-5-5-261028" : "")
  const baseUrl =
    str(body, "baseUrl") ||
    envValue(env, doubao ? "ARK_BASE_URL" : "OPENAI_COMPAT_IMAGE_BASE_URL") ||
    (doubao ? "https://ark.cn-beijing.volces.com/api/v3" : "")
  const prompt = str(body, "prompt").slice(0, 900)
  if (!apiKey) return { ok: false, error: "未配置配图模型密钥" }
  if (!model || !baseUrl) return { ok: false, error: "还没有填写配图模型 ID 或 Base URL" }
  if (!prompt) return { ok: false, error: "缺少配图提示词" }
  const endpoint = joinEndpoint(assertSafeUrl(baseUrl).toString().replace(/\/$/, ""), "/images/generations")
  if (doubao) {
    const payload: Record<string, unknown> = {
      model,
      prompt: prompt.slice(0, 300),
      // 1728x2304 is a documented 3:4 frame inside Seedream 5.5 and 4.x pixel windows.
      size: "1728x2304",
      response_format: "b64_json",
      watermark: false,
    }
    if (!/4[-.]0|4[-.]5|seedream-4/i.test(model)) payload.output_format = "png"
    const result = await imageCall(endpoint, apiKey, payload)
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true, base64: result.base64, mime: result.mime }
  }
  let result = await imageCall(endpoint, apiKey, {
    model,
    prompt,
    n: 1,
    size: "1024x1536",
    response_format: "b64_json",
  })
  if (!result.ok && result.status === 400) {
    result = await imageCall(endpoint, apiKey, {
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    })
  }
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, base64: result.base64, mime: result.mime }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseBaidu(json: unknown) {
  const cards = asRecord(asRecord(json)?.data)?.cards
  if (!Array.isArray(cards)) return []
  const items: { title: string; heat: string; url: string; source: string }[] = []
  for (const card of cards) {
    const blocks = asRecord(card)?.content
    if (!Array.isArray(blocks)) continue
    for (const block of blocks) {
      const rows = asRecord(block)?.content
      if (!Array.isArray(rows)) continue
      for (const row of rows) {
        const record = asRecord(row)
        const word = record?.word
        if (typeof word !== "string" || word.trim().length < 2) continue
        const heat = record?.isTop === true ? "置顶" : typeof record?.index === "number" ? String(record.index) : ""
        items.push({
          title: word.trim(),
          heat,
          url: typeof record?.url === "string" ? record.url : "",
          source: "百度热搜",
        })
      }
    }
  }
  return items.slice(0, 20)
}

function parseWeibo(json: unknown) {
  const realtime = asRecord(asRecord(json)?.data)?.realtime
  if (!Array.isArray(realtime)) return []
  const items: { title: string; heat: string; url: string; source: string }[] = []
  for (const row of realtime) {
    const record = asRecord(row)
    const word = record?.word
    if (typeof word !== "string" || word.trim().length < 2) continue
    const title = word.trim()
    items.push({
      title,
      heat: typeof record?.num === "number" ? String(record.num) : "",
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
      source: "微博热搜",
    })
  }
  return items.slice(0, 20)
}

function parseContract(json: unknown, source: string) {
  const root = asRecord(json)
  const list = Array.isArray(root?.items) ? root.items : Array.isArray(root?.data) ? root.data : null
  if (!list) return []
  const items: { title: string; heat: string; url: string; source: string }[] = []
  for (const row of list) {
    const record = asRecord(row)
    if (!record) continue
    const title = [record.title, record.word, record.name].find((value) => typeof value === "string" && value.trim().length >= 2)
    if (typeof title !== "string") continue
    const heatValue = record.heat ?? record.hotScore ?? record.num
    items.push({
      title: title.trim(),
      heat: typeof heatValue === "string" || typeof heatValue === "number" ? String(heatValue) : "",
      url: typeof record.url === "string" ? record.url : "",
      source,
    })
  }
  return items.slice(0, 20)
}

async function fetchHot(url: string, apiKey: string) {
  const headers: Record<string, string> = {
    accept: "application/json,text/plain,*/*",
    "user-agent": "Mozilla/5.0 (compatible; WeiboStudioDemo/0.1)",
  }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) })
  if (!response.ok) throw new Error(response.status === 403 ? "接口拒绝访问" : `热榜接口返回 ${response.status}`)
  return (await response.json()) as unknown
}

async function hot(env: Env, body: Body) {
  const source = str(body, "source") || "baidu"
  const query = str(body, "q")
  if (source === "sample") return { ok: true, items: [], label: "离线样本", live: false }
  try {
    if (source === "baidu") {
      const json = await fetchHot("https://top.baidu.com/api/board?platform=wise&tab=realtime", "")
      const items = parseBaidu(json)
      if (!items.length) return { ok: false, error: "百度热搜没有解析出话题" }
      const filtered = query ? items.filter((item) => item.title.includes(query)) : items
      return { ok: true, items: filtered.length ? filtered : items, label: "百度热搜 · 公开热榜，无需登录", live: true, relaxed: Boolean(query && !filtered.length) }
    }
    if (source === "weibo") {
      const json = await fetchHot("https://weibo.com/ajax/side/hotSearch", "")
      const items = parseWeibo(json)
      if (!items.length) return { ok: false, error: "微博热搜没有返回话题。演示站不会登录微博。" }
      const filtered = query ? items.filter((item) => item.title.includes(query)) : items
      return { ok: true, items: filtered.length ? filtered : items, label: "微博热搜 · 公开热榜，无需登录", live: true, relaxed: Boolean(query && !filtered.length) }
    }
    const custom = str(body, "url") || envValue(env, "HOT_SEARCH_URL")
    const apiKey = str(body, "apiKey") || envValue(env, "HOT_SEARCH_API_KEY")
    if (!custom) return { ok: false, error: "还没有填写自定义热榜地址" }
    const url = assertSafeUrl(custom)
    if (query) url.searchParams.set("q", query)
    const json = await fetchHot(url.toString(), apiKey)
    const items = parseContract(json, "自定义接口")
    const fallback = items.length ? items : parseBaidu(json)
    const weibo = fallback.length ? fallback : parseWeibo(json)
    if (!weibo.length) return { ok: false, error: "自定义接口没有返回可识别的话题列表" }
    return { ok: true, items: weibo, label: "自定义热榜接口", live: true, relaxed: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : "热榜请求失败"
    if (source === "weibo") return { ok: false, error: `微博热搜暂时不可用（${message}）。演示站不会登录微博。` }
    if (source === "baidu") return { ok: false, error: `百度热搜暂时不可用（${message}）。` }
    return { ok: false, error: `自定义热榜暂时不可用（${message}）。` }
  }
}

function status(env: Env) {
  return {
    ok: true,
    proxy: true,
    deepseek: Boolean(envValue(env, "DEEPSEEK_API_KEY")),
    openaiChat: Boolean(envValue(env, "OPENAI_COMPAT_TEXT_API_KEY")),
    doubao: Boolean(envValue(env, "ARK_API_KEY")),
    openaiImage: Boolean(envValue(env, "OPENAI_COMPAT_IMAGE_API_KEY")),
    hotCustom: Boolean(envValue(env, "HOT_SEARCH_URL")),
  }
}

function attach(middlewares: Connect.Server, mode: string, root: string) {
  const env = loadEnv(mode, root, "")
  middlewares.use((req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost")
    if (!url.pathname.startsWith("/api/")) {
      next()
      return
    }
    void (async () => {
      try {
        if (req.method === "GET" && url.pathname === "/api/provider-status") {
          send(res, 200, status(env))
          return
        }
        if (req.method === "POST" && url.pathname === "/api/providers/text") {
          send(res, 200, await generateText(env, await readJson(req)))
          return
        }
        if (req.method === "POST" && url.pathname === "/api/providers/image") {
          send(res, 200, await generateImage(env, await readJson(req)))
          return
        }
        if (req.method === "POST" && url.pathname === "/api/hot") {
          send(res, 200, await hot(env, await readJson(req)))
          return
        }
        send(res, 404, { ok: false, error: "没有这个接口" })
      } catch (error) {
        const message = error instanceof Error ? error.message : "本地代理出错"
        send(res, 200, { ok: false, error: message })
      }
    })()
  })
}

export function providerPlugin(): Plugin {
  return {
    name: "studio-providers",
    configureServer(server) {
      attach(server.middlewares, server.config.mode, server.config.root)
    },
    configurePreviewServer(server) {
      attach(server.middlewares, server.config.mode, server.config.root)
    },
  }
}
