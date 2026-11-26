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
