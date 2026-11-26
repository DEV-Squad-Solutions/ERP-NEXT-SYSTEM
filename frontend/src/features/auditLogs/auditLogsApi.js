import { baseApi } from "../../lib/baseApi";

export const auditLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query({
      query: (params) => ({ url: "/AuditLogs", params }),
    }),
    getAuditLogFilters: builder.query({
      query: () => "/AuditLogs/filters",
    }),
    getAuditLogRetention: builder.query({
      query: () => "/AuditLogs/retention",
      providesTags: ["AuditRetention"],
    }),
    setAuditLogRetention: builder.mutation({
      query: (body) => ({ url: "/AuditLogs/retention", method: "PUT", body }),
      invalidatesTags: ["AuditRetention"],
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogFiltersQuery,
  useGetAuditLogRetentionQuery,
  useSetAuditLogRetentionMutation,
} = auditLogsApi;
