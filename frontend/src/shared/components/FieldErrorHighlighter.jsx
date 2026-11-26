import { useEffect } from "react";

// يعلّم الخانة اللي فيها المشكلة بالأحمر ويكتب الرسالة تحتها،
// لأي نموذج مفتوح، من أخطاء الـ API (حسب اسم الحقل أو اسم الـ label في الرسالة).
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");

const clearMark = (el) => {
  el.classList.remove("field-invalid");
  el.removeAttribute("aria-invalid");
  const p = el.__fieldErrorNode;
  if (p && p.parentNode) p.parentNode.removeChild(p);
  el.__fieldErrorNode = null;
};

const mark = (el, message) => {
  if (!el || el.__fieldErrorNode || el.getAttribute("aria-invalid") === "true") return false;
  el.classList.add("field-invalid");
  el.setAttribute("aria-invalid", "true");
  const p = document.createElement("p");
  p.className = "field-error";
  p.setAttribute("role", "alert");
  p.setAttribute("data-api-field-error", "1");
  p.textContent = message;
  const host = el.closest("[data-field-host]") || el.parentElement;
  (host || el.parentElement).appendChild(p);
  el.__fieldErrorNode = p;
  const off = () => {
    clearMark(el);
    el.removeEventListener("input", off);
    el.removeEventListener("change", off);
  };
  el.addEventListener("input", off);
  el.addEventListener("change", off);
  try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { /* ignore */ }
  return true;
};

const getScope = () => {
  const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')];
  const top = dialogs.filter((d) => d.offsetParent !== null || getComputedStyle(d).position === "fixed").pop();
  return top || document.querySelector("main") || document.body;
};

const controls = (scope) =>
  [...scope.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea")].filter(
    (el) => el.getBoundingClientRect().width > 0,
  );

const labelFor = (el) => {
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l) return l.textContent;
  }
  const wrap = el.closest("label");
  if (wrap) return wrap.textContent;
  const holder = el.closest("div");
  const l = holder?.querySelector("label");
  return l ? l.textContent : "";
};

const run = ({ errors, messages }) => {
  const scope = getScope();
  const els = controls(scope);
  if (!els.length) return;
  let done = false;

  // 1) أخطاء الحقول من الباك إند: المفتاح = اسم الحقل
  Object.entries(errors || {}).forEach(([key, msgs]) => {
    const last = String(key).split(".").pop().replace(/\[\d+\]/g, "");
    const msg = [].concat(msgs).filter(Boolean)[0];
    if (!msg) return;
    const target = els.find((el) => norm(el.name) === norm(key) || norm(el.name) === norm(last) || norm(el.id) === norm(last));
    if (target && mark(target, msg)) done = true;
  });
  if (done) return;

  // 2) الرسالة بتذكر اسم الخانة (الـ label)
  (messages || []).forEach((msg) => {
    let best = null;
    let bestLen = 0;
    els.forEach((el) => {
      const text = String(labelFor(el)).replace(/[*:\u200f]/g, "").trim();
      if (text.length >= 3 && msg.includes(text) && text.length > bestLen) {
        best = el;
        bestLen = text.length;
      }
    });
    if (best && mark(best, msg)) done = true;
  });
};

export default function FieldErrorHighlighter() {
  useEffect(() => {
    const handler = (e) => setTimeout(() => run(e.detail || {}), 80);
    window.addEventListener("api-errors", handler);
    return () => window.removeEventListener("api-errors", handler);
  }, []);
  return null;
}
