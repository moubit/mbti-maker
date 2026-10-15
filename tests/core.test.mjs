import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculate,
  clone,
  fingerprint,
  freshSession,
  isDraftShape,
  parseConfig,
  previewResult,
  restoreSession,
  scaleLabels,
  selectQuestions,
  validate,
} from "../src/core.mjs";
import { renderDocument, scriptJson } from "../src/document.mjs";

const generic = JSON.parse(
  readFileSync(new URL("../template.json", import.meta.url), "utf8"),
);
const mpti = JSON.parse(
  readFileSync(new URL("../src/templates/mpti.json", import.meta.url), "utf8"),
);
function answersFor(config, questions, choices) {
  return Object.fromEntries(
    questions.map((q) => [
      q.id,
      choices[q.dimensionId] === q.poleId ? config.settings.scalePoints : 1,
    ]),
  );
}
function seed(value = 16) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

test("both templates validate and contain only portable questionnaire content", () => {
  assert.equal(generic.dimensions.length, 4);
  assert.equal(generic.questions.length, 16);
  for (const c of [generic, mpti]) {
    assert.deepEqual(validate(c), []);
    assert.deepEqual(parseConfig(JSON.stringify(c)), c);
    for (const key of [
      "products",
      "productLines",
      "recommendations",
      "dlcConfig",
      "analytics",
    ])
      assert.equal(key in c, false);
  }
  assert.equal(mpti.questions.length, 30);
  assert.equal(mpti.profiles.length, 16);
});

test("all generic combinations score 100% and support custom or fallback evaluations", () => {
  for (let mask = 0; mask < 16; mask++) {
    const choices = Object.fromEntries(
      generic.dimensions.map((d, i) => [d.id, d.poles[(mask >> i) & 1].id]),
    );
    const result = calculate(
      generic,
      generic.questions,
      answersFor(generic, generic.questions, choices),
    );
    assert.deepEqual(result.choices, choices);
    assert.equal(
      result.code,
      generic.dimensions
        .map((d) => d.poles.find((p) => p.id === choices[d.id]).code)
        .join(""),
    );
    assert.ok(result.text.length > 20);
    for (const t of result.tendencies) {
      assert.equal(t.selectedPercent, 100);
      assert.equal(t.leftPercent + t.rightPercent, 100);
    }
    if (mask === 0) assert.equal(result.name, "灵感漫游者");
  }
});

test("all MPTI combinations use dynamic dimensions and optional suffixes", () => {
  const qs = selectQuestions(mpti, seed());
  for (let mask = 0; mask < 32; mask++) {
    const choices = Object.fromEntries(
      mpti.dimensions.map((d, i) => [d.id, d.poles[(mask >> i) & 1].id]),
    );
    const r = calculate(mpti, qs, answersFor(mpti, qs, choices));
    assert.deepEqual(r.choices, choices);
    assert.equal(r.code.length, 6);
    assert.equal(r.code[4], "-");
    assert.ok(r.suffixText);
    assert.ok(r.tendencies.every((t) => t.selectedPercent === 100));
  }
});

test("balanced sampling honors required questions, counts and random variation", () => {
  const seen = new Set();
  const random = seed();
  for (let i = 0; i < 60; i++) {
    const qs = selectQuestions(mpti, random);
    assert.equal(qs.length, 20);
    assert.equal(new Set(qs.map((q) => q.id)).size, 20);
    for (const q of mpti.questions.filter((q) => q.required))
      assert.ok(qs.some((s) => s.id === q.id));
    for (const d of mpti.dimensions)
      for (const p of d.poles)
        assert.equal(
          qs.filter((q) => q.dimensionId === d.id && q.poleId === p.id).length,
          2,
        );
    seen.add(qs.map((q) => q.id).join(","));
  }
  assert.ok(seen.size > 40);
});

