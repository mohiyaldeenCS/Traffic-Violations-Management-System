export const ROOT = "/api/v1/";
let csrf = "";
export function describeError(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(describeError).join("، ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => `${k === "detail" ? "" : `${k}: `}${describeError(v)}`)
      .join(" — ");
  return "تعذر إتمام الطلب. يرجى المحاولة مجددًا.";
}
export async function refreshCsrf() {
  const response = await fetch(`${ROOT}auth/csrf/`, {
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("تعذر إنشاء جلسة آمنة.");
  csrf = (await response.json()).csrfToken;
}
export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  if (body !== undefined && !csrf) await refreshCsrf();
  const multipart = body instanceof FormData;
  const response = await fetch(`${ROOT}${path}`, {
    method: method || (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    headers:
      body === undefined
        ? {}
        : {
            "X-CSRFToken": csrf,
            ...(multipart ? {} : { "Content-Type": "application/json" }),
          },
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  const data: unknown =
    response.status === 204
      ? null
      : await response
          .json()
          .catch(() => ({ detail: "استجابة غير متوقعة من الخادم." }));
  if (!response.ok) throw new Error(describeError(data));
  return data as T;
}
export type Role =
  | "admin"
  | "registrar"
  | "reviewer"
  | "approver"
  | "finance"
  | "appeals"
  | "auditor"
  | "citizen";
export type Session = {
  id: number;
  username: string;
  role: Role;
  agency: string;
  agency_name: string;
  simulation: boolean;
};
export type Row = Record<string, unknown> & { id: string | number };
export type Page = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Row[];
};
export const statusNames: Record<string, string> = {
  draft: "مسودة",
  review: "قيد المراجعة",
  approval: "بانتظار الاعتماد",
  approved: "معتمدة",
  issued: "مبلّغة",
  appealed: "معترض عليها",
  paid: "مسددة",
  closed: "مغلقة",
  cancelled: "ملغاة",
  accepted: "مقبول",
  rejected: "مرفوض",
  pending: "قيد الانتظار",
  online: "متصلة",
  offline: "غير متصلة",
};
export const roleNames: Record<Role, string> = {
  admin: "مدير النظام",
  registrar: "مسجل المخالفات",
  reviewer: "مراجع الأدلة",
  approver: "مسؤول الاعتماد",
  finance: "موظف المالية",
  appeals: "لجنة الاعتراضات",
  auditor: "مدقق",
  citizen: "مستفيد",
};
export const actionNames: Record<string, string> = {
  submit: "إرسال للمراجعة",
  review: "إحالة للاعتماد",
  approve: "اعتماد المخالفة",
  issue: "إصدار وتبليغ",
  cancel: "إلغاء المخالفة",
  close: "إغلاق الملف",
};
export const textValue = (v: unknown): string =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
export const dateValue = (v: unknown): string =>
  v
    ? new Intl.DateTimeFormat("ar", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(v)))
    : "—";
export function navigation(role: Role) {
  const items = [
    { id: "dashboard", label: "نظرة عامة" },
    { id: "cases", label: role === "citizen" ? "مخالفاتي" : "ملفات المخالفات" },
    { id: "vehicles", label: "المركبات" },
    { id: "appeals", label: "الاعتراضات" },
    { id: "payments", label: "سجل السداد" },
    { id: "notifications", label: "الإشعارات" },
  ];
  if (role !== "citizen")
    items.splice(
      3,
      0,
      { id: "cameras", label: "أجهزة الرصد" },
      { id: "rules", label: "قواعد المخالفات" },
    );
  if (role === "admin") items.push({ id: "users", label: "المستخدمون" });
  if (role === "admin" || role === "auditor")
    items.push({ id: "audit", label: "سجل التدقيق" });
  return items.filter(
    (item) =>
      item.id !== "payments" ||
      ["admin", "finance", "auditor", "citizen"].includes(role),
  );
}
