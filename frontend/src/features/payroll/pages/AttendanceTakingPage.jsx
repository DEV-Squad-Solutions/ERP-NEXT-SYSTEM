import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  Loader2,
  RotateCcw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";

import {
  useBulkCreateEmployeeAttendancesMutation,
  useBulkUpdateEmployeeAttendancesMutation,
  useGetEmployeeAttendancesQuery,
  useGetEmployeeAttendancesSelectQuery,
} from "../payrollApi";

import { ATTENDANCE_STATUS_VALUE, dayRatioOptions } from "../payroll.constants";

import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Button from "../../../shared/components/ui/Button";
import { useFiscalYearGuard } from "../../../lib/useFiscalYearGuard";
import ReadOnlyFiscalYearBanner from "../../../shared/components/ui/ReadOnlyFiscalYearBanner";
import DateInput from "../../../shared/components/ui/DateInput.jsx";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
const DEFAULT_CHECK_IN = "09:00";
const DEFAULT_CHECK_OUT = "17:00";

const STATUS = {
  PRESENT: "Present",
  ABSENT: "Absent",
  NOT_RECORDED: "NotRecorded",
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeStatus = (status) => {
  if (status === 1 || status === "1" || status === "Present") {
    return STATUS.PRESENT;
  }

  if (status === 0 || status === "0" || status === "Absent") {
    return STATUS.ABSENT;
  }

  return STATUS.NOT_RECORDED;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
};

const normalizeRatio = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number" && value >= 1 && value <= 10) {
    return value;
  }

  const numericValue = Number(value);

  if (
    Number.isFinite(numericValue) &&
    numericValue >= 1 &&
    numericValue <= 10
  ) {
    return numericValue;
  }

  const ratioMap = {
    OneDay: 1,
    FullDay: 1,
    TwoDays: 2,
    ThreeDays: 3,
    FourDays: 4,
    FiveDays: 5,
    ThreeQuarterDay: 6,
    TwoThirdsDay: 7,
    HalfDay: 8,
    ThirdDay: 9,
    QuarterDay: 10,
  };

  return ratioMap[value] ?? fallback;
};

const toApiTime = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    return normalized;
  }

  return normalized;
};

const getApiErrorMessage = (error) => {
  const errors = error?.data?.errors;

  if (errors && typeof errors === "object") {
    const firstError = Object.values(errors)
      .flat()
      .find((message) => typeof message === "string" && message.trim());

    if (firstError) {
      return firstError;
    }
  }

  return (
    error?.data?.message ||
    error?.data?.title ||
    error?.error ||
    t("حدث خطأ أثناء حفظ الحضور والغياب")
  );
};

const createEmptyRow = (employee) => ({
  employee,
  existing: null,
  status: STATUS.NOT_RECORDED,
  checkIn: DEFAULT_CHECK_IN,
  checkOut: DEFAULT_CHECK_OUT,
  workDayRatio: 1,
  workOverTimeRatio: "",
  workDaysDeductionRatio: "",
  workLocation: "",
  notes: "",
});

