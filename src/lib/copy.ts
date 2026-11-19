import { clipChars, cleanTopic, countChars, unique } from "./format"
import { mulberry32, shuffle } from "./rng"
import type { PositionId, Tone } from "../types"

export interface Angle {
  id: string
  kicker: string
  brief: string
  hooks: string[]
}

export const ANGLES: Angle[] = [
  {
    id: "counter",
    kicker: "看法",
    brief: "先指出一个常见误解，再给一个可以核对的判断，最后落到一个最小动作。不要写清单。",
    hooks: ["先别急着下定义", "差的不是概念", "别停在名词上", "这句话说反了"],
  },
  {
    id: "scene",
    kicker: "现场",
    brief: "从一个具体现场写起，只问一个问题，再写出当场可以做的动作。",
    hooks: ["回到那个现场", "问题只有一句", "先把场景写清", "从一次发问开始"],
  },
  {
    id: "steps",
    kicker: "方法",
    brief: "用三步写成可执行的方法，每一步都是动作，不要空泛框架。",
    hooks: ["只留这三步", "一张纸就够", "把动作排开", "三步，不要十页"],
  },
  {
    id: "contrast",
    kicker: "对照",
    brief: "对比两种做法，说明哪一种真的产生结果，并请读者选一种。",
    hooks: ["前后差在哪", "两种做法", "别用忙代替进", "选后面那种"],
  },
  {
    id: "myth",
    kicker: "纠偏",
    brief: "点出一个昂贵误区，说明为什么会空转，并给出停掉什么。",
    hooks: ["这个误区很贵", "先停掉一件事", "别在这里耗", "好看但不顶用"],
  },
  {
    id: "question",
    kicker: "发问",
    brief: "用三个具体问题开头，问题比观点重要，最后告诉读者答得上再往外说。",
    hooks: ["先问自己一句", "你能答上来吗", "问题比观点重要", "三个问题"],
  },
  {
    id: "list",
    kicker: "清单",
    brief: "用很短的核对清单，缺一项就先别扩大范围。",
    hooks: ["出发前对一下", "四项就够了", "别带多余的东西", "先核对再开口"],
  },
  {
    id: "window",
    kicker: "时机",
    brief: "写为什么现在就该做一个小样，而不是等完美方案。",
    hooks: ["窗口就在现在", "现在正好动手", "别等完美", "先交一个小样"],
  },
  {
    id: "review",
    kicker: "复盘",
    brief: "用三行复盘：谁用了、卡在哪、下一步砍掉什么。",
    hooks: ["这周只留三行", "复盘别写成长文", "记住这个变化", "三行就收束"],
  },
  {
    id: "beginner",
    kicker: "入门",
    brief: "写给刚开始的人，只要一个最小起点，不要完整体系。",
    hooks: ["给刚开始的人", "从最小的一格做起", "新手不必求全", "先让别人看懂"],
  },
  {
    id: "standard",
    kicker: "标准",
    brief: "给出一句硬标准，用来判断这件事有没有进展。",
    hooks: ["用一句做判断", "标准要提前说", "别靠感觉推进", "一句就够硬"],
  },
  {
    id: "action",
    kicker: "行动",
    brief: "收成今天就能发出去的一个动作，停在文件夹里不算开始。",
    hooks: ["这周只做一件", "收成一个动作", "从今天开始", "发出去才算数"],
  },
]

interface Lens {
  misread: string
  real: string
  action: string
  unit: string
  place: string
  object: string
}

const LENSES: Record<PositionId, Lens> = {
  data: {
    misread: "多写一份报告",
    real: "口径、授权和责任人写在同一处",
    action: "选一个业务场景做最小闭环",
    unit: "字段",
    place: "项目例会",
    object: "一张权责清楚的表",
  },
  lifestyle: {
    misread: "堆一张好东西清单",
    real: "你为什么留下、为什么会再买",
    action: "只写一件这周真的在用的东西",
    unit: "使用瞬间",
    place: "周末的街上",
    object: "一句说得清的推荐",
  },
  career: {
    misread: "再收藏一套方法",
    real: "明天上午能做完的那一块",
    action: "在日历里留出一段不被打断的时间",
    unit: "任务",
    place: "工位",
    object: "一张只写三行的清单",
  },
  local: {
    misread: "把店名报一遍",
    real: "时段、路线和值不值得专门去",
    action: "选一条你真的走过的路",
    unit: "街角",
    place: "家门口两公里",
    object: "一段能跟着走的路线",
  },
  tech: {
    misread: "追着发布会改标题",
    real: "它改变了哪一个具体动作",
    action: "只用一个产品做一次对照",
    unit: "能力",
    place: "更新日志",
    object: "一条写得清的对照",
  },
  custom: {
    misread: "停在概念本身",
    real: "一个别人能接着做的下一步",
    action: "选一个最小场景先做完",
    unit: "细节",
    place: "日常",
    object: "一句能执行的话",
  },
}

