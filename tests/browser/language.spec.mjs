import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

const project = JSON.parse(await fs.readFile("template.json", "utf8"));
test.use({ locale: "en-US" });
const languageSelect = (page) => page.locator(".language-switch select");

test("English UI covers editor tabs and errors, and switching preserves edits and undo history", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(languageSelect(page)).toHaveValue("auto");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    project.site.subtitle,
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Test name", { exact: true })).toHaveValue(
    project.site.title,
  );
  await page.screenshot({
    path: testInfo.outputPath("editor-en.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize().width + 1);
  for (const label of [
    "Dimensions & codes",
    "Questions",
    "Test settings",
    "Results & feedback",
    "Author credits",
    "Page details",
  ]) {
    await page
      .locator(".editor-sidebar nav")
      .getByRole("button", { name: label, exact: false })
      .click();
    await expect(page.locator(".workspace-heading h1")).toHaveText(label);
  }
  await page.getByLabel("Test name", { exact: true }).fill("");
  await page.locator(".validation summary").click();
  await expect(page.locator(".validation")).toContainText("Enter a test name");
  await languageSelect(page).selectOption("zh");
  await expect(page.locator(".validation")).toContainText("测试名称需要填写");
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue("");
  await page.getByLabel("测试名称", { exact: true }).fill("作者原文 / My test");
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "题库", exact: false })
    .click();
  const question = page
    .locator(".question-editor")
    .first()
    .getByRole("textbox", { name: "题目内容" });
  await question.fill("原文保留 / Keep my words");
  const route = page.url();
  await languageSelect(page).selectOption("en");
  expect(page.url()).toBe(route);
  await expect(page.locator(".workspace-heading h1")).toHaveText("Questions");
  const translatedField = page
    .locator(".question-editor")
    .first()
    .getByRole("textbox", { name: "Question text" });
  await expect(translatedField).toHaveValue("原文保留 / Keep my words");
  await page.getByRole("button", { name: "Undo changes" }).click();
  await expect(translatedField).toHaveValue(project.questions[0].text);
  await page.getByRole("button", { name: "Redo changes" }).click();
  await expect(translatedField).toHaveValue("原文保留 / Keep my words");
  const mobileSwitch = page.locator(".editor-mobile-switch");
  if (await mobileSwitch.isVisible())
    await mobileSwitch.getByRole("button", { name: "Live preview" }).click();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "Result", exact: true })
    .click();
  await page
    .locator(".preview-combination select")
    .first()
    .selectOption("right");
  const previewCode = await page
    .locator(".preview-content .result-code")
    .textContent();
  await languageSelect(page).selectOption("zh");
  await expect(page.locator(".segmented .active")).toHaveText("结果");
  await expect(page.locator(".preview-content .result-code")).toHaveText(
    previewCode,
  );
  await expect(page.locator(".preview-pane")).toBeVisible();
  await languageSelect(page).selectOption("en");
  if (await mobileSwitch.isVisible())
    await mobileSwitch.getByRole("button", { name: "Edit content" }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".message")).toContainText("Draft saved.");
  await languageSelect(page).selectOption("zh");
  await expect(page.locator(".message")).toContainText("草稿已保存。");
  await page.reload();
  await expect(languageSelect(page)).toHaveValue("zh");
  await page
    .locator(".editor-sidebar nav")
    .getByRole("button", { name: "页面信息" })
    .click();
  await expect(page.getByLabel("测试名称", { exact: true })).toHaveValue(
    "作者原文 / My test",
  );
  expect(errors).toEqual([]);
});

test("switching interface language preserves the quiz page, answers, and session identity", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: project.site.startLabel, exact: true })
    .click();
  for (const fieldset of await page.locator(".question-list .question").all())
    await fieldset.locator("input[type=radio]").nth(6).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .locator(".question-list .question")
    .first()
    .locator("input[type=radio]")
    .nth(2)
    .check();
  const current = await page
    .locator(".question-list .question")
    .first()
    .getAttribute("id");
  const before = await page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith("umbti:answers:"))
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );
  await languageSelect(page).selectOption("zh");
  await expect(page.locator(".quiz-progress")).toContainText("第 2 / 4 组");
  await expect(
    page.locator(".question-list .question").first(),
  ).toHaveAttribute("id", current);
  await expect(page.locator(".question-list input:checked")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator(".question-list input:checked")).toHaveCount(1);
  await languageSelect(page).selectOption("auto");
  await expect(page.locator(".quiz-progress")).toContainText("Page 2 / 4");
  const after = await page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith("umbti:answers:"))
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );
  expect(after).toEqual(before);
});

test("English exports preserve all authored content and detect the offline reader’s language", async ({
  page,
  browser,
}, testInfo) => {
  await page.goto("/#/editor");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Project JSON/ }).click();
  const jsonFile = testInfo.outputPath("content.json");
  await (await jsonDownload).saveAs(jsonFile);
  expect(JSON.parse(await fs.readFile(jsonFile, "utf8"))).toEqual(project);
  const htmlDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Standalone HTML/ }).click();
  const htmlFile = testInfo.outputPath("bilingual.html");
  await (await htmlDownload).saveAs(htmlFile);
  const context = await browser.newContext({ locale: "zh-TW", offline: true });
  const offline = await context.newPage();
  try {
    await offline.goto(pathToFileURL(htmlFile).href);
    await expect(offline.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(
      offline.getByRole("button", { name: "编辑", exact: true }),
    ).toBeVisible();
    await languageSelect(offline).selectOption("en");
    await offline.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(offline.getByLabel("Test name", { exact: true })).toHaveValue(
      project.site.title,
    );
    const embedded = await offline.locator("#project-config").textContent();
    expect(JSON.parse(embedded)).toEqual(project);
    await offline.reload();
    await expect(languageSelect(offline)).toHaveValue("en");
    await expect(offline.locator(".workspace-heading h1")).toHaveText(
      "Page details",
    );
  } finally {
    await context.close();
  }
});

test("Auto follows browser language changes, manual choice takes precedence, storage failure remains usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.testLanguages = ["zh-HK"];
    Object.defineProperty(navigator, "languages", {
      get: () => window.testLanguages,
    });
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page.evaluate(() => {
    window.testLanguages = ["en-GB"];
    dispatchEvent(new Event("languagechange"));
  });
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await languageSelect(page).selectOption("zh");
  await page.evaluate(() => {
    window.testLanguages = ["en-US"];
    dispatchEvent(new Event("languagechange"));
  });
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page
    .getByRole("button", { name: project.site.startLabel, exact: true })
    .click();
  await page.locator(".question-list input[type=radio]").first().check();
  await languageSelect(page).selectOption("auto");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".question-list input:checked")).toHaveCount(1);
  await expect(page.locator(".storage-note")).toContainText(
    "cannot save your progress",
  );
});
