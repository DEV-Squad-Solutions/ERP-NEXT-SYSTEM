// features/payroll/pages/DeductionsPage.jsx
import { MinusCircle } from "lucide-react";
import EmployeeTransactionsListPage from "../components/EmployeeTransactionsListPage";
import { categoryOptionsFor, deductionCategories } from "../payroll.constants";

import { t } from "../../../i18n";
export default function DeductionsPage() {
  return (
    <EmployeeTransactionsListPage
      title={t("الخصومات")}
      subtitle={t("خصومات الغياب والتأخير والجزاءات")}
      categoryOptions={categoryOptionsFor(deductionCategories)}
      categoryKeys={deductionCategories}
      emptyIcon={MinusCircle}
      emptyLabel={t("لا توجد خصومات")}
    />
  );
}
