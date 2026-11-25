import { baseApi } from "../../lib/baseApi";

export const themeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTheme: builder.query({
      query: () => "/Theme",
      providesTags: ["Theme"],
    }),
    setMyTheme: builder.mutation({
      query: (body) => ({ url: "/Theme/me", method: "PUT", body }),
      invalidatesTags: ["Theme"],
    }),
    setCompanyTheme: builder.mutation({
      query: (body) => ({ url: "/Theme/company", method: "PUT", body }),
      invalidatesTags: ["Theme"],
    }),
  }),
});

export const {
  useGetThemeQuery,
  useSetMyThemeMutation,
  useSetCompanyThemeMutation,
} = themeApi;
