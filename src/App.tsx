import { Settings, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast, Toaster } from "sonner"
import { PostCard } from "./components/PostCard"
import { PublishDialog } from "./components/PublishDialog"
import { SettingsDialog } from "./components/SettingsDialog"
import { SetupPanel } from "./components/SetupPanel"
import { Button, Modal } from "./components/ui"
import { copyText, downloadDataUrl, exportBatch } from "./lib/export"
import { formatTime, formatTopicLine, resolveTheme, safeFilePart } from "./lib/format"
import { posterCaption } from "./lib/copy"
import { makeThumb, renderPoster } from "./lib/posters"
import { nicknameOf } from "./lib/presets"
import { rebuildPost, runBatch, type ProgressState } from "./lib/runBatch"
import { loadSettings, loadStudio, saveSettings, saveStudio } from "./lib/storage"
import { SAMPLE_HOT } from "./providers/hot"
import { publishForDemo } from "./providers/weibo"
import {
  defaultForm,
  type EnvStatus,
  type HistoryItem,
  type HotItem,
  type PostDraft,
  type ProviderSettings,
  type StudioForm,
} from "./types"

const emptyEnv: EnvStatus = {
  proxy: false,
  deepseek: false,
  openaiChat: false,
  doubao: false,
  openaiImage: false,
  hotCustom: false,
}

