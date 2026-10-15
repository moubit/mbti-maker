import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { unzipSync, strFromU8 } from "fflate";

const project = JSON.parse(await fs.readFile("template.json", "utf8"));
const builtHtml = pathToFileURL(path.resolve("dist/index.html")).href;
async function edit(page, section) {
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.locator(".editor-app")).toBeVisible();
  if (section)
    await page
      .locator(".editor-sidebar nav")
      .getByRole("button", { name: section })
      .click();
}
async function start(page) {
  await page.getByRole("button", { name: "开始体验测试", exact: true }).click();
}
async function complete(page, config = project, side = "left") {
  for (let group = 0; group < 10; group++) {
    const questions = page.locator(".question-list .question");
    for (let i = 0; i < (await questions.count()); i++) {
      const fieldset = questions.nth(i);
      const id = (await fieldset.getAttribute("id")).slice("question-".length);
      const q = config.questions.find((q) => q.id === id);
      const index = q.poleId === side ? config.settings.scalePoints - 1 : 0;
      await fieldset.locator("input[type=radio]").nth(index).check();
    }
    const last = page.getByRole("button", {
      name: "查看我的结果",
      exact: true,
    });
    if (await last.count()) {
      await last.click();
      break;
    }
    await page.getByRole("button", { name: "下一组", exact: true }).click();
  }
  await expect(page.locator(".result-sheet")).toBeVisible();
}
async function exported(page, name, testInfo) {
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: false }).click();
  const download = await wait;
  const file = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  return file;
}

test("homepage is responsive and quiz validates, restores, scores and downloads a share image", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /把好奇，\s*变成一场测试。/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("homepage.png"),
    fullPage: true,
  });
  await start(page);
  await page.getByRole("button", { name: "下一组", exact: true }).click();
  await expect(page.locator(".field-error")).toHaveCount(4);
  await page.locator(".question-list input[type=radio]").first().check();
  await page.reload();
  await expect(
    page.locator(".question-list input[type=radio]:checked"),
  ).toHaveCount(1);
  await complete(page);
  await expect(page.locator(".result-code")).toHaveText("ACXM");
  await expect(
    page.getByRole("heading", { name: "灵感漫游者", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "查看 A 的含义" }).click();
  await expect(page.locator("[data-no-capture]")).toContainText("即兴派");
  await page.screenshot({
    path: testInfo.outputPath("result.png"),
    fullPage: true,
  });
  const png = await exported(page, "下载分享图", testInfo);
  const data = await fs.readFile(png);
  expect(data.subarray(1, 4).toString()).toBe("PNG");
  expect(data.length).toBeGreaterThan(10000);
  expect(errors).toEqual([]);
});

test("editor changes letters and authors, exports portable HTML and ZIP, and keeps published content isolated", async ({
  page,
  browser,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await edit(page, "字母与倾向");
  await page.locator(".code-input").first().fill("Z");
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "作者署名" })
    .click();
  await page.getByLabel("项目作者名称", { exact: true }).fill("测试作者");
  await page
    .getByRole("button", { name: "删除这项署名", exact: true })
    .first()
    .click();
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "页面信息" })
    .click();
  await page.getByLabel("测试名称", { exact: true }).fill("可分享的自定义测试");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("editor.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "退出编辑" }).click();
  await expect(page.locator(".brand")).toContainText("万能MBTI生成器");
  await edit(page);
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue(
    "可分享的自定义测试",
  );
  await page.getByRole("button", { name: "导出与部署", exact: true }).click();
  const htmlPath = await exported(page, "单 HTML 文件", testInfo);
  const zipPath = await exported(page, "静态部署包 ZIP", testInfo);
  const zip = unzipSync(new Uint8Array(await fs.readFile(zipPath)));
  expect(Object.keys(zip)).toContain("index.html");
  expect(Object.keys(zip)).toContain("LICENSE");
  expect(strFromU8(zip["index.html"])).toContain("可分享的自定义测试");
  const context = await browser.newContext({ offline: true });
  const offline = await context.newPage();
  const requests = [];
  offline.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await offline.goto(pathToFileURL(htmlPath).href);
  await expect(offline.locator(".brand")).toContainText("可分享的自定义测试");
  await expect(offline.locator(".credits")).not.toContainText("@某bit");
  await expect(offline.locator(".credits")).toContainText("测试作者");
  await start(offline);
  await complete(offline);
  await expect(offline.locator(".result-code")).toHaveText("ZCXM");
  await edit(offline, "字母与倾向");
  await expect(offline.locator(".code-input").first()).toHaveValue("Z");
  await offline
    .getByRole("button", { name: "导出与部署", exact: true })
    .click();
  const second = await exported(offline, "单 HTML 文件", {
    outputPath: (name) => testInfo.outputPath(`again-${name}`),
  });
  const reopened = await context.newPage();
  await reopened.goto(pathToFileURL(second).href);
  await expect(reopened.locator(".brand")).toContainText("可分享的自定义测试");
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});

