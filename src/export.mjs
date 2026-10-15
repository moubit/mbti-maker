import { zipSync, strToU8 } from "fflate";
import { renderDocument } from "./document.mjs";
import { LICENSE } from "./license.mjs";

export function downloadFile(name, content, mime = "application/json") {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30000);
}
export function fileName(name) {
  return (
    name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").slice(0, 80) || "my-test"
  );
}
async function runtime() {
  let root = document;
  if (!root.querySelector("script[data-runtime]")) {
    const response = await fetch("/__export_runtime");
    if (!response.ok)
      throw new Error("开发预览导出前，请先运行 npm run build。");
    root = new DOMParser().parseFromString(await response.text(), "text/html");
  }
  return {
    js: root.querySelector("script[data-runtime]")?.textContent,
    css: root.querySelector("style[data-runtime]")?.textContent,
    licenses: root.querySelector("#project-licenses")?.textContent || LICENSE,
  };
}
export async function exportHtml(config, editable) {
  const content = renderDocument(config, await runtime(), { editable });
  downloadFile(
    `${fileName(config.site.title)}.html`,
    content,
    "text/html;charset=utf-8",
  );
}
export async function exportZip(config, editable) {
  const resources = await runtime();
  const html = renderDocument(config, resources, { editable });
  const files = {
    "index.html": strToU8(html),
    LICENSE: strToU8(LICENSE),
    "THIRD_PARTY_NOTICES.txt": strToU8(resources.licenses),
    "部署说明.txt": strToU8(
      "将这个 ZIP 上传到支持静态网站的托管平台即可。index.html 已在压缩包根目录。\n更新网站：在编辑器修改后重新导出并上传。浏览器草稿不会更新公开网站。\n此包不含答题记录、浏览器草稿或后台服务。\n",
    ),
  };
  downloadFile(
    `${fileName(config.site.title)}-site.zip`,
    zipSync(files),
    "application/zip",
  );
}
