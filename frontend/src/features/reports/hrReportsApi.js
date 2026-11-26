import { baseApi } from "../../lib/baseApi";

export const hrReportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAttendanceReport: builder.query({
      query: ({ startDate, endDate }) => ({
        url: "EmployeeAttendances/report",
        params: { startDate, endDate },
      }),
    }),
    getEmployeeMovementsReport: builder.query({
      query: ({ fromDate, toDate }) => ({
        url: "EmployeeMovements/report",
        params: { fromDate, toDate },
      }),
    }),
  }),
});

export const { useGetAttendanceReportQuery, useGetEmployeeMovementsReportQuery } = hrReportsApi;

export const invoiceReportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoiceSummary: builder.query({
      query: ({ fromDate, toDate }) => ({ url: "InvoiceReports/summary", params: { fromDate, toDate } }),
    }),
    getInvoiceAging: builder.query({
      query: ({ kind, asOfDate }) => ({ url: "InvoiceReports/aging", params: { kind, asOfDate } }),
    }),
  }),
});

export const { useGetInvoiceSummaryQuery, useGetInvoiceAgingQuery } = invoiceReportsApi;
