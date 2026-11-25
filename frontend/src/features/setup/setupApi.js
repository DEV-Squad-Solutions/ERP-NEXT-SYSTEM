import { baseApi } from "../../lib/baseApi";

export const setupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSetupStatus: builder.query({
      query: () => "/Setup/status",
    }),
    initializeSetup: builder.mutation({
      query: (body) => ({
        url: "/Setup/initialize",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useGetSetupStatusQuery, useInitializeSetupMutation } = setupApi;
