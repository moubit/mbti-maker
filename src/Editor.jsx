import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileJson,
  FileUp,
  HelpCircle,
  LayoutTemplate,
  ListChecks,
  Palette,
  PanelLeftClose,
  Plus,
  Redo2,
  Save,
  Settings2,
  Shapes,
  Trash2,
  Undo2,
  Users,
  X,
} from "lucide-react";
import {
  clone,
  draftStorageKey,
  fingerprint,
  isDraftShape,
  newDimension,
  newQuestion,
  previewResult,
  readStorage,
  scaleLabels,
  uid,
  validate,
  parseConfig,
  writeStorage,
} from "./core.mjs";
import { downloadFile, exportHtml, exportZip, fileName } from "./export.mjs";
import { Credits, Home, Question, ResultView } from "./Player.jsx";
import lifestyle from "./templates/lifestyle.json";
import mpti from "./templates/mpti.json";

const sections = [
  ["site", "页面信息", Palette],
  ["dimensions", "字母与倾向", Shapes],
  ["questions", "题库", ListChecks],
  ["settings", "答题设置", Settings2],
  ["results", "结果与评语", LayoutTemplate],
  ["credits", "作者署名", Users],
];
function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Toggle({ checked, onChange, children }) {
  return (
    <label className="toggle-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      title={label}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}
function move(array, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= array.length) return;
  const [value] = array.splice(index, 1);
  array.splice(target, 0, value);
}
function readDraft(config) {
  try {
    const saved = JSON.parse(readStorage(draftStorageKey(config)));
    if (!saved?.config || !isDraftShape(saved.config))
      return { config: clone(config), outdated: null };
    return saved.base === fingerprint(config)
      ? { config: saved.config, outdated: null }
      : { config: clone(config), outdated: saved.config };
  } catch {
    return { config: clone(config), outdated: null };
  }
}

export default function Editor({
  published,
  initialSection = "site",
  initialId,
  onExit,
  onTrial,
}) {
  const [loaded] = useState(() => readDraft(published));
  const [history, setHistory] = useState({
    past: [],
    present: loaded.config,
    future: [],
  });
  const draft = history.present;
  const [section, setSection] = useState(initialSection);
  const [preview, setPreview] = useState("home");
  const [previewChoices, setPreviewChoices] = useState({});
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [message, setMessage] = useState("");
  const [savedStatus, setSavedStatus] = useState("");
  const [outdated, setOutdated] = useState(loaded.outdated);
  const [showExport, setShowExport] = useState(false);
  const [editableExport, setEditableExport] = useState(
    draft.settings.showEditor,
  );
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [axisFilter, setAxisFilter] = useState("");
  const [mobilePane, setMobilePane] = useState("edit");
  const importRef = useRef();
  const dialogRef = useRef();
  const workspaceRef = useRef();
  const errors = validate(draft);
  const mutate = (recipe) => {
    setHistory((state) => {
      const next = clone(state.present);
      recipe(next);
      return {
        past: [...state.past, state.present].slice(-60),
        present: next,
        future: [],
      };
    });
    setMessage("");
  };
  const replace = (config) =>
    setHistory((state) => ({
      past: [...state.past, state.present].slice(-60),
      present: clone(config),
      future: [],
    }));
  const undo = () =>
    setHistory((s) =>
      s.past.length
        ? {
            past: s.past.slice(0, -1),
            present: s.past.at(-1),
            future: [s.present, ...s.future],
          }
        : s,
    );
  const redo = () =>
    setHistory((s) =>
      s.future.length
        ? {
            past: [...s.past, s.present],
            present: s.future[0],
            future: s.future.slice(1),
          }
        : s,
    );
  const save = (announce = false) => {
    if (outdated) {
      if (announce) setMessage("请先选择恢复旧草稿或使用当前版本。");
      return false;
    }
    const ok = writeStorage(
      draftStorageKey(published),
      JSON.stringify({ base: fingerprint(published), config: draft }),
    );
    setSavedStatus(
      ok ? "草稿已保存在此浏览器" : "浏览器存储不可用，请下载 JSON 备份",
    );
    if (announce)
      setMessage(
        ok
          ? "草稿已保存。下载 HTML 或部署包后，才能分享修改后的版本。"
          : "无法保存到浏览器，请下载 JSON 备份。",
      );
    return ok;
  };
  useEffect(() => {
    if (outdated) return;
    setSavedStatus("正在保存…");
    const timer = setTimeout(() => save(), 350);
    return () => clearTimeout(timer);
  }, [draft, outdated]);
  useEffect(() => {
    const listener = () => {
      if (!outdated) save();
    };
    window.addEventListener("pagehide", listener);
    return () => window.removeEventListener("pagehide", listener);
  }, [draft, outdated]);
  useEffect(() => {
    if (showExport) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [showExport]);
  useEffect(() => {
    if (initialId)
      requestAnimationFrame(() =>
        document
          .getElementById(`edit-${initialId}`)
          ?.scrollIntoView({ block: "center" }),
      );
  }, []);
  const locate = (tab, id) => {
    setSection(tab);
    setMobilePane("edit");
    if (tab === "questions") {
      setAxisFilter("");
      setQuery("");
    }
    requestAnimationFrame(() => {
      if (id)
        document
          .getElementById(`edit-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      else workspaceRef.current?.scrollTo({ top: 0 });
    });
  };
  const validAction = (action) => {
    if (errors.length) {
      setMessage(`请先修复 ${errors.length} 个配置问题。`);
      locate(errors[0].section);
      return;
    }
    action();
  };
  const loadTemplate = (kind) => {
    if (
      !window.confirm(
        "载入模板会替换当前草稿，可以撤销。需要保留多个项目时，请先下载 JSON 备份。",
      )
    )
      return;
    let next = clone(kind === "mpti" ? mpti : lifestyle);
    next.id = uid("project");
    if (kind === "blank") {
      next.dimensions = lifestyle.dimensions.map((source, index) => {
        const dim = newDimension(index + 1);
        dim.poles.forEach((pole, side) => {
          pole.code = source.poles[side].code;
        });
        return dim;
      });
      next.questions = next.dimensions.flatMap((dim) =>
        dim.poles.map((pole) => newQuestion(dim, pole)),
      );
      next.profiles = [];
      next.site.title = "我的新测试";
      next.site.subtitle = "从一个好问题开始。";
      next.site.description = "介绍一下这个测试，邀请大家来试一试。";
      next.site.resultIntro = "你的测试结果";
      next.site.startLabel = "开始测试";
    }
    replace(next);
    setOutdated(null);
    setPreviewChoices({});
    setPreviewAnswers({});
    setMessage("模板已载入，可以修改后导出。");
    setSection("site");
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error("配置文件超过 4 MB。");
      const next = parseConfig(await file.text());
      if (!window.confirm("导入配置会替换当前草稿，可以撤销。继续导入？"))
        return;
      replace(next);
      setOutdated(null);
      setMessage("配置已导入，检查后可以试答或导出。");
    } catch (error) {
      setMessage(error.message);
    }
  };
  const doExport = async (kind) => {
    if (errors.length) return;
    setExporting(true);
    setMessage("");
    try {
      if (kind === "json")
        downloadFile(
          `${fileName(draft.site.title)}.json`,
          JSON.stringify(draft, null, 2),
        );
      else if (kind === "html") await exportHtml(draft, editableExport);
      else await exportZip(draft, editableExport);
      setMessage(
        kind === "json"
          ? "配置已下载。"
          : "文件已导出，可以在另一台电脑打开或部署。",
      );
    } catch (error) {
      setMessage(error.message || "导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  };
  const deleteDimension = (dim) => {
    if (draft.dimensions.length === 1) return;
    const qs = draft.questions.filter((q) => q.dimensionId === dim.id).length;
    const profiles = draft.profiles.filter((p) =>
      Object.hasOwn(p.match, dim.id),
    ).length;
    if (
      !window.confirm(
        `删除「${dim.name}」会同时删除 ${qs} 道关联题目和 ${profiles} 条专属评语。确认删除？可用撤销恢复。`,
      )
    )
      return;
    mutate((d) => {
      d.dimensions = d.dimensions.filter((v) => v.id !== dim.id);
      d.questions = d.questions.filter((q) => q.dimensionId !== dim.id);
      d.profiles = d.profiles.filter((p) => !Object.hasOwn(p.match, dim.id));
    });
  };
  const title = sections.find(([key]) => key === section)?.[1];
  const visibleQuestions = draft.questions
    .map((q, index) => ({ q, index }))
    .filter(
      ({ q }) =>
        (!axisFilter || q.dimensionId === axisFilter) &&
        q.text.toLowerCase().includes(query.toLowerCase()),
    );
  const mainDimensions = draft.dimensions.filter((d) => d.role === "main");
  const previewValid = errors.length === 0;
  return (
    <div className="editor-app" style={{ "--accent": draft.site.themeColor }}>
      <header className="editor-header">
        <div className="editor-brand">
          <span className="brand-icon">
            <Shapes size={22} />
          </span>
          <div>
            <b>万能MBTI生成器</b>
            <span>让每一个好问题，都有自己的页面。</span>
          </div>
        </div>
        <div className="editor-header-actions">
          <IconButton
            label="撤销修改"
            onClick={undo}
            disabled={!history.past.length}
          >
            <Undo2 size={18} />
          </IconButton>
          <IconButton
            label="重做修改"
            onClick={redo}
            disabled={!history.future.length}
          >
            <Redo2 size={18} />
          </IconButton>
          <button
            className="button secondary small"
            aria-label="保存草稿"
            onClick={() => save(true)}
          >
            <Save size={16} />
            <span>保存草稿</span>
          </button>
          <button
            className="button primary small"
            onClick={() =>
              validAction(() => {
                setEditableExport(draft.settings.showEditor);
                setShowExport(true);
              })
            }
          >
            <Download size={16} />
            导出与部署
          </button>
          <IconButton
            label="退出编辑"
            onClick={() => {
              save();
              onExit();
            }}
          >
            <X size={20} />
          </IconButton>
        </div>
      </header>
      <div className="editor-mobile-switch">
        <button
          className={mobilePane === "edit" ? "active" : ""}
          onClick={() => setMobilePane("edit")}
        >
          <PanelLeftClose size={16} />
          编辑配置
        </button>
        <button
          className={mobilePane === "preview" ? "active" : ""}
          onClick={() => setMobilePane("preview")}
        >
          <Eye size={16} />
          实时预览
        </button>
      </div>
      <div className={`editor-layout show-${mobilePane}`}>
        <aside className="editor-sidebar">
          <p className="sidebar-caption">我的测试</p>
          <nav>
            {sections.map(([key, label, Icon], i) => (
              <button
                key={key}
                className={section === key ? "active" : ""}
                onClick={() => locate(key)}
              >
                <Icon size={17} />
                <span>{label}</span>
                <small>{String(i + 1).padStart(2, "0")}</small>
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <p className="sidebar-caption">从模板开始</p>
            <button onClick={() => loadTemplate("lifestyle")}>
              <LayoutTemplate size={16} />
              生活方式测试
            </button>
            <button onClick={() => loadTemplate("mpti")}>
              <LayoutTemplate size={16} />
              MPTI 手机倾向
            </button>
            <button onClick={() => loadTemplate("blank")}>
              <Plus size={16} />
              空白测试
            </button>
            <button onClick={() => importRef.current.click()}>
              <FileUp size={16} />
              导入 JSON 配置
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={importFile}
              hidden
            />
            <a
              href="https://github.com/moubit/universal-mbti-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              使用说明与源代码 <ChevronRight size={14} />
            </a>
          </div>
        </aside>
        <section className="editor-workspace" ref={workspaceRef}>
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">制作属于你的测试</span>
              <h1>{title}</h1>
            </div>
            <span className="draft-status">
              <span className="status-dot" />
              {savedStatus || "本地草稿"}
            </span>
          </div>
          {outdated && (
            <div className="notice">
              <b>发现先前的草稿</b>
              <p>
                它与当前发布配置不同，尚未覆盖当前内容。可以下载备份后再决定恢复。
              </p>
              <div className="inline-actions">
                <button
                  onClick={() =>
                    downloadFile(
                      "previous-draft.json",
                      JSON.stringify(outdated, null, 2),
                    )
                  }
                >
                  备份旧草稿
                </button>
                <button
                  onClick={() => {
                    try {
                      if (!isDraftShape(outdated))
                        throw new Error("旧草稿格式无效，请下载备份后检查。");
                      replace(outdated);
                      setOutdated(null);
                    } catch (error) {
                      setMessage(error.message);
                    }
                  }}
                >
                  恢复旧草稿
                </button>
                <button onClick={() => setOutdated(null)}>使用当前版本</button>
              </div>
            </div>
          )}
          {message && (
            <div className="notice message" role="status">
              {message}
            </div>
          )}
          {errors.length > 0 && (
            <details className="validation">
              <summary>
                {errors.length} 个配置问题需要处理，修复后可导出
              </summary>
              {errors.map((error, i) => (
                <button key={i} onClick={() => locate(error.section)}>
                  {error.message}
                  <ChevronRight size={14} />
                </button>
              ))}
            </details>
          )}
          {section === "site" && (
            <div className="panel">
              <p className="panel-description">
                从一个名字开始。右侧会同步显示你的修改。
              </p>
              <Field label="测试名称">
                <input
                  value={draft.site.title}
                  maxLength={100}
                  onChange={(e) =>
                    mutate((d) => {
                      d.site.title = e.target.value;
                    })
                  }
                />
              </Field>
              <Field label="首页大标题">
                <textarea
                  rows={2}
                  value={draft.site.subtitle}
                  onChange={(e) =>
                    mutate((d) => {
                      d.site.subtitle = e.target.value;
                    })
                  }
                />
              </Field>
              <Field label="测试介绍">
                <textarea
                  rows={4}
                  value={draft.site.description}
                  onChange={(e) =>
                    mutate((d) => {
                      d.site.description = e.target.value;
                    })
                  }
                />
              </Field>
              <div className="field-grid">
                <Field label="开始按钮文案">
                  <input
                    value={draft.site.startLabel}
                    onChange={(e) =>
                      mutate((d) => {
                        d.site.startLabel = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="结果页引导语">
                  <input
                    value={draft.site.resultIntro}
                    onChange={(e) =>
                      mutate((d) => {
                        d.site.resultIntro = e.target.value;
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="测试说明">
                <textarea
                  rows={2}
                  value={draft.site.disclaimer}
                  onChange={(e) =>
                    mutate((d) => {
                      d.site.disclaimer = e.target.value;
                    })
                  }
                />
              </Field>
              <Field label="主题色">
                <div className="color-picker">
                  <input
                    type="color"
                    value={draft.site.themeColor}
                    onChange={(e) =>
                      mutate((d) => {
                        d.site.themeColor = e.target.value;
                      })
                    }
                  />
                  <code>{draft.site.themeColor}</code>
                  <span>按钮与倾向条使用此颜色</span>
                </div>
              </Field>
              <div className="tip">
                <HelpCircle size={16} />
                <p>
                  配置保存在当前浏览器。想把修改带走，请下载 HTML 或
                  JSON；想更新公开网站，请上传新的部署包。
                </p>
              </div>
            </div>
          )}
          {section === "dimensions" && (
            <>
              <p className="panel-description">
                每个维度有两个倾向。改字母不会丢失题目关联；主编码按排列顺序组合，后缀统一放在末尾。
              </p>
              {draft.dimensions.map((dim, index) => (
                <article
                  className="panel dimension-panel"
                  id={`edit-${dim.id}`}
                  key={dim.id}
                >
                  <div className="panel-toolbar">
                    <span className="pill">维度 {index + 1}</span>
                    <div className="inline-actions">
                      <IconButton
                        label={`上移维度 ${dim.name}`}
                        onClick={() =>
                          mutate((d) => move(d.dimensions, index, -1))
                        }
                        disabled={!index}
                      >
                        <ArrowUp size={15} />
                      </IconButton>
                      <IconButton
                        label={`下移维度 ${dim.name}`}
                        onClick={() =>
                          mutate((d) => move(d.dimensions, index, 1))
                        }
                        disabled={index === draft.dimensions.length - 1}
                      >
                        <ArrowDown size={15} />
                      </IconButton>
                      <IconButton
                        label={`删除维度 ${dim.name}`}
                        onClick={() => deleteDimension(dim)}
                        disabled={draft.dimensions.length === 1}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="field-grid">
                    <Field label="维度名称">
                      <input
                        value={dim.name}
                        onChange={(e) =>
                          mutate((d) => {
                            d.dimensions[index].name = e.target.value;
                          })
                        }
                      />
                    </Field>
                    <Field label="编码位置">
                      <select
                        value={dim.role}
                        onChange={(e) =>
                          mutate((d) => {
                            d.dimensions[index].role = e.target.value;
                          })
                        }
                      >
                        <option value="main">主编码</option>
                        <option value="suffix">附加后缀</option>
                      </select>
                    </Field>
                  </div>
                  <div className="pole-grid">
                    {dim.poles.map((pole, pi) => (
                      <div className={`pole pole-${pi}`} key={pole.id}>
                        <Field
                          label={pi ? "右侧字母 / 编码" : "左侧字母 / 编码"}
                          hint="1–4 个字母、汉字或数字"
                        >
                          <input
                            className="code-input"
                            value={pole.code}
                            maxLength={4}
                            onChange={(e) =>
                              mutate((d) => {
                                d.dimensions[index].poles[pi].code =
                                  e.target.value;
                              })
                            }
                          />
                        </Field>
                        <Field label="倾向名称">
                          <input
                            value={pole.name}
                            onChange={(e) =>
                              mutate((d) => {
                                d.dimensions[index].poles[pi].name =
                                  e.target.value;
                              })
                            }
                          />
                        </Field>
                        <Field label="倾向解释 / 默认评语">
                          <textarea
                            rows={4}
                            value={pole.description}
                            onChange={(e) =>
                              mutate((d) => {
                                d.dimensions[index].poles[pi].description =
                                  e.target.value;
                              })
                            }
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                  <Field
                    label="平分时使用的编码"
                    hint="结果仍显示 50% / 50%，这里只决定字母，不额外加分。"
                  >
                    <select
                      value={dim.tiePoleId}
                      onChange={(e) =>
                        mutate((d) => {
                          d.dimensions[index].tiePoleId = e.target.value;
                        })
                      }
                    >
                      {dim.poles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} · {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </article>
              ))}
              <button
                className="button add-button"
                disabled={draft.dimensions.length >= 12}
                onClick={() =>
                  mutate((d) => {
                    const dim = newDimension(d.dimensions.length + 1);
                    d.dimensions.push(dim);
                    d.questions.push(
                      ...dim.poles.map((p) => newQuestion(dim, p)),
                    );
                  })
                }
              >
                <Plus size={17} />
                添加维度（同时添加两道示例题）
              </button>
              <p className="hint">
                最多 12
                个维度。添加主维度后，请到「结果与评语」补全原有专属组合。
              </p>
            </>
          )}
          {section === "questions" && (
            <>
              <div className="question-filters">
                <input
                  aria-label="搜索题目"
                  placeholder="搜索题干…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="筛选维度"
                  value={axisFilter}
                  onChange={(e) => setAxisFilter(e.target.value)}
                >
                  <option value="">全部维度</option>
                  {draft.dimensions.map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="panel-description">
                共 {draft.questions.length}{" "}
                道题。选择「同意时倾向」后，反对答案会自动计入另一侧。
              </p>
              {visibleQuestions.map(({ q, index }) => {
                const dim = draft.dimensions.find(
                  (d) => d.id === q.dimensionId,
                );
                return (
                  <article
                    className="panel question-editor"
                    key={q.id}
                    id={`edit-${q.id}`}
                  >
                    <div className="panel-toolbar">
                      <span className="pill">
                        QUESTION {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="inline-actions">
                        <IconButton
                          label={`上移第 ${index + 1} 题`}
                          disabled={!index}
                          onClick={() =>
                            mutate((d) => move(d.questions, index, -1))
                          }
                        >
                          <ArrowUp size={15} />
                        </IconButton>
                        <IconButton
                          label={`下移第 ${index + 1} 题`}
                          disabled={index === draft.questions.length - 1}
                          onClick={() =>
                            mutate((d) => move(d.questions, index, 1))
                          }
                        >
                          <ArrowDown size={15} />
                        </IconButton>
                        <IconButton
                          label={`复制第 ${index + 1} 题`}
                          disabled={draft.questions.length >= 500}
                          onClick={() =>
                            mutate((d) => {
                              d.questions.splice(index + 1, 0, {
                                ...clone(q),
                                id: uid("q"),
                              });
                            })
                          }
                        >
                          <Copy size={15} />
                        </IconButton>
                        <IconButton
                          label={`删除第 ${index + 1} 题`}
                          onClick={() =>
                            mutate((d) => {
                              d.questions.splice(index, 1);
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </div>
                    <Field label="题目内容">
                      <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) =>
                          mutate((d) => {
                            d.questions[index].text = e.target.value;
                          })
                        }
                      />
                    </Field>
                    <div className="field-grid">
                      <Field label="所属维度">
                        <select
                          value={q.dimensionId}
                          onChange={(e) =>
                            mutate((d) => {
                              const dim = d.dimensions.find(
                                (v) => v.id === e.target.value,
                              );
                              d.questions[index].dimensionId = dim.id;
                              d.questions[index].poleId = dim.poles[0].id;
                            })
                          }
                        >
                          {draft.dimensions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="同意 / 高分时倾向">
                        <select
                          value={q.poleId}
                          onChange={(e) =>
                            mutate((d) => {
                              d.questions[index].poleId = e.target.value;
                            })
                          }
                        >
                          {dim?.poles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} · {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="field-grid">
                      <Field label="权重" hint="默认 1；最大 10，支持小数。">
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={q.weight}
                          onChange={(e) =>
                            mutate((d) => {
                              d.questions[index].weight = Number(
                                e.target.value,
                              );
                            })
                          }
                        />
                      </Field>
                      <div className="checkbox-field">
                        <Toggle
                          checked={q.required}
                          onChange={(v) =>
                            mutate((d) => {
                              d.questions[index].required = v;
                            })
                          }
                        >
                          平衡抽题时每次必出
                        </Toggle>
                      </div>
                    </div>
                    <details className="custom-scale">
                      <summary>
                        自定义本题量表文案{q.labels ? " · 已启用" : ""}
                      </summary>
                      <Toggle
                        checked={!!q.labels}
                        onChange={(v) =>
                          mutate((d) => {
                            if (v)
                              d.questions[index].labels = [
                                ...d.settings.scaleLabels,
                              ];
                            else delete d.questions[index].labels;
                          })
                        }
                      >
                        为这道题单独设置各档文案
                      </Toggle>
                      {q.labels?.map((text, li) => (
                        <Field key={li} label={`第 ${li + 1} 档`}>
                          <input
                            value={text}
                            onChange={(e) =>
                              mutate((d) => {
                                d.questions[index].labels[li] = e.target.value;
                              })
                            }
                          />
                        </Field>
                      ))}
                    </details>
                  </article>
                );
              })}
              {!visibleQuestions.length && (
                <div className="empty-state">没有匹配的题目。</div>
              )}
              <button
                className="button add-button"
                disabled={draft.questions.length >= 500}
                onClick={() =>
                  mutate((d) => {
                    d.questions.push(
                      newQuestion(
                        d.dimensions.find((v) => v.id === axisFilter) ||
                          d.dimensions[0],
                      ),
                    );
                  })
                }
              >
                <Plus size={17} />
                添加题目
              </button>
            </>
          )}
          {section === "settings" && (
            <div className="panel">
              <Field label="出题方式">
                <select
                  value={draft.settings.selection}
                  onChange={(e) =>
                    mutate((d) => {
                      d.settings.selection = e.target.value;
                    })
                  }
                >
                  <option value="all">全部题目</option>
                  <option value="balanced">每个维度两侧平衡抽题</option>
                </select>
              </Field>
              {draft.settings.selection === "balanced" && (
                <Field
                  label="每个倾向抽取几道题"
                  hint={`本次共 ${draft.dimensions.length * 2 * draft.settings.perPole} 道题；必出题占用抽题名额。`}
                >
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={draft.settings.perPole}
                    onChange={(e) =>
                      mutate((d) => {
                        d.settings.perPole = Number(e.target.value);
                      })
                    }
                  />
                </Field>
              )}
              <Field label="每页题数">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={draft.settings.perPage}
                  onChange={(e) =>
                    mutate((d) => {
                      d.settings.perPage = Number(e.target.value);
                    })
                  }
                />
              </Field>
              <Toggle
                checked={draft.settings.shuffle}
                onChange={(v) =>
                  mutate((d) => {
                    d.settings.shuffle = v;
                  })
                }
              >
                打乱题目顺序
              </Toggle>
              <Field
                label="量表档数"
                hint="修改档数会重置各档文案，包括单题自定义文案。"
              >
                <select
                  value={draft.settings.scalePoints}
                  onChange={(e) => {
                    const points = Number(e.target.value);
                    if (
                      window.confirm(
                        "修改量表档数会重置所有量表文案，可撤销。继续？",
                      )
                    )
                      mutate((d) => {
                        d.settings.scalePoints = points;
                        d.settings.scaleLabels = scaleLabels(points);
                        d.questions.forEach((q) => {
                          delete q.labels;
                        });
                      });
                  }}
                >
                  <option value={5}>5 档</option>
                  <option value={7}>7 档</option>
                </select>
              </Field>
              <div className="scale-editor">
                {draft.settings.scaleLabels.map((label, i) => (
                  <Field
                    label={`第 ${i + 1} 档${i === Math.floor(draft.settings.scalePoints / 2) ? " · 中立" : ""}`}
                    key={i}
                  >
                    <input
                      value={label}
                      onChange={(e) =>
                        mutate((d) => {
                          d.settings.scaleLabels[i] = e.target.value;
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Toggle
                checked={draft.settings.showEditor}
                onChange={(v) =>
                  mutate((d) => {
                    d.settings.showEditor = v;
                  })
                }
              >
                发布页面默认保留编辑入口
              </Toggle>
              <div className="tip">
                <HelpCircle size={16} />
                <p>
                  编辑入口只修改访问者自己的浏览器草稿。上传新的 HTML
                  或部署包，才会改变公开网站。
                </p>
              </div>
            </div>
          )}
          {section === "results" && (
            <>
              <div className="tip">
                <LayoutTemplate size={17} />
                <p>
                  未填写专属评语的组合，会自动使用各维度的倾向解释。当前有{" "}
                  {2 ** mainDimensions.length} 种主编码组合，不必全部填写。
                </p>
              </div>
              {draft.profiles.map((profile, index) => (
                <article className="panel" key={profile.id}>
                  <div className="panel-toolbar">
                    <span className="pill">专属评语 {index + 1}</span>
                    <IconButton
                      label={`删除评语 ${profile.name}`}
                      onClick={() =>
                        mutate((d) => {
                          d.profiles.splice(index, 1);
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                  <div className="profile-selectors">
                    {mainDimensions.map((dim) => (
                      <Field key={dim.id} label={dim.name}>
                        <select
                          value={profile.match[dim.id] || ""}
                          onChange={(e) =>
                            mutate((d) => {
                              const p = d.profiles[index];
                              p.match = Object.fromEntries(
                                mainDimensions.map((v) => [
                                  v.id,
                                  v.id === dim.id
                                    ? e.target.value
                                    : p.match[v.id] || "",
                                ]),
                              );
                            })
                          }
                        >
                          <option value="" disabled>
                            选择倾向
                          </option>
                          {dim.poles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} · {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ))}
                  </div>
                  {Object.keys(profile.match).some(
                    (id) => !mainDimensions.some((d) => d.id === id),
                  ) && (
                    <button
                      className="button secondary small"
                      onClick={() =>
                        mutate((d) => {
                          const p = d.profiles[index];
                          p.match = Object.fromEntries(
                            mainDimensions.map((v) => [
                              v.id,
                              p.match[v.id] || "",
                            ]),
                          );
                        })
                      }
                    >
                      移除已不参与主编码的关联
                    </button>
                  )}
                  <Field label="结果名称">
                    <input
                      value={profile.name}
                      onChange={(e) =>
                        mutate((d) => {
                          d.profiles[index].name = e.target.value;
                        })
                      }
                    />
                  </Field>
                  <Field label="完整评语">
                    <textarea
                      rows={5}
                      value={profile.text}
                      onChange={(e) =>
                        mutate((d) => {
                          d.profiles[index].text = e.target.value;
                        })
                      }
                    />
                  </Field>
                  <button
                    className="button text-button small"
                    onClick={() => {
                      setPreviewChoices(profile.match);
                      setPreview("result");
                      setMobilePane("preview");
                    }}
                  >
                    <Eye size={15} />
                    预览这个组合
                  </button>
                </article>
              ))}
              <button
                className="button add-button"
                disabled={draft.profiles.length >= 1024}
                onClick={() =>
                  mutate((d) => {
                    const used = new Set(
                      d.profiles.map((p) =>
                        mainDimensions.map((dim) => p.match[dim.id]).join("|"),
                      ),
                    );
                    let match;
                    for (let i = 0; i < 2 ** mainDimensions.length; i++) {
                      const candidate = Object.fromEntries(
                        mainDimensions.map((dim, j) => [
                          dim.id,
                          dim.poles[(i >> j) & 1].id,
                        ]),
                      );
                      if (
                        !used.has(
                          mainDimensions
                            .map((dim) => candidate[dim.id])
                            .join("|"),
                        )
                      ) {
                        match = candidate;
                        break;
                      }
                    }
                    if (!match) {
                      setMessage("所有组合都已有专属评语。");
                      return;
                    }
                    d.profiles.push({
                      id: uid("profile"),
                      match,
                      name: "新的结果名称",
                      text: "在这里描述这个组合的特点。",
                    });
                  })
                }
              >
                <Plus size={17} />
                添加组合专属评语
              </button>
            </>
          )}
          {section === "credits" && (
            <>
              <p className="panel-description">
                两份署名分别控制。页面底部和下载的分享图使用相同设置，导出后会保留你的选择。
              </p>
              {[
                ["original", "原项目作者"],
                ["project", "项目作者"],
              ].map(([key, label]) => (
                <div className="panel" key={key}>
                  <div className="panel-toolbar">
                    <h2>{label}</h2>
                    <Toggle
                      checked={draft.credits[key].visible}
                      onChange={(v) =>
                        mutate((d) => {
                          d.credits[key].visible = v;
                        })
                      }
                    >
                      显示署名
                    </Toggle>
                  </div>
                  <Field label={`${label}名称`}>
                    <input
                      value={draft.credits[key].name}
                      onChange={(e) =>
                        mutate((d) => {
                          d.credits[key].name = e.target.value;
                        })
                      }
                    />
                  </Field>
                  <Field
                    label={`${label}链接`}
                    hint="可留空；填写时使用完整的 https:// 或 http:// 地址。"
                  >
                    <input
                      type="url"
                      value={draft.credits[key].url}
                      placeholder="https://…"
                      onChange={(e) =>
                        mutate((d) => {
                          d.credits[key].url = e.target.value;
                        })
                      }
                    />
                  </Field>
                  <button
                    className="button text-button danger small"
                    onClick={() =>
                      mutate((d) => {
                        d.credits[key] = { name: "", url: "", visible: false };
                      })
                    }
                  >
                    <Trash2 size={15} />
                    删除这项署名
                  </button>
                </div>
              ))}
              <p className="hint">
                页面署名可自由删除。软件和第三方依赖的许可证仍随发行文件保留。
              </p>
            </>
          )}
        </section>
        <aside className="preview-pane">
          <div className="preview-toolbar">
            <div>
              <span className="status-dot" />
              <b>实时预览</b>
            </div>
            <div className="segmented">
              {[
                ["home", "首页"],
                ["quiz", "题目"],
                ["result", "结果"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={preview === key ? "active" : ""}
                  onClick={() => setPreview(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="button secondary small"
              onClick={() =>
                validAction(() => {
                  save();
                  onTrial(clone(draft));
                })
              }
            >
              <Eye size={15} />
              完整试答
            </button>
          </div>
          <div className="preview-scroll">
            <div className="preview-browser">
              <div className="browser-chrome">
                <i />
                <i />
                <i />
                <span>{draft.site.title}</span>
                <span className="preview-badge">PREVIEW</span>
              </div>
              <div
                className="preview-content"
                style={{ "--accent": draft.site.themeColor }}
              >
                {previewValid ? (
                  <>
                    {preview === "home" && (
                      <>
                        <Home
                          compact
                          config={draft}
                          onStart={() => setPreview("quiz")}
                          onEdit={locate}
                        />
                        <Credits config={draft} onEdit={locate} />
                      </>
                    )}
                    {preview === "quiz" && (
                      <>
                        <div className="preview-section-intro">
                          <span className="eyebrow">题目预览</span>
                          <h2>点击题干，跳到编辑位置</h2>
                        </div>
                        {draft.questions
                          .slice(0, draft.settings.perPage)
                          .map((q, i) => (
                            <Question
                              key={q.id}
                              config={draft}
                              question={q}
                              number={i + 1}
                              answer={previewAnswers[q.id]}
                              onAnswer={(v) =>
                                setPreviewAnswers((s) => ({ ...s, [q.id]: v }))
                              }
                              onEdit={locate}
                            />
                          ))}
                        <Credits config={draft} onEdit={locate} />
                      </>
                    )}
                    {preview === "result" && (
                      <>
                        <div className="preview-combination">
                          {draft.dimensions.map((dim) => (
                            <Field key={dim.id} label={dim.name}>
                              <select
                                value={
                                  previewChoices[dim.id] || dim.poles[0].id
                                }
                                onChange={(e) =>
                                  setPreviewChoices((s) => ({
                                    ...s,
                                    [dim.id]: e.target.value,
                                  }))
                                }
                              >
                                {dim.poles.map((p) => (
                                  <option value={p.id} key={p.id}>
                                    {p.code}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          ))}
                        </div>
                        <ResultView
                          preview
                          config={draft}
                          result={previewResult(draft, previewChoices)}
                          onEdit={locate}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <Shapes size={32} />
                    <h3>把配置补完整，就能看到预览</h3>
                    <p>{errors[0]?.message}</p>
                    <button
                      className="button secondary small"
                      onClick={() => locate(errors[0]?.section)}
                    >
                      前往修改
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="preview-hint">
              修改会即时显示。预览区里的标题、字母和题干可点击定位。
            </p>
          </div>
        </aside>
      </div>
      <dialog
        ref={dialogRef}
        className="export-dialog"
        onClose={() => setShowExport(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            const r = e.target.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              setShowExport(false);
          }
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">让你的测试走出去</span>
            <h2>导出与部署</h2>
          </div>
          <IconButton label="关闭导出窗口" onClick={() => setShowExport(false)}>
            <X size={20} />
          </IconButton>
        </div>
        <Toggle checked={editableExport} onChange={setEditableExport}>
          HTML / 部署包保留编辑入口
        </Toggle>
        <p className="hint">
          关闭后，页面仅用于答题。建议同时下载 JSON，方便之后继续修改。
        </p>
        <div className="export-options">
          <button
            disabled={exporting || !!errors.length}
            onClick={() => doExport("html")}
          >
            <Download size={22} />
            <div>
              <b>单 HTML 文件</b>
              <span>双击打开，离线答题和编辑。分享文件即可使用。</span>
            </div>
            <ChevronRight size={18} />
          </button>
          <button
            disabled={exporting || !!errors.length}
            onClick={() => doExport("zip")}
          >
            <LayoutTemplate size={22} />
            <div>
              <b>静态部署包 ZIP</b>
              <span>上传到 EdgeOne 等静态托管平台即可发布。</span>
            </div>
            <ChevronRight size={18} />
          </button>
          <button
            disabled={exporting || !!errors.length}
            onClick={() => doExport("json")}
          >
            <FileJson size={22} />
            <div>
              <b>项目配置 JSON</b>
              <span>备份内容，或在另一份生成器中继续编辑。</span>
            </div>
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="notice" role="status">
          {exporting
            ? "正在打包，请稍等…"
            : message || "导出只包含测试内容，不包含答题记录或浏览器草稿。"}
        </p>
      </dialog>
    </div>
  );
}
