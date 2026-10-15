import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Languages } from "lucide-react";
import {
  LANGUAGE_KEY,
  LANGUAGE_OPTIONS,
  formatMessage,
  resolveLanguage,
} from "./i18n.mjs";

const Context = createContext(null);
const browserLanguages = () =>
  navigator.languages?.length ? navigator.languages : [navigator.language];
function readPreference() {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return LANGUAGE_OPTIONS.includes(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function I18nProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [languages, setLanguages] = useState(browserLanguages);
  const language = resolveLanguage(preference, languages);
  const tr = useCallback(
    (source, params) => formatMessage(source, language, params),
    [language],
  );
  const selectLanguage = useCallback((next) => {
    if (!LANGUAGE_OPTIONS.includes(next)) return;
    setPreference(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* Keep the current tab usable without browser storage. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);
  useEffect(() => {
    const onLanguage = () => setLanguages(browserLanguages());
    const onStorage = (event) => {
      if (event.key === LANGUAGE_KEY || event.key === null)
        setPreference(readPreference());
    };
    window.addEventListener("languagechange", onLanguage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("languagechange", onLanguage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const value = useMemo(
    () => ({ language, preference, selectLanguage, tr }),
    [language, preference, selectLanguage, tr],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() {
  return useContext(Context);
}

export function LanguageSwitch() {
  const { preference, selectLanguage, tr } = useI18n();
  return (
    <label
      className="language-switch"
      title={tr("只切换界面语言，不修改测试内容。")}
    >
      <Languages size={16} aria-hidden="true" />
      <select
        aria-label={tr("界面语言")}
        value={preference}
        onChange={(event) => selectLanguage(event.target.value)}
      >
        <option value="auto">{tr("自动")}</option>
        <option value="zh" lang="zh-CN">
          中文
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
    </label>
  );
}
