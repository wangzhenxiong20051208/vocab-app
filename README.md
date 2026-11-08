# 单词本微信小程序

用于管理词本、录入单词、背诵复习、听词和查看学习统计。仓库包含小程序前端、图片资源、PDF 导出与语音合成云函数，以及依赖清单和锁文件。

仓库地址：https://github.com/wangzhenxiong20051208/vocab-app

## 在另一台电脑开始开发

准备 Git、Node.js（含 npm）和微信开发者工具，然后执行：

```bash
git clone https://github.com/wangzhenxiong20051208/vocab-app.git
cd vocab-app
npm ci
```

在微信开发者工具中选择“导入项目”，导入克隆后的 **vocab-app 根目录**（有 `project.config.json` 的那一层）。根配置已指定 `miniprogram/` 为小程序目录、`cloudfunctions/` 为云函数目录。前端使用微信原生小程序，不需要另外安装前端框架。

配置中保留原项目 AppID。使用该 AppID 的队友需要由小程序管理员添加为开发成员；自行试验可使用自己的 AppID，并相应配置自己的云环境。GitHub 协作者权限与微信开发成员权限分别管理。

## 项目结构

```text
vocab-app/
├── miniprogram/                # 小程序前端
│   ├── pages/                  # 词本、单词录入、学习、复习、听词、导出、统计
│   ├── utils/                  # 本地存储与复习逻辑
│   ├── images/                 # 界面图片
│   ├── app.js
│   └── app.json
├── cloudfunctions/
│   ├── generatePdf/            # PDF 导出云函数
│   └── tts/                    # 腾讯云语音合成云函数
├── project.config.json        # 根项目导入配置
├── package.json               # miniprogram-ci 工具依赖
└── package-lock.json
```

## 云函数配置

词本和学习记录目前使用微信本地存储。GitHub 同步代码，不会同步手机或开发者工具中的词本、学习记录，也不会自动部署小程序和云函数。

需要 PDF 导出或云端语音合成时：

1. 在微信开发者工具中开通或选择自己的云开发环境，将 `miniprogram/app.js` 中的 `your-env-id` 替换为实际环境 ID。
2. 分别在 `cloudfunctions/generatePdf/` 和 `cloudfunctions/tts/` 中执行 `npm ci`，或在开发者工具中选择云端安装依赖并部署对应云函数。
3. 使用腾讯云 TTS 时，在云函数环境变量中配置 `TTS_SECRET_ID` 和 `TTS_SECRET_KEY`，并开通相应服务。密钥不要写入源码或提交到 GitHub。

当前源码仍使用云环境占位值；上传仓库不代表云功能已部署或完成真机验证。PDF 中文字体支持也需要单独验证，当前仓库未包含中文字库。

## 多电脑更新代码

每次开始工作前，在项目目录运行：

```bash
git status
git pull --ff-only
```

完成修改并在微信开发者工具中编译检查后：

```bash
git status
git diff
# 将本次完成的文件逐个加入暂存区，例如：
git add miniprogram/pages/index/index.js
git diff --cached
git commit -m "说明这次修改的内容"
git push
```

另一台电脑执行 `git pull --ff-only` 即可取得已推送版本。切换电脑前，先提交并推送当前修改；如有未提交修改或双方同时改动，先保留修改并处理合并冲突，不要强推或覆盖文件。

## 队友共同开发

仓库是公开的，任何人都能查看和克隆。让队友直接向本仓库推送，需要仓库所有者在 GitHub 的 **Settings → Collaborators → Add people** 中邀请对方，队友接受邀请后再使用自己的 GitHub 账号登录 Git。

多人开发建议每个功能使用独立分支：

```bash
git switch main
git pull --ff-only
git switch -c feature/your-feature
# 修改、编译检查、git add、git commit
git push -u origin feature/your-feature
```

然后在 GitHub 创建 Pull Request，审阅并合并到 `main`。合并后，其他电脑或队友切回 `main` 并执行 `git pull --ff-only`。未获得直接写权限的队友也可以 Fork 后提交 Pull Request。

## 提交范围

上传源码、界面资源、公共项目配置及 `package-lock.json`。`node_modules/`、`miniprogram_npm/`、`project.private.config.json`、密钥、日志、缓存和编辑器本机配置由 `.gitignore` 排除，保留在本机；依赖用 `npm ci` 恢复。
