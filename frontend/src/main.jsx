import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster, toast } from "sonner";
import TableCardsLabeler from "./shared/components/TableCardsLabeler";
import FieldErrorHighlighter from "./shared/components/FieldErrorHighlighter";
import { store } from "./app/store";
import App from "./app/App";
// Fonts are bundled (no Google Fonts request): the company server has no internet.
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-500.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/latin-400.css";
import "@fontsource/cairo/latin-500.css";
import "@fontsource/cairo/latin-600.css";
import "@fontsource/cairo/latin-700.css";
import "@fontsource/tajawal/arabic-400.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-700.css";
import "@fontsource/tajawal/latin-400.css";
import "@fontsource/tajawal/latin-500.css";
import "@fontsource/tajawal/latin-700.css";
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
      <TableCardsLabeler />
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