test("invalid edits are blocked and recoverable; additions, deletes and history keep IDs consistent", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await edit(page, "字母与倾向");
  await page.locator(".code-input").first().fill("");
  await expect(page.locator(".validation")).toContainText("配置问题");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.reload();
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "字母与倾向" })
    .click();
  await expect(page.locator(".code-input").first()).toHaveValue("");
  await page.locator(".code-input").first().fill("A");
  await page
    .getByRole("button", {
      name: "添加维度（同时添加两道示例题）",
      exact: true,
    })
    .click();
  await expect(page.locator(".dimension-panel")).toHaveCount(5);
  await expect(page.locator(".validation")).toContainText("配置问题");
  await page
    .getByRole("button", { name: "删除维度 新维度 5", exact: true })
    .click();
  await expect(page.locator(".dimension-panel")).toHaveCount(4);
  await expect(page.locator(".validation")).toHaveCount(0);
  await page.getByRole("button", { name: "撤销修改", exact: true }).click();
  await expect(page.locator(".dimension-panel")).toHaveCount(5);
  await page.getByRole("button", { name: "重做修改", exact: true }).click();
  await expect(page.locator(".dimension-panel")).toHaveCount(4);
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "题库", exact: false })
    .click();
  await page.getByRole("button", { name: "复制第 1 题", exact: true }).click();
  await expect(page.locator(".question-editor")).toHaveCount(17);
  await page.getByRole("button", { name: "删除第 2 题", exact: true }).click();
  await expect(page.locator(".question-editor")).toHaveCount(16);
});

test("offline build and player-only export need no external services or editor route", async ({
  page,
}, testInfo) => {
  await page.context().setOffline(true);
  await page.goto(builtHtml);
  await edit(page, "作者署名");
  await page
    .getByRole("button", { name: "删除这项署名", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "删除这项署名", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "导出与部署", exact: true }).click();
  await page.getByLabel("HTML / 部署包保留编辑入口").uncheck();
  const file = await exported(page, "单 HTML 文件", testInfo);
  await page.goto(pathToFileURL(file).href + "#/editor");
  await expect(page.locator(".player")).toBeVisible();
  await expect(page.locator(".editor-app")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "编辑", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".credits")).toHaveCount(0);
  await start(page);
  await complete(page);
  await expect(page.locator(".credits")).toHaveCount(0);
});

test("template loading, JSON imports and result previews work on desktop and mobile", async ({
  page,
}, testInfo) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await edit(page);
  await page
    .getByRole("button", { name: "MPTI 手机倾向", exact: true })
    .click();
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue(
    "MPTI 手机倾向测试",
  );
  await page.getByRole("button", { name: "导出与部署", exact: true }).click();
  const file = await exported(page, "项目配置 JSON", testInfo);
  const config = JSON.parse(await fs.readFile(file, "utf8"));
  expect(config.questions.length).toBe(30);
  expect(config.settings.selection).toBe("balanced");
  await page.getByRole("button", { name: "关闭导出窗口" }).click();
  await page.getByRole("button", { name: "空白测试", exact: true }).click();
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue(
    "我的新测试",
  );
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "字母与倾向" })
    .click();
  await expect(page.locator(".dimension-panel")).toHaveCount(4);
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "页面信息" })
    .click();
  await page.locator("input[type=file]").setInputFiles(file);
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue(
    "MPTI 手机倾向测试",
  );
  const invalid = testInfo.outputPath("invalid.json");
  await fs.writeFile(invalid, '{"schemaVersion":999}');
  await page.locator("input[type=file]").setInputFiles(invalid);
  await expect(page.locator(".message")).toContainText("不支持配置版本");
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue(
    "MPTI 手机倾向测试",
  );
  const mobileSwitch = page.locator(".editor-mobile-switch");
  if (await mobileSwitch.isVisible())
    await mobileSwitch.getByRole("button", { name: "实时预览" }).click();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "结果", exact: true })
    .click();
  await expect(page.locator(".preview-content .result-code")).toHaveText(
    "ESTJ-B",
  );
  await page.getByRole("button", { name: "完整试答", exact: true }).click();
  await expect(page.locator(".draft-banner")).toBeVisible();
  await page
    .getByRole("button", { name: "测测我的手机倾向", exact: true })
    .click();
  await expect(page.locator(".quiz-progress")).toContainText("20");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});

test("imported markup is rendered as text and cannot escape the generated HTML", async ({
  page,
  browser,
}, testInfo) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await edit(page);
  const payload = structuredClone(project);
  payload.site.subtitle = "</script><script>window.__injected = true</script>";
  const file = testInfo.outputPath("payload.json");
  await fs.writeFile(file, JSON.stringify(payload));
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByRole("button", { name: "导出与部署", exact: true }).click();
  const html = await exported(page, "单 HTML 文件", testInfo);
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto(pathToFileURL(html).href);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(
    payload.site.subtitle,
  );
  expect(await other.evaluate(() => window.__injected)).toBeUndefined();
  await context.close();
});
