import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  detectLanguage,
  resolveLanguage,
  formatMessage,
  message,
} from "../src/i18n.mjs";
import { fingerprint, parseConfig, validate } from "../src/core.mjs";

const english = JSON.parse(
  readFileSync(new URL("../src/locales/en.json", import.meta.url), "utf8"),
);
const project = JSON.parse(
  readFileSync(new URL("../template.json", import.meta.url), "utf8"),
);

test("automatic language respects supported browser preferences and language variants", () => {
  for (const tag of ["zh-CN", "zh-TW", "zh-HK", "ZH_hans_CN", "zh"])
    assert.equal(detectLanguage([tag]), "zh");
  for (const tag of ["en-US", "en-GB", "EN_au", "en"])
    assert.equal(detectLanguage([tag]), "en");
  assert.equal(detectLanguage(["fr-FR", "zh-TW", "en-US"]), "zh");
  assert.equal(detectLanguage(["en-GB", "zh-CN"]), "en");
  assert.equal(detectLanguage(["de-DE"]), "en");
  assert.equal(detectLanguage([]), "en");
});

test("manual language overrides browser detection while auto follows the browser", () => {
  assert.equal(resolveLanguage("zh", ["en-US"]), "zh");
  assert.equal(resolveLanguage("en", ["zh-CN"]), "en");
  assert.equal(resolveLanguage("auto", ["zh-HK"]), "zh");
  assert.equal(resolveLanguage("invalid", ["en-US"]), "en");
});

test("English messages retain every interpolation slot without translating user content", () => {
  for (const [key, value] of Object.entries(english)) {
    const placeholders = (text) =>
      [...new Set(text.match(/\{\w+\}/g) || [])].sort();
    assert.deepEqual(placeholders(value), placeholders(key), key);
    assert.ok(value.trim(), key);
  }
  const authoredName = "页面信息";
  assert.equal(
    formatMessage(message("删除维度 {p0}", { p0: authoredName }), "en"),
    "Delete dimension 页面信息",
  );
  const nested = message("{p0}需要题干。", {
    p0: message("第 {p0} 题", { p0: 3 }),
  });
  assert.equal(formatMessage(nested, "en"), "Question 3 needs question text.");
  assert.equal(formatMessage(nested, "zh"), "第 3 题需要题干。");
});

test("validation and import messages localize without altering configuration or scoring identity", () => {
  const original = JSON.stringify(project);
  const signature = fingerprint(project);
  const invalid = structuredClone(project);
  invalid.site.title = "";
  invalid.dimensions[0].poles[0].code = "";
  invalid.credits.original.name = "";
  const errors = validate(invalid);
  const translated = formatMessage(
    errors.map((e) => e.i18n || e.message),
    "en",
  );
  assert.match(translated, /Enter a test name/);
  assert.match(translated, /生活节奏/);
  assert.match(translated, /Enter the Original project author name/);
  assert.doesNotMatch(translated, /\[object Object\]|\{p\d+\}/);
  try {
    parseConfig('{"schemaVersion":999}');
    assert.fail("Expected an import error");
  } catch (error) {
    assert.match(
      formatMessage(error.messages || error.message, "en"),
      /Configuration version 999 is not supported/,
    );
  }
  assert.equal(JSON.stringify(project), original);
  assert.equal(fingerprint(project), signature);
});

test("both README editions include the original MPTI entry and both source videos", () => {
  for (const file of ["README.md", "README.en.md"]) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const url of [
      "https://mpti.basebit.top/",
      "https://www.bilibili.com/video/BV1Z4he66EDs",
      "https://www.bilibili.com/video/BV1MKpj6XEz1",
    ])
      assert.ok(text.includes(url), `${file} missing ${url}`);
    assert.match(
      text,
      /\[!\[.*MPTI.*\]\(docs\/assets\/mpti-button-(zh|en)\.svg\)\]\(https:\/\/mpti\.basebit\.top\/\)/,
    );
  }
});
