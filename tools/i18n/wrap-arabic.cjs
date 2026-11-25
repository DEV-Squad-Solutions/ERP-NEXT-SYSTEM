const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const SRC = process.argv[2];
const DRY = process.argv[3] === "dry";
const AR = /[\u0600-\u06FF]/;
const ALLOWED_PROPS = new Set(["label","title","description","placeholder","text","message","header","subtitle","emptyText","helperText","tooltip","hint","heading","name","caption","content","error","success","warning","info","note","displayName","description","buttonLabel","confirmText","cancelText","emptyMessage","errorMessage","successMessage","summary","footer","badge","status","statusText","typeLabel","arabicName","shortLabel","fullLabel","unit","prefix","suffix","legend","alt","ariaLabel","noDataText","loadingText","actionLabel","sectionTitle","pageTitle","subTitle","detail","reason"]);
const CALLS_OK = new Set(["toast","error","success","info","warning","warn","loading","alert","confirm","Error","min","max","length","required","nonempty","email","regex","refine","superRefine","message","string","number","describe"]);
const stats = { files: 0, wrapped: 0, skipped: [] };

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (!/i18n|node_modules/.test(f)) walk(p, out); }
    else if (/\.(jsx?|)$/.test(f) && /\.(js|jsx)$/.test(f)) out.push(p);
  }
  return out;
}
const esc = (s) => JSON.stringify(s);

