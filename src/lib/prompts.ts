import { ANGLES, posterCaption } from "./copy"
import { clipChars } from "./format"
import { paletteHint } from "./posters"
import { positionLabel } from "./presets"
import type { StudioForm } from "../types"

export function buildTextMessages(input: {
  form: StudioForm
  theme: string
  angleId: string
  avoid: string[]
}) {
  const angle = ANGLES.find((item) => item.id === input.angleId) ?? ANGLES[0]
  const fixed = input.form.fixedTopics.filter(Boolean)
  const hot = input.form.hotPicks.filter(Boolean)
  const system = [
    "你是微博文案编辑。只输出一个 JSON 对象，不要 Markdown。",
    "字段：copy（简体中文微博正文，80到140个字，含标点，不要出现#），topics（2到4个话题，不要带#，每个2到12个字），hook（海报主标题，4到12个汉字），kicker（2到4个字的栏目名）。",
    "文案要具体，有明确判断和动作，不要空话，不要声称已经发布。",
    "必须写入用户给的固定话题和热点词，话题数组里也要包含它们。",
  ].join("")
  const user = [
    `账号定位：${positionLabel(input.form.positionId, input.form.positionCustom)}`,
    `主题：${input.theme}`,
    `语气：${input.form.tone}`,
    `本条结构：${angle.brief}`,
    fixed.length ? `固定话题（必须保留）：${fixed.join("、")}` : "没有额外固定话题。",
    hot.length ? `必须自然写进这些热点，不要生硬堆砌：${hot.join("、")}` : "没有指定热点。",
    input.avoid.length ? `不要复用这些开头：${input.avoid.join(" / ")}` : "",
    "现在输出 JSON。",
  ]
    .filter(Boolean)
    .join("\n")
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ]
}

export function buildCoverPrompt(hook: string, theme: string, kicker: string, paletteIndex: number, hot: string[] = []): string {
  const title = clipChars(hook, 12)
  const subtitle = posterCaption(theme, hot)
  return `竖版3:4微博封面海报，印刷级平面设计，不是照片拼贴，不是界面截图。主标题必须准确写成「${title}」。副标题只写「${subtitle}」。栏目小字「${kicker}」。${paletteHint(paletteIndex)}大字排版，留白充足，几何色块或印章，杂志感。不要水印，不要二维码，不要乱码，不要英文假字。`
}