const POSITION_TOPICS: Record<PositionId, string[]> = {
  data: ["数据要素", "数商", "数据资产", "数据合规", "企业数字化", "数据服务"],
  lifestyle: ["生活种草", "真实分享", "好物种草", "日常消费", "使用体验"],
  career: ["职场效率", "工作方法", "时间管理", "职场成长", "深度工作"],
  local: ["本地生活", "城市生活", "周末去处", "城市漫步", "附近的店"],
  tech: ["科技观察", "产品思考", "产业笔记", "新工具", "技术趋势"],
  custom: ["经验分享", "内容笔记", "观点"],
}

const ANGLE_TOPICS: Record<string, string[]> = {
  counter: ["认知差", "说点实话"],
  scene: ["真实场景", "一线观察"],
  steps: ["方法笔记", "可执行"],
  contrast: ["前后差别", "对照"],
  myth: ["常见误区", "避坑"],
  question: ["一个问题", "先问清楚"],
  list: ["清单", "核对"],
  window: ["窗口期", "时机"],
  review: ["周复盘", "复盘"],
  beginner: ["入门", "从零开始"],
  standard: ["判断标准", "什么叫做好"],
  action: ["本周行动", "马上做"],
}

const RELATED: { match: string; topics: string[] }[] = [
  { match: "数据要素", topics: ["数据要素", "数据资产入表", "公共数据", "数据流通"] },
  { match: "数商", topics: ["数商", "数据服务", "数据产品"] },
  { match: "职场", topics: ["职场效率", "工作方法", "职场成长"] },
  { match: "效率", topics: ["时间管理", "深度工作", "个人效率"] },
  { match: "散步", topics: ["城市散步", "城市漫步"] },
  { match: "小店", topics: ["小店发现", "街角小店"] },
  { match: "本地", topics: ["本地生活", "城市生活", "周末去处"] },
  { match: "咖啡", topics: ["城市咖啡", "咖啡日常"] },
  { match: "人工智能", topics: ["人工智能", "AI办公", "新工具"] },
  { match: "会议", topics: ["高效会议", "职场沟通"] },
  { match: "周报", topics: ["周报", "工作方法"] },
]

export interface CopyInput {
  positionId: PositionId
  theme: string
  tone: Tone
  fixedTopics: string[]
  hotTopics: string[]
  angleId: string
  seed: number
}

export interface CopyOutput {
  copy: string
  topics: string[]
  hook: string
  kicker: string
  angleId: string
}

const KEYWORDS: { test: RegExp; topic: string }[] = [
  { test: /数据要素/, topic: "数据要素" },
  { test: /公共数据/, topic: "公共数据" },
  { test: /数据资产/, topic: "数据资产" },
  { test: /数商/, topic: "数商" },
  { test: /知识库/, topic: "知识库" },
  { test: /碎片时间/, topic: "碎片时间" },
  { test: /深度工作/, topic: "深度工作" },
  { test: /会议/, topic: "高效会议" },
  { test: /周报/, topic: "周报" },
  { test: /职场/, topic: "职场效率" },
  { test: /小店/, topic: "小店" },
  { test: /散步|慢慢走/, topic: "城市散步" },
  { test: /咖啡/, topic: "城市咖啡" },
  { test: /人工智能|AI/, topic: "人工智能" },
  { test: /数字化/, topic: "数字化" },
  { test: /本地生活|周末/, topic: "本地生活" },
]

export function collectTitles(theme: string, hot: string[]): string[] {
  const picked = hot.map((item) => item.trim()).filter((item) => countChars(item) >= 2)
  if (picked.length) return picked.slice(0, 4)
  return theme
    .split(/[、,，;；。！？]/)
    .map((item) => item.trim())
    .filter((item) => countChars(item) >= 2)
    .slice(0, 4)
}

