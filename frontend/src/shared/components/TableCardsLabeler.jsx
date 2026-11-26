import { useEffect } from "react";

// جداول بكلاس "cards-on-phone" بتتحول لكروت على الموبايل (CSS في index.css).
// هنا بس بنكتب اسم العمود (من الـ thead) على كل خلية عشان يظهر جنب القيمة.
const labelTable = (table) => {
  const headRows = table.querySelectorAll("thead tr");
  if (!headRows.length) return;
  const headCells = [...headRows[headRows.length - 1].children];
  const labels = [];
  headCells.forEach((th) => {
    const span = Number(th.getAttribute("colspan") || 1);
    const text = (th.textContent || "").replace(/\s+/g, " ").trim();
    for (let i = 0; i < span; i += 1) labels.push(text);
  });
  table.querySelectorAll("tbody tr, tfoot tr").forEach((tr) => {
    let col = 0;
    [...tr.children].forEach((td) => {
      const span = Number(td.getAttribute("colspan") || 1);
      if (span === 1 && !td.hasAttribute("data-label") && labels[col]) {
        td.setAttribute("data-label", labels[col]);
      }
      if (span > 1) td.setAttribute("data-wide", "1");
      col += span;
    });
  });
};

export default function TableCardsLabeler() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = 0;
      document.querySelectorAll("table.cards-on-phone").forEach(labelTable);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true });
    schedule();
    return () => {
      obs.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
