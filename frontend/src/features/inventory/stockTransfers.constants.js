import { getLocale } from "../../i18n";
export const stockTransferEmptyLine = {
  itemId: "",
  quantity: "",
  notes: "",
};

export const stockTransferEmptyForm = {
  transferDate: new Date().toISOString().slice(0, 10),
  sourceStoreId: "",
  destinationStoreId: "",
  notes: "",
  lines: [
    {
      ...stockTransferEmptyLine,
    },
  ],
};

export const formatQuantity = (value) =>
  Number(value || 0).toLocaleString(getLocale(), {
    maximumFractionDigits: 2,
  });

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