export function posterCaption(theme: string, hot: string[]): string {
  const titles = collectTitles(theme, hot)
  const first = titles[0]
  if (!first) return "一件具体的事"
  const parts: string[] = []
  let used = 0
  for (const title of titles) {
    const next = used + countChars(title) + (parts.length ? 1 : 0)
    if (parts.length && next > 22) break
    parts.push(title)
    used = next
  }
  return parts.join("、") || first
}

function keywordInside(text: string): string | null {
  for (const rule of KEYWORDS) {
    if (rule.test.test(text)) return rule.topic
  }
  return null
}

function usableTag(text: string): boolean {
  const topic = cleanTopic(text)
  const length = countChars(topic)
  if (length < 2 || length > 10) return false
  if (/怎么|如何|为什么|是否|能不能|要不要/.test(topic)) return false
  if (/[把被让将从在的了吗呢啊里能要]$/.test(topic)) return false
  return true
}

function inlineTitle(title: string): string | null {
  const text = title.trim()
  if (countChars(text) < 2 || countChars(text) > 16) return null
  if (/把|被|怎么|如何|为什么|如果|是否|能不能/.test(text)) return null
  if (/[的了吗呢啊]$/.test(text)) return null
  return text
}

function nounFor(titles: string[]): string {
  if (titles.length > 1) return "这几件事"
  const title = titles[0] ?? ""
  const key = keywordInside(title)
  if (key) return key
  const inline = inlineTitle(title)
  if (inline && countChars(inline) <= 8) return inline
  return "这件事"
}

function themeName(titles: string[]): string {
  if (titles.length > 1) return "这几件事"
  return inlineTitle(titles[0] ?? "") || "这件事"
}

function intro(titles: string[]): string {
  if (titles.length === 1 && inlineTitle(titles[0] ?? "")) return ""
  const shown: string[] = []
  let used = 0
  for (const title of titles.slice(0, 4)) {
    if (countChars(title) > 22) continue
    const next = used + countChars(title) + (shown.length ? 1 : 0)
    if (shown.length && next > 40) break
    shown.push(title)
    used = next
  }
  if (shown.length === 0) return ""
  if (shown.length === 1) return `要写的是「${shown[0]}」。`
  return `一起看这几件：${shown.join("、")}。`
}

export function topicsFromTitles(titles: string[]): string[] {
  const topics: string[] = []
  for (const title of titles) {
    const whole = cleanTopic(title)
    const tag = usableTag(whole) ? whole : keywordInside(title)
    if (tag && usableTag(tag) && !topics.includes(tag)) topics.push(tag)
  }
  return topics.slice(0, 4)
}

