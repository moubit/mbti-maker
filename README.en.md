# Universal MBTI Generator

[简体中文](README.md) · **English**

Create your own preference test by editing its letters, poles, questions, and feedback. Share it as an offline HTML file or deploy it as a static website.

[Use online](https://moubit.github.io/universal-mbti-generator/) · [Download HTML](https://github.com/moubit/universal-mbti-generator/releases/latest/download/universal-mbti-generator.html) · [Download site ZIP](https://github.com/moubit/universal-mbti-generator/releases/latest/download/universal-mbti-generator-site.zip) · [Releases](https://github.com/moubit/universal-mbti-generator/releases)

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fmoubit%2Funiversal-mbti-generator)

## About the project

Universal MBTI Generator is an open-source **preference-test builder** with a test player and visual editor on the same page. Use it to create quizzes about lifestyles, interests, gaming styles, or community topics. Define a set of dimensions, give each dimension two opposing poles, and write questions that turn answers into a type code, preference percentages, and personalized feedback.

The project grew out of @某bit’s MPTI phone-preference test. This edition makes its questionnaire, scoring, result presentation, and editing capabilities reusable. It leaves out the phone catalog, product recommendations, and analytics backend so that other creators can build independent tests around their own content.

The default example has **4 dimensions and 16 questions**. You can try it immediately or start with a blank four-dimension template. Display codes are separate from the stable IDs that link questions to poles, so changing a letter does not break those links. Results without custom feedback combine the relevant pole descriptions; you can also give any specific combination its own name and full write-up.

Preview the homepage, questions, and results while you edit, or take the entire draft test. Export the same content as a standalone HTML file that works and remains editable offline, or as a static website ZIP ready to upload. Answers and drafts stay in browser storage. The project is intended for individual creators, community organizers, and developers who want a starting point for their own tools.

### Original MPTI test and videos

MPTI stands for **Mobile Phone TI**. This button opens the currently running MPTI website. That site is maintained separately from this generator and its simplified MPTI template.

