/** Reserved Weibo publish adapter. Live posting is intentionally disabled. */

export interface WeiboStatusDraft {
  status: string
  imageDataUrl?: string
}

export interface WeiboPublishResult {
  ok: false
  sent: false
  blocked: true
  message: string
}

export const WEIBO_PUBLISH_ENABLED: boolean = false

export const weiboPublishAdapter = {
  id: "weibo" as const,
  enabled: WEIBO_PUBLISH_ENABLED,
  label: "微博开放平台（未接入）",
  async publish(draft: WeiboStatusDraft): Promise<WeiboPublishResult> {
    void draft.status
    return {
      ok: false,
      sent: false,
      blocked: true,
      message: "微博发布接口只做预留，演示版不会登录，也不会发帖。",
    }
  },
}

export interface DemoReceipt {
  ok: true
  sent: false
  channel: "demo"
  message: string
  publishedAt: number
}

export async function publishForDemo(draft: WeiboStatusDraft): Promise<DemoReceipt> {
  if (WEIBO_PUBLISH_ENABLED) {
    const blocked = await weiboPublishAdapter.publish(draft)
    throw new Error(blocked.message)
  }
  void draft.imageDataUrl
  return {
    ok: true,
    sent: false,
    channel: "demo",
    message: "演示发布成功，未实际发送到微博",
    publishedAt: Date.now(),
  }
}
