# 微博内容工坊

一个在本地运行的微博内容演示站。可以按主题批量生成文案、话题和封面海报，也可以从公开热榜里挑题目再生成。发布按钮只做演示，**不会登录微博，也不会把内容真正发出去**。

第一次打开不需要任何密钥。默认使用本地模板写文案，并在浏览器里绘制海报。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 [http://127.0.0.1:4317](http://127.0.0.1:4317)。

生产构建：

```bash
npm ci
npm run build
npm start
```

`npm start`（和 `npm run preview` 相同）用 Vite preview 提供构建后的页面，并挂上和开发时一样的 `/api` 路由：`/api/hot`、`/api/providers/text`、`/api/providers/image`、`/api/provider-status`。进程监听 `0.0.0.0`，端口读取环境变量 `PORT`；没有 `PORT` 时用 `4317`。`npm run dev` 仍然固定在 `4317`。

可以接受的 Host 包括本机、`*.onrender.com` 和 `gmailchao.xyz`（含其子域名）。只把 `dist/` 丢到静态空间时，本地模板、本地海报和离线热榜样本仍然可用；在线热榜和远程模型需要这个 Node 服务。

## 部署到 Render

仓库根目录的 `render.yaml` 定义一个免费 Node Web Service（`plan: free`）。构建命令是 `npm ci --include=dev && npm run build`，启动命令是 `npm start`。`--include=dev` 是因为 Render 会把 `NODE_ENV` 设为 `production`，这时普通的 `npm ci` 会跳过开发依赖，而构建和启动都需要 TypeScript 和 Vite。

在 [Blueprint 页面](https://dashboard.render.com/blueprint/new?repo=https://github.com/zs954/weibo) 选择本仓库并应用。合并到 `main` 之后再用这个链接，或者在创建时改选包含 `render.yaml` 的分支。

密钥不要写进仓库，也不要写进 `render.yaml`。需要服务端默认密钥时，在 Render Dashboard 里按 `.env.example` 添加环境变量即可；留空也行，页面「模型设置」里填写的密钥优先，并且只存在浏览器本地。不填密钥时，本地模板和本地海报仍然可用。

`gmailchao.xyz` 写在 Blueprint 的 `domains` 里。DNS 需要另外把域名指到这个服务（Render 会签发证书）。免费实例大约空闲 15 分钟后会休眠，下次打开要多等几秒。

## 演示边界

- 没有微博登录，没有微博 SDK，也不保存微博凭证。
- 「演示发布」只把一条记录写进这台浏览器的 localStorage，并提示「演示发布成功，未实际发送到微博」。
- 代码里留有微博发布适配器（`src/providers/weibo.ts`），`WEIBO_PUBLISH_ENABLED` 固定为 `false`。即便打开这个开关，当前实现也只返回“未接入”，不会发帖。
- 草稿、模型密钥和演示记录都只在浏览器本地。密钥不要提交到仓库。

## 批量生成

1. 选一个示例（数据要素 / 职场效率 / 本地生活），或自己写主题。
2. 选账号定位、语气和条数（1–12，默认 6）。需要的话加上固定话题。
3. 点「批量生成」。过程会经过「生成文案 → 配图 → 话题」。
4. 每条都可以改文案和话题，也可以重新生成、下载 PNG 配图、复制文案。
5. 「导出全部」会下载一个 zip，里面是每条文案和配图。

文案大约 80–140 字。本地模板会按不同结构来写，不是只换一个词。

## 切换模型

左侧可以直接切换：

- 文案：本地模板 / DeepSeek / 兼容接口
- 配图：本地海报 / 豆包 / 兼容文生图

「模型设置」里填写模型 ID、Base URL 和 API Key。密钥存在 localStorage。如果这里留空，本地服务器会改用 `.env` 里的环境变量，浏览器看不到密钥原文。

没有密钥，或请求中途失败时，这一条以及后面尚未完成的条目会改用本地模板或本地海报，并给出中文说明。批次不会因此中断。

### DeepSeek（文案，推荐）

1. 在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API Key。
2. 默认模型 `deepseek-flash`，Base URL `https://api.deepseek.com`。
3. 调用的是 OpenAI 兼容的 `POST /chat/completions`，并关闭思考模式以便稳定返回 JSON。
4. 环境变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`。

### 豆包 Seedream（配图，推荐）

1. 在 [火山方舟](https://ark.volcengine.com/region:cn-beijing/apikey) 创建 API Key，并开通图像模型。
2. 默认模型 `doubao-seedream-5-5-261028`（Seedream 5.5）。
3. 接口是方舟图片生成：`POST {ARK_BASE_URL}/images/generations`。  
   文档：[图片生成 API](https://ark.volcengine.com/region:cn-beijing/docs/image-generation-api)。
4. 请求使用竖版 `1728x2304`、`response_format: b64_json`、`watermark: false`。Seedream 5.5 不支持组图参数，所以这里不传 `sequential_image_generation`。
5. 环境变量：`ARK_API_KEY`、`ARK_MODEL`、`ARK_BASE_URL`（默认 `https://ark.cn-beijing.volces.com/api/v3`）。

### OpenAI 兼容槽位

文案槽位把请求发到 `{BASE}/chat/completions`。可以填千问兼容模式、Kimi 或其他兼容地址，例如：

- 千问：`https://dashscope.aliyuncs.com/compatible-mode/v1`，模型名以阿里云文档为准，例如 `qwen-plus`
- Kimi：`https://api.moonshot.cn/v1`，模型名以月之暗面文档为准

配图槽位把请求发到 `{BASE}/images/generations`，字段按 OpenAI Images（`model`、`prompt`、`size`、`response_format`）。协议不同的文生图服务不要硬填这个槽位，需要再加一个适配器。

环境变量见 `.env.example`。把该文件复制为 `.env` 再填写。`.env` 已被 git 忽略。

## 网络热点

左侧「搜索网络热点」可以刷新或筛选热榜，勾选最多 4 条，再点「用所选热点填入主题」。之后照常批量生成，文案和话题会带上这些词。

来源：

| 来源 | 说明 |
| --- | --- |
| 百度热搜 | 默认。请求公开接口 `https://top.baidu.com/api/board?platform=wise&tab=realtime`，不需要登录，也不需要密钥。 |
| 微博热搜 | 尝试公开接口 `https://weibo.com/ajax/side/hotSearch`。不登录、不带 Cookie。该接口经常拒绝机房或未登录访问，失败时会提示，并改显示离线样本。 |
| 自定义接口 | 填写地址后，按 `GET {地址}?q=关键词` 请求。若填写了密钥，放在 `Authorization: Bearer`。也可用环境变量 `HOT_SEARCH_URL`、`HOT_SEARCH_API_KEY`。 |
| 离线样本 | 内置的一组演示题目，不联网。 |

自定义接口最好返回：

```json
{ "items": [{ "title": "话题", "heat": "123万", "url": "https://..." }] }
```

热榜拉不下来时，页面会用中文说明原因，并给出离线样本。主题框始终可以手写。选热点不会自动发布。

## 数据放在哪里

浏览器 localStorage：

- `weibo-studio.v1`：表单、草稿和演示发布记录
- `weibo-studio.providers.v1`：模型与热榜设置，包括你填入的密钥

清除站点数据就会丢掉它们。服务器不保存用户内容。
