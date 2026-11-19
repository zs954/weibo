import type { HotItem } from "../types"

export const SAMPLE_HOT: HotItem[] = [
  { title: "数据要素入表怎么落地", heat: "样本", url: "", source: "离线样本" },
  { title: "公共数据授权运营", heat: "样本", url: "", source: "离线样本" },
  { title: "企业知识库为什么没人用", heat: "样本", url: "", source: "离线样本" },
  { title: "碎片时间里的深度工作", heat: "样本", url: "", source: "离线样本" },
  { title: "会议太多怎么把半天要回来", heat: "样本", url: "", source: "离线样本" },
  { title: "周报能不能少写一点", heat: "样本", url: "", source: "离线样本" },
  { title: "周末适合慢慢走的城市", heat: "样本", url: "", source: "离线样本" },
  { title: "家门口两公里的小店", heat: "样本", url: "", source: "离线样本" },
  { title: "城市咖啡店的工作日", heat: "样本", url: "", source: "离线样本" },
  { title: "人工智能进了日常办公", heat: "样本", url: "", source: "离线样本" },
  { title: "新工具先替掉哪一个动作", heat: "样本", url: "", source: "离线样本" },
  { title: "本地生活的烟火气", heat: "样本", url: "", source: "离线样本" },
]

export function filterHot(items: HotItem[], query: string): HotItem[] {
  const q = query.trim()
  if (!q) return items
  return items.filter((item) => item.title.includes(q))
}
