import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { parseConfig } from "../src/core.mjs";
import { renderDocument } from "../src/document.mjs";
import { LICENSE } from "../src/license.mjs";

const config = parseConfig(
  await readFile(new URL("../template.json", import.meta.url), "utf8"),
);
const require = createRequire(import.meta.url);
const runtimePackages = [
  "react",
  "react-dom",
  "scheduler",
  "lucide-react",
  "fflate",
  "html-to-image",
];
const notices = [];
for (const name of runtimePackages) {
  const packagePath = require.resolve(`${name}/package.json`);
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  let license;
  for (const file of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
    try {
      license = await readFile(join(dirname(packagePath), file), "utf8");
      break;
    } catch {}
  }
  if (!license) throw new Error(`Missing license for ${name}`);
  notices.push(`${name} ${pkg.version}\n${license}`);
}
const thirdParty = notices.join(
  "\n\n----------------------------------------\n\n",
);
const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  write: false,
  outfile: "app.js",
  format: "iife",
  platform: "browser",
  target: ["chrome110", "firefox115", "safari16.4"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "inline",
});
const runtime = {
  js: result.outputFiles.find((f) => f.path.endsWith(".js")).text,
  css: result.outputFiles.find((f) => f.path.endsWith(".css")).text,
  licenses: `${LICENSE}\n\n${thirdParty}`,
};
const html = renderDocument(config, runtime);
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("release", { recursive: true });
await writeFile("dist/index.html", html);
await writeFile("dist/LICENSE", LICENSE);
await writeFile("dist/THIRD_PARTY_NOTICES.txt", thirdParty);
await writeFile("release/万能MBTI生成器.html", html);
await writeFile("release/universal-mbti-generator.html", html);
await writeFile(
  "release/template.json",
  JSON.stringify(config, null, 2) + "\n",
);
await writeFile(
  "release/universal-mbti-generator-site.zip",
  zipSync({
    "index.html": strToU8(html),
    LICENSE: strToU8(LICENSE),
    "THIRD_PARTY_NOTICES.txt": strToU8(thirdParty),
  }),
);
await writeFile("THIRD_PARTY_NOTICES.txt", thirdParty);
console.log(
  `Built offline HTML and deployment ZIP (${(Buffer.byteLength(html) / 1024).toFixed(0)} KiB HTML).`,
);