function process1(file) {
  const code = fs.readFileSync(file, "utf8");
  if (!AR.test(code)) return;
  let ast;
  try { ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { stats.skipped.push(file + " PARSE " + e.message); return; }
  const edits = []; // {start,end,text}
  let usesT = false;
  const rel = (file.replace(SRC + path.sep, "")).split(path.sep).length - 1;
  const importPath = (rel === 0 ? "./" : "../".repeat(rel)) + "i18n";

  const ctxOk = (p) => {
    // p is path of StringLiteral/TemplateLiteral
    const par = p.parent;
    switch (par.type) {
      case "JSXAttribute": return true;
      case "JSXExpressionContainer": return true;
      case "ObjectProperty": return par.value === p.node && !["value","id","key","code","type","status","kind"].includes(par.key.name || par.key.value);
      case "VariableDeclarator": return par.init === p.node;
      case "ReturnStatement": return true;
      case "ArrowFunctionExpression": return par.body === p.node;
      case "AssignmentExpression": return par.right === p.node;
      case "AssignmentPattern": return par.right === p.node;
      case "ConditionalExpression": return (par.consequent === p.node || par.alternate === p.node);
      case "LogicalExpression": return par.right === p.node && ["||","??"].includes(par.operator) || (par.operator==="&&" && par.right===p.node && ["JSXExpressionContainer"].includes(p.parentPath.parent.type));
      case "CallExpression": {
        const c = par.callee;
        const name = c.type === "MemberExpression" ? (c.object.name || "") + "." + (c.property.name || "") : c.name;
        const last = c.type === "MemberExpression" ? c.property.name : c.name;
        if (name && /^toast/.test(name)) return true;
        return par.arguments.includes(p.node) && !["includes","indexOf","startsWith","endsWith","get","set","has","localeCompare","split","replace","replaceAll","join","match","test","normalize","push","add","delete","append","getItem","setItem","dispatch","trim","querySelector","fn","useState","useMemo","useRef","createContext"].includes(last) && !/^(use|set)[A-Z]/.test(last||"");
      }
      case "NewExpression": return par.callee.name === "Error";
      case "ArrayExpression": return par.elements.includes(p.node);
      default: return false;
    }
  };
  const ctxOkUp = (p) => {
    // p: the Conditional/Logical expression path
    const par = p.parent;
    if (["JSXExpressionContainer","JSXAttribute"].includes(par.type)) return true;
    if (par.type === "ObjectProperty") return !par.computed && ALLOWED_PROPS.has(par.key.name || par.key.value);
    if (par.type === "CallExpression") { const c = par.callee; const last = c.type==="MemberExpression"?c.property.name:c.name; const nm = c.type==="MemberExpression"?(c.object.name||""):""; return /^toast/.test(nm) || CALLS_OK.has(last); }
    if (par.type === "ConditionalExpression" || par.type === "LogicalExpression") return ctxOkUp(p.parentPath);
    if (par.type === "TemplateLiteral") return false;
    return false;
  };

  traverse(ast, {
    JSXText(p) {
      const v = p.node.value;
      if (!AR.test(v)) return;
      const m = v.match(/^(\s*)([\s\S]*?)(\s*)$/);
      edits.push({ start: p.node.start, end: p.node.end, text: m[1] + "{t(" + esc(m[2].replace(/\s+/g, " ")) + ")}" + m[3] });
      usesT = true; stats.wrapped++;
    },
    StringLiteral(p) {
      if (!AR.test(p.node.value)) return;
      if (p.parent.type === "JSXAttribute") {
        if (p.parent.value !== p.node) return;
        edits.push({ start: p.node.start, end: p.node.end, text: "{t(" + esc(p.node.value) + ")}" });
        usesT = true; stats.wrapped++; return;
      }
      if (p.parent.type === "ImportDeclaration" || p.parent.type==="ExportNamedDeclaration") return;
      if (!ctxOk(p)) { stats.skipped.push(file.replace(SRC + "/", "") + ":" + p.node.loc.start.line + " " + p.node.value.slice(0, 40)); return; }
      edits.push({ start: p.node.start, end: p.node.end, text: "t(" + esc(p.node.value) + ")" });
      usesT = true; stats.wrapped++;
    },
    TemplateLiteral(p) {
      const hasAr = p.node.quasis.some((q) => AR.test(q.value.cooked || ""));
      if (!hasAr) return;
      if (p.parent.type === "TaggedTemplateExpression") return;
      if (!ctxOk(p)) { stats.skipped.push(file.replace(SRC + "/", "") + ":" + p.node.loc.start.line + " TPL " + (p.node.quasis[0].value.cooked||"").slice(0, 30)); return; }
      let key = ""; const exprs = [];
      p.node.quasis.forEach((q, i) => { key += q.value.cooked; if (i < p.node.expressions.length) { key += "{" + i + "}"; exprs.push(code.slice(p.node.expressions[i].start, p.node.expressions[i].end)); } });
      const params = exprs.length ? ", { " + exprs.map((e, i) => i + ": " + e).join(", ") + " }" : "";
      edits.push({ start: p.node.start, end: p.node.end, text: "t(" + esc(key) + params + ")" });
      usesT = true; stats.wrapped++;
    },
  });
  if (!edits.length) return;
  // drop nested edits (template exprs containing strings): keep outermost
  edits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = []; let lastEnd = -1;
  for (const e of edits) { if (e.start >= lastEnd) { kept.push(e); lastEnd = e.end; } }
  let out = ""; let pos = 0;
  for (const e of kept) { out += code.slice(pos, e.start) + e.text; pos = e.end; }
  out += code.slice(pos);
  if (usesT && !/from ["'][./]*i18n["']/.test(out)) {
    // insert import after last import
    const imports = [...out.matchAll(/^import[\s\S]*?;\s*$/gm)];
    const last = imports[imports.length - 1];
    const ins = `import { t } from "${importPath}";\n`;
    if (last) { const at = last.index + last[0].length; out = out.slice(0, at) + "\n" + ins.trimEnd() + out.slice(at); }
    else out = ins + out;
  }
  stats.files++;
  if (!DRY) fs.writeFileSync(file, out);
}
walk(SRC).forEach(process1);
console.log(JSON.stringify({ files: stats.files, wrapped: stats.wrapped, skipped: stats.skipped.length }));
fs.writeFileSync("/tmp/skipped.txt", stats.skipped.join("\n"));