test("five-point and seven-point scores normalize weights and reverse questions", () => {
  for (const scale of [5, 7]) {
    const c = clone(generic);
    c.settings.scalePoints = scale;
    c.settings.scaleLabels = scaleLabels(scale);
    c.dimensions = c.dimensions.slice(0, 1);
    c.profiles = [];
    c.questions = c.questions
      .filter((q) => q.dimensionId === c.dimensions[0].id)
      .slice(0, 2);
    c.questions[0].weight = 3;
    c.questions[1].weight = 1;
    const answers = Object.fromEntries(c.questions.map((q) => [q.id, scale]));
    const r = calculate(c, c.questions, answers);
    assert.equal(r.tendencies[0].leftPercent, 75);
    assert.equal(r.code, "A");
    const reversed = Object.fromEntries(c.questions.map((q) => [q.id, 1]));
    assert.equal(
      calculate(c, c.questions, reversed).tendencies[0].rightPercent,
      75,
    );
  }
});

test("neutral ties are explicit, deterministic, and independent of question order", () => {
  const answers = Object.fromEntries(generic.questions.map((q) => [q.id, 4]));
  const a = calculate(generic, generic.questions, answers);
  assert.equal(a.code, "BDYN");
  assert.ok(a.tendencies.every((t) => t.tied && t.selectedPercent === 50));
  assert.deepEqual(
    calculate(generic, [...generic.questions].reverse(), answers),
    a,
  );
  const c = clone(generic);
  c.dimensions[0].tiePoleId = "left";
  assert.equal(calculate(c, c.questions, answers).code, "ADYN");
});

test("letter renaming and dimension reordering preserve semantic profile matches", () => {
  const c = clone(generic);
  c.dimensions[0].poles[0].code = "乐";
  c.dimensions.reverse();
  const choices = Object.fromEntries(c.dimensions.map((d) => [d.id, "left"]));
  const r = calculate(c, c.questions, answersFor(c, c.questions, choices));
  assert.equal(r.code, "MXC乐");
  assert.equal(r.name, "灵感漫游者");
  assert.equal(validate(c).length, 0);
});

test("suffix presentation remains at the end even when dimensions are interleaved", () => {
  const c = clone(mpti);
  c.dimensions.unshift(c.dimensions.pop());
  const result = previewResult(c);
  assert.equal(result.code, "ESTJ-B");
  assert.equal(result.name, "天生 Pro Max 圣体");
});

test("unselected answers do not affect scoring and missing answers cannot publish a result", () => {
  const selected = selectQuestions(mpti, seed());
  const choices = Object.fromEntries(
    mpti.dimensions.map((d) => [d.id, d.poles[0].id]),
  );
  const answers = answersFor(mpti, selected, choices);
  const expected = calculate(mpti, selected, answers);
  for (const q of mpti.questions)
    if (!(q.id in answers))
      answers[q.id] = q.poleId === choices[q.dimensionId] ? 1 : 7;
  assert.deepEqual(calculate(mpti, selected, answers), expected);
  delete answers[selected[0].id];
  assert.throws(() => calculate(mpti, selected, answers), /完成/);
});

test("sessions preserve exact sampled questions and reject corrupt or stale versions", () => {
  const c = clone(mpti);
  const s = freshSession(c);
  s.view = "quiz";
  s.page = 2;
  s.answers[s.questionIds[0]] = 7;
  assert.deepEqual(restoreSession(JSON.stringify(s), c), s);
  for (const modify of [
    (s) => {
      s.questionIds[1] = s.questionIds[0];
    },
    (s) => {
      s.questionIds.pop();
    },
    (s) => {
      s.questionIds[0] = "unknown";
    },
    (s) => {
      s.signature = "old";
    },
  ]) {
    const invalid = clone(s);
    modify(invalid);
    assert.deepEqual(restoreSession(JSON.stringify(invalid), c).answers, {});
  }
  c.dimensions[0].poles[0].code = "大";
  assert.notEqual(fingerprint(c), fingerprint(mpti));
  assert.equal(restoreSession(JSON.stringify(s), c).view, "home");
});

