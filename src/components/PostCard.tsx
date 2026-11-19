import { Copy, Download, RefreshCw, Send } from "lucide-react"
import { useEffect, useRef } from "react"
import { countChars, formatTopicLine } from "../lib/format"
import type { PostDraft } from "../types"
import { Button, Input } from "./ui"

function sourceLabel(source: string, kind: "copy" | "image") {
  if (kind === "copy") {
    if (source === "deepseek") return "DeepSeek"
    if (source === "openai-chat") return "兼容接口"
    if (source === "local-fallback") return "文案已回退"
    return "本地模板"
  }
  if (source === "doubao") return "豆包"
  if (source === "openai-image") return "兼容文生图"
  if (source === "local-fallback") return "配图已回退"
  return "本地海报"
}

export function PostCard({
  post,
  index,
  busy,
  onChange,
  onRegen,
  onDownload,
  onCopy,
  onPublish,
}: {
  post: PostDraft
  index: number
  busy: boolean
  onChange: (patch: Partial<PostDraft>) => void
  onRegen: () => void
  onDownload: () => void
  onCopy: () => void
  onPublish: () => void
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const node = area.current
    if (!node) return
    node.style.height = "auto"
    node.style.height = `${node.scrollHeight}px`
  }, [post.copy])
  const chars = countChars(post.copy)
  const off = chars < 80 || chars > 140

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_12px_40px_rgba(60,32,12,0.06)]">
      <div className="relative aspect-[3/4] bg-[#efe6da]">
        {post.imageDataUrl?.startsWith("data:") ? (
          <img src={post.imageDataUrl} alt={`${post.hook}的配图`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">{busy ? "正在重绘…" : "配图准备中"}</div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs text-ink">{sourceLabel(post.imageSource, "image")}</span>
        </div>
        {post.demoPublishedAt ? (
          <span className="absolute right-3 top-3 rounded-full bg-moss px-2.5 py-1 text-xs text-white">已演示发布</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {String(index + 1).padStart(2, "0")} · {sourceLabel(post.copySource, "copy")}
          </span>
          <span className={off ? "text-amber" : ""}>
            {chars} 字{off ? " · 建议 80–140" : ""}
          </span>
        </div>
        <textarea
          ref={area}
          aria-label={`第${index + 1}条文案`}
          value={post.copy}
          onChange={(event) => onChange({ copy: event.target.value })}
          className="min-h-28 w-full resize-none bg-transparent text-[15px] leading-7 text-ink outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {post.topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className="rounded-full bg-amberbg px-2.5 py-1 text-xs text-seal"
              onClick={() => onChange({ topics: post.topics.filter((item) => item !== topic) })}
            >
              #{topic}# ×
            </button>
          ))}
        </div>
        <Input
          aria-label="添加话题"
          placeholder="添加话题，回车确认"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            const value = event.currentTarget.value.replace(/#/g, "").trim()
            if (!value || post.topics.includes(value) || post.topics.length >= 6) return
            onChange({ topics: [...post.topics, value.slice(0, 20)] })
            event.currentTarget.value = ""
          }}
        />
        {post.note ? <p className="text-xs text-amber">{post.note}</p> : null}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegen}>
            <RefreshCw className="size-3.5" /> 重新生成
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDownload}>
            <Download className="size-3.5" /> 下载配图
          </Button>
          <Button type="button" variant="quiet" size="sm" onClick={onCopy}>
            <Copy className="size-3.5" /> 复制文案
          </Button>
          <Button type="button" variant="default" size="sm" onClick={onPublish}>
            <Send className="size-3.5" /> 演示发布
          </Button>
        </div>
        <p className="sr-only">{formatTopicLine(post.topics)}</p>
      </div>
    </article>
  )
}
