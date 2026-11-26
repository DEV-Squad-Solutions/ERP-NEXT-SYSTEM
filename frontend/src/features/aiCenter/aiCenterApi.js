import { baseApi } from "../../lib/baseApi";

export const aiCenterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKpis: builder.query({ query: () => "/Kpis" }),
    getAnomalies: builder.query({ query: () => "/Anomalies" }),
    getSalesForecast: builder.query({ query: () => "/Forecasts/sales" }),
    askAi: builder.mutation({
      query: (body) => ({ url: "/Ai/ask", method: "POST", body }),
    }),
  }),
});

export const {
  useGetKpisQuery,
  useGetAnomaliesQuery,
  useGetSalesForecastQuery,
  useAskAiMutation,
} = aiCenterApi;