const AttendanceTakingPage = () => {
  const { isReadOnly: isFiscalYearReadOnly, fiscalYear } = useFiscalYearGuard();
  const [workDate, setWorkDate] = useState(getToday);
  const [search, setSearch] = useState("");
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [statusFilter, setStatusFilter] = useState("");
  const [localRows, setLocalRows] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [defaultCheckIn, setDefaultCheckIn] = useState(DEFAULT_CHECK_IN);
  const [defaultCheckOut, setDefaultCheckOut] = useState(DEFAULT_CHECK_OUT);

  const parentRef = useRef(null);

  const {
    data: employeesData = [],
    isLoading: employeesLoading,
    isFetching: employeesFetching,
  } = useGetEmployeeAttendancesSelectQuery();

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    refetch,
  } = useGetEmployeeAttendancesQuery({
    PageNumber: 1,
    PageSize: 100,
    WorkDateFrom: workDate,
    WorkDateTo: workDate,
  });

  const [bulkCreateEmployeeAttendances, { isLoading: creatingAttendance }] =
    useBulkCreateEmployeeAttendancesMutation();

  const [bulkUpdateEmployeeAttendances, { isLoading: updatingAttendance }] =
    useBulkUpdateEmployeeAttendancesMutation();

  const employees = useMemo(() => {
    if (!Array.isArray(employeesData)) {
      return [];
    }

    return employeesData
      .filter((employee) => employee?.id !== null && employee?.id !== undefined)
      .map((employee) => ({
        id: Number(employee.id),
        name: employee.name || t("موظف #{0}", { 0: employee.id }),
      }));
  }, [employeesData]);

  const existingAttendance = useMemo(() => {
    const items = Array.isArray(attendanceData?.items)
      ? attendanceData.items
      : Array.isArray(attendanceData)
        ? attendanceData
        : [];

    const map = new Map();

    items.forEach((attendance) => {
      if (
        attendance?.employeeId !== null &&
        attendance?.employeeId !== undefined
      ) {
        map.set(Number(attendance.employeeId), attendance);
      }
    });

    return map;
  }, [attendanceData]);

  const employeeRows = useMemo(() => {
    return employees.map((employee) => {
      const existing = existingAttendance.get(Number(employee.id));

      const serverRow = existing
        ? {
            employee,
            existing,
            status: normalizeStatus(existing.status),
            checkIn: normalizeValue(existing.checkIn)?.slice(0, 5) || "",
            checkOut: normalizeValue(existing.checkOut)?.slice(0, 5) || "",
            workDayRatio: normalizeRatio(existing.workDayRatio, 1),
            workOverTimeRatio: normalizeRatio(existing.workOverTimeRatio, ""),
            workDaysDeductionRatio: normalizeRatio(
              existing.workDaysDeductionRatio,
              "",
            ),
            workLocation: existing.workLocation || "",
            notes: existing.notes || "",
          }
        : createEmptyRow(employee);

      return localRows[employee.id]
        ? {
            ...serverRow,
            ...localRows[employee.id],
          }
        : serverRow;
    });
  }, [employees, existingAttendance, localRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employeeRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        String(row.employee.id).includes(normalizedSearch) ||
        row.employee.name.toLowerCase().includes(normalizedSearch);

      const matchesStatus = !statusFilter || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employeeRows, search, statusFilter]);

  const summary = useMemo(() => {
    const total = employeeRows.length;

    const present = employeeRows.filter(
      (row) => row.status === STATUS.PRESENT,
    ).length;

    const absent = employeeRows.filter(
      (row) => row.status === STATUS.ABSENT,
    ).length;

    const notRecorded = employeeRows.filter(
      (row) => row.status === STATUS.NOT_RECORDED,
    ).length;

    return {
      total,
      present,
      absent,
      notRecorded,
    };
  }, [employeeRows]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (narrow ? 346 : 118),
    overscan: 10,
  });

  useEffect(() => {
    setLocalRows({});
    setSelectedIds(new Set());
  }, [workDate]);

  const updateRow = useCallback((employeeId, updates) => {
    setLocalRows((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] || {}),
        ...updates,
      },
    }));
  }, []);

  const setEmployeeStatus = useCallback(
    (employeeId, status) => {
      const row = employeeRows.find(
        (item) => Number(item.employee.id) === Number(employeeId),
      );

      if (!row) {
        return;
      }

      if (status === STATUS.PRESENT) {
        updateRow(employeeId, {
          status,
          checkIn: row.checkIn || defaultCheckIn,
          checkOut: row.checkOut || defaultCheckOut,
          workDayRatio: row.workDayRatio || 1,
        });

        return;
      }

      updateRow(employeeId, {
        status,
        checkIn: "",
        checkOut: "",
        workDayRatio: null,
        workOverTimeRatio: "",
        workDaysDeductionRatio: "",
      });
    },
    [employeeRows, defaultCheckIn, defaultCheckOut, updateRow],
  );

  const toggleSelected = useCallback((employeeId) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }

      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);

      filteredRows.forEach((row) => {
        next.add(Number(row.employee.id));
      });

      return next;
    });
  }, [filteredRows]);

  const clearSelected = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);

      filteredRows.forEach((row) => {
        next.delete(Number(row.employee.id));
      });

      return next;
    });
  }, [filteredRows]);

  const markSelectedPresent = useCallback(() => {
    if (!selectedIds.size) {
      toast.error(t("اختر موظفًا واحدًا على الأقل"));
      return;
    }

    selectedIds.forEach((employeeId) => {
      setEmployeeStatus(employeeId, STATUS.PRESENT);
    });
  }, [selectedIds, setEmployeeStatus]);

  const markSelectedAbsent = useCallback(() => {
    if (!selectedIds.size) {
      toast.error(t("اختر موظفًا واحدًا على الأقل"));
      return;
    }

    selectedIds.forEach((employeeId) => {
      setEmployeeStatus(employeeId, STATUS.ABSENT);
    });
  }, [selectedIds, setEmployeeStatus]);

  const markAllPresent = useCallback(() => {
    filteredRows.forEach((row) => {
      setEmployeeStatus(row.employee.id, STATUS.PRESENT);
    });

    toast.success(t("تم تحديد الموظفين الظاهرين كحاضرين"));
  }, [filteredRows, setEmployeeStatus]);

  const markAllAbsent = useCallback(() => {
    filteredRows.forEach((row) => {
      setEmployeeStatus(row.employee.id, STATUS.ABSENT);
    });

    toast.success(t("تم تحديد الموظفين الظاهرين كغائبين"));
  }, [filteredRows, setEmployeeStatus]);

  const applyDefaultTimes = useCallback(() => {
    if (!defaultCheckIn || !defaultCheckOut) {
      toast.error(t("حدد وقت الحضور والانصراف أولًا"));
      return;
    }

    setLocalRows((current) => {
      const next = { ...current };

      filteredRows.forEach((row) => {
        if (row.status === STATUS.PRESENT) {
          next[row.employee.id] = {
            ...(next[row.employee.id] || {}),
            checkIn: defaultCheckIn,
            checkOut: defaultCheckOut,
          };
        }
      });

      return next;
    });

    toast.success(t("تم تطبيق أوقات الحضور والانصراف"));
  }, [defaultCheckIn, defaultCheckOut, filteredRows]);

  const handleReset = useCallback(() => {
    setLocalRows({});
    setSelectedIds(new Set());
    toast.success(t("تم إلغاء التعديلات المحلية"));
  }, []);

  const buildAttendance = useCallback(
    (row, includeId = false) => {
      const payload = {
        employeeId: Number(row.employee.id),
        status:
          row.status === STATUS.PRESENT
            ? ATTENDANCE_STATUS_VALUE.Present
            : ATTENDANCE_STATUS_VALUE.Absent,
        workDate,
        checkIn: row.status === STATUS.PRESENT ? toApiTime(row.checkIn) : null,
        checkOut:
          row.status === STATUS.PRESENT ? toApiTime(row.checkOut) : null,
        workDayRatio:
          row.status === STATUS.PRESENT
            ? normalizeRatio(row.workDayRatio, 1)
            : null,
        workOverTimeRatio:
          row.workOverTimeRatio !== "" &&
          row.workOverTimeRatio !== null &&
          row.workOverTimeRatio !== undefined
            ? normalizeRatio(row.workOverTimeRatio, null)
            : null,
        workDaysDeductionRatio:
          row.workDaysDeductionRatio !== "" &&
          row.workDaysDeductionRatio !== null &&
          row.workDaysDeductionRatio !== undefined
            ? normalizeRatio(row.workDaysDeductionRatio, null)
            : null,
        workLocation: row.workLocation?.trim() || null,
        notes: row.notes?.trim() || null,
      };

      if (includeId && row.existing?.id) {
        payload.id = Number(row.existing.id);
      }

      return payload;
    },
    [workDate],
  );

  const handleSave = async () => {
    if (!employeeRows.length) {
      toast.error(t("لا يوجد موظفون لتسجيل الحضور"));
      return;
    }

    const recordedRows = employeeRows.filter(
      (row) => row.status === STATUS.PRESENT || row.status === STATUS.ABSENT,
    );

    if (!recordedRows.length) {
      toast.error(t("لم يتم تسجيل حضور أو غياب لأي موظف"));
      return;
    }

    const invalidPresentRows = recordedRows.filter(
      (row) => row.status === STATUS.PRESENT && (!row.checkIn || !row.checkOut),
    );

    if (invalidPresentRows.length) {
      toast.error(
        t("يوجد {0} موظف حاضر بدون وقت حضور أو انصراف", { 0: invalidPresentRows.length }),
      );
      return;
    }

    const newRows = recordedRows.filter((row) => !row.existing);
    const updatedRows = recordedRows.filter((row) => row.existing);

    try {
      let created = 0;
      let updated = 0;

      if (newRows.length) {
        await bulkCreateEmployeeAttendances({
          attendances: newRows.map((row) => buildAttendance(row, false)),
        }).unwrap();

        created = newRows.length;
      }

      if (updatedRows.length) {
        await bulkUpdateEmployeeAttendances({
          attendances: updatedRows.map((row) => buildAttendance(row, true)),
        }).unwrap();

        updated = updatedRows.length;
      }

      setLocalRows({});
      setSelectedIds(new Set());

      await refetch();

      toast.success(
        t("تم حفظ الحضور والغياب بنجاح — جديد: {0}، تعديل: {1}", { 0: created, 1: updated }),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const isSaving = creatingAttendance || updatingAttendance;

  const isLoading = employeesLoading || attendanceLoading;

  const isFetching = employeesFetching || attendanceFetching;

  return (
    <div dir={getDir()} className="flex h-full min-h-0 flex-col gap-4 p-4">
      {isFiscalYearReadOnly && (
        <ReadOnlyFiscalYearBanner fiscalYear={fiscalYear} />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600">
              <CalendarDays size={21} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-ink-900">
                {t("تسجيل الحضور والغياب")}
              </h1>

              <p className="text-sm text-ink-500">
                {t("تسجيل ومراجعة حضور الموظفين ليوم محدد")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            disabled={!Object.keys(localRows).length || isSaving}
          >
            <RotateCcw size={17} />
            {t("إلغاء التعديلات")}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              isLoading ||
              !employeeRows.length ||
              isFiscalYearReadOnly
            }
          >
            {isSaving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <FileCheck2 size={17} />
            )}
            {t("حفظ الحضور")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-500">{t("إجمالي الموظفين")}</span>

            <Users size={19} className="text-primary-600" />
          </div>

          <div className="mt-2 text-2xl font-bold text-ink-900">
            {summary.total}
          </div>
        </div>

        <div className="rounded-2xl border border-positive/10 bg-positive/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-500">{t("الحاضرون")}</span>

            <UserCheck size={19} className="text-positive" />
          </div>

          <div className="mt-2 text-2xl font-bold text-positive">
            {summary.present}
          </div>
        </div>

        <div className="rounded-2xl border border-negative/10 bg-negative/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-500">{t("الغائبون")}</span>

            <UserX size={19} className="text-negative" />
          </div>

          <div className="mt-2 text-2xl font-bold text-negative">
            {summary.absent}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-500">{t("لم يسجل")}</span>

            <Clock3 size={19} className="text-amber-600" />
          </div>

          <div className="mt-2 text-2xl font-bold text-amber-600">
            {summary.notRecorded}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("تاريخ الحضور")}
            </label>

            <div className="relative">
              <CalendarDays
                size={17}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <DateInput
                type="date"
                value={workDate}
                onChange={(event) => setWorkDate(event.target.value)}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white pe-10 ps-3 text-sm text-ink-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("البحث عن موظف")}
            </label>

            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("اسم الموظف أو الرقم...")}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white ps-10 pe-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("الحالة")}
            </label>

            <CompactSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: t("الكل") },
                { value: STATUS.PRESENT, label: t("حاضر") },
                { value: STATUS.ABSENT, label: t("غائب") },
                {
                  value: STATUS.NOT_RECORDED,
                  label: t("لم يسجل"),
                },
              ]}
              placeholder={t("الحالة")}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("وقت الحضور الافتراضي")}
            </label>

            <div className="relative">
              <Clock3
                size={17}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <input
                type="time"
                value={defaultCheckIn}
                onChange={(event) => setDefaultCheckIn(event.target.value)}
                className="h-10 w-full min-w-0 max-w-full appearance-none rounded-xl border border-ink-200 bg-white pe-10 ps-3 text-start text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("وقت الانصراف الافتراضي")}
            </label>

            <div className="relative">
              <Clock3
                size={17}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <input
                type="time"
                value={defaultCheckOut}
                onChange={(event) => setDefaultCheckOut(event.target.value)}
                className="h-10 w-full min-w-0 max-w-full appearance-none rounded-xl border border-ink-200 bg-white pe-10 ps-3 text-start text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={!filteredRows.length}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 transition active:bg-ink-50 disabled:opacity-50 sm:h-10 sm:flex-none"
            >
              <Check size={16} />
              {t("تحديد الظاهر")}
            </button>
            <button
              type="button"
              onClick={markAllPresent}
              disabled={!filteredRows.length}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-positive/30 bg-positive/5 px-3 text-sm font-semibold text-positive transition active:bg-positive/10 disabled:opacity-50 sm:h-10 sm:flex-none"
            >
              <UserCheck size={16} />
              {t("الكل حاضر")}
            </button>
            <button
              type="button"
              onClick={markAllAbsent}
              disabled={!filteredRows.length}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-negative/30 bg-negative/5 px-3 text-sm font-semibold text-negative transition active:bg-negative/10 disabled:opacity-50 sm:h-10 sm:flex-none"
            >
              <UserX size={16} />
              {t("الكل غائب")}
            </button>
          </div>

          <button
            type="button"
            onClick={applyDefaultTimes}
            disabled={!filteredRows.length}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition active:opacity-90 disabled:opacity-50 sm:h-10 sm:w-auto"
          >
            <Clock3 size={16} />
            {t("تطبيق الأوقات")}
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 px-3 pt-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <div className="min-w-[56px] text-center leading-tight">
                <div className="num text-lg font-bold text-ink-900">{selectedIds.size}</div>
                <div className="text-[10px] text-ink-500">{t("المحدد:").replace(":", "")}</div>
              </div>
              <button
                type="button"
                onClick={markSelectedPresent}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-positive px-3 text-sm font-bold text-white active:opacity-90"
              >
                <UserCheck size={18} />
                {t("المحدد حاضر")}
              </button>
              <button
                type="button"
                onClick={markSelectedAbsent}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-negative/40 bg-white px-3 text-sm font-bold text-negative active:bg-negative/5"
              >
                <UserX size={18} />
                {t("المحدد غائب")}
              </button>
              <button
                type="button"
                onClick={clearSelected}
                aria-label={t("إلغاء التحديد")}
                title={t("إلغاء التحديد")}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-ink-200 text-ink-500 active:bg-ink-50"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 size={28} className="animate-spin text-primary-600" />
            </div>
          ) : !filteredRows.length ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-ink-500">
              <Users size={32} />
              <p className="text-sm">{t("لا توجد بيانات مطابقة")}</p>
            </div>
          ) : (
            <div
              className="relative"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = filteredRows[virtualRow.index];

                const employeeId = Number(row.employee.id);

                const present = row.status === STATUS.PRESENT;

                const selected = selectedIds.has(employeeId);

                return (
                  <div
                    key={employeeId}
                    className={narrow ? "absolute start-0 end-0 px-2.5 py-1.5" : "absolute start-0 end-0 border-b border-ink-100 bg-white px-3 py-2 transition hover:bg-ink-50/50"}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className={narrow ? "grid h-full grid-cols-2 content-start gap-x-3 gap-y-2.5 overflow-hidden rounded-xl border border-ink-200 bg-white p-3 shadow-sm" : "grid items-end gap-x-2 gap-y-1.5"} style={narrow ? undefined : { gridTemplateColumns: "44px repeat(4, minmax(0, 1fr))" }}>
                      <div className={narrow ? "col-span-2 flex items-center gap-2" : "flex h-9 items-center"}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelected(employeeId)}
                          className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
                        />
                        {narrow && (
                          <span className="truncate font-semibold text-ink-800">{row.employee.name} <span className="text-xs text-ink-400">#{row.employee.id}</span></span>
                        )}
                      </div>
                      {!narrow && (
                        <div className="min-w-0 pb-1">
                          <div className="truncate font-semibold text-ink-800">{row.employee.name}</div>
                          <div className="text-xs text-ink-400">#{row.employee.id}</div>
                        </div>
                      )}
                      <label className={"block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1" + (narrow ? " col-span-2" : "")}>{t("الحالة")}
                        <CompactSelect
                          value={row.status}
                          onChange={(value) => setEmployeeStatus(employeeId, value)}
                          options={[
                            { value: STATUS.PRESENT, label: t("حاضر") },
                            { value: STATUS.ABSENT, label: t("غائب") },
                            { value: STATUS.NOT_RECORDED, label: t("لم يسجل") },
                          ]}
                          placeholder={t("الحالة")}
                        />
                      </label>
                      <label className="block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1">{t("الحضور")}
                        <input type="time" value={present ? row.checkIn || "" : ""} disabled={!present}
                          onChange={(event) => updateRow(employeeId, { checkIn: event.target.value })}
                          className="h-[38px] w-full min-w-0 max-w-full appearance-none rounded-lg border border-ink-200 bg-white px-2 text-start text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-300 focus:border-primary-500" />
                      </label>
                      <label className="block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1">{t("الانصراف")}
                        <input type="time" value={present ? row.checkOut || "" : ""} disabled={!present}
                          onChange={(event) => updateRow(employeeId, { checkOut: event.target.value })}
                          className="h-[38px] w-full min-w-0 max-w-full appearance-none rounded-lg border border-ink-200 bg-white px-2 text-start text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-300 focus:border-primary-500" />
                      </label>
                      {!narrow && <div />}
                      <label className="block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1">{t("نسبة اليوم")}
                        <CompactSelect
                          value={present ? (row.workDayRatio ?? 1) : ""}
                          onChange={(value) => updateRow(employeeId, { workDayRatio: normalizeRatio(value, 1) })}
                          options={dayRatioOptions}
                          placeholder={t("نسبة اليوم")}
                          isDisabled={!present}
                        />
                      </label>
                      <label className="block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1">{t("الإضافي")}
                        <CompactSelect
                          value={row.workOverTimeRatio || ""}
                          onChange={(value) => updateRow(employeeId, { workOverTimeRatio: value })}
                          options={[{ value: "", label: t("بدون") }, ...dayRatioOptions]}
                          placeholder={t("الإضافي")}
                        />
                      </label>
                      <label className="block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1">{t("الخصم")}
                        <CompactSelect
                          value={row.workDaysDeductionRatio || ""}
                          onChange={(value) => updateRow(employeeId, { workDaysDeductionRatio: value })}
                          options={[{ value: "", label: t("بدون") }, ...dayRatioOptions]}
                          placeholder={t("الخصم")}
                          isDisabled={!present}
                        />
                      </label>
                      <label className="block min-w-0 text-[11px] font-medium text-ink-500 [&>div]:mt-1 [&>input]:mt-1">{t("ملاحظات")}
                        <input type="text" value={row.notes || ""}
                          onChange={(event) => updateRow(employeeId, { notes: event.target.value })}
                          placeholder={t("ملاحظات...")}
                          className="h-[38px] w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-primary-500" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/50 px-4 py-3 text-xs text-ink-500">
          <div>
            {t("عرض")}{" "}
            <span className="font-semibold text-ink-800">
              {filteredRows.length}
            </span>{" "}
            {t("من")}{" "}
            <span className="font-semibold text-ink-800">
              {employeeRows.length}
            </span>{" "}
            {t("موظف")}
          </div>

          {isFetching && (
            <div className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" />
              {t("جاري تحديث البيانات...")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTakingPage;
