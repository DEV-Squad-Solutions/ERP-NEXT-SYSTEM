import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster, toast } from "sonner";
import FieldErrorHighlighter from "./shared/components/FieldErrorHighlighter";
import { store } from "./app/store";
import App from "./app/App";
import "./index.css";
import { initTheme } from "./shared/theme/theme";
import { reloadOnceForNewVersion, warmLazyPages } from "./lib/lazyRetry";
import { applyDocumentLanguage, getLang } from "./i18n";

window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

if (import.meta.env.DEV) window.__toast = toast;
initTheme();
window.addEventListener("load", warmLazyPages, { once: true });
applyDocumentLanguage();
// رسالة الخطأ نفسها ماتظهرش مرتين: نفس النص = نفس الـ id فـ sonner يحدّث الرسالة بدل ما يكررها.
const originalToastError = toast.error.bind(toast);
toast.error = (message, options) =>
  originalToastError(message, {
    ...(typeof message === "string" ? { id: message } : {}),
    ...options,
  });

const savedTheme = localStorage.getItem("theme");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <FieldErrorHighlighter />
      <Toaster
        closeButton
        visibleToasts={4}
        toastOptions={{ classNames: { toast: "app-toast" } }}
        position={getLang() === "ar" ? "top-left" : "top-right"}
        theme={savedTheme === "dark" ? "dark" : "light"}
      />
    </Provider>
  </StrictMode>,
);
