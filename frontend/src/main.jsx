import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { store } from "./app/store";
import App from "./app/App";
import "./index.css";
import { initTheme } from "./shared/theme/theme";
import { applyDocumentLanguage, getLang } from "./i18n";

initTheme();
applyDocumentLanguage();
const savedTheme = localStorage.getItem("theme");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <Toaster
        richColors
        position={getLang() === "ar" ? "top-left" : "top-right"}
        theme={savedTheme === "dark" ? "dark" : "light"}
      />
    </Provider>
  </StrictMode>,
);
