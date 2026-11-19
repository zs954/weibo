import type { EnvStatus, ProviderSettings } from "../types"
import { IMAGE_PROVIDERS, TEXT_PROVIDERS } from "../types"
import { Button, Input, Modal } from "./ui"

export function SettingsDialog({
  open,
  settings,
  env,
  onOpenChange,
  onChange,
  onSave,
}: {
  open: boolean
  settings: ProviderSettings
  env: EnvStatus
  onOpenChange: (open: boolean) => void
  onChange: (settings: ProviderSettings) => void
  onSave: () => void
}) {
  const textAuth = settings.textProviderId === "openai-chat" ? settings.openaiChat : settings.deepseek
  const imageAuth = settings.imageProviderId === "openai-image" ? settings.openaiImage : settings.doubao
  const setText = (patch: Partial<typeof textAuth>) => {
    if (settings.textProviderId === "openai-chat") onChange({ ...settings, openaiChat: { ...settings.openaiChat, ...patch } })
    else onChange({ ...settings, deepseek: { ...settings.deepseek, ...patch } })
  }
  const setImage = (patch: Partial<typeof imageAuth>) => {
    if (settings.imageProviderId === "openai-image") onChange({ ...settings, openaiImage: { ...settings.openaiImage, ...patch } })
    else onChange({ ...settings, doubao: { ...settings.doubao, ...patch } })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="模型设置"
      description="密钥只保存在这台浏览器，或由本地开发服务器读取环境变量。不会写入仓库，也不会拿去登录微博。"
      wide
    >
      {!env.proxy ? <p className="mb-3 rounded-xl bg-amberbg px-3 py-2 text-sm text-amber">没有连上本地代理。远程模型需要 npm run dev。本地模板和本地海报不受影响。</p> : null}
      <div className="grid gap-5">
        <section>
          <h3 className="text-sm font-medium">文案模型</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEXT_PROVIDERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={settings.textProviderId === item.id ? "default" : "outline"}
                onClick={() => onChange({ ...settings, textProviderId: item.id })}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {settings.textProviderId !== "local" ? (
            <div className="mt-3 grid gap-2">
              <Input aria-label="文案模型 ID" placeholder="模型 ID" value={textAuth.model} onChange={(event) => setText({ model: event.target.value })} />
              <Input aria-label="文案 Base URL" placeholder="Base URL" value={textAuth.baseUrl} onChange={(event) => setText({ baseUrl: event.target.value })} />
              <Input aria-label="文案 API Key" type="password" autoComplete="off" placeholder="API Key，留空则尝试环境变量" value={textAuth.apiKey} onChange={(event) => setText({ apiKey: event.target.value })} />
              <p className="text-xs text-muted">
                {settings.textProviderId === "deepseek"
                  ? `推荐 deepseek-flash。${env.deepseek ? "服务器环境变量里已有 DeepSeek 密钥。" : "也可在 .env 设置 DEEPSEEK_API_KEY。"}`
                  : "把 Base URL 指到千问、Kimi 或其他 OpenAI Chat Completions 兼容地址。"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">本地模板不需要密钥。</p>
          )}
        </section>
        <section>
          <h3 className="text-sm font-medium">配图模型</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {IMAGE_PROVIDERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={settings.imageProviderId === item.id ? "default" : "outline"}
                onClick={() => onChange({ ...settings, imageProviderId: item.id })}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {settings.imageProviderId !== "local" ? (
            <div className="mt-3 grid gap-2">
              <Input aria-label="配图模型 ID" placeholder="模型 ID" value={imageAuth.model} onChange={(event) => setImage({ model: event.target.value })} />
              <Input aria-label="配图 Base URL" placeholder="Base URL" value={imageAuth.baseUrl} onChange={(event) => setImage({ baseUrl: event.target.value })} />
              <Input aria-label="配图 API Key" type="password" autoComplete="off" placeholder="API Key，留空则尝试环境变量" value={imageAuth.apiKey} onChange={(event) => setImage({ apiKey: event.target.value })} />
              <p className="text-xs text-muted">
                {settings.imageProviderId === "doubao"
                  ? `默认豆包 Seedream 5.5。${env.doubao ? "服务器环境变量里已有方舟密钥。" : "也可在 .env 设置 ARK_API_KEY。"}`
                  : "兼容槽位走 OpenAI Images 的 /images/generations。协议不同的文生图需要另加适配器。"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">本地海报在浏览器里绘制，不需要密钥。</p>
          )}
        </section>
        <section className="rounded-2xl bg-paper px-3 py-3 text-sm text-muted">
          微博发布适配器已预留，当前关闭。演示发布只会写进本机记录。
        </section>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={onSave}>
          保存到本机
        </Button>
      </div>
    </Modal>
  )
}
