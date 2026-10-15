import english from "./locales/en.json" with { type: "json" };

export const LANGUAGE_KEY = "umbti:ui-language";
export const LANGUAGE_OPTIONS = ["auto", "zh", "en"];
export const message = (key, params = {}) => ({ key, params });

export function detectLanguage(languages = []) {
  for (const tag of languages) {
    const language = String(tag).toLowerCase().split(/[-_]/)[0];
    if (language === "zh" || language === "en") return language;
  }
  return "en";
}

export function resolveLanguage(preference, languages) {
  return preference === "zh" || preference === "en"
    ? preference
    : detectLanguage(languages);
}

export function formatMessage(source, language = "zh", params = {}) {
  if (Array.isArray(source))
    return source.map((item) => formatMessage(item, language)).join("\n");
  if (source == null) return "";
  const key = typeof source === "object" ? source.key : String(source);
  const values = typeof source === "object" ? source.params || {} : params;
  const text = language === "en" ? (english[key] ?? key) : key;
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    if (!Object.hasOwn(values, name)) return match;
    const value = values[name];
    // Only explicit message descriptors are translated. User-authored values
    // are inserted verbatim, even if they happen to match a UI translation key.
    return value && typeof value === "object" && typeof value.key === "string"
      ? formatMessage(value, language)
      : String(value ?? "");
  });
}

export class MessageError extends Error {
  constructor(messages) {
    super(formatMessage(messages));
    this.name = "MessageError";
    this.messages = messages;
  }
}