function fitLength(raw: string): string {
  let text = raw.replace(/\s+/g, "").replace(/#[^#]{0,30}#/g, "")
  if (countChars(text) > 140) {
    const sentences = text.match(/[^。！？]+[。！？]?/g) ?? [text]
    let acc = ""
    for (const sentence of sentences) {
      if (countChars(acc + sentence) > 140) break
      acc += sentence
    }
    text = countChars(acc) >= 80 ? acc : `${clipChars(text, 138).replace(/[，、：；]$/u, "")}。`
  }
  if (countChars(text) < 80) {
    const pads = [
      "今天先交一个能给人看的小样，再决定下一步。",
      "这一步做完，再考虑要不要扩大范围。",
      "先写给一个真正会用它的人看。",
      "本周只把这一件推进到底。",
    ]
    const start = (text.codePointAt(0) ?? 0) % pads.length
    for (let offset = 0; offset < pads.length; offset += 1) {
      const pad = pads[(start + offset) % pads.length] ?? pads[0]
      if (countChars(text + pad) >= 80 && countChars(text + pad) <= 140) {
        text += pad
        break
      }
    }
  }
  if (!/[。！？]$/u.test(text)) text += "。"
  if (countChars(text) > 140) text = `${clipChars(text, 139)}。`
  return text
}

interface Ctx {
  theme: string
  focus: string
  lens: Lens
  lead: string
}

function body(angleId: string, tone: Tone, c: Ctx): string {
  const { theme, focus, lens, lead } = c
  if (angleId === "counter") {
    if (tone === "专业") return `${lead}${theme}最容易被当成${lens.misread}。真正要核对的，是${lens.real}。先围绕「${focus}」，${lens.action}。`
    if (tone === "亲和") return `${lead}如果你也觉得${theme}听起来很满、做起来很虚，先别着急。把「${focus}」收成${lens.object}，就已经比大多数人往前了。`
    if (tone === "犀利") return `${lead}${theme}最常见的浪费，是用新名词重复旧动作。不碰「${focus}」的责任和结果，讨论都是空转。要么落地，要么别说。`
    return `${lead}上周有人把和${theme}有关的材料摊开，问我值不值钱。我反问：${focus}出事时先找谁？房间安静了，${lens.object}仍是空的。`
  }
  if (angleId === "scene") {
    if (tone === "专业") return `${lead}在${lens.place}谈到${theme}时，问题其实只有一句：${focus}现在卡在谁手里？把${lens.unit}、负责人和这周动作列开，场面会短很多。`
    if (tone === "亲和") return `${lead}下次在${lens.place}聊起${theme}，不用先做全套背景。你只要说清「${focus}」卡在哪，别人就听得懂，也愿意帮你。`
    if (tone === "犀利") return `${lead}${lens.place}里再谈${theme}，如果没人回答${focus}在谁手上，就散会。没有主人的话题，开再久也只是消耗。`
    return `${lead}那天在${lens.place}，有人忽然提起${theme}。没人争定义，只问${focus}卡在谁那里。问完这一句，空话少了一半。`
  }
  if (angleId === "steps") {
    if (tone === "专业") return `${lead}推进${theme}，我只留三步：写清${focus}服务谁，标出缺的${lens.unit}，约定谁在何时给结果。三步在同一页，比十页框架更容易被执行。`
    if (tone === "亲和") return `${lead}想把${theme}做起来，可以只做三件小事：写下${focus}是给谁的，缺哪一个${lens.unit}，这周谁来收尾。做完这三件，心里就有底了。`
    if (tone === "犀利") return `${lead}${theme}不要再加框架。三步：${focus}给谁用，缺的${lens.unit}是什么，谁对结果负责。写不满这三步，就还没开始。`
    return `${lead}我把${theme}的计划删到只剩三行。${focus}给谁，缺哪个${lens.unit}，周五之前谁交结果。删完才发现，之前那叠纸没有一句能动手。`
  }
  if (angleId === "contrast") {
    if (tone === "专业") return `${lead}同样在做${theme}，一种做法是不断补材料，另一种是盯住${focus}有没有被用起来。前者看起来完整，后者才靠近${lens.real}。这周请选第二种。`
    if (tone === "亲和") return `${lead}做${theme}时，补很多说明会让人安心，可真正有用的是${focus}被用了一次。如果你也在两种做法之间犹豫，先选那个能看见变化的。`
    if (tone === "犀利") return `${lead}${theme}的忙碌有两种。一种在生产材料，一种在让${focus}发生。看不出差别，就是还在用忙代替进展。这周只留第二种。`
    return `${lead}两个团队都在做${theme}。一个做了很厚的材料，一个只盯${focus}被谁用过。月底复盘，厚的那份还在文件夹里，薄的那份已经改过一版。`
  }
  if (angleId === "myth") {
    if (tone === "专业") return `${lead}推进${theme}时，最贵的误区是把时间花在表述上。${focus}如果没有主人、没有边界，讲得越完整越难落地。先补上${lens.real}。`
    if (tone === "亲和") return `${lead}做${theme}很容易不知不觉去打磨说法。如果「${focus}」还没有人负责，我们先停一次无效同步，把${lens.object}补上，会轻松很多。`
    if (tone === "犀利") return `${lead}别再为${theme}筹备一场更好看的同步。${focus}没有主人，就没有进展。先停掉一次会，把责任写清楚，否则全是成本。`
    return `${lead}我曾把${theme}的说法改到第三版，才发现${focus}根本没人认领。那晚我删掉形容词，只留下${lens.object}。第二天，事情才真正动了一下。`
  }
  if (angleId === "question") {
    if (tone === "专业") return `${lead}关于${theme}，先别表态。${focus}的来源能否说清，出了问题找谁，下周能演示什么。三个问题都有答案，再对外沟通会稳很多。`
    if (tone === "亲和") return `${lead}聊${theme}之前，可以先悄悄问自己三句：${focus}从哪来，谁能拍板，下周能给别人看什么。答得上，你就不用再慌。`
    if (tone === "犀利") return `${lead}谈${theme}之前先回答：${focus}从哪来，出问题谁负责，下周演示什么。有一句答不上，就还没资格扩大声量。`
    return `${lead}有人拉我讨论${theme}。我没先讲观点，只问了三句：${focus}从哪来，谁负责，下周看什么。对方笑了一下，说这三句比方案难。`
  }
  if (angleId === "list") {
    if (tone === "专业") return `${lead}这周若要碰${theme}，出发前只核对四件事：对象是谁，${focus}是否可用，风险谁担，结果放在哪。缺任何一项，就先别排大范围沟通。`
    if (tone === "亲和") return `${lead}准备聊${theme}时，口袋里放一张小清单就好：给谁、${focus}能不能用、谁承担风险、结果写在哪。四项齐了，再开口也不迟。`
    if (tone === "犀利") return `${lead}${theme}出门前核对四项：对象、${focus}、风险主人、结果位置。缺一项就别开会。清单若长到需要目录，说明你还没想清楚。`
    return `${lead}我现在谈${theme}，会先在纸上写四格：谁需要、${focus}在不在、风险归谁、结果放哪。有一格是空的，我就把约好的会推迟。`
  }
  if (angleId === "window") {
    if (tone === "专业") return `${lead}${theme}的窗口，往往不是等方案完美才出现。当${focus}已被反复提到、口径却不统一时，就是做小样的时候。先交一版，比等待完整授权更接近结果。`
    if (tone === "亲和") return `${lead}如果${theme}已经被提到好多次，不一定要等全部条件齐。围绕「${focus}」先做一个小样，给一位真正会用的人看，时机就抓在手里了。`
    if (tone === "犀利") return `${lead}${focus}已经被反复提起，还没有统一口径，就是${theme}的窗口。再等一份完美方案，窗口会自己关上。先交小样。`
    return `${lead}我记得${theme}被第三次提起的那个下午。没人缺概念，缺的是${focus}的一个样子。于是我们当周做了小样，讨论终于有了抓手。`
  }
  if (angleId === "review") {
    if (tone === "专业") return `${lead}复盘${theme}，我不写长文，只留三行：${focus}这周被谁用了一次，卡在哪里，下一步砍掉什么。三行写完，${lens.place}上就不必再争方向。`
    if (tone === "亲和") return `${lead}给${theme}做复盘时，三行就够：${focus}被谁用过，哪里卡住，下一步少做哪一件。写短一点，下周才真的看得进去。`
    if (tone === "犀利") return `${lead}${theme}的复盘若超过三行，多半是在掩饰没进展。${focus}谁用了，卡在哪，砍掉什么。写不出就照实写没有，别再包装。`
    return `${lead}周五我只给${theme}写了三行：${focus}被一位同事用了，卡在权限，下周砍掉一次同步。短到有点不好意思，可它比长文更诚实。`
  }
  if (angleId === "beginner") {
    if (tone === "专业") return `${lead}刚接触${theme}，不必先建完整体系。选一个熟悉的场景，把和${focus}相关的${lens.unit}整理到别人能看懂。能看懂，才谈得上往后做大。`
    if (tone === "亲和") return `${lead}如果刚开始碰${theme}，不用一次学完。挑一个你熟悉的场景，用大白话讲给外行听。他听懂了，你就有了真正的起点。`
    if (tone === "犀利") return `${lead}刚做${theme}就想搭体系，通常是在逃避第一个${lens.unit}。先把${focus}整理到外行能看懂。看不懂，就还没入门。`
    return `${lead}我第一次碰${theme}，也想先画一张大图。后来只做了一件小事：把${focus}讲给不懂行的朋友听。他问得越具体，我才越知道自己缺什么。`
  }
  if (angleId === "standard") {
    if (tone === "专业") return `${lead}判断${theme}有没有进展，可以用一句硬标准：离开制作它的人，${focus}是否还能被正确使用。若是否定的，就先补说明、权限和示例。`
    if (tone === "亲和") return `${lead}想知道${theme}到底有没有往前，可以问一句很温柔也很硬的话：人不在时，${focus}还能不能被别人用对。不能的话，我们先把示例补上。`
    if (tone === "犀利") return `${lead}${theme}的标准只留一句：人走了，${focus}还能不能被用对。不能，就别谈推广。先把说明和权限补上，再出来讲话。`
    return `${lead}有人问我${theme}怎样算做成。我想了想，只留一句：制作的人休假那天，${focus}仍能被用对。说完他自己沉默，因为当天就做不到。`
  }
  if (tone === "专业") return `${lead}如果${theme}在清单上停留太久，今天只做一件事：把${focus}写成${lens.object}，发给一位真正会用它的人。发出去，才算开始。`
  if (tone === "亲和") return `${lead}${theme}若已经在清单上躺了一阵，今天不必做完。把${focus}写成${lens.object}，发给一个会用的人。发出去，这件事就活了。`
  if (tone === "犀利") return `${lead}${theme}再停留下去，就只是收藏。今天把${focus}写成${lens.object}并发出去。发不出去，就承认还没开始，别再给自己打勾。`
  return `${lead}我把${theme}从待办里拖了很久。后来只做了一个动作：把${focus}写成${lens.object}，发给会用的人。对方回了一句收到，我才觉得它开始了。`
}

export function buildHook(angle: Angle, focus: string, seed: number): string {
  const generic = angle.hooks[seed % angle.hooks.length] ?? "先写下来"
  if (!usableTag(focus) || countChars(focus) > 6 || focus === "这件事" || focus === "这几件事") return generic
  const crafted = [generic, `${focus}，先落地`, `先看${focus}`]
  const pick = crafted[seed % crafted.length] ?? generic
  if (countChars(pick) < 4 || countChars(pick) > 12 || pick.includes("怎么")) return generic
  return pick
}

export function buildTopics(input: {
  theme: string
  positionId: PositionId
  angleId: string
  fixed: string[]
  hot: string[]
  seed: number
}): string[] {
  const fixed = unique(
    input.fixed.map((topic) => cleanTopic(topic)).filter((topic) => countChars(topic) >= 2 && countChars(topic) <= 12 && !/怎么|如何|为什么|能不能/.test(topic)),
  ).slice(0, 4)
  if (fixed.length >= 4) return fixed
  const rand = mulberry32(input.seed || 1)
  const pool = [
    ...topicsFromTitles(collectTitles(input.theme, input.hot)),
    ...RELATED.filter((item) => input.theme.includes(item.match) || input.hot.some((hot) => hot.includes(item.match))).flatMap((item) => item.topics),
    ...POSITION_TOPICS[input.positionId],
    ...(ANGLE_TOPICS[input.angleId] ?? []),
  ]
  const cleaned = unique(pool.filter((topic) => usableTag(topic)))
  const goal = Math.min(4, Math.max(fixed.length, 2 + Math.floor(rand() * 3)))
  const result = [...fixed]
  for (const topic of shuffle(cleaned, input.seed ^ 0x9e3779b9)) {
    if (result.length >= goal) break
    if (!result.includes(topic)) result.push(topic)
  }
  while (result.length < 2) {
    const spare = result.length === 0 ? "内容笔记" : "经验分享"
    if (!result.includes(spare)) result.push(spare)
    else break
  }
  return result.slice(0, 4)
}

export function generateLocalCopy(input: CopyInput): CopyOutput {
  const angle = ANGLES.find((item) => item.id === input.angleId) ?? ANGLES[0]
  const titles = collectTitles(input.theme, input.hotTopics)
  const theme = themeName(titles)
  const focus = nounFor(titles)
  const lens = LENSES[input.positionId]
  const lead = intro(titles)
  const context = { theme, focus, lens, lead }
  const copy = fitLength(body(angle.id, input.tone, context))
  const topics = buildTopics({
    theme: input.theme,
    positionId: input.positionId,
    angleId: angle.id,
    fixed: input.fixedTopics,
    hot: input.hotTopics,
    seed: input.seed,
  })
  return {
    copy,
    topics,
    hook: buildHook(angle, focus, input.seed),
    kicker: angle.kicker,
    angleId: angle.id,
  }
}

export function mergeTopics(modelTopics: string[], localTopics: string[], fixed: string[], hot: string[]): string[] {
  const cleaned = unique(
    [...fixed, ...topicsFromTitles(hot), ...modelTopics, ...localTopics]
      .map((topic) => cleanTopic(topic))
      .filter((topic) => usableTag(topic) || (countChars(topic) >= 2 && countChars(topic) <= 12 && !/怎么|如何|为什么/.test(topic))),
  )
  const preferred = unique(
    [...fixed, ...topicsFromTitles(hot)].map((topic) => cleanTopic(topic)).filter((topic) => countChars(topic) >= 2 && countChars(topic) <= 12),
  )
  const result = [...preferred]
  for (const topic of cleaned) {
    if (result.length >= 4) break
    if (!result.includes(topic)) result.push(topic)
  }
  return result.slice(0, 4)
}
