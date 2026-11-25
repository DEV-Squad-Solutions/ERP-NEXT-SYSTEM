// Lightweight i18n. Arabic is the source language: t("نص عربي") returns the
// same text in Arabic and the English dictionary entry when English is active.
// A missing English entry falls back to the Arabic text, so nothing breaks.
// Switching language stores the choice and reloads the page.
import en from "./en";

const STORAGE_KEY = "lang";
export const SUPPORTED_LANGUAGES = ["ar", "en"];

const readStored = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(value) ? value : "ar";
  } catch {
    return "ar";
  }
};

const current = readStored();
const dictionaries = { en };
const normalize = (text) => text.replace(/\s+/g, " ").trim();

export const getLang = () => current;
export const isRtl = () => current === "ar";
export const getDir = () => (current === "ar" ? "rtl" : "ltr");
export const getLocale = () => (current === "ar" ? "ar-EG" : "en-US");

export const applyDocumentLanguage = () => {
  document.documentElement.lang = current;
  document.documentElement.dir = getDir();
};

export const setLang = (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang) || lang === current) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  window.location.reload();
};

export const t = (text, params) => {
  if (typeof text !== "string" || text === "") return text;
  let out = text;
  if (current !== "ar") {
    const hit = dictionaries[current]?.[normalize(text)];
    if (hit !== undefined) out = hit;
  }
  if (params) {
    out = out.replace(/\{(\w+)\}/g, (match, key) =>
      params[key] !== undefined && params[key] !== null ? params[key] : match,
    );
  }
  return out;
};
