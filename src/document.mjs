import { LICENSE } from "./license.mjs";
import { clone, validate } from "./core.mjs";

export function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function renderDocument(
  config,
  runtime,
  { editable = config.settings.showEditor } = {},
) {
  const errors = validate(config);
  if (errors.length) throw new Error(errors.map((e) => e.message).join("\n"));
  if (!runtime?.js || !runtime?.css)
    throw new Error("程序资源尚未就绪，请重新加载后导出。");
  const published = clone(config);
  published.settings.showEditor = editable;
  const js = runtime.js.replace(/<\/script/gi, "<\\/script");
  const css = runtime.css.replace(/<\/style/gi, "<\\/style");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(published.site.description)}"><meta name="theme-color" content="${published.site.themeColor}"><title>${escapeHtml(published.site.title)}</title><style data-runtime>${css}</style></head>
<body><div id="root"></div><script id="project-config" type="application/json">${scriptJson(published)}</script><script id="project-licenses" type="text/plain">${(runtime.licenses || LICENSE).replace(/<\/script/gi, "<\\/script")}</script><script data-runtime>${js}</script></body></html>`;
}
