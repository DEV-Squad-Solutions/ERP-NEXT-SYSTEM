# AI layer: engineering report (status)

Principle: every number comes from deterministic C# services. The AI only narrates. No SQL access for the AI.

## Delivered and live (backend, additive, no migration)
| Stage | Piece | Endpoint |
|---|---|---|
| 1 Discovery | Architecture and formulas mapped | (this folder) |
| 2 Financial foundation | Formulas documented | `financial-formulas.md` |
| 4 AI infrastructure | `IAIProvider` (Gemini, Groq; OpenAI intentionally absent), tool registry, assistant | `POST /api/v1/Ai/ask` |
| 3/6 KPIs | KPI list with formulas, built on the dashboard figures | `GET /api/v1/Kpis` |
| 7 Anomaly detection | Median/MAD outliers on invoice totals, per kind, every flag `PendingReview` | `GET /api/v1/Anomalies` |
| 8 Forecasting | Linear trend, 3 months, refuses under 6 complete months | `GET /api/v1/Forecasts/sales` |

## Safety properties (tested)
- Company comes only from the authenticated user. No request model, tool or service accepts a company id (`AiIsolationTests`).
- Tool registry is closed: unknown tool names are rejected, no free-form query parameter.
- AI data sharing is limited to `Ai:AllowedCompanyIds` (default: test company 2 only). Real company data is never sent.
- All three endpoints require the Admin role on top of authentication.
- With no key configured the assistant returns the system figures and a clear "not configured" note.
- Anomalies are suggestions for a person. Nothing is blocked or changed. Forecasts refuse on short history and say so.

## Not done yet
- Stage 3 reporting center beyond KPIs, Stage 5 chat UI, Stage 6 executive dashboard page, Stage 9 frontend AI Center.
- No provider key yet: needs a free Gemini or Groq key supplied through the vault. Until then Ai/ask returns figures only.
- Per-call logging of assistant questions (access log) is not persisted yet.
- Cross-company data tests against a real two-company database are not written; isolation is verified by construction and by live use of the test company only.

## Verification
- Backend test baseline unchanged: 102 pre-existing failures (same names), all new tests pass.
- Live checks on the test company: Kpis, Ai/ask, Anomalies, Forecasts return 200 with expected shapes.