test("restoration clamps progress, drops invalid answers, and prevents incomplete results", () => {
  const s = freshSession(generic);
  s.page = 500;
  s.view = "result";
  s.answers = { [s.questionIds[0]]: 999, [s.questionIds[1]]: 7, missing: 4 };
  const result = restoreSession(JSON.stringify(s), generic);
  assert.equal(result.view, "quiz");
  assert.equal(result.page, 3);
  assert.deepEqual(result.answers, { [s.questionIds[1]]: 7 });
  assert.equal(restoreSession("{broken", generic).view, "home");
});

test("validation handles malformed untrusted imports without throwing", () => {
  const variants = [null, [], 2, {}, { ...clone(generic), dimensions: [null] }];
  for (const mutate of [
    (c) => {
      c.dimensions[0].poles = "bad";
    },
    (c) => {
      c.dimensions[0].poles = [null, null];
    },
    (c) => {
      c.questions[0] = null;
    },
    (c) => {
      c.questions[0].weight = 0;
    },
    (c) => {
      c.dimensions[0].id = "__proto__";
    },
    (c) => {
      c.profiles[0].match = [];
    },
    (c) => {
      c.credits.original.url = "javascript:alert(1)";
    },
    (c) => {
      c.settings.scaleLabels = null;
    },
    (c) => {
      c.site.themeColor = "red;background:url(https://example.com)";
    },
    (c) => {
      c.questions[1].id = c.questions[0].id;
    },
    (c) => {
      c.settings.selection = "balanced";
      c.settings.perPole = 3;
    },
  ]) {
    const c = clone(generic);
    mutate(c);
    variants.push(c);
  }
  for (const c of variants) {
    assert.doesNotThrow(() => validate(c));
    assert.ok(validate(c).length > 0);
    assert.throws(() => parseConfig(JSON.stringify(c)));
  }
});

test("configuration editing can retain incomplete drafts without exporting them", () => {
  const c = clone(generic);
  c.site.title = "";
  c.dimensions[0].poles[0].code = "";
  c.questions[0].text = "";
  assert.equal(isDraftShape(c), true);
  assert.ok(validate(c).length >= 3);
  c.dimensions[0].poles = [null];
  assert.equal(isDraftShape(c), false);
});

test("HTML serialization escapes scripts and independently preserves deleted credits", () => {
  const c = clone(generic);
  c.site.description =
    "</script><script>window.compromised = true</script> & \u2028";
  for (const key of ["original", "project"]) {
    c.credits[key] = { name: "", url: "", visible: false };
    const html = renderDocument(
      c,
      { js: 'window.example = "</script>";', css: "body{margin:0}" },
      { editable: false },
    );
    const match = html.match(
      /id="project-config" type="application\/json">([^]*?)<\/script>/,
    );
    const published = JSON.parse(match[1]);
    assert.equal(published.credits[key].visible, false);
    assert.equal(published.settings.showEditor, false);
    assert.equal(published.site.description, c.site.description);
    assert.equal(html.includes("<script>window.compromised"), false);
    assert.ok(html.includes("MIT License"));
    assert.equal(c.settings.showEditor, true);
    assert.equal("answers" in published, false);
  }
  assert.deepEqual(JSON.parse(scriptJson(c)), c);
});

test("empty dimensions, stale profiles, missing coverage and duplicate profiles block export", () => {
  for (const change of [
    (c) => {
      c.dimensions = [];
    },
    (c) => {
      c.dimensions[0].role = "suffix";
    },
    (c) => {
      c.questions = c.questions.filter((q) => q.dimensionId !== "rhythm");
    },
    (c) => {
      c.profiles.push({ ...clone(c.profiles[0]), id: "another" });
    },
    (c) => {
      c.dimensions[0].poles[1].code = c.dimensions[0].poles[0].code;
    },
  ]) {
    const c = clone(generic);
    change(c);
    assert.ok(validate(c).length);
    assert.throws(() => renderDocument(c, { js: "true;", css: "body{}" }));
  }
});
