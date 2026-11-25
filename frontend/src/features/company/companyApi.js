import { baseApi } from "../../lib/baseApi";
import { tagsFor } from "../../lib/invalidation";

import { t } from "../../i18n";
export const STOCK_BALANCE_CHECK_MODES = [
  { value: "None", label: t("بدون فحص") },
  { value: "DateCheck", label: t("فحص بالتاريخ") },
  { value: "FinalCheck", label: t("فحص نهائي") },
  { value: "Both", label: t("الاثنين معًا") },
];

export const CURRENCY_CODES = [
  { value: "EGP", label: t("جنيه مصري (EGP)") },
  { value: "USD", label: t("دولار أمريكي (USD)") },
  { value: "EUR", label: t("يورو (EUR)") },
  { value: "GBP", label: t("جنيه إسترليني (GBP)") },
  { value: "SAR", label: t("ريال سعودي (SAR)") },
  { value: "AED", label: t("درهم إماراتي (AED)") },
  { value: "KWD", label: t("دينار كويتي (KWD)") },
];

export const companiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCompanies: builder.query({
      query: (params) => ({ url: "/Companies", params }),
      providesTags: (result) =>
        Array.isArray(result?.items)
          ? [
              ...result.items.map(({ id }) => ({ type: "Company", id })),
              { type: "Company", id: "LIST" },
            ]
          : [{ type: "Company", id: "LIST" }],
    }),

    getCompaniesForSelect: builder.query({
      query: () => "/Companies/select",
      transformResponse: (response) =>
        Array.isArray(response)
          ? response
          : (response?.data ?? response?.items ?? []),
    }),

    getCompanyById: builder.query({
      query: (id) => `/Companies/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Company", id }],
    }),

    createCompany: builder.mutation({
      query: (body) => ({ url: "/Companies", method: "POST", body }),
      invalidatesTags: tagsFor("Company"),
    }),

    updateCompany: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/Companies/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: tagsFor("Company"),
    }),

    deleteCompany: builder.mutation({
      query: (id) => ({ url: `/Companies/${id}`, method: "DELETE" }),
      invalidatesTags: tagsFor("Company"),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCompaniesQuery,
  useGetCompaniesForSelectQuery,
  useGetCompanyByIdQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} = companiesApi;
