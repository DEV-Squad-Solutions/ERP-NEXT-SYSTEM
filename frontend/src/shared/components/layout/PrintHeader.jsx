import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { getLocale, t } from "../../../i18n";

/**
 * Standard header printed at the top of every screen printed with the browser
 * (company, page title, fiscal year, date, user). Invisible on screen.
 * The title is read from the page's first heading when printing starts.
 */
export default function PrintHeader({ mainRef }) {
  const company = useSelector((s) => s.auth.selectedCompany);
  const user = useSelector((s) => s.auth.fullName);
  const [title, setTitle] = useState("");
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    const before = () => {
      const h = mainRef?.current?.querySelector("h1, h2");
      setTitle((h?.textContent || document.title || "").trim());
      setStamp(
        new Date().toLocaleString(getLocale(), { dateStyle: "medium", timeStyle: "short" }),
      );
    };
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  }, [mainRef]);

  return (
    <div className="hidden border-b-2 border-black pb-2 print:mb-3 print:block" data-print-header>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold">{company?.name || ""}</p>
          <p className="text-base font-semibold">{title}</p>
        </div>
        <div className="text-end text-xs leading-5">
          <p>{stamp}</p>
          {user ? <p>{t("المستخدم")}: {user}</p> : null}
        </div>
      </div>
    </div>
  );
}
