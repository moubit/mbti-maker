# 万能MBTI生成器

把字母、倾向、题目和评语换成自己的想法，制作一份可以离线打开、也可以直接部署的倾向测试。

[在线使用](https://moubit.github.io/universal-mbti-generator/) · [下载单 HTML](https://github.com/moubit/universal-mbti-generator/releases/latest/download/universal-mbti-generator.html) · [下载部署 ZIP](https://github.com/moubit/universal-mbti-generator/releases/latest/download/universal-mbti-generator-site.zip) · [所有版本](https://github.com/moubit/universal-mbti-generator/releases)

[![部署到 EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fmoubit%2Funiversal-mbti-generator)

## 不需要写代码

1. 打开在线页面，或下载 HTML 后双击打开。
2. 点击右上角「编辑」，修改页面信息、字母、倾向、题目和评语。
3. 在预览区切换首页、题目和结果，或点击「完整试答」。
4. 点击「导出与部署」，下载 HTML、静态部署 ZIP 或配置 JSON。

单 HTML 内含完整程序、样式和模板，核心操作不依赖网络、CDN、账号或服务器。下载的 HTML 可以继续编辑，也可以关闭编辑入口，只用于答题。

手机浏览器可以在线答题和编辑；手机系统对下载的 HTML 文件打开方式各不相同，本地双击使用建议在桌面浏览器完成。

## 能编辑什么

| 区域       | 能力                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| 页面信息   | 名称、大标题、介绍、按钮、结果引导语、说明、主题色                               |
| 字母与倾向 | 1–12 个维度，每维两个倾向；字母/短编码、名称、解释、排序、主编码或后缀、平分规则 |
| 题库       | 增删、复制、排序、搜索、维度归属、同意时倾向、权重、必出题、单题量表文案         |
| 答题设置   | 5/7 档量表、每页题数、全部出题或两侧平衡抽题、随机顺序                           |
| 结果与评语 | 默认组合倾向解释，按需填写组合专属名称和评语，预览任意结果                       |
| 作者署名   | 原项目作者、项目作者，两项独立编辑、隐藏或删除                                   |

支持答题进度恢复、复制结果、下载 PNG 分享图和最近 60 步编辑历史。原项目作者默认填入「@某bit」，项目作者默认填入「你的名字」。分享图遵循同一份署名设置。

默认提供四维、16 题的「生活方式测试」，包含生活节奏、能量来源、探索偏好、判断方式；同时内置「MPTI 手机倾向」和空白起点。MPTI 模板仅保留问卷、倾向和结果评语，不包含机型库、产品推荐或统计后台。它使用通用评分规则，平分策略在维度设置里明确指定。

## 保存与发布

- **保存草稿**：只保存到当前浏览器。编辑器会自动保存，也可以手动保存。
- **完整试答**：在当前页面体验草稿，不改变公开网站。
- **下载 JSON**：备份内容，导入到另一份生成器继续编辑。
- **下载 HTML**：将当前内容写入一份新文件，可以离线打开和分享。
- **下载 ZIP**：生成根目录包含 `index.html` 的静态网站部署包。

浏览器无法保证对原 HTML 文件直接覆写，因此以「下载新版 HTML」作为保存文件的方式。缓存被清理、隐私模式或浏览器限制可能导致草稿无法保存；重要修改请下载 JSON 备份。导出不包含答题记录或浏览器草稿。

每个项目的草稿与发布内容分开保存。新发布内容与旧草稿不一致时，编辑器会提示恢复或备份旧草稿，不会自动用旧草稿覆盖发布内容。隐藏编辑入口是展示设置，不是权限控制；本项目没有写入远端内容的接口。

## 部署

### 上传 ZIP

在编辑器导出「静态部署包 ZIP」，在 [EdgeOne 的直接上传入口](https://pages.edgeone.ai/document/direct-upload) 创建项目并上传文件。ZIP 根目录已经包含 `index.html`，无需安装 Node.js 或运行构建。

更新网站时重新导出并上传。EdgeOne 的直接上传和 Git 集成是不同的项目创建方式，选择直接上传后，如需改成 Git 自动部署，需要创建新的 Git 集成项目。

### 从 GitHub 模板部署

使用本仓库的 **Use this template** 创建自己的仓库，然后：

1. 在编辑器制作测试并导出 JSON。
2. 将仓库根目录的 `template.json` 替换为自己的配置，文件名保持不变。
3. 选择部署方式：
   - **EdgeOne**：导入仓库，构建命令 `npm run build`，输出目录 `dist`。
   - **GitHub Pages**：仓库 Settings → Pages → Source 选择 **GitHub Actions**；启用 Actions 后，推送到 `main` 自动验证、构建和部署。
   - **其他静态托管**：上传构建后的 `dist` 内容。

页面采用哈希路由和内嵌资源，支持 GitHub Pages 的仓库子路径，不需要服务器重写规则或环境变量。

## 本地开发

需要 Node.js 22.12+，建议使用 Node.js 24。

```sh
npm ci
npm run build
npm run dev
```

开发服务器中的 HTML/ZIP 导出读取最近一次构建的程序资源。修改程序代码后，需要再次运行 `npm run build`；通过编辑器修改的配置会在导出时直接写入，不需要重建。正式发行的 HTML 不需要这个步骤。

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:browser
```

浏览器测试覆盖 Chromium 桌面、Chromium 手机视口和 WebKit，包括评分流程、断网使用、HTML 再导出、ZIP 内容、署名删除、草稿隔离和导入文本处理。手机视口模拟不等同于所有真机浏览器验证。

构建产物：

```text
dist/                                  静态部署目录
release/万能MBTI生成器.html              本地使用的单文件
release/universal-mbti-generator.html   GitHub 发行文件
release/universal-mbti-generator-site.zip
release/template.json
```

## 项目结构

```text
src/core.mjs           配置校验、评分、抽题、答题恢复
src/Player.jsx         首页、答题、结果与分享图
src/Editor.jsx         内容编辑、实时预览、本地草稿
src/document.mjs       HTML 文档与配置序列化
src/export.mjs         HTML / ZIP / JSON 下载
src/templates/         通用示例与精简 MPTI 模板
scripts/build.mjs      单文件与部署包构建
template.json          当前公开网站的默认内容
tests/                 核心逻辑和浏览器测试
```

评分规则和配置结构见 [配置说明](docs/configuration.md)。项目采用 React + Vite 开发，通过 esbuild 将正式程序和样式内嵌到 HTML。两种交付形式使用相同的评分和编辑器代码。

## 关于测试与授权

这是一个用于娱乐、自我探索和自定义问卷的生成工具，不是官方 MBTI 测评，也不是经过心理测量学验证的诊断工具。

代码与内置模板采用 [MIT License](LICENSE)。页面中的两项作者署名都可自由删除；软件及第三方依赖的许可声明随发行文件保留。第三方声明见 [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)。

原项目作者：[@某bit](https://space.bilibili.com/30348237)。
