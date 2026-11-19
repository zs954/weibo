import JSZip from "jszip"
import { formatStamp, formatTopicLine, safeFilePart } from "./format"
import type { PostDraft } from "../types"

function dataUrlBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",")
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export async function exportBatch(posts: PostDraft[], theme: string) {
  const zip = new JSZip()
  const stamp = formatStamp()
  const folder = zip.folder(`微博内容工坊-${stamp}`)
  if (!folder) throw new Error("无法创建压缩包")
  const lines = ["# 微博内容工坊导出", "", "本文件由演示站导出，未发布到微博。", ""]
  posts.forEach((post, index) => {
    const no = String(index + 1).padStart(2, "0")
    const text = `${post.copy}\n\n${formatTopicLine(post.topics)}\n`
    folder.file(`${no}-文案.txt`, text)
    lines.push(`## ${no}`, "", post.copy, "", formatTopicLine(post.topics), "")
    if (post.imageDataUrl) folder.file(`${no}-配图.png`, dataUrlBytes(post.imageDataUrl))
  })
  folder.file("全部文案.md", lines.join("\n"))
  folder.file("说明.txt", "演示导出。这些内容没有发送到微博，也没有登录微博。\n")
  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `微博内容工坊-${safeFilePart(theme)}-${stamp}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement("textarea")
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand("copy")
    area.remove()
  }
}
