export const SCHEMA_VERSION = 1;
export const clone = (value) => structuredClone(value);
export const uid = (prefix = "id") =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
export const scaleLabels = (points) =>
  points === 5
    ? ["很不同意", "不太同意", "中立", "比较同意", "非常同意"]
    : [
        "很不同意",
        "不同意",
        "不太同意",
        "中立",
        "比较同意",
        "同意",
        "非常同意",
      ];

const validId = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z][\w-]{0,79}$/.test(value) &&
  !["__proto__", "constructor", "prototype"].includes(value);
const nonempty = (value, max = 20000) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
export function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function validate(config) {
  const errors = [];
  const issue = (section, message) => errors.push({ section, message });
  if (!config || typeof config !== "object" || Array.isArray(config))
    return [{ section: "site", message: "请选择有效的项目 JSON 文件。" }];
  if (config.schemaVersion !== SCHEMA_VERSION)
    issue(
      "site",
      `不支持配置版本 ${config.schemaVersion ?? "未填写"}，当前支持版本 ${SCHEMA_VERSION}。`,
    );
  if (!validId(config.id)) issue("site", "项目编号无效。");
  if (!nonempty(config.site?.title, 100))
    issue("site", "测试名称需要填写，且不超过 100 字。");
  for (const key of [
    "subtitle",
    "description",
    "disclaimer",
    "resultIntro",
    "startLabel",
  ]) {
    if (
      typeof config.site?.[key] !== "string" ||
      config.site[key].length > 20000
    )
      issue("site", `页面字段 ${key} 无效。`);
  }
  if (!/^#[a-f\d]{6}$/i.test(config.site?.themeColor || ""))
    issue("site", "主题色需要是六位十六进制颜色。");
  const settings = config.settings;
  if (!settings || ![5, 7].includes(settings.scalePoints))
    issue("settings", "量表必须为 5 档或 7 档。");
  if (
    !Array.isArray(settings?.scaleLabels) ||
    settings.scaleLabels.length !== settings.scalePoints ||
    !settings.scaleLabels.every((s) => nonempty(s, 40))
  )
    issue("settings", "请填写量表每一档的文案。");
  if (
    !Number.isInteger(settings?.perPage) ||
    settings.perPage < 1 ||
    settings.perPage > 20
  )
    issue("settings", "每页题数必须为 1–20。");
  if (!["all", "balanced"].includes(settings?.selection))
    issue("settings", "请选择全部出题或平衡抽题。");
  if (
    !Number.isInteger(settings?.perPole) ||
    settings.perPole < 1 ||
    settings.perPole > 50
  )
    issue("settings", "每侧抽题数必须为 1–50。");
  if (
    typeof settings?.shuffle !== "boolean" ||
    typeof settings?.showEditor !== "boolean"
  )
    issue("settings", "出题顺序或编辑入口设置无效。");
  if (
    !Array.isArray(config.dimensions) ||
    config.dimensions.length < 1 ||
    config.dimensions.length > 12
  ) {
    issue("dimensions", "请设置 1–12 个维度。");
    return errors;
  }
  const dimensions = new Map();
  for (const [index, dim] of config.dimensions.entries()) {
    if (!dim || typeof dim !== "object") {
      issue("dimensions", `第 ${index + 1} 个维度格式无效。`);
      continue;
    }
    if (!validId(dim.id) || dimensions.has(dim.id))
      issue("dimensions", `第 ${index + 1} 个维度编号缺失或重复。`);
    dimensions.set(dim.id, dim);
    if (!nonempty(dim.name, 100))
      issue("dimensions", `第 ${index + 1} 个维度需要名称。`);
    if (!["main", "suffix"].includes(dim.role))
      issue("dimensions", `「${dim.name}」的编码位置无效。`);
    if (
      !Array.isArray(dim.poles) ||
      dim.poles.length !== 2 ||
      dim.poles.some((p) => !p || typeof p !== "object")
    ) {
      issue("dimensions", `「${dim.name}」必须有两个倾向。`);
      continue;
    }
    if (
      new Set(dim.poles.map((p) => p.id)).size !== 2 ||
      dim.poles.some((p) => !validId(p.id))
    )
      issue("dimensions", `「${dim.name}」的倾向编号无效或重复。`);
    if (
      new Set(dim.poles.map((p) => p.code)).size !== 2 ||
      dim.poles.some(
        (p) =>
          typeof p.code !== "string" || !/^[\p{L}\p{N}]{1,4}$/u.test(p.code),
      )
    )
      issue(
        "dimensions",
        `「${dim.name}」的两个编码必须不同，支持 1–4 个字母、汉字或数字。`,
      );
    for (const pole of dim.poles) {
      if (!nonempty(pole.name, 100) || !nonempty(pole.description))
        issue("dimensions", `「${dim.name}」的倾向名称和解释需要填写。`);
    }
    if (!dim.poles.some((p) => p.id === dim.tiePoleId))
      issue("dimensions", `「${dim.name}」需要设置平分时采用的倾向。`);
  }
  const mains = config.dimensions.filter((d) => d?.role === "main");
  if (!mains.length) issue("dimensions", "至少需要一个主编码维度。");
  if (
    !Array.isArray(config.questions) ||
    !config.questions.length ||
    config.questions.length > 500
  ) {
    issue("questions", "请设置 1–500 道题目。");
  } else {
    const ids = new Set();
    for (const [index, q] of config.questions.entries()) {
      const label = `第 ${index + 1} 题`;
      if (!q || typeof q !== "object") {
        issue("questions", `${label}格式无效。`);
        continue;
      }
      if (!validId(q.id) || ids.has(q.id))
        issue("questions", `${label}编号无效或重复。`);
      ids.add(q.id);
      if (!nonempty(q.text)) issue("questions", `${label}需要题干。`);
      const dim = dimensions.get(q.dimensionId);
      if (
        !Array.isArray(dim?.poles) ||
        !dim.poles.some((p) => p?.id === q.poleId)
      )
        issue("questions", `${label}的维度或倾向已失效，请重新指定。`);
      if (!Number.isFinite(q.weight) || q.weight <= 0 || q.weight > 10)
        issue("questions", `${label}权重需要大于 0，且不超过 10。`);
      if (typeof q.required !== "boolean")
        issue("questions", `${label}的必出设置无效。`);
      if (
        q.labels != null &&
        (!Array.isArray(q.labels) ||
          q.labels.length !== settings?.scalePoints ||
          !q.labels.every((s) => nonempty(s, 40)))
      )
        issue("questions", `${label}的自定义量表文案与档数不符。`);
    }
    for (const dim of config.dimensions.filter(
      (d) => d && Array.isArray(d.poles),
    )) {
      const pool = config.questions.filter((q) => q?.dimensionId === dim.id);
      if (!pool.length) issue("questions", `「${dim.name}」还没有题目。`);
      if (settings?.selection === "balanced") {
        for (const pole of dim.poles.filter(Boolean)) {
          const side = pool.filter((q) => q.poleId === pole.id);
          if (side.length < settings.perPole)
            issue(
              "questions",
              `「${dim.name} / ${pole.code}」需要至少 ${settings.perPole} 道题才能抽题。`,
            );
          if (side.filter((q) => q.required).length > settings.perPole)
            issue(
              "questions",
              `「${dim.name} / ${pole.code}」的必出题超过抽题数。`,
            );
        }
      }
    }
  }
  if (!Array.isArray(config.profiles) || config.profiles.length > 1024)
    issue("results", "专属评语列表无效或超过 1024 条。");
  else {
    const keys = new Set();
    const ids = new Set();
    for (const [index, p] of config.profiles.entries()) {
      if (!p || !validId(p.id) || ids.has(p.id)) {
        issue("results", `第 ${index + 1} 条专属评语编号无效或重复。`);
        continue;
      }
      ids.add(p.id);
      if (!nonempty(p.name, 150) || !nonempty(p.text))
        issue("results", `第 ${index + 1} 条专属评语需要名称和正文。`);
      const validMatch =
        p.match &&
        typeof p.match === "object" &&
        !Array.isArray(p.match) &&
        Object.keys(p.match).length === mains.length &&
        mains.every(
          (d) =>
            Array.isArray(d.poles) &&
            d.poles.some((pole) => pole?.id === p.match[d.id]),
        );
      if (!validMatch)
        issue(
          "results",
          `「${p.name}」的组合与当前主维度不一致，请重新指定或删除这条评语。`,
        );
      else {
        const key = mains
          .map((d) => `${d.id}:${p.match[d.id]}`)
          .sort()
          .join("|");
        if (keys.has(key))
          issue("results", `「${p.name}」与另一条评语对应同一个组合。`);
        keys.add(key);
      }
    }
  }
  for (const key of ["original", "project"]) {
    const author = config.credits?.[key];
    if (
      !author ||
      typeof author.visible !== "boolean" ||
      typeof author.name !== "string" ||
      author.name.length > 100 ||
      typeof author.url !== "string" ||
      (author.url && !safeUrl(author.url))
    )
      issue(
        "credits",
        `${key === "original" ? "原项目" : "项目"}作者信息无效，链接只支持 http / https。`,
      );
    else if (author.visible && !author.name.trim())
      issue(
        "credits",
        `${key === "original" ? "原项目" : "项目"}作者需要名称，也可以关闭署名。`,
      );
  }
  return errors;
}

export function parseConfig(text) {
  if (text.length > 4_000_000)
    throw new Error("配置文件超过 4 MB，请检查文件内容。");
  let config;
  try {
    config = JSON.parse(text);
  } catch {
    throw new Error("无法读取 JSON，请选择导出的项目配置文件。");
  }
  const errors = validate(config);
  if (errors.length) throw new Error(errors.map((e) => e.message).join("\n"));
  return config;
}

// Incomplete text fields are valid drafts. Only published/imported configurations
// must pass the stricter semantic validator above.
export function isDraftShape(c) {
  const strings = (value, keys) =>
    !!value && keys.every((key) => typeof value[key] === "string");
  return (
    c?.schemaVersion === 1 &&
    validId(c.id) &&
    strings(c.site, [
      "title",
      "subtitle",
      "description",
      "disclaimer",
      "resultIntro",
      "startLabel",
      "themeColor",
    ]) &&
    c.settings &&
    [5, 7].includes(c.settings.scalePoints) &&
    Array.isArray(c.settings.scaleLabels) &&
    c.settings.scaleLabels.every((s) => typeof s === "string") &&
    typeof c.settings.shuffle === "boolean" &&
    typeof c.settings.showEditor === "boolean" &&
    Array.isArray(c.dimensions) &&
    c.dimensions.length > 0 &&
    c.dimensions.length <= 12 &&
    c.dimensions.every(
      (d) =>
        strings(d, ["id", "name", "role", "tiePoleId"]) &&
        Array.isArray(d.poles) &&
        d.poles.length === 2 &&
        d.poles.every((p) => strings(p, ["id", "code", "name", "description"])),
    ) &&
    Array.isArray(c.questions) &&
    c.questions.length <= 500 &&
    c.questions.every(
      (q) =>
        strings(q, ["id", "text", "dimensionId", "poleId"]) &&
        typeof q.weight === "number" &&
        typeof q.required === "boolean" &&
        (q.labels == null ||
          (Array.isArray(q.labels) &&
            q.labels.every((l) => typeof l === "string"))),
    ) &&
    Array.isArray(c.profiles) &&
    c.profiles.length <= 1024 &&
    c.profiles.every(
      (p) =>
        strings(p, ["id", "name", "text"]) &&
        p.match &&
        typeof p.match === "object" &&
        !Array.isArray(p.match),
    ) &&
    ["original", "project"].every(
      (key) =>
        strings(c.credits?.[key], ["name", "url"]) &&
        typeof c.credits[key].visible === "boolean",
    )
  );
}

export function fingerprint(config) {
  const text = JSON.stringify(config);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function selectQuestions(config, random = Math.random) {
  let selected;
  if (config.settings.selection === "all") selected = [...config.questions];
  else {
    const chosen = new Set(
      config.dimensions.flatMap((dim) =>
        dim.poles.flatMap((pole) => {
          const pool = config.questions.filter(
            (q) => q.dimensionId === dim.id && q.poleId === pole.id,
          );
          const required = pool.filter((q) => q.required);
          if (
            pool.length < config.settings.perPole ||
            required.length > config.settings.perPole
          )
            throw new Error("题库不满足平衡抽题要求。");
          return [
            ...required,
            ...shuffle(
              pool.filter((q) => !q.required),
              random,
            ).slice(0, config.settings.perPole - required.length),
          ].map((q) => q.id);
        }),
      ),
    );
    selected = config.questions.filter((q) => chosen.has(q.id));
  }
  return config.settings.shuffle ? shuffle(selected, random) : selected;
}
export const isAnswer = (value, config) =>
  Number.isInteger(value) && value >= 1 && value <= config.settings.scalePoints;

export function calculate(config, questions, answers) {
  if (!questions.every((q) => isAnswer(answers[q.id], config)))
    throw new Error("请先完成所有题目。");
  const midpoint = (config.settings.scalePoints + 1) / 2;
  const choices = {};
  const tendencies = config.dimensions.map((dim) => {
    const pool = questions.filter((q) => q.dimensionId === dim.id);
    const weight = pool.reduce((sum, q) => sum + q.weight, 0);
    if (!weight) throw new Error(`「${dim.name}」没有可评分的题目。`);
    const delta = pool.reduce(
      (sum, q) =>
        sum +
        ((answers[q.id] - midpoint) / (midpoint - 1)) *
          q.weight *
          (q.poleId === dim.poles[0].id ? 1 : -1),
      0,
    );
    const leftPercent = Math.max(
      0,
      Math.min(100, Math.round(50 + (delta / weight) * 50)),
    );
    const winner =
      Math.abs(delta) < 1e-9
        ? dim.poles.find((p) => p.id === dim.tiePoleId)
        : dim.poles[delta > 0 ? 0 : 1];
    choices[dim.id] = winner.id;
    return {
      dimension: dim,
      winner,
      leftPercent,
      rightPercent: 100 - leftPercent,
      tied: Math.abs(delta) < 1e-9,
      selectedPercent:
        winner.id === dim.poles[0].id ? leftPercent : 100 - leftPercent,
    };
  });
  return composeResult(config, tendencies, choices);
}
function composeResult(config, tendencies, choices) {
  const mains = config.dimensions.filter((d) => d.role === "main");
  const profile = config.profiles.find(
    (p) =>
      Object.keys(p.match).length === mains.length &&
      mains.every((d) => p.match[d.id] === choices[d.id]),
  );
  const main = tendencies.filter((t) => t.dimension.role === "main");
  const suffix = tendencies.filter((t) => t.dimension.role === "suffix");
  const code =
    main.map((t) => t.winner.code).join("") +
    (suffix.length ? `-${suffix.map((t) => t.winner.code).join("")}` : "");
  return {
    code,
    tendencies,
    choices,
    name: profile?.name || main.map((t) => t.winner.name).join(" · "),
    text: profile?.text || main.map((t) => t.winner.description).join("\n\n"),
    suffixText: suffix
      .map((t) => `${t.winner.name}：${t.winner.description}`)
      .join("\n\n"),
  };
}
export function previewResult(config, choices = {}) {
  const complete = {};
  const tendencies = config.dimensions.map((dimension) => {
    const winner =
      dimension.poles.find((p) => p.id === choices[dimension.id]) ||
      dimension.poles[0];
    complete[dimension.id] = winner.id;
    return {
      dimension,
      winner,
      leftPercent: winner.id === dimension.poles[0].id ? 75 : 25,
      rightPercent: winner.id === dimension.poles[0].id ? 25 : 75,
      selectedPercent: 75,
      tied: false,
    };
  });
  return composeResult(config, tendencies, complete);
}

export function freshSession(config) {
  return {
    signature: fingerprint(config),
    questionIds: selectQuestions(config).map((q) => q.id),
    answers: {},
    view: "home",
    page: 0,
  };
}
export function restoreSession(raw, config) {
  try {
    const s = JSON.parse(raw);
    if (
      !s ||
      s.signature !== fingerprint(config) ||
      !Array.isArray(s.questionIds) ||
      new Set(s.questionIds).size !== s.questionIds.length
    )
      throw new Error();
    const byId = new Map(config.questions.map((q) => [q.id, q]));
    const selected = s.questionIds.map((id) => byId.get(id));
    if (
      selected.some((q) => !q) ||
      !selected.length ||
      config.questions.some((q) => q.required && !s.questionIds.includes(q.id))
    )
      throw new Error();
    if (
      config.settings.selection === "all" &&
      selected.length !== config.questions.length
    )
      throw new Error();
    if (
      config.settings.selection === "balanced" &&
      (selected.length !==
        config.dimensions.length * 2 * config.settings.perPole ||
        config.dimensions.some((d) =>
          d.poles.some(
            (p) =>
              selected.filter(
                (q) => q.dimensionId === d.id && q.poleId === p.id,
              ).length !== config.settings.perPole,
          ),
        ))
    )
      throw new Error();
    if (!s.answers || typeof s.answers !== "object" || Array.isArray(s.answers))
      throw new Error();
    const answers = Object.fromEntries(
      selected
        .filter((q) => isAnswer(s.answers[q.id], config))
        .map((q) => [q.id, s.answers[q.id]]),
    );
    const view = ["home", "quiz", "result"].includes(s.view) ? s.view : "home";
    return {
      ...freshSessionWithoutSelection(config),
      questionIds: s.questionIds,
      answers,
      view:
        view === "result" &&
        selected.some((q) => !isAnswer(answers[q.id], config))
          ? "quiz"
          : view,
      page: Number.isInteger(s.page)
        ? Math.max(
            0,
            Math.min(
              s.page,
              Math.ceil(selected.length / config.settings.perPage) - 1,
            ),
          )
        : 0,
    };
  } catch {
    return freshSession(config);
  }
}
function freshSessionWithoutSelection(config) {
  return { signature: fingerprint(config) };
}

export function draftStorageKey(config) {
  return `umbti:draft:${config.id}`;
}
export function sessionStorageKey(config) {
  return `umbti:answers:${config.id}:${fingerprint(config)}`;
}
export function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function newDimension(index = 1) {
  const id = uid("dim");
  return {
    id,
    name: `新维度 ${index}`,
    role: "main",
    tiePoleId: "right",
    poles: [
      {
        id: "left",
        code: "A",
        name: "左侧倾向",
        description: "在这里描述选择这一侧的人的特点。",
      },
      {
        id: "right",
        code: "B",
        name: "右侧倾向",
        description: "在这里描述另一侧倾向的特点。",
      },
    ],
  };
}
export function newQuestion(dim, pole = dim.poles[0]) {
  return {
    id: uid("q"),
    dimensionId: dim.id,
    poleId: pole.id,
    text: "在这里输入题目",
    weight: 1,
    required: false,
  };
}