export default function App() {
  const stored = useMemo(() => loadStudio(), [])
  const [form, setForm] = useState<StudioForm>(stored?.form ?? defaultForm())
  const [settings, setSettings] = useState<ProviderSettings>(() => loadSettings())
  const [posts, setPosts] = useState<PostDraft[]>(stored?.posts ?? [])
  const [history, setHistory] = useState<HistoryItem[]>(stored?.history ?? [])
  const [env, setEnv] = useState<EnvStatus>(emptyEnv)
  const [running, setRunning] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [notices, setNotices] = useState<string[]>([])
  const [publishPost, setPublishPost] = useState<PostDraft | null>(null)
  const [publishAllOpen, setPublishAllOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [hotItems, setHotItems] = useState<HotItem[]>([])
  const [hotLoading, setHotLoading] = useState(false)
  const [hotError, setHotError] = useState("")
  const [hotNote, setHotNote] = useState("")
  const [hotLive, setHotLive] = useState(false)
  const [hotQuery, setHotQuery] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const ready = useRef(false)
  const hotSourceRef = useRef(settings.hotSource)

  useEffect(() => {
    ready.current = true
  }, [])

  useEffect(() => {
    if (!ready.current) return
    saveStudio({ form, posts, history })
  }, [form, posts, history])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    void fetch("/api/provider-status")
      .then((response) => response.json())
      .then((data: EnvStatus) => setEnv({ ...emptyEnv, ...data, proxy: true }))
      .catch(() => setEnv(emptyEnv))
  }, [])

  useEffect(() => {
    if (hotSourceRef.current !== settings.hotSource) {
      hotSourceRef.current = settings.hotSource
      setForm((current) => (current.hotPicks.length ? { ...current, hotPicks: [] } : current))
    }
    void refreshHot(settings.hotSource, hotQuery, settings)
    // 只在来源变化时重拉，避免输入筛选词时反复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hotSource])

  const posterKey = posts.map((post) => `${post.id}:${post.seed}:${post.imageDataUrl == null ? "0" : "1"}`).join("|")
  useEffect(() => {
    if (running) return
    const missing = posts.filter((post) => post.imageDataUrl == null)
    if (!missing.length) return
    let cancel = false
    const theme = form.theme
    const seal = nicknameOf(form.positionId, form.positionCustom).slice(0, 1) || "微"
    void (async () => {
      const updates = new Map<string, Partial<PostDraft>>()
      for (const post of missing) {
        if ((post.imageSource === "doubao" || post.imageSource === "openai-image") && post.thumbDataUrl) {
          updates.set(post.id, { imageDataUrl: post.thumbDataUrl })
          continue
        }
        try {
          const index = posts.findIndex((item) => item.id === post.id)
          const imageDataUrl = await renderPoster({
            hook: post.hook,
            kicker: post.kicker,
            theme: posterCaption(theme || post.hook, form.hotPicks),
            layout: post.layout,
            palette: post.palette,
            seed: post.seed,
            index: index + 1,
            seal,
          })
          const thumbDataUrl = await makeThumb(imageDataUrl)
          const remote = post.imageSource === "doubao" || post.imageSource === "openai-image"
          updates.set(post.id, {
            imageDataUrl,
            thumbDataUrl,
            note: remote ? post.note || "远程配图没有留在本机，这张是本地海报。" : post.note,
          })
        } catch {
          updates.set(post.id, { imageDataUrl: "", note: "配图暂时画不出来，可以点重新生成。" })
        }
      }
      if (!cancel) setPosts((current) => current.map((post) => ({ ...post, ...updates.get(post.id) })))
    })()
    return () => {
      cancel = true
    }
    // posterKey 只在缺图或换一批时变化，避免编辑文案时重绘。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterKey, running])

  async function refreshHot(source = settings.hotSource, query = hotQuery, current = settings) {
    if (source === "sample") {
      setHotItems(SAMPLE_HOT)
      setHotLive(false)
      setHotError("")
      setHotNote("以下是离线样本，不是实时热搜。")
      return
    }
    setHotLoading(true)
    try {
      const response = await fetch("/api/hot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, q: query, url: current.hotUrl, apiKey: current.hotApiKey }),
      })
      const data = (await response.json()) as { ok?: boolean; items?: HotItem[]; label?: string; error?: string; relaxed?: boolean }
      if (!data.ok || !data.items?.length) throw new Error(data.error || "没有拿到热点")
      setHotItems(data.items)
      setHotLive(true)
      setHotError("")
      setHotNote(data.relaxed ? `热榜里没有包含「${query}」的条目，下面仍是完整列表。` : data.label || "")
    } catch (error) {
      const message = error instanceof Error ? error.message : "热榜暂时不可用"
      setHotError(message.endsWith("。") ? message : `${message}。`)
      setHotItems(SAMPLE_HOT)
      setHotLive(false)
      setHotNote("以下改为离线样本。你可以直接点选，或在主题里自己输入。")
    } finally {
      setHotLoading(false)
    }
  }

  async function generate() {
    const theme = resolveTheme(form.theme, form.hotPicks)
    if (!theme.trim()) {
      toast.error("先写一个主题，或从热点里选一条填入。")
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setNotices([])
    setProgress({ phase: "copy", detail: "正在准备这一批", index: 0, total: form.count })
    try {
      const result = await runBatch({
        form,
        settings,
        env,
        signal: controller.signal,
        onProgress: setProgress,
      })
      setPosts(result.posts)
      setNotices(result.notices)
      toast.success(`已生成 ${result.posts.length} 条草稿`)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("这一批没有生成完成")
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  async function regenerate(post: PostDraft) {
    const theme = resolveTheme(form.theme, form.hotPicks) || post.hook
    const badgeIndex = Math.max(1, posts.findIndex((item) => item.id === post.id) + 1)
    const controller = new AbortController()
    setBusyId(post.id)
    try {
      const result = await rebuildPost({ post, form, settings, env, theme, signal: controller.signal, badgeIndex })
      setPosts((current) => current.map((item) => (item.id === post.id ? result.post : item)))
      if (result.notice) toast.message(result.notice)
      else toast.success("这一条已重新生成")
    } catch {
      toast.error("这一条没有重新生成")
    } finally {
      setBusyId(null)
    }
  }

  async function publish(post: PostDraft) {
    const receipt = await publishForDemo({ status: `${post.copy}\n${formatTopicLine(post.topics)}`, imageDataUrl: post.imageDataUrl })
    const nickname = nicknameOf(form.positionId, form.positionCustom)
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      copy: post.copy,
      topics: post.topics,
      hook: post.hook,
      kicker: post.kicker,
      seed: post.seed,
      layout: post.layout,
      palette: post.palette,
      nickname,
      publishedAt: receipt.publishedAt,
      thumbDataUrl: post.thumbDataUrl || post.imageDataUrl,
    }
    setHistory((current) => [item, ...current].slice(0, 40))
    setPosts((current) => current.map((itemPost) => (itemPost.id === post.id ? { ...itemPost, demoPublishedAt: receipt.publishedAt } : itemPost)))
    toast.success(receipt.message)
    setPublishPost(null)
  }

  async function publishAll() {
    const nickname = nicknameOf(form.positionId, form.positionCustom)
    const items: HistoryItem[] = []
    for (const [index, post] of posts.entries()) {
      const receipt = await publishForDemo({ status: post.copy, imageDataUrl: post.imageDataUrl })
      items.push({
        id: crypto.randomUUID(),
        copy: post.copy,
        topics: post.topics,
        hook: post.hook,
        kicker: post.kicker,
        seed: post.seed,
        layout: post.layout,
        palette: post.palette,
        nickname,
        publishedAt: receipt.publishedAt + index,
        thumbDataUrl: post.thumbDataUrl || (post.imageDataUrl?.startsWith("data:") ? post.imageDataUrl : undefined),
      })
    }
    setHistory((current) => [...items.reverse(), ...current].slice(0, 40))
    setPosts((current) => current.map((post) => ({ ...post, demoPublishedAt: post.demoPublishedAt ?? Date.now() })))
    setPublishAllOpen(false)
    toast.success(`已演示发布 ${posts.length} 条，未实际发送到微博`)
  }

  const nickname = nicknameOf(form.positionId, form.positionCustom)

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="sticky top-0 z-40 border-b border-cinnabar/15 bg-[#f6e4dc] px-4 py-2 text-center text-sm text-seal">
        演示模式 · 不会登录或发布到微博
      </div>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-cinnabar font-serif text-lg text-white">微</div>
          <div>
            <h1 className="font-serif text-2xl leading-none">微博内容工坊</h1>
            <p className="mt-1 text-sm text-muted">文案、配图与话题，一次成批</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="shrink-0" aria-label="模型设置" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-4" />
          <span className="hidden sm:inline">模型设置</span>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-10 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[22.5rem_minmax(0,1fr)]">
        <SetupPanel
          form={form}
          settings={settings}
          env={env}
          running={running}
          hotItems={hotItems}
          hotLoading={hotLoading}
          hotError={hotError}
          hotNote={hotNote}
          hotLive={hotLive}
          hotQuery={hotQuery}
          onForm={setForm}
          onSettings={setSettings}
          onQuery={setHotQuery}
          onRefresh={() => void refreshHot()}
          onGenerate={() => void generate()}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <section className="min-w-0">
          {notices.length ? (
            <div className="mb-4 space-y-2">
              {notices.map((notice) => (
                <p key={notice} className="rounded-2xl bg-amberbg px-4 py-3 text-sm leading-6 text-amber">
                  {notice}
                </p>
              ))}
            </div>
          ) : null}
          {running && progress ? (
            <div className="mb-4 rounded-3xl border border-line bg-card p-5">
              <ol className="grid gap-3 sm:grid-cols-3">
                {[
                  ["copy", "生成文案"],
                  ["image", "配图"],
                  ["topics", "话题"],
                ].map(([id, label], index) => {
                  const order = ["copy", "image", "topics"]
                  const current = order.indexOf(progress.phase)
                  const state = index < current ? "done" : index === current ? "now" : "wait"
                  return (
                    <li key={id} className={`rounded-2xl px-3 py-3 text-sm ${state === "now" ? "bg-cinnabar text-white" : state === "done" ? "bg-moss/10 text-moss" : "bg-paper text-muted"}`}>
                      {index + 1}. {label}
                    </li>
                  )
                })}
              </ol>
              <p className="mt-3 text-sm text-muted">{progress.detail}</p>
            </div>
          ) : null}
          {posts.length === 0 && !running ? (
            <div className="rounded-3xl border border-dashed border-line bg-card/70 px-6 py-16 text-center">
              <p className="font-serif text-3xl">先给这一批一个题目</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">选一个示例，或从热榜勾几条填进主题。大约几秒后，你会得到可编辑的文案、话题，以及可以直接下载的海报。</p>
            </div>
          ) : null}
          {posts.length > 0 ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg">本批 {posts.length} 条</h2>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setPublishAllOpen(true)}>
                    全部演示发布
                  </Button>
                  <Button type="button" variant="quiet" onClick={() => void exportBatch(posts, resolveTheme(form.theme, form.hotPicks) || "草稿")}>
                    导出全部
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {posts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={index}
                    busy={busyId === post.id}
                    onChange={(patch) => setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, ...patch } : item)))}
                    onRegen={() => void regenerate(post)}
                    onDownload={() => {
                      if (!post.imageDataUrl?.startsWith("data:")) {
                        toast.error("这张配图还没准备好")
                        return
                      }
                      downloadDataUrl(post.imageDataUrl, `微博配图-${String(index + 1).padStart(2, "0")}-${safeFilePart(post.hook)}.png`)
                    }}
                    onCopy={() => {
                      void copyText(`${post.copy}\n\n${formatTopicLine(post.topics)}`).then(() => toast.success("文案已复制"))
                    }}
                    onPublish={() => setPublishPost(post)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </section>
        </div>
        <section className="mt-6 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">发布记录</h2>
            {history.length ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setClearOpen(true)}>
                <Trash2 className="size-4" /> 清空
              </Button>
            ) : null}
          </div>
          {history.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted">还没有演示发布。点卡片上的「演示发布」，记录会留在这台浏览器里，不会发到微博。</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {history.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  {item.thumbDataUrl ? <img src={item.thumbDataUrl} alt="" className="size-16 rounded-xl object-cover" /> : <div className="size-16 rounded-xl bg-paper" />}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{formatTime(item.publishedAt)}</span>
                      <span>{item.nickname}</span>
                      <span className="rounded-full bg-amberbg px-2 py-0.5 text-amber">演示</span>
                    </div>
                    <p className="mt-1 text-sm leading-6">{item.copy}</p>
                    <p className="mt-1 text-xs text-cinnabar">{formatTopicLine(item.topics)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <PublishDialog post={publishPost} nickname={nickname} open={Boolean(publishPost)} onOpenChange={(open) => { if (!open) setPublishPost(null) }} onConfirm={() => { if (publishPost) void publish(publishPost) }} />
      <Modal open={publishAllOpen} onOpenChange={setPublishAllOpen} title="全部演示发布" description={`将把当前 ${posts.length} 条写入演示发布记录。内容不会发送到微博。`}>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setPublishAllOpen(false)}>取消</Button>
          <Button type="button" onClick={() => void publishAll()}>确认写入记录</Button>
        </div>
      </Modal>
      <Modal open={clearOpen} onOpenChange={setClearOpen} title="清空发布记录" description="只删除这台浏览器里的演示记录。">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setClearOpen(false)}>取消</Button>
          <Button type="button" onClick={() => { setHistory([]); setClearOpen(false) }}>清空</Button>
        </div>
      </Modal>
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        env={env}
        onOpenChange={setSettingsOpen}
        onChange={setSettings}
        onSave={() => {
          saveSettings(settings)
          setSettingsOpen(false)
          toast.success("模型设置已留在本机")
        }}
      />
      <Toaster position="top-center" offset={72} />
    </div>
  )
}
