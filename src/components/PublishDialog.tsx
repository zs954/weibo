import { toast } from "sonner"
import { formatTopicLine } from "../lib/format"
import type { PostDraft } from "../types"
import { Button, Modal } from "./ui"

export function PublishDialog({
  post,
  nickname,
  open,
  onOpenChange,
  onConfirm,
}: {
  post: PostDraft | null
  nickname: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!post) return null
  const initial = nickname.slice(0, 1) || "微"
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="演示发布"
      description="只在本机留下一条发布记录，不会登录或发送到微博。"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={onConfirm}>
            确认演示发布
          </Button>
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[#ececec] bg-white text-[#333]">
        <div className="flex items-center justify-between border-b border-[#f2f2f2] px-4 py-2 text-xs text-[#999]">
          <span>微博</span>
          <span>演示预览</span>
        </div>
        <div className="flex gap-3 px-4 pt-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#c4452d] text-lg text-white">{initial}</div>
          <div>
            <div className="font-semibold">{nickname}</div>
            <div className="text-xs text-[#939393]">刚刚 · 来自 内容工坊演示</div>
          </div>
        </div>
        <p className="whitespace-pre-wrap px-4 pt-3 text-[15px] leading-7">
          {post.copy}
          <span className="text-[#eb7350]"> {formatTopicLine(post.topics)}</span>
        </p>
        {post.imageDataUrl?.startsWith("data:") ? (
          <img src={post.imageDataUrl} alt="" className="mx-4 mt-3 max-h-52 w-[calc(100%-2rem)] rounded-lg object-cover sm:max-h-80" />
        ) : null}
        <div className="mt-3 grid grid-cols-3 border-t border-[#f3f3f3] text-center text-sm text-[#666]">
          {["转发", "评论", "赞"].map((label) => (
            <button key={label} type="button" className="py-3" onClick={() => toast("这是演示界面，不会和微博发生互动")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">微博发布适配器未启用。确认后只写入这台浏览器里的演示记录。</p>
    </Modal>
  )
}
