import { Search } from "lucide-react"
import { toast } from "sonner"
import { topicsFromTitles } from "../lib/copy"
import { parseTopicInput, unique } from "../lib/format"
import { POSITIONS, THEME_PRESETS, TONES } from "../lib/presets"
import { filterHot } from "../providers/hot"
import { HOT_SOURCES, IMAGE_PROVIDERS, TEXT_PROVIDERS, type EnvStatus, type HotItem, type ProviderSettings, type StudioForm } from "../types"
import { Button, Input, RangeSlider, Textarea } from "./ui"

export function SetupPanel({
  form,
  settings,
  env,
  running,
  hotItems,
  hotLoading,
  hotError,
  hotNote,
  hotLive,
  hotQuery,
  onForm,
  onSettings,
  onQuery,
  onRefresh,
  onGenerate,
  onOpenSettings,
}: {
  form: StudioForm
  settings: ProviderSettings
  env: EnvStatus
  running: boolean
  hotItems: HotItem[]
  hotLoading: boolean
  hotError: string
  hotNote: string
  hotLive: boolean
  hotQuery: string
  onForm: (form: StudioForm) => void
  onSettings: (settings: ProviderSettings) => void
  onQuery: (query: string) => void
  onRefresh: () => void
  onGenerate: () => void
  onOpenSettings: () => void
}) {
  const shown = settings.hotSource === "custom" ? hotItems : filterHot(hotItems, hotQuery)
  const textReady =
    settings.textProviderId === "local" ||
    (settings.textProviderId === "deepseek" ? Boolean(settings.deepseek.apiKey.trim() || env.deepseek) : Boolean(settings.openaiChat.apiKey.trim() || env.openaiChat))
  const imageReady =
    settings.imageProviderId === "local" ||
    (settings.imageProviderId === "doubao" ? Boolean(settings.doubao.apiKey.trim() || env.doubao) : Boolean(settings.openaiImage.apiKey.trim() || env.openaiImage))

  function fillHot() {
    if (!form.hotPicks.length) return
    const topics = topicsFromTitles(form.hotPicks).slice(0, 3)
    onForm({
      ...form,
      theme: form.hotPicks.join("、"),
      fixedTopics: unique([...topics, ...form.fixedTopics]).slice(0, 4),
    })
    toast.success("已把所选热点填入主题")
  }

  return (
    <aside className="rounded-3xl border border-line bg-card p-4 shadow-[0_10px_30px_rgba(60,32,12,0.04)] lg:sticky lg:top-14 lg:max-h-[calc(100dvh-4.5rem)] lg:overflow-auto">
      <p className="text-xs tracking-[0.18em] text-cinnabar">从示例开始</p>
      <div className="mt-3 grid gap-2">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="rounded-2xl border border-line px-3 py-3 text-left hover:border-cinnabar/50"
            onClick={() =>
              onForm({
                ...form,
                positionId: preset.positionId,
                theme: preset.theme,
                tone: preset.tone,
                fixedTopics: preset.topics,
              })
            }
          >
            <div className="font-medium">{preset.title}</div>
            <div className="mt-1 text-xs leading-5 text-muted">{preset.blurb}</div>
          </button>
        ))}
      </div>

      <label className="mt-5 block text-sm font-medium">账号定位</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {POSITIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={form.positionId === item.id}
            className={`rounded-full px-3 py-1.5 text-sm ${form.positionId === item.id ? "bg-ink text-white" : "bg-paper text-ink"}`}
            onClick={() => onForm({ ...form, positionId: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>
      {form.positionId === "custom" ? (
        <Input className="mt-2" aria-label="自定义定位" placeholder="例如：城市观察、品牌内容" value={form.positionCustom} onChange={(event) => onForm({ ...form, positionCustom: event.target.value })} />
      ) : null}

      <section className="mt-5 rounded-2xl bg-paper p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">搜索网络热点</h2>
          <span className="text-xs text-muted">{hotLive ? "实时" : "非实时"}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {HOT_SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={settings.hotSource === item.id}
              className={`rounded-full px-2.5 py-1 text-xs ${settings.hotSource === item.id ? "bg-cinnabar text-white" : "bg-white text-ink"}`}
              onClick={() => onSettings({ ...settings, hotSource: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
        {settings.hotSource === "custom" ? (
          <div className="mt-2 grid gap-2">
            <Input aria-label="热榜接口地址" placeholder="https://example.com/hot" value={settings.hotUrl} onChange={(event) => onSettings({ ...settings, hotUrl: event.target.value })} />
            <Input aria-label="热榜密钥" type="password" autoComplete="off" placeholder="可选 API Key" value={settings.hotApiKey} onChange={(event) => onSettings({ ...settings, hotApiKey: event.target.value })} />
          </div>
        ) : null}
        <div className="mt-2 flex gap-2">
          <Input aria-label="筛选热点" placeholder={settings.hotSource === "custom" ? "搜索关键词" : "筛选已加载的热榜"} value={hotQuery} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onRefresh() }} />
          <Button type="button" variant="outline" className="shrink-0" onClick={onRefresh} disabled={hotLoading}>
            <Search className="size-4" />
            {settings.hotSource === "custom" ? "搜索" : "刷新"}
          </Button>
        </div>
        {hotError ? <p className="mt-2 text-xs leading-5 text-amber">{hotError} 你可以继续点选下面的离线样本，或自己写主题。</p> : null}
        {hotNote ? <p className="mt-2 text-xs leading-5 text-muted">{hotNote}</p> : null}
        <div className="mt-2 max-h-56 space-y-1 overflow-auto">
          {hotLoading ? <p className="px-1 py-3 text-sm text-muted">正在拉取热榜…</p> : null}
          {!hotLoading && shown.length === 0 ? <p className="px-1 py-3 text-sm text-muted">没有匹配的条目。换个词，或直接把想写的内容填进主题。</p> : null}
          {shown.map((item) => {
            const checked = form.hotPicks.includes(item.title)
            return (
              <label key={`${item.source}-${item.title}`} className="flex cursor-pointer items-start gap-2 rounded-xl px-1 py-1.5 hover:bg-white">
                <input
                  type="checkbox"
                  className="mt-1 accent-cinnabar"
                  checked={checked}
                  onChange={() => {
                    if (checked) onForm({ ...form, hotPicks: form.hotPicks.filter((title) => title !== item.title) })
                    else if (form.hotPicks.length >= 4) return
                    else onForm({ ...form, hotPicks: [...form.hotPicks, item.title] })
                  }}
                />
                <span className="min-w-0 flex-1 text-sm leading-5">{item.title}</span>
                <span className="shrink-0 text-xs text-muted">{item.heat}</span>
              </label>
            )
          })}
        </div>
        <Button type="button" variant="quiet" className="mt-2 w-full" disabled={!form.hotPicks.length} onClick={fillHot}>
          用所选热点填入主题{form.hotPicks.length ? `（${form.hotPicks.length}）` : ""}
        </Button>
      </section>

      <label className="mt-5 block text-sm font-medium" htmlFor="theme">
        主题 / 关键词
      </label>
      <Textarea id="theme" className="mt-2" rows={3} placeholder="写一个主题，或从上面的热点填入" value={form.theme} onChange={(event) => onForm({ ...form, theme: event.target.value })} />

      <p className="mt-4 text-sm font-medium">语气</p>
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-full bg-paper p-1">
        {TONES.map((tone) => (
          <button key={tone} type="button" aria-pressed={form.tone === tone} className={`rounded-full py-1.5 text-sm ${form.tone === tone ? "bg-white shadow" : "text-muted"}`} onClick={() => onForm({ ...form, tone })}>
            {tone}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-medium">条数</span>
        <span>{form.count}</span>
      </div>
      <RangeSlider value={form.count} min={1} max={12} onChange={(count) => onForm({ ...form, count })} />

      <label className="mt-4 block text-sm font-medium" htmlFor="fixed">
        要带的固定话题
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {form.fixedTopics.map((topic) => (
          <button key={topic} type="button" className="rounded-full bg-amberbg px-2.5 py-1 text-xs text-seal" onClick={() => onForm({ ...form, fixedTopics: form.fixedTopics.filter((item) => item !== topic) })}>
            #{topic}# ×
          </button>
        ))}
      </div>
      <Input
        id="fixed"
        className="mt-2"
        placeholder="输入后回车，例如 数据要素"
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          const topics = parseTopicInput(event.currentTarget.value)
          if (!topics.length) return
          onForm({ ...form, fixedTopics: unique([...form.fixedTopics, ...topics]).slice(0, 4) })
          event.currentTarget.value = ""
        }}
      />

      <div className="mt-5 space-y-3">
        <ProviderRow label="文案" options={TEXT_PROVIDERS} value={settings.textProviderId} onChange={(textProviderId) => onSettings({ ...settings, textProviderId })} />
        {!textReady ? <p className="text-xs leading-5 text-amber">这个文案来源还没有密钥。批量生成会自动改用本地模板。</p> : null}
        <ProviderRow label="配图" options={IMAGE_PROVIDERS} value={settings.imageProviderId} onChange={(imageProviderId) => onSettings({ ...settings, imageProviderId })} />
        {!imageReady ? <p className="text-xs leading-5 text-amber">这个配图来源还没有密钥。批量生成会自动改用本地海报。</p> : null}
        <button type="button" className="text-sm text-cinnabar underline-offset-2 hover:underline" onClick={onOpenSettings}>
          模型设置
        </button>
      </div>

      <div className="mt-4">
        <Button type="button" size="lg" className="w-full" disabled={running} onClick={onGenerate}>
          {running ? "正在生成…" : "批量生成"}
        </Button>
      </div>
    </aside>
  )
}

function ProviderRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            className={`rounded-full px-3 py-1.5 text-xs ${value === item.id ? "bg-ink text-white" : "bg-paper text-ink"}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
