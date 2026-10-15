import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Download,
  Copy,
  Check,
  Pencil,
  Sparkles,
  Shapes,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  calculate,
  freshSession,
  isAnswer,
  readStorage,
  restoreSession,
  safeUrl,
  sessionStorageKey,
  writeStorage,
} from "./core.mjs";
import { downloadFile, fileName } from "./export.mjs";

export function Credits({ config, onEdit }) {
  const entries = [
    ["original", "原项目作者"],
    ["project", "项目作者"],
  ].filter(([key]) => config.credits[key].visible);
  if (!entries.length) return null;
  return (
    <footer
      className={`credits ${onEdit ? "editable-region" : ""}`}
      onClick={
        onEdit
          ? (event) => {
              event.preventDefault();
              onEdit("credits");
            }
          : undefined
      }
    >
      {entries.map(([key, label]) => (
        <span key={key}>
          {label}
          <span className="credit-dot">·</span>
          {safeUrl(config.credits[key].url) ? (
            <a
              href={safeUrl(config.credits[key].url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {config.credits[key].name}
              <ArrowUpRight size={12} />
            </a>
          ) : (
            <strong>{config.credits[key].name}</strong>
          )}
        </span>
      ))}
    </footer>
  );
}
export function Home({
  config,
  onStart,
  onEdit,
  resume = false,
  compact = false,
}) {
  const mains = config.dimensions.filter((d) => d.role === "main");
  const count =
    config.settings.selection === "all"
      ? config.questions.length
      : config.dimensions.length * config.settings.perPole * 2;
  return (
    <section className={`home ${compact ? "compact-home" : ""}`}>
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" /> 每一种倾向，都有自己的答案
        </div>
        <h1
          className={onEdit ? "editable-region" : ""}
          onClick={() => onEdit?.("site")}
        >
          {config.site.subtitle || config.site.title}
        </h1>
        <p className="hero-description">{config.site.description}</p>
        <div className="hero-actions">
          <button className="button primary" onClick={onStart}>
            {resume ? "继续上次测试" : config.site.startLabel || "开始测试"}
            <ArrowRight size={18} />
          </button>
          {onEdit && (
            <button className="button secondary" onClick={() => onEdit("site")}>
              <Pencil size={16} />
              编辑我的测试
            </button>
          )}
        </div>
        <div className="hero-stats">
          <span>
            <b>{count.toString().padStart(2, "0")}</b> 道题目
          </span>
          <span>
            <b>{config.dimensions.length.toString().padStart(2, "0")}</b> 个维度
          </span>
          <span>
            <b>{Math.max(1, Math.ceil(count / 5))}</b> 分钟探索
          </span>
        </div>
      </div>
      <div
        className="hero-art"
        aria-label="测试维度示意"
        onClick={() => onEdit?.("dimensions")}
      >
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="art-note">
          <Sparkles size={15} /> 没有标准答案
        </div>
        <div className="type-tiles">
          {mains.slice(0, 4).map((dim, i) => (
            <div className={`type-tile tile-${i % 4}`} key={dim.id}>
              <span>{dim.name}</span>
              <strong>{dim.poles[0].code}</strong>
              <small>{dim.poles[0].name}</small>
              <i>{dim.poles[1].code}</i>
            </div>
          ))}
        </div>
        <div className="art-caption">
          <span className="tiny-star">✳</span>
          <div>
            <b>你的组合，由你定义</b>
            <span>每一面，都值得被看见。</span>
          </div>
        </div>
      </div>
      <div className="home-bottom">
        <div className="home-note">
          <Shapes size={18} />
          <span>{config.dimensions.length} 个维度，发现不同的自己</span>
        </div>
        <p className="disclaimer">{config.site.disclaimer}</p>
      </div>
    </section>
  );
}

export function Question({
  config,
  question,
  number,
  answer,
  onAnswer,
  missing,
  onEdit,
}) {
  const labels = question.labels || config.settings.scaleLabels;
  return (
    <fieldset
      className={`question ${missing ? "missing" : ""}`}
      id={`question-${question.id}`}
    >
      <legend>
        <span className="question-number">
          {String(number).padStart(2, "0")}
        </span>
        <span
          className={onEdit ? "editable-region" : ""}
          onClick={() => onEdit?.("questions", question.id)}
        >
          {question.text}
        </span>
      </legend>
      <div
        className="answer-scale"
        style={{ "--points": config.settings.scalePoints }}
      >
        {labels.map((label, index) => (
          <label
            className={`answer-option ${index < labels.length / 2 - 0.5 ? "negative" : index > labels.length / 2 - 0.5 ? "positive" : "neutral"} ${answer === index + 1 ? "selected" : ""}`}
            key={index}
          >
            <input
              type="radio"
              name={question.id}
              value={index + 1}
              checked={answer === index + 1}
              onChange={() => onAnswer(index + 1)}
              aria-label={label}
            />
            <span className="answer-circle" aria-hidden="true">
              {answer === index + 1 ? <Check size={18} /> : index + 1}
            </span>
            <span className="answer-label">{label}</span>
          </label>
        ))}
      </div>
      {missing && <p className="field-error">请选择一个答案后继续。</p>}
    </fieldset>
  );
}

export function ResultView({
  config,
  result,
  preview = false,
  onRestart,
  onEdit,
}) {
  const cardRef = useRef(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [openPole, setOpenPole] = useState(null);
  const ordered = [
    ...result.tendencies.filter((t) => t.dimension.role === "main"),
    ...result.tendencies.filter((t) => t.dimension.role === "suffix"),
  ];
  const explanation = ordered.find((t) => t.dimension.id === openPole);
  const copy = async () => {
    const text = `${config.site.title}\n${result.code} · ${result.name}\n\n${result.text}${result.suffixText ? `\n\n${result.suffixText}` : ""}\n\n${config.site.disclaimer}`;
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement("textarea");
        input.value = text;
        document.body.append(input);
        input.select();
        const ok = document.execCommand("copy");
        input.remove();
        if (!ok) throw new Error();
      }
      setMessage("结果已复制。");
    } catch {
      setMessage("复制失败，请使用浏览器选择结果文字后复制。");
    }
  };
  const saveImage = async () => {
    setBusy(true);
    setMessage("");
    try {
      await document.fonts?.ready;
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#fcfdf9",
        skipFonts: true,
        filter: (node) => !node.dataset?.noCapture,
      });
      const blob = await (await fetch(dataUrl)).blob();
      downloadFile(
        `${fileName(config.site.title)}-${fileName(result.code)}.png`,
        blob,
        "image/png",
      );
      setMessage("分享图已生成。");
    } catch {
      setMessage("分享图生成失败，可以先复制结果，或使用浏览器截图。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="result-page">
      <div className="result-topline">
        <span className="eyebrow">
          {preview ? "结果预览 · 示例比例" : "探索完成"}
        </span>
        <span className="result-stamp">
          <Sparkles size={15} /> 每一面都是你
        </span>
      </div>
      <div className="result-sheet" ref={cardRef}>
        <div className="result-heading">
          <span>{config.site.title}</span>
          <Shapes size={24} />
        </div>
        <p
          className="result-intro editable-region"
          onClick={() => onEdit?.("site")}
        >
          {config.site.resultIntro}
        </p>
        <div className="result-code" aria-label={`结果 ${result.code}`}>
          {ordered.map((t, i) => (
            <React.Fragment key={t.dimension.id}>
              {t.dimension.role === "suffix" &&
                (i === 0 || ordered[i - 1].dimension.role !== "suffix") && (
                  <span className="code-separator">-</span>
                )}
              <button
                aria-label={`查看 ${t.winner.code} 的含义`}
                aria-expanded={openPole === t.dimension.id}
                title={`${t.dimension.name} · ${t.winner.name}`}
                onClick={() =>
                  onEdit
                    ? onEdit("dimensions", t.dimension.id)
                    : setOpenPole((v) =>
                        v === t.dimension.id ? null : t.dimension.id,
                      )
                }
              >
                {t.winner.code}
              </button>
            </React.Fragment>
          ))}
        </div>
        {explanation && (
          <div className="suffix-note" data-no-capture="true">
            <b>
              {explanation.dimension.name} · {explanation.winner.name}
            </b>
            <p>{explanation.winner.description}</p>
          </div>
        )}
        <h2
          className={onEdit ? "editable-region" : ""}
          onClick={() => onEdit?.("results")}
        >
          {result.name}
        </h2>
        <div className="result-prose">
          {result.text.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {result.suffixText && (
          <div className="suffix-note">
            {result.suffixText.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        <div className="tendencies">
          <div className="section-caption">
            <span>倾向分布</span>
            <small>
              {preview ? "示例比例，仅用于预览" : "比例来自本次作答"}
            </small>
          </div>
          {result.tendencies.map(
            ({ dimension, leftPercent, rightPercent, winner, tied }) => (
              <div className="tendency" key={dimension.id}>
                <div className="tendency-title">
                  <strong>{dimension.name}</strong>
                  <span>{tied ? "两侧均衡" : winner.name}</span>
                </div>
                <div
                  className="tendency-bar"
                  role="img"
                  aria-label={`${dimension.poles[0].name} ${leftPercent}%，${dimension.poles[1].name} ${rightPercent}%`}
                >
                  <span style={{ width: `${leftPercent}%` }} />
                  <i style={{ left: `${leftPercent}%` }} />
                </div>
                <div className="tendency-labels">
                  {dimension.poles.map((p, i) => (
                    <span key={p.id} title={p.description}>
                      {p.code} · {p.name}
                      <b>{i ? rightPercent : leftPercent}%</b>
                    </span>
                  ))}
                </div>
                {tied && (
                  <small className="tie-note">
                    按设置采用 {winner.code}；倾向仍为 50% / 50%。
                  </small>
                )}
              </div>
            ),
          )}
        </div>
        <p className="disclaimer">{config.site.disclaimer}</p>
        <Credits config={config} onEdit={onEdit} />
      </div>
      {!preview && (
        <>
          <div className="result-actions">
            <button
              className="button primary"
              onClick={saveImage}
              disabled={busy}
            >
              <Download size={17} />
              {busy ? "生成中…" : "下载分享图"}
            </button>
            <button className="button secondary" onClick={copy}>
              <Copy size={17} />
              复制结果
            </button>
            <button className="button text-button" onClick={onRestart}>
              <RotateCcw size={16} />
              重新测试
            </button>
          </div>
          <p className="status-message" role="status">
            {message}
          </p>
        </>
      )}
    </section>
  );
}

export default function Player({ config, onEdit, onBack }) {
  const [session, setSession] = useState(() =>
    restoreSession(readStorage(sessionStorageKey(config)), config),
  );
  const [missing, setMissing] = useState([]);
  const [storageFailed, setStorageFailed] = useState(false);
  const questionMap = new Map(config.questions.map((q) => [q.id, q]));
  const selected = session.questionIds.map((id) => questionMap.get(id));
  const groupCount = Math.ceil(selected.length / config.settings.perPage);
  const current = selected.slice(
    session.page * config.settings.perPage,
    (session.page + 1) * config.settings.perPage,
  );
  const answered = selected.filter((q) =>
    isAnswer(session.answers[q.id], config),
  ).length;
  useEffect(() => {
    setStorageFailed(
      !writeStorage(sessionStorageKey(config), JSON.stringify(session)),
    );
  }, [session, config]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [session.view, session.page]);
  const change = (patch) => setSession((s) => ({ ...s, ...patch }));
  const restart = () => {
    setSession({ ...freshSession(config), view: "quiz" });
    setMissing([]);
  };
  const next = () => {
    const absent = current
      .filter((q) => !isAnswer(session.answers[q.id], config))
      .map((q) => q.id);
    setMissing(absent);
    if (absent.length) {
      requestAnimationFrame(() =>
        document
          .getElementById(`question-${absent[0]}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }
    if (session.page === groupCount - 1) change({ view: "result" });
    else change({ page: session.page + 1 });
  };
  return (
    <div className="player" style={{ "--accent": config.site.themeColor }}>
      <header className="site-header">
        <button className="brand" onClick={() => change({ view: "home" })}>
          <span className="brand-icon">
            <Shapes size={23} />
          </span>
          <span>
            {config.site.title}
            <small>发现每一种可能</small>
          </span>
        </button>
        <nav>
          {onBack && (
            <button className="button secondary small" onClick={onBack}>
              <ArrowLeft size={15} />
              返回编辑
            </button>
          )}
          {config.settings.showEditor && onEdit && (
            <button
              className="button secondary small"
              onClick={() => onEdit("site")}
            >
              <Pencil size={15} />
              编辑
            </button>
          )}
        </nav>
      </header>
      {onBack && (
        <div className="draft-banner">
          正在试答本地草稿，公开网站内容未改变。
        </div>
      )}
      <main className="site-main">
        {session.view === "home" && (
          <Home
            config={config}
            onStart={() => change({ view: "quiz" })}
            onEdit={config.settings.showEditor ? onEdit : undefined}
            resume={answered > 0}
          />
        )}
        {session.view === "quiz" && (
          <section className="quiz-page">
            <div className="quiz-heading">
              <span className="eyebrow">按你的直觉，慢慢选择</span>
              <h1>这一面，更像你吗？</h1>
              <p>没有对错；越靠近两端，倾向越明显。</p>
            </div>
            <div className="quiz-progress">
              <span>
                第 {session.page + 1} / {groupCount} 组
              </span>
              <span>
                已完成 {answered} / {selected.length} 题
              </span>
              <progress
                max={selected.length}
                value={answered}
                aria-label="答题进度"
              />
            </div>
            <div className="question-list">
              {current.map((q, i) => (
                <Question
                  key={q.id}
                  config={config}
                  question={q}
                  number={session.page * config.settings.perPage + i + 1}
                  answer={session.answers[q.id]}
                  missing={missing.includes(q.id)}
                  onAnswer={(value) => {
                    setSession((s) => ({
                      ...s,
                      answers: { ...s.answers, [q.id]: value },
                    }));
                    setMissing((s) => s.filter((id) => id !== q.id));
                  }}
                />
              ))}
            </div>
            <div className="quiz-navigation">
              <button
                className="button secondary"
                onClick={() => {
                  setMissing([]);
                  change(
                    session.page
                      ? { page: session.page - 1 }
                      : { view: "home" },
                  );
                }}
              >
                <ArrowLeft size={17} />
                {session.page ? "上一组" : "返回首页"}
              </button>
              <button className="button primary" onClick={next}>
                {session.page === groupCount - 1 ? "查看我的结果" : "下一组"}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        )}
        {session.view === "result" && (
          <ResultView
            config={config}
            result={calculate(config, selected, session.answers)}
            onRestart={restart}
          />
        )}
      </main>
      {storageFailed && (
        <p className="storage-note" role="status">
          浏览器无法保存答题进度，关闭页面后需要重新开始。
        </p>
      )}
      {session.view !== "result" && <Credits config={config} />}
    </div>
  );
}
