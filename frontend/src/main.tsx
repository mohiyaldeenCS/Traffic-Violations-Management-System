import React, { useCallback, useEffect, useId, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  ROOT,
  refreshCsrf,
  statusNames,
  roleNames,
  actionNames,
  textValue,
  dateValue,
  navigation,
} from "./api";
import type { Page, Row, Session } from "./api";
import "./style.css";

const s = textValue;
function Icon({ name = "grid" }: { name?: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    cases: "M8 3h8v3H8z M6 5H4v16h16V5h-2 M8 11h8 M8 16h5",
    vehicles:
      "M4 10l2-6h12l2 6 M3 10h18v8H3z M6 18v3 M18 18v3 M6 14h2 M16 14h2",
    cameras: "M3 6h12v12H3z M15 10l6-3v10l-6-3",
    rules: "M5 3h14v18H5z M8 7h8 M8 12h8 M8 17h5",
    appeals: "M12 3v18 M5 21h14 M4 7h16 M6 7l-4 7h8z M18 7l-4 7h8z",
    payments: "M3 5h18v14H3z M3 10h18 M6 15h4",
    notifications: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4",
    audit: "M5 3h14v18H5z M8 8l2 2 5-5 M8 15h8",
    users:
      "M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M21 21v-3a4 4 0 0 0-3-4",
    arrow: "M14 5l-7 7 7 7 M7 12h14",
    logout: "M9 3H3v18h6 M14 7l5 5-5 5 M8 12h11",
    plus: "M12 4v16 M4 12h16",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
function Status({ value }: { value: unknown }) {
  return (
    <span className={`status status-${s(value)}`}>
      {statusNames[s(value)] || s(value)}
    </span>
  );
}
function Message({ error, success }: { error?: string; success?: string }) {
  return error ? (
    <div className="notice error" role="alert">
      {error}
    </div>
  ) : success ? (
    <div className="notice success" role="status">
      {success}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="empty" role="status">
      <span className="spinner" /> جارٍ تحميل السجلات…
    </div>
  );
}
function Empty({
  children = "لا توجد سجلات لعرضها حاليًا.",
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name="cases" />
      <h3>السجل خالٍ</h3>
      <p>{children}</p>
    </div>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const fieldId = useId();
  return (
    <label className="field">
      <span id={`${fieldId}-label`}>{label}</span>
      {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{id:string;'aria-labelledby':string;'aria-describedby'?:string}>, {id:fieldId,'aria-labelledby':`${fieldId}-label`,'aria-describedby':hint ? `${fieldId}-hint` : undefined}) : children}
      {hint && <small id={`${fieldId}-hint`}>{hint}</small>}
    </label>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <div>
        <strong>رَصد</strong>
        <span>المخالفات والسلامة المرورية</span>
      </div>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (v: Session) => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const session = await api<Session>("auth/login/", {
        username: data.get("username"),
        password: data.get("password"),
        ...(data.get("otp") ? { otp: data.get("otp") } : {}),
      });
      await refreshCsrf();
      onLogin(session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">إجراءات واضحة. قرارات موثقة.</p>
          <h1>
            كل ملف له مسار.
            <br />
            وكل قرار له أثر.
          </h1>
          <p>
            مساحة عمل موحدة لمراجعة المخالفات، توثيق الأدلة، ومتابعة الاعتراضات
            والسداد.
          </p>
          <div className="login-process">
            <span>
              01 <b>رصد وتوثيق</b>
            </span>
            <span>
              02 <b>مراجعة واعتماد</b>
            </span>
            <span>
              03 <b>تبليغ ومتابعة</b>
            </span>
          </div>
        </div>
        <small>منصة تقييم مستقلة • لا تمثل جهة حكومية</small>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <p className="eyebrow">أهلًا بك في رَصد</p>
          <h2>تسجيل الدخول</h2>
          <p className="muted">استخدم الحساب الذي خصصه لك مسؤول الجهة.</p>
          <Message error={error} />
          <form onSubmit={submit}>
            <Field label="اسم المستخدم">
              <input
                name="username"
                autoComplete="username"
                dir="ltr"
                required
                maxLength={150}
              />
            </Field>
            <Field label="كلمة المرور">
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field
              label="رمز التحقق الإضافي"
              hint="أدخله إذا كانت المصادقة الثنائية مفعلة لحسابك."
            >
              <input
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                dir="ltr"
              />
            </Field>
            <button className="primary wide" disabled={busy}>
              {busy ? "جارٍ التحقق…" : "الدخول إلى المنصة"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="login-foot">
            صلاحياتك تحدد السجلات والإجراءات المتاحة لك.
            <br />
            تُسجل الإجراءات الحساسة لأغراض التدقيق.
          </p>
        </div>
      </section>
    </main>
  );
}
type DashboardData = {
  total: number;
  by_status: { status: string; total: number }[];
  collected: { currency: string; total: string }[];
  cameras_online: number;
  cameras_total: number;
  pending_outbox: number;
};
function Dashboard({
  session,
  go,
}: {
  session: Session;
  go: (p: string) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [recent, setRecent] = useState<Row[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all([
      session.role === "citizen"
        ? Promise.resolve(null)
        : api<DashboardData>("dashboard/"),
      api<Page>("cases/?page_size=5"),
    ])
      .then(([d, c]) => {
        if (live) {
          setData(d);
          setRecent(c.results);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [session.role]);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">مساحة العمل / {roleNames[session.role]}</p>
          <h1>
            {session.role === "citizen"
              ? "متابعة ملفاتك المرورية"
              : "نظرة عامة على العمل"}
          </h1>
          <p>
            مرحبًا {session.username}،{" "}
            {session.role === "citizen"
              ? "تابع حالة المخالفات والاعتراضات المرتبطة بحسابك."
              : "هذه أحدث الأرقام المسجلة لدى جهتك."}
          </p>
        </div>
        <span className="date-tag">
          {new Intl.DateTimeFormat("ar", { dateStyle: "full" }).format(
            new Date(),
          )}
        </span>
      </div>
      <Message error={error} />
      {session.role !== "citizen" && !data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="metrics" aria-label="مؤشرات الجهة">
              <article>
                <span>إجمالي الملفات</span>
                <strong>{data.total.toLocaleString("ar")}</strong>
                <small>جميع حالات المخالفات</small>
              </article>
              <article>
                <span>بانتظار المراجعة</span>
                <strong>
                  {(
                    data.by_status.find((x) => x.status === "review")?.total ||
                    0
                  ).toLocaleString("ar")}
                </strong>
                <small>تحتاج فحص الأدلة</small>
              </article>
              <article>
                <span>أجهزة الرصد المتصلة</span>
                <strong>
                  {data.cameras_online.toLocaleString("ar")}
                  <em> / {data.cameras_total.toLocaleString("ar")}</em>
                </strong>
                <small>الحالة المسجلة لدى الخادم</small>
              </article>
              <article>
                <span>رسائل بانتظار التسليم</span>
                <strong>{data.pending_outbox.toLocaleString("ar")}</strong>
                <small>قائمة إرسال الإشعارات</small>
              </article>
            </section>
            <section className="overview-split">
              <div className="panel">
                <div className="panel-heading">
                  <h2>توزيع حالات الملفات</h2>
                  <span className="subtle">بيانات فعلية</span>
                </div>
                {data.by_status.length ? (
                  <div className="status-distribution">
                    {data.by_status.map((row) => (
                      <div key={row.status}>
                        <span>{statusNames[row.status] || row.status}</span>
                        <div className="bar-track">
                          <span
                            style={{
                              width: `${data.total ? (row.total / data.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <strong>{row.total.toLocaleString("ar")}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty>تظهر حالة العمل بعد تسجيل أول مخالفة.</Empty>
                )}
              </div>
              <div className="panel collection">
                <div className="panel-heading">
                  <h2>السداد المسجل</h2>
                  <Icon name="payments" />
                </div>
                {data.collected.length ? (
                  data.collected.map((row) => (
                    <div key={row.currency} className="collection-value">
                      <strong>{row.total}</strong>
                      <span>{row.currency}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">لا توجد مبالغ مسددة.</p>
                )}
                <p className="subtle">
                  حسب العملة؛ تشمل البيئة التجريبية عمليات المحاكاة المسجلة.
                </p>
                {["admin", "finance", "auditor"].includes(session.role) && (
                  <button
                    className="text-button"
                    onClick={() => go("payments")}
                  >
                    عرض سجل السداد ←
                  </button>
                )}
              </div>
            </section>
          </>
        )
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>آخر الملفات</h2>
            <p>تفاصيل المخالفة ومسار المعالجة في مكان واحد.</p>
          </div>
          <button className="secondary" onClick={() => go("cases")}>
            عرض الكل <Icon name="arrow" />
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="empty">تعذر تحميل أحدث الملفات.</div>
        ) : (
          <CaseTable rows={recent} go={go} />
        )}
      </section>
    </>
  );
}
function CaseTable({ rows, go }: { rows: Row[]; go: (p: string) => void }) {
  return rows.length ? (
    <>
      <div
        className="table-wrap"
        role="region"
        aria-label="جدول ملفات المخالفات"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>رقم الملف</th>
              <th>المركبة</th>
              <th>المخالفة / الموقع</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>
                <span className="sr-only">التفاصيل</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <button
                    className="reference"
                    onClick={() => go(`cases/${row.id}`)}
                  >
                    {s(row.reference)}
                  </button>
                </td>
                <td>
                  <span className="plate">{s(row.plate)}</span>
                </td>
                <td>
                  <strong>{s(row.rule_title)}</strong>
                  <small>{s(row.location)}</small>
                </td>
                <td className="number">
                  {s(row.amount)}{" "}
                  <small className="inline">{s(row.currency)}</small>
                </td>
                <td>
                  <Status value={row.status} />
                </td>
                <td className="date-cell">{dateValue(row.occurred_at)}</td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`عرض الملف ${s(row.reference)}`}
                    onClick={() => go(`cases/${row.id}`)}
                  >
                    <Icon name="arrow" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="case-cards" role="list" aria-label="ملفات المخالفات">
        {rows.map((row) => (
          <article className="case-card" role="listitem" key={row.id}>
            <header className="case-card-header">
              <strong dir="ltr">{s(row.reference)}</strong>
              <Status value={row.status} />
            </header>
            <dl>
              <div>
                <dt>المركبة</dt>
                <dd>{s(row.plate)}</dd>
              </div>
              <div>
                <dt>المخالفة / الموقع</dt>
                <dd>
                  <strong>{s(row.rule_title)}</strong>
                  <small>{s(row.location)}</small>
                </dd>
              </div>
              <div>
                <dt>المبلغ</dt>
                <dd>
                  {s(row.amount)} {s(row.currency)}
                </dd>
              </div>
              <div>
                <dt>التاريخ</dt>
                <dd>{dateValue(row.occurred_at)}</dd>
              </div>
            </dl>
            <button
              className="secondary"
              onClick={() => go(`cases/${row.id}`)}
            >
              عرض الملف <Icon name="arrow" />
            </button>
          </article>
        ))}
      </div>
    </>
  ) : (
    <Empty>
      لا توجد ملفات مطابقة. يمكنك تعديل عوامل البحث أو العودة لاحقًا.
    </Empty>
  );
}
const listColumns: Record<string, [string, string][]> = {
  vehicles: [
    ["plate", "رقم اللوحة"],
    ["model", "المركبة"],
    ["color", "اللون"],
    ["country", "الدولة"],
    ["region", "المنطقة"],
    ["owner", "معرّف المالك"],
  ],
  cameras: [
    ["code", "رمز الجهاز"],
    ["location", "الموقع"],
    ["status", "الحالة"],
    ["adapter", "نوع الاتصال"],
  ],
  rules: [
    ["code", "رمز القاعدة"],
    ["title", "الوصف"],
    ["amount", "المبلغ"],
    ["currency", "العملة"],
    ["appeal_days", "مهلة الاعتراض / يوم"],
    ["active", "مفعلة"],
  ],
  users: [
    ["username", "اسم المستخدم"],
    ["role", "الدور"],
    ["is_active", "نشط"],
  ],
  appeals: [
    ["reference", "رقم المخالفة"],
    ["reason", "سبب الاعتراض"],
    ["status", "الحالة"],
    ["decision_reason", "سبب القرار"],
    ["created_at", "التاريخ"],
  ],
  payments: [
    ["reference", "مرجع السداد"],
    ["case_reference", "رقم المخالفة"],
    ["amount", "المبلغ"],
    ["currency", "العملة"],
    ["simulated", "محاكاة"],
    ["created_at", "التاريخ"],
  ],
  audit: [
    ["sequence", "التسلسل"],
    ["action", "الإجراء"],
    ["target", "السجل"],
    ["actor", "المنفذ"],
    ["created_at", "التاريخ"],
    ["digest", "بصمة التدقيق"],
  ],
  notifications: [
    ["topic", "الموضوع"],
    ["payload", "التفاصيل"],
    ["created_at", "التاريخ"],
    ["delivered_at", "تاريخ التسليم"],
  ],
};
const resourceTitles: Record<string, string> = {
  cases: "ملفات المخالفات",
  vehicles: "سجل المركبات",
  cameras: "أجهزة الرصد",
  rules: "قواعد المخالفات",
  appeals: "الاعتراضات",
  payments: "سجل السداد",
  audit: "سجل التدقيق",
  notifications: "الإشعارات",
  users: "إدارة المستخدمين",
};
const resourceDescriptions: Record<string, string> = {
  cases: "ابحث عن ملف، راجع الأدلة، وتابع خطوات المعالجة.",
  vehicles: "المركبات المسجلة وملكية كل مركبة داخل الجهة.",
  cameras: "بيانات الأجهزة وحالتها المسجلة. لا تتوفر بثوث مباشرة.",
  rules: "سياسات تقييم قابلة للتهيئة، ولا تمثل تشريعات رسمية.",
  appeals: "أسباب الاعتراض والقرارات المسجلة على ملفات المخالفات.",
  payments: "قيود السداد المسجلة ومراجع التسوية.",
  audit: "تسلسل الإجراءات المسجلة وبصمات سلامتها.",
  notifications: "التحديثات المرتبطة بملفاتك وإجراءاتها.",
  users: "حسابات الجهة وأدوارها الوظيفية.",
};
function canCreate(resource: string, session: Session) {
  return resource === "cases"
    ? session.role === "registrar"
    : resource === "vehicles"
      ? ["registrar", "admin"].includes(session.role)
      : ["cameras", "rules", "users"].includes(resource) &&
        session.role === "admin";
}
function NotificationPayload({
  value,
  go,
}: {
  value: unknown;
  go: (path: string) => void;
}) {
  if (!value || typeof value !== "object") return <>{s(value)}</>;
  const payload = value as Record<string, unknown>;
  return (
    <div>
      {payload.decision ? (
        <p>
          قرار الاعتراض:{" "}
          {statusNames[s(payload.decision)] || s(payload.decision)}
        </p>
      ) : null}
      {payload.simulated ? <p>سداد محاكى داخل بيئة التقييم</p> : null}
      {typeof payload.case === "string" ? (
        <button
          className="reference"
          onClick={() => go(`cases/${payload.case}`)}
        >
          {payload.reference ? s(payload.reference) : "عرض الملف المرتبط"}
        </button>
      ) : (
        <span>{s(value)}</span>
      )}
    </div>
  );
}
const notificationTopics: Record<string, string> = {
  "case.issued": "صدرت مخالفة مرتبطة بحسابك",
  "appeal.decided": "صدر قرار في اعتراضك",
  "payment.recorded": "تم تسجيل السداد",
};
function Resource({
  resource,
  session,
  go,
}: {
  resource: string;
  session: Session;
  go: (p: string) => void;
}) {
  const [data, setData] = useState<Page | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [create, setCreate] = useState(false),
    [revision, setRevision] = useState(0),
    [decision, setDecision] = useState<Row | null>(null);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    api<Page>(
      `${resource}/?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
    )
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [resource, page, search, status, revision]);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">مساحة العمل / السجلات</p>
          <h1>{resourceTitles[resource]}</h1>
          <p>{resourceDescriptions[resource]}</p>
        </div>
        <div className="actions">
          {resource === "cases" &&
            ["admin", "finance", "auditor"].includes(session.role) && (
              <a className="secondary" href={`${ROOT}cases/export/`}>
                تصدير CSV
              </a>
            )}
          {canCreate(resource, session) && (
            <button className="primary" onClick={() => setCreate(true)}>
              <Icon name="plus" />
              {resource === "cases" ? "تسجيل مخالفة" : "إضافة سجل"}
            </button>
          )}
        </div>
      </div>
      {resource === "cameras" && (
        <div className="notice neutral">
          أجهزة هذه البيئة تستخدم محاكيًا. عرض الحالة لا يثبت اتصال جهاز ميداني
          حقيقي.
        </div>
      )}
      <section className="panel">
        <div className="toolbar">
          {resource === "cases" && (
            <form
              className="search"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(query);
                setPage(1);
              }}
            >
              <input
                aria-label="البحث في السجلات"
                placeholder={
                  resource === "cases"
                    ? "ابحث برقم الملف أو اللوحة أو الموقع…"
                    : "البحث في السجلات…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="secondary" type="submit">
                بحث
              </button>
            </form>
          )}
          {resource === "cases" && (
            <select
              aria-label="تصفية حسب الحالة"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">جميع الحالات</option>
              {[
                "draft",
                "review",
                "approval",
                "approved",
                "issued",
                "appealed",
                "paid",
                "closed",
                "cancelled",
              ].map((v) => (
                <option key={v} value={v}>
                  {statusNames[v]}
                </option>
              ))}
            </select>
          )}
          <span className="count">
            {data ? `${data.count.toLocaleString("ar")} سجل` : "—"}
          </span>
        </div>
        <Message error={error} />
        {busy ? (
          <Loading />
        ) : error ? (
          <div className="empty">
            <button
              className="secondary"
              onClick={() => setRevision((v) => v + 1)}
            >
              إعادة المحاولة
            </button>
          </div>
        ) : resource === "cases" ? (
          <CaseTable rows={data?.results || []} go={go} />
        ) : data?.results.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {listColumns[resource].map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  {resource === "appeals" && session.role === "appeals" && (
                    <th>الإجراء</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row.id}>
                    {listColumns[resource].map(([key]) => (
                      <td
                        key={key}
                        className={key === "digest" ? "digest" : ""}
                      >
                        {(key === "case_reference" ||
                          (resource === "appeals" && key === "reference")) &&
                        row.case ? (
                          <button
                            className="reference"
                            onClick={() => go(`cases/${row.case}`)}
                          >
                            {s(row[key])}
                          </button>
                        ) : key === "status" ? (
                          <Status value={row[key]} />
                        ) : key === "payload" ? (
                          <NotificationPayload value={row[key]} go={go} />
                        ) : key === "topic" ? (
                          notificationTopics[s(row[key])] || s(row[key])
                        ) : key === "role" ? (
                          roleNames[row[key] as keyof typeof roleNames] ||
                          s(row[key])
                        ) : key.endsWith("_at") ? (
                          dateValue(row[key])
                        ) : typeof row[key] === "boolean" ? (
                          row[key] ? (
                            "نعم"
                          ) : (
                            "لا"
                          )
                        ) : (
                          s(row[key])
                        )}
                      </td>
                    ))}
                    {resource === "appeals" && session.role === "appeals" && (
                      <td>
                        {row.status === "pending" && (
                          <button
                            className="secondary"
                            onClick={() => setDecision(row)}
                          >
                            مراجعة الاعتراض
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            {canCreate(resource, session)
              ? "ابدأ بإضافة أول سجل باستخدام الزر أعلى الصفحة."
              : "ستظهر السجلات هنا عند توفرها من الخادم."}
          </Empty>
        )}
        <div className="pagination">
          <span>صفحة {page.toLocaleString("ar")}</span>
          <div>
            <button
              className="secondary"
              disabled={busy || !data?.previous}
              onClick={() => setPage((v) => v - 1)}
            >
              السابق
            </button>
            <button
              className="secondary"
              disabled={busy || !data?.next}
              onClick={() => setPage((v) => v + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </section>
      {create && (
        <CreateDialog
          resource={resource}
          close={() => setCreate(false)}
          saved={() => {
            setCreate(false);
            setPage(1);
            setRevision((v) => v + 1);
          }}
        />
      )}
      {decision && (
        <DecisionDialog
          row={decision}
          close={() => setDecision(null)}
          saved={() => {
            setDecision(null);
            setRevision((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
type Spec = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: [string, string][];
  hint?: string;
};
const createSpecs: Record<string, Spec[]> = {
  vehicles: [
    { name: "plate", label: "رقم اللوحة", required: true },
    {
      name: "country",
      label: "رمز الدولة",
      required: true,
      hint: "رمز حرفي من حرفين أو ثلاثة، مثل SA.",
    },
    { name: "region", label: "المنطقة" },
    { name: "model", label: "طراز المركبة", required: true },
    { name: "color", label: "اللون" },
    { name: "owner", label: "مالك المركبة", required: true, type: "choice" },
  ],
  cameras: [
    { name: "code", label: "رمز الجهاز", required: true },
    { name: "location", label: "وصف الموقع", required: true },
    { name: "latitude", label: "خط العرض", type: "number" },
    { name: "longitude", label: "خط الطول", type: "number" },
  ],
  rules: [
    { name: "code", label: "رمز القاعدة", required: true },
    { name: "title", label: "عنوان المخالفة", required: true },
    { name: "amount", label: "المبلغ", type: "number", required: true },
    {
      name: "currency",
      label: "رمز العملة (3 أحرف)",
      required: true,
      hint: "تُحدد القيمة والعملة وفق سياسة الجهة التجريبية.",
    },
    {
      name: "appeal_days",
      label: "مهلة الاعتراض بالأيام",
      type: "number",
      required: true,
    },
  ],
  users: [
    { name: "username", label: "اسم المستخدم", required: true },
    {
      name: "password",
      label: "كلمة المرور",
      type: "password",
      required: true,
    },
    {
      name: "role",
      label: "الدور الوظيفي",
      required: true,
      options: Object.entries(roleNames),
    },
  ],
  cases: [
    { name: "vehicle", label: "المركبة", required: true, type: "choice" },
    { name: "rule", label: "قاعدة المخالفة", required: true, type: "choice" },
    { name: "camera", label: "جهاز الرصد (اختياري)", type: "choice" },
    {
      name: "source_ref",
      label: "مرجع المصدر الفريد",
      required: true,
      hint: "معرّف الحدث الأصلي لمنع تكرار تسجيله.",
    },
    { name: "location", label: "موقع المخالفة", required: true },
    {
      name: "occurred_at",
      label: "تاريخ ووقت الواقعة",
      type: "datetime-local",
      required: true,
    },
    { name: "notes", label: "ملاحظات الواقعة", type: "textarea" },
  ],
};
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const elements = [
          ...document.querySelectorAll<HTMLElement>(
            ".dialog button:not(:disabled), .dialog input, .dialog select, .dialog textarea, .dialog a",
          ),
        ];
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.querySelector<HTMLElement>(".dialog button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="dialog-overlay">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="panel-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
async function choices(resource: string) {
  const rows: Row[] = [];
  let page = 1;
  while (true) {
    const result = await api<Page>(`${resource}/?page_size=100&page=${page}`);
    rows.push(...result.results);
    if (!result.next) break;
    page++;
    if (page > 100)
      throw new Error(
        "عدد الخيارات كبير جدًا. يرجى تضييق السجلات قبل المتابعة.",
      );
  }
  return rows;
}
function CreateDialog({
  resource,
  close,
  saved,
}: {
  resource: string;
  close: () => void;
  saved: () => void;
}) {
  const [options, setOptions] = useState<Record<string, [string, string][]>>(
      {},
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    const sources =
      resource === "cases"
        ? ["vehicles", "rules", "cameras"]
        : resource === "vehicles"
          ? ["users"]
          : [];
    Promise.all(
      sources.map(async (source) => [source, await choices(source)] as const),
    )
      .then((all) => {
        const o: Record<string, [string, string][]> = {};
        all.forEach(([source, rows]) => {
          o[
            {
              vehicles: "vehicle",
              rules: "rule",
              cameras: "camera",
              users: "owner",
            }[source]!
          ] = rows
            .filter((r) => source !== "rules" || r.active !== false)
            .filter(
              (r) =>
                source !== "users" ||
                (r.role === "citizen" && r.is_active !== false),
            )
            .map((r) => [
              String(r.id),
              s(
                source === "vehicles"
                  ? r.plate
                  : source === "rules"
                    ? r.title
                    : source === "cameras"
                      ? `${s(r.code)} — ${s(r.location)}`
                      : r.username,
              ),
            ]);
        });
        if (live) setOptions(o);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [resource]);
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget),
    );
    if (resource === "cases") {
      values.occurred_at = new Date(String(values.occurred_at)).toISOString();
      values.camera = values.camera || null;
    }
    if (resource === "vehicles") values.owner = Number(values.owner);
    if (resource === "cameras") {
      values.status = "offline";
      values.adapter = "simulator";
      for (const key of ["latitude", "longitude"]) {
        if (!values[key]) delete values[key];
      }
    }
    if (resource === "rules") {
      values.active = true;
      values.appeal_days = Number(values.appeal_days);
      values.currency = String(values.currency).toUpperCase();
    }
    try {
      await api(`${resource}/`, values);
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={
        resource === "cases"
          ? "تسجيل ملف مخالفة جديد"
          : `إضافة إلى ${resourceTitles[resource]}`
      }
      close={close}
    >
      <Message error={error} />
      {loading ? (
        <Loading />
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            {createSpecs[resource].map((spec) => (
              <Field key={spec.name} label={spec.label} hint={spec.hint}>
                {spec.type === "textarea" ? (
                  <textarea
                    name={spec.name}
                    required={spec.required}
                    rows={3}
                  />
                ) : spec.options || spec.type === "choice" ? (
                  <select name={spec.name} required={spec.required}>
                    <option value="">اختر من السجلات المتاحة</option>
                    {(spec.options || options[spec.name] || []).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <input
                    name={spec.name}
                    required={spec.required}
                    type={spec.type || "text"}
                    step={spec.type === "number" ? "any" : undefined}
                    min={
                      ["amount", "appeal_days"].includes(spec.name)
                        ? 0
                        : undefined
                    }
                    minLength={spec.name === "password" ? 12 : undefined}
                    maxLength={spec.name === "currency" ? 3 : undefined}
                    defaultValue={spec.name === "appeal_days" ? 30 : undefined}
                    autoComplete={
                      spec.name === "password" ? "new-password" : "off"
                    }
                  />
                )}
              </Field>
            ))}
          </div>
          {resource === "cases" && (
            <p className="subtle">
              يُحفظ مبلغ المخالفة من القاعدة المحددة. يبدأ الملف كمسودة قبل
              المراجعة والاعتماد.
            </p>
          )}
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              {busy ? "جارٍ الحفظ…" : "حفظ السجل"}
            </button>
            <button className="secondary" type="button" onClick={close}>
              إلغاء
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
function DecisionDialog({
  row,
  close,
  saved,
}: {
  row: Row;
  close: () => void;
  saved: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `appeals/${row.id}/decide/`,
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="قرار الاعتراض" close={close}>
      <p className="reason-block">{s(row.reason)}</p>
      <Message error={error} />
      <form onSubmit={submit}>
        <Field label="القرار">
          <select name="decision" required>
            <option value="">اختر القرار</option>
            <option value="accepted">قبول الاعتراض</option>
            <option value="rejected">رفض الاعتراض</option>
          </select>
        </Field>
        <Field label="أسباب القرار">
          <textarea name="reason" rows={4} required minLength={5} />
        </Field>
        <button className="primary" disabled={busy}>
          {busy ? "جارٍ حفظ القرار…" : "تثبيت القرار"}
        </button>
      </form>
    </Dialog>
  );
}
function CaseDetail({
  id,
  session,
  go,
}: {
  id: string;
  session: Session;
  go: (p: string) => void;
}) {
  const [row, setRow] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let live = true;
    setError("");
    api<Row>(`cases/${id}/`)
      .then((v) => {
        if (live) setRow(v);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, revision]);
  async function mutate(
    path: string,
    body: unknown,
    message: string,
    form?: HTMLFormElement,
  ) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(`cases/${id}/${path}/`, body);
      setSuccess(message);
      setRevision((v) => v + 1);
      form?.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!row)
    return (
      <>
        <button className="text-button" onClick={() => go("cases")}>
          → العودة للملفات
        </button>
        <Message error={error} />
        {!error && <Loading />}
      </>
    );
  const evidence = (row.evidence || []) as Row[],
    history = (row.history || []) as Row[],
    actions = (row.allowed_actions || []) as string[];
  return (
    <>
      <button className="text-button back" onClick={() => go("cases")}>
        → جميع ملفات المخالفات
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ملف مخالفة / الإصدار {s(row.version)}</p>
          <h1 className="case-title">{s(row.reference)}</h1>
          <p>{s(row.rule_title)}</p>
        </div>
        <Status value={row.status} />
      </div>
      <Message error={error} success={success} />
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <div className="panel-heading">
              <h2>بيانات الواقعة</h2>
              <span className="plate">{s(row.plate)}</span>
            </div>
            <dl className="case-facts">
              {[
                ["الموقع", row.location],
                ["تاريخ الواقعة", dateValue(row.occurred_at)],
                ["المبلغ", `${s(row.amount)} ${s(row.currency)}`],
                ["تاريخ الإصدار", dateValue(row.issued_at)],
                ["آخر موعد للاعتراض", dateValue(row.appeal_deadline)],
                ["جهاز الرصد", row.camera ? "مرتبط بجهاز رصد" : "تسجيل يدوي"],
              ].map(([label, value]) => (
                <div key={s(label)}>
                  <dt>{s(label)}</dt>
                  <dd>{s(value)}</dd>
                </div>
              ))}
            </dl>
            {row.notes ? (
              <div className="case-notes">
                <h3>ملاحظات التسجيل</h3>
                <p>{s(row.notes)}</p>
              </div>
            ) : null}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  الأدلة والمرفقات{" "}
                  <span className="count">{evidence.length}</span>
                </h2>
                <p>تنزيل المرفقات يُسجل ضمن سلسلة حيازة الأدلة.</p>
              </div>
              {["auditor", "reviewer", "approver"].includes(session.role) &&
                evidence.length > 0 && (
                  <a
                    className="secondary"
                    href={`${ROOT}cases/${id}/evidence-package/`}
                  >
                    حزمة الأدلة
                  </a>
                )}
            </div>
            {evidence.length ? (
              <ul className="evidence-list">
                {evidence.map((file) => (
                  <li key={file.id}>
                    <span className="file-icon">
                      {s(file.content_type).includes("pdf") ? "PDF" : "IMG"}
                    </span>
                    <div>
                      <strong>{s(file.original_name)}</strong>
                      <small>
                        {(Number(file.size) / 1024).toFixed(1)} KB ·{" "}
                        {dateValue(file.created_at)}
                      </small>
                      <details>
                        <summary>بصمة SHA-256</summary>
                        <code>{s(file.sha256)}</code>
                      </details>
                    </div>
                    <a
                      className="secondary"
                      href={`${ROOT}evidence/${file.id}/download/`}
                    >
                      تنزيل
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>لم تُرفق أدلة بهذا الملف بعد.</Empty>
            )}
            {["registrar", "reviewer"].includes(session.role) &&
              ["draft", "review"].includes(s(row.status)) && (
                <form
                  className="attachment-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      data = new FormData(form);
                    const file = data.get("file") as File;
                    if (file.size > 10 * 1024 * 1024) {
                      setError("حجم الملف يتجاوز الحد المسموح: 10 ميجابايت.");
                      return;
                    }
                    data.set(
                      "captured_at",
                      new Date(String(data.get("captured_at"))).toISOString(),
                    );
                    void mutate(
                      "evidence",
                      data,
                      "تم إرفاق الدليل وتسجيل بصمته.",
                      form,
                    );
                  }}
                >
                  <h3>إرفاق دليل</h3>
                  <Field
                    label="الملف"
                    hint="JPEG أو PNG أو PDF، بحد أقصى 10 ميجابايت."
                  >
                    <input
                      name="file"
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      required
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="مصدر الدليل">
                      <input name="source" required maxLength={200} />
                    </Field>
                    <Field label="وقت التقاط الدليل">
                      <input
                        name="captured_at"
                        type="datetime-local"
                        required
                      />
                    </Field>
                  </div>
                  <button className="secondary" disabled={busy}>
                    رفع الدليل
                  </button>
                </form>
              )}
          </section>
          {session.role === "citizen" && row.status === "issued" && (
            <section className="panel padded">
              <h2>تقديم اعتراض</h2>
              <p className="muted">
                اشرح سبب الاعتراض قبل انقضاء المهلة المسجلة أعلاه.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    "appeals",
                    Object.fromEntries(new FormData(e.currentTarget)),
                    "تم تسجيل الاعتراض للمراجعة.",
                    e.currentTarget,
                  );
                }}
              >
                <Field label="سبب الاعتراض">
                  <textarea name="reason" rows={4} required minLength={5} />
                </Field>
                <button className="primary" disabled={busy}>
                  إرسال الاعتراض
                </button>
              </form>
            </section>
          )}
          {session.role === "finance" && row.status === "issued" && (
            <section className="panel padded">
              <h2>تسجيل تسوية مالية</h2>
              <p className="muted">
                يسجل هذا الإجراء سدادًا جرى التحقق منه خارجيًا. لا تجمع المنصة
                بيانات البطاقات.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    "payments",
                    {
                      ...Object.fromEntries(new FormData(e.currentTarget)),
                      idempotency_key: crypto.randomUUID(),
                    },
                    "تم تسجيل التسوية المالية.",
                    e.currentTarget,
                  );
                }}
              >
                <div className="form-grid">
                  <Field label="مرجع السداد الخارجي">
                    <input name="reference" required />
                  </Field>
                  <Field label="المبلغ">
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={s(row.amount)}
                      required
                    />
                  </Field>
                  <Field label="العملة">
                    <input
                      name="currency"
                      defaultValue={s(row.currency)}
                      required
                      maxLength={3}
                    />
                  </Field>
                </div>
                <button className="primary" disabled={busy}>
                  تسجيل السداد المتحقق منه
                </button>
              </form>
            </section>
          )}
          {session.role === "citizen" &&
            session.simulation &&
            row.status === "issued" && (
              <section className="panel padded sandbox">
                <h2>محاكاة السداد</h2>
                <p>
                  اختبار داخل بيئة التقييم فقط. لا يُخصم أي مبلغ، ولا تمثل
                  النتيجة إيصال دفع حقيقيًا.
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      "simulate-payment",
                      { idempotency_key: crypto.randomUUID() },
                      "تم تسجيل سداد محاكى فقط؛ لم يتم خصم أموال.",
                    )
                  }
                >
                  تنفيذ محاكاة سداد — {s(row.amount)} {s(row.currency)}
                </button>
              </section>
            )}
          {["paid", "closed"].includes(s(row.status)) &&
            ["admin", "finance", "auditor", "citizen"].includes(
              session.role,
            ) && (
              <section className="panel padded">
                <h2>إيصال السداد</h2>
                <button
                  className="secondary"
                  onClick={() => {
                    setError("");
                    void api<Record<string, unknown>>(`cases/${id}/receipt/`)
                      .then(setReceipt)
                      .catch((e) => setError(e.message));
                  }}
                >
                  عرض الإيصال
                </button>
                {receipt && (
                  <div className="receipt">
                    <h3>
                      {receipt.simulated
                        ? "إيصال محاكاة — ليس دفعًا حقيقيًا"
                        : "إيصال السداد المسجل"}
                    </h3>
                    <dl className="case-facts">
                      {[
                        ["مرجع الإيصال", receipt.reference],
                        ["رقم الملف", receipt.case_reference],
                        [
                          "المبلغ",
                          `${s(receipt.amount)} ${s(receipt.currency)}`,
                        ],
                        ["التاريخ", dateValue(receipt.created_at)],
                      ].map(([label, value]) => (
                        <div key={s(label)}>
                          <dt>{s(label)}</dt>
                          <dd>{s(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      className="secondary"
                      onClick={() => window.print()}
                    >
                      طباعة الإيصال
                    </button>
                  </div>
                )}
              </section>
            )}
        </div>
        <aside className="detail-side">
          {actions.length > 0 && (
            <section className="panel action-panel">
              <p className="eyebrow">الخطوة التالية</p>
              <h2>إجراء على الملف</h2>
              <p className="muted">
                تُطبق الصلاحيات وفصل المسؤوليات قبل حفظ القرار.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  void mutate(
                    "transition",
                    { ...values, version: row.version },
                    "تم تحديث حالة الملف.",
                    e.currentTarget,
                  );
                }}
              >
                <Field label="الإجراء">
                  <select name="action" required>
                    <option value="">اختر الإجراء</option>
                    {actions.map((action) => (
                      <option key={action} value={action}>
                        {actionNames[action] || action}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="سبب الإجراء">
                  <textarea name="reason" required rows={4} minLength={3} />
                </Field>
                <button className="primary wide" disabled={busy}>
                  {busy ? "جارٍ الحفظ…" : "تأكيد الإجراء"}
                </button>
              </form>
            </section>
          )}
          <section className="panel timeline-panel">
            <h2>مسار الملف</h2>
            <p className="muted">تاريخ القرارات المسجلة</p>
            {history.length ? (
              <ol className="timeline">
                {history.map((event) => (
                  <li key={event.id}>
                    <Status value={event.to_status} />
                    {event.reason ? <p>{s(event.reason)}</p> : null}
                    <small>{dateValue(event.created_at)}</small>
                    {event.actor ? (
                      <small>المنفذ: {s(event.actor)}</small>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="subtle">لم تُسجل انتقالات على الملف بعد.</p>
            )}
          </section>
          <div className="integrity-note">
            <Icon name="audit" />
            <p>
              قرارات قابلة للتتبع
              <br />
              <span>كل انتقال مرتبط بمنفذه ووقت تنفيذه وسببه.</span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function App() {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [bootError, setBootError] = useState(""),
    [path, setPath] = useState(window.location.hash.slice(1) || "dashboard"),
    [menu, setMenu] = useState(false),
    [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    refreshCsrf()
      .then(() => api<Session>("auth/session/"))
      .then(setSession)
      .catch((e) => {
        if (
          !/Authentication credentials|credentials were not provided|not authenticated|لم يتم/i.test(
            e.message,
          )
        )
          setBootError(e.message);
      })
      .finally(() => setLoading(false));
    const handler = () => {
      setPath(window.location.hash.slice(1) || "dashboard");
      setMenu(false);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const go = useCallback((v: string) => {
    window.location.hash = v;
  }, []);
  if (loading)
    return (
      <>
        <aside className="evaluation" aria-label="تنبيه بيئة التقييم">بيئة تقييم — غير معتمدة للإنفاذ الفعلي</aside>
        <Loading />
      </>
    );
  if (!session)
    return (
      <>
        <aside className="evaluation" aria-label="تنبيه بيئة التقييم">بيئة تقييم — غير معتمدة للإنفاذ الفعلي</aside>
        {bootError && <Message error={bootError} />}
        <Login
          onLogin={(v) => {
            setSession(v);
            setBootError("");
            go("dashboard");
          }}
        />
      </>
    );
  const nav = navigation(session.role),
    resource = path.split("/")[0],
    authorized = nav.some((x) => x.id === resource);
  return (
    <>
      <aside className="evaluation" aria-label="تنبيه بيئة التقييم">
        بيئة تقييم — غير معتمدة للإنفاذ الفعلي{" "}
        <span>لا تستخدم بيانات شخصية حقيقية</span>
      </aside>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        انتقل إلى المحتوى
      </a>
      <div className="app-shell">
        <aside className={`sidebar ${menu ? "is-open" : ""}`}>
          <Brand />
          <div className="workspace-label">
            مساحة الجهة <span>{session.agency_name || "الجهة المسجلة"}</span>
          </div>
          <nav aria-label="التنقل الرئيسي">
            {nav.map((item) => (
              <button
                key={item.id}
                className={resource === item.id ? "active" : ""}
                onClick={() => go(item.id)}
                aria-current={resource === item.id ? "page" : undefined}
              >
                <Icon name={item.id} />
                {item.label}
                {resource === item.id && <i />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="avatar">
              {session.username.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong dir="ltr">{session.username}</strong>
              <small>{roleNames[session.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="تسجيل الخروج"
              onClick={() => {
                void api("auth/logout/", {})
                  .then(() => {
                    setSession(null);
                    void refreshCsrf();
                  })
                  .catch((e) => setLogoutError(e.message));
              }}
            >
              <Icon name="logout" />
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="mobile-toggle secondary"
              aria-label="فتح أو إغلاق القائمة"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
            >
              ☰ القائمة
            </button>
            <div className="breadcrumb">
              رَصد <span>/</span> {resourceTitles[resource] || "نظرة عامة"}
            </div>
            <div className="topbar-end">
              <span className="session-indicator">جلسة مستخدم موثقة</span>
              <button
                className="icon-button"
                aria-label="الإشعارات"
                onClick={() => go("notifications")}
              >
                <Icon name="notifications" />
              </button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            <Message error={logoutError} />
            {!authorized ? (
              <div className="panel padded">
                <h1>الصفحة غير متاحة</h1>
                <p>اختر إحدى الصفحات المتاحة لدورك من القائمة.</p>
              </div>
            ) : resource === "dashboard" ? (
              <Dashboard session={session} go={go} />
            ) : resource === "cases" && path.split("/")[1] ? (
              <CaseDetail
                key={path}
                id={path.split("/")[1]}
                session={session}
                go={go}
              />
            ) : (
              <Resource
                key={resource}
                resource={resource}
                session={session}
                go={go}
              />
            )}
          </main>
          <footer className="workspace-footer">
            <span>رَصد · منصة إدارة المخالفات والسلامة المرورية</span>
            <span>بيئة تقييم مستقلة</span>
          </footer>
        </div>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
