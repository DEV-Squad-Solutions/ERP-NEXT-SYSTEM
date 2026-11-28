import { baseApi } from "../../lib/baseApi";
import { tagsFor } from "../../lib/invalidation";

export const invoicePriceChangesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // معاينة فقط: لا تغيّر أي بيانات
    previewInvoicePriceChange: builder.mutation({
      query: (body) => ({
        url: "InvoicePriceChanges/preview",
        method: "POST",
        body,
      }),
    }),
    applyInvoicePriceChange: builder.mutation({
      query: (body) => ({
        url: "InvoicePriceChanges/apply",
        method: "POST",
        body,
      }),
      invalidatesTags: tagsFor("Invoice"),
    }),
  }),
});

export const {
  usePreviewInvoicePriceChangeMutation,
  useApplyInvoicePriceChangeMutation,
} = invoicePriceChangesApi;