[![Try the original MPTI test](docs/assets/mpti-button-en.svg)](https://mpti.basebit.top/)

The MPTI test originated from these two phone-buying videos by @某bit. Both videos are in Chinese and open directly on Bilibili:

| Part                      | Video                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Part 1 · Buying basics    | [0基础教会你选手机【上】 — A beginner’s guide to choosing a phone](https://www.bilibili.com/video/BV1Z4he66EDs) |
| Part 2 · Brand commentary | [万字锐评，所有手机品牌【下】 — An in-depth look at phone brands](https://www.bilibili.com/video/BV1MKpj6XEz1)  |

## Get started without coding

1. Open the online app, or download the HTML file and double-click it.
2. Click **Edit** to customize the page, dimensions, questions, and feedback.
3. Switch between the Home, Questions, and Result previews, or click **Try test**.
4. Click **Export** to download HTML, a static site ZIP, or project JSON.

The standalone HTML includes the application, styles, and templates. Its core features work without a network connection, CDN, account, or server. Keep the editor available in your export, or hide it to publish a test-only page.

Mobile browsers support the hosted test and editor. Opening downloaded HTML files varies by mobile operating system; use a desktop browser for the double-click offline workflow.

## Chinese and English interfaces

The default language setting is **Auto**. The app uses the first supported Chinese or English language in the browser’s preference list, falling back to English when neither is listed. Use the language selector to choose **Auto / 中文 / English** at any time. Manual preferences are saved in the current browser.

Switching language changes menus, buttons, instructions, and validation messages. It does **not** translate or modify test titles, questions, scale labels, pole names, result feedback, or author details. It also preserves the current screen, answers, and editing state. The bundled sample content remains in Chinese; authors may write their own content in any language. Language preferences are not included in project JSON. Exported HTML detects the browser language when it is opened.

## What you can customize

| Area               | Features                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Page details       | Name, headline, introduction, button text, result introduction, notice, accent color                                             |
| Dimensions & codes | 1–12 dimensions with two poles each; display codes, names, descriptions, ordering, main codes or suffixes, tie rules             |
| Questions          | Add, duplicate, delete, reorder, search, assign dimensions and poles, set weights and required questions, customize scale labels |
| Test settings      | 5- or 7-point scales, questions per page, all questions or balanced sampling, shuffled order                                     |
| Results & feedback | Combine pole descriptions by default, add custom names and feedback for selected combinations, preview any result                |
| Author credits     | Independently edit, hide, or remove the original author and project author                                                       |

The player supports progress recovery, copying results, and PNG share images. The editor keeps the latest 60 undo steps. The original author defaults to “@某bit” and the project author to “你的名字” (“Your name”). Share images use the same credit settings as the page.

The default lifestyle example covers four dimensions: daily rhythm, energy source, exploration preference, and decision-making style. The editor also includes a simplified MPTI phone-preference template and a blank four-dimension starting point. The MPTI template contains questions and feedback, without the phone catalog, recommendations, or analytics backend. It uses the common scoring model with an explicit tie rule for each dimension.

## Saving and publishing

- **Save draft** saves only in your current browser. Drafts also save automatically.
- **Try test** lets you test the draft without changing the published website.
- **Project JSON** backs up your content for later import.
- **Standalone HTML** writes your current content into a new file for offline use and sharing.
- **Static site ZIP** creates a deployment package with `index.html` at its root.

Downloading a new HTML file is the supported way to save a portable copy; browsers cannot reliably overwrite the file you originally opened. Cleared storage, private browsing, or browser restrictions may prevent draft persistence. Download JSON backups for important changes. Exports exclude answers and browser draft history.

Drafts and published content are stored separately. If an old draft differs from a new published version, the editor offers to restore or back it up instead of silently replacing the published content. Hiding the editor is a presentation option, not access control: this app has no endpoint for writing remote content.

## Deployment

### Upload a ZIP

Export **Static site ZIP**, create a project using [EdgeOne Direct Upload](https://pages.edgeone.ai/document/direct-upload), and upload the file. The archive already has `index.html` at its root. You do not need Node.js or a local build.

To update the site, export and upload a new package. EdgeOne Direct Upload and Git integration are separate project creation modes. Moving from direct uploads to automatic Git deployments requires a new Git-integrated project.

### Deploy from a GitHub template

Choose **Use this template** to create your own repository, then:

1. Create a test in the editor and export its JSON.
2. Replace the repository’s root `template.json` with your configuration, keeping the filename.
3. Choose a deployment method:
   - **EdgeOne:** import the repository, use `npm run build`, and set the output directory to `dist`.
   - **GitHub Pages:** choose **GitHub Actions** under Settings → Pages → Source. Enable Actions; pushes to `main` validate, build, and deploy the site.
   - **Other static hosting:** upload the contents of the built `dist` directory.

Hash routing and embedded assets support GitHub Pages repository subpaths without server rewrite rules or environment variables.

## Local development

Requires Node.js 22.12 or later; Node.js 24 is recommended.

```sh
npm ci
npm run build
npm run dev
```

HTML and ZIP exports from the development server use the latest built application resources. Run `npm run build` again after changing application code. Content edited in the UI is embedded directly on export and does not require a rebuild. Release HTML files work independently of this development step.

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:browser
```

Browser checks cover desktop Chromium, a Chromium mobile viewport, and WebKit. They exercise scoring, offline use, repeated HTML export, ZIP contents, credits, draft isolation, imported text, and language switching. Mobile emulation is not a substitute for testing every physical device.

Build outputs:

```text
dist/                                  Static deployment directory
release/万能MBTI生成器.html              Local standalone HTML
release/universal-mbti-generator.html   GitHub release HTML
release/universal-mbti-generator-site.zip
release/template.json
```

## Project structure

```text
src/core.mjs           Validation, scoring, sampling, answer recovery
src/Player.jsx         Homepage, questions, results, share images
src/Editor.jsx         Content editor, previews, browser drafts
src/I18n.jsx           Interface language state and selector
src/i18n.mjs           Language detection and message formatting
src/locales/en.json    English interface translations
src/document.mjs       HTML document and configuration serialization
src/export.mjs         HTML / ZIP / JSON downloads
src/templates/         Lifestyle and simplified MPTI examples
scripts/build.mjs      Standalone HTML and site ZIP build
template.json         Default content of the published site
tests/                Core and browser checks
```

See the [configuration and scoring guide](docs/configuration.en.md). React and Vite provide the development environment; esbuild embeds the production application and styles into HTML. Both distribution formats share the same scoring and editor implementation.

## About the tests and license

This tool is for entertainment, self-exploration, and custom questionnaires. It is not an official MBTI assessment or a clinically validated diagnostic tool.

Code and bundled templates use the [MIT License](LICENSE). Both visible author credits may be removed. Software and dependency license notices remain in the distribution; see [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).

Original author: [@某bit](https://space.bilibili.com/30348237).
