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
  const referenceIcons: Record<string, React.ReactNode> = {
    dashboard: <><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></>,
    cases: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/></>,
    review: <><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m1 10 2 2 4-4"/></>,
    appeals: <><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Zm-14 0 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></>,
    payments: <><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></>,
    cameras: <><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/></>,
    audit: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2"/>,
    notifications: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />,
    chevron: <path d="m15 18-6-6 6-6"/>,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>,
  };
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
    menu: "M4 7h16 M4 12h16 M4 17h16",
    check: "M5 12l4 4L19 6",
    clock: "M12 8v4l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    close: "M18 6L6 18 M6 6l12 12",
    alert: "M12 9v4 M12 17h.01 M10.3 3.9L1.8 18.4A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0z",
    calendar: "M8 3v4 M16 3v4 M4 9h16 M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z M8 13h3 M8 16h3",
    review: "M8 4h12v16H8z M4 8v12h12 M11 10h6 M11 14h3 M11 17l1.5 1.5L16 15",
    filter: "M4 5h16l-6.5 7.5v5l-3 1.5v-6.5z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {referenceIcons[name] || <path d={paths[name] || paths.grid} />}
    </svg>
  );
}
function Status({ value, label }: { value: unknown; label?: string }) {
  const status = s(value);
  const icon = ["approved", "issued", "paid", "closed", "online", "accepted"].includes(status)
    ? "check"
    : ["cancelled", "rejected"].includes(status)
      ? "close"
      : ["review", "approval", "appealed", "pending", "draft"].includes(status)
        ? "clock"
        : "alert";
  return (
    <span className={`status status-${status}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/>{icon === "check" ? <path d="m9 12 2 2 4-4"/> : icon === "clock" ? <path d="M12 6v6l4 2"/> : icon === "close" ? <path d="m9 9 6 6m0-6-6 6"/> : <path d="M12 8v4m0 4h.01"/>}</svg>
      <span>{label || statusNames[status] || status}</span>
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
  action,
}: {
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name="cases" />
      <h3>السجل خالٍ</h3>
      <p>{children}</p>
      {action && <div className="empty-action">{action}</div>}
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
      <span><span id={`${fieldId}-label`}>{label}</span>{React.isValidElement(children) && (children.props as {required?: boolean}).required && <span className="required-mark" aria-hidden="true">*</span>}</span>
      {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{id:string;'aria-labelledby':string;'aria-describedby'?:string}>, {id:fieldId,'aria-labelledby':`${fieldId}-label`,'aria-describedby':hint ? `${fieldId}-hint` : undefined}) : children}
      {hint && <small id={`${fieldId}-hint`}>{hint}</small>}
    </label>
  );
}
function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="brand">
      <svg className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`} viewBox="0 0 96 96" role="img" aria-label="شعار رَصد">
        <rect width="96" height="96" rx="18" fill="#FFFFFF" />
        <circle cx="48" cy="48" r="22" fill="none" stroke="#14513F" strokeWidth="8" strokeDasharray="108 30" transform="rotate(-6 48 48)" />
        <circle cx="63.6" cy="32.4" r="7" fill="#C9A24B" />
        <circle cx="48" cy="48" r="5" fill="#14513F" />
      </svg>
      <div>
        <strong>رَصد</strong>
        <span>المخالفات والسلامة المرورية</span>
      </div>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (v: Session) => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
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
        <Brand inverse />
        <div>
          <h1>قضية موثَّقة من التسجيل حتى الإغلاق</h1>
          <p>نظام إدارة المخالفات المرورية</p>
        </div>
        <aside className="login-disclosure" aria-label="تنبيه بيئة التقييم">الدفع والأجهزة والإشعارات في هذه النسخة محاكاة. منصة تقييم مستقلة.</aside>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <div className="login-intro">
            <h2>تسجيل الدخول</h2>
            <p className="muted">أدخل بيانات حسابك للمتابعة.</p>
          </div>
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
            <div className="field">
              <label htmlFor={passwordId}>كلمة المرور <span className="required-mark" aria-hidden="true">*</span></label>
              <span className="password-entry">
              <input
                id={passwordId}
                name="password"
                aria-label="كلمة المرور"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
              />
                <button type="button" className="password-toggle" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}><Icon name="eye" /></button>
              </span>
            </div>
            <details className="otp-disclosure">
              <summary>لدي رمز تحقق إضافي</summary>
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
            </details>
            <button className="primary wide" disabled={busy}>
              {busy ? "جارٍ التحقق…" : "متابعة"}
            </button>
          </form>
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
    [recent, setRecent] = useState<Row[]>([]),
    [recentAudit, setRecentAudit] = useState<Row[]>([]);
  const statusRows = [...(data?.by_status || [])].sort((a, b) => b.total - a.total);
  const topStatusCount = Math.max(1, ...statusRows.map((row) => row.total));
  const offlineCameras = data
    ? Math.max(0, data.cameras_total - data.cameras_online)
    : 0;
  useEffect(() => {
    let live = true;
    Promise.all([
      session.role === "citizen"
        ? Promise.resolve(null)
        : api<DashboardData>("dashboard/"),
      api<Page>("cases/?page_size=5"),
      ["admin", "auditor"].includes(session.role)
        ? api<Page>("audit/?page_size=4").catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([d, c, audit]) => {
        if (live) {
          setData(d);
          setRecent(c.results);
          setRecentAudit(audit?.results || []);
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
          <h1>
            {session.role === "citizen"
              ? "متابعة ملفاتك المرورية"
              : "لوحة المعلومات"}
          </h1>
          <p>
            {session.role === "citizen"
              ? "تابع حالة المخالفات والاعتراضات المرتبطة بحسابك."
              : "ملخص نشاط المخالفات"}
          </p>
        </div>
        <div className="dashboard-date-range" aria-label="النطاق الزمني للبيانات">
          <span>جميع السجلات المتاحة</span>
        </div>
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
                <span>حالة محاكي الرصد</span>
                <strong>
                  {data.cameras_online.toLocaleString("ar")}
                  <em> / {data.cameras_total.toLocaleString("ar")}</em>
                </strong>
                <small>أجهزة تجريبية متصلة</small>
              </article>
              <article>
                <span>إشعارات بانتظار المعالجة</span>
                <strong>{data.pending_outbox.toLocaleString("ar")}</strong>
                <small>محاكاة؛ بلا إرسال خارجي</small>
              </article>
            </section>
            <section className="dashboard-analytics" aria-label="تحليلات الملفات وأجهزة الرصد">
              <section className="panel ranked-panel">
                <div className="panel-heading">
                  <div><h2>توزيع ملفات المخالفات حسب الحالة</h2></div>
                </div>
                {statusRows.length ? (
                  <ol className="ranked-list" aria-label="عدد الملفات حسب الحالة">
                    {statusRows.map((row) => (
                      <li className="ranked-row" key={row.status}>
                        <span className="rank-label">{statusNames[row.status] || row.status}</span>
                        <span className="rank-track" aria-hidden="true"><i style={{ width: `${Math.round((row.total / topStatusCount) * 100)}%` }} /></span>
                        <strong className="rank-value">{row.total.toLocaleString("ar")}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="ranked-empty">
                    <div><strong>لا توجد ملفات في السجل بعد</strong><p>سيظهر توزيع الحالات هنا عند توفر سجلات فعلية في هذه البيئة.</p></div>
                    <button className={session.role === "registrar" ? "primary" : "secondary"} onClick={() => go("cases")}>{session.role === "registrar" ? "تسجيل مخالفة" : "عرض ملفات المخالفات"} <Icon name="arrow" /></button>
                  </div>
                )}
              </section>
              <section className="panel ranked-panel device-panel">
                <div className="panel-heading">
                  <div><h2>حالة أجهزة الرصد</h2></div>
                </div>
                {data.cameras_total > 0 ? (
                  <ol className="ranked-list device-rankings" aria-label="حالة أجهزة الرصد التجريبية">
                    {[{ label: "متصلة", amount: data.cameras_online, status: "online" }, { label: "غير متصلة", amount: offlineCameras, status: "offline" }].map((entry) => (
                      <li className={`ranked-row ${entry.status}`} key={entry.status}>
                        <span className="rank-label">{entry.label}</span>
                        <span className="rank-track" aria-hidden="true"><i style={{ width: `${Math.round((entry.amount / data.cameras_total) * 100)}%` }} /></span>
                        <strong className="rank-value">{entry.amount.toLocaleString("ar")}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="ranked-empty device-empty">
                    <div><strong>لا توجد أجهزة في السجل</strong><p>٠ من ٠ — لا توجد بيانات اتصال ميداني.</p></div>
                  </div>
                )}
              </section>
            </section>
            <div className="dashboard-collection-summary">
              <span>مبالغ السداد المسجلة</span>
              {data.collected.length ? data.collected.map((row) => <strong key={row.currency}>{row.total} <small>{row.currency}</small></strong>) : <strong className="collection-none">لا توجد مبالغ مسجلة</strong>}
              {["admin", "finance", "auditor"].includes(session.role) && <button className="text-button" onClick={() => go("payments")}>عرض سجل السداد <Icon name="arrow" /></button>}
            </div>
          </>
        )
      )}
      <section className={`dashboard-lower-grid ${["admin", "auditor"].includes(session.role) ? "has-audit" : ""}`}>
      <section className="panel recent-cases-panel">
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
      {["admin", "auditor"].includes(session.role) && (
        <section className="panel audit-excerpt">
          <div className="panel-heading">
            <div><p className="eyebrow">أثر موثق</p><h2>آخر الإجراءات</h2></div>
            <button className="text-button" onClick={() => go("audit")}>سجل التدقيق <Icon name="arrow" /></button>
          </div>
          {loading ? <Loading /> : recentAudit.length ? (
            <ol className="audit-list">
              {recentAudit.map((event) => (
                <li key={event.id}>
                  <span className="audit-event-mark" aria-hidden="true"><Icon name="audit" /></span>
                  <div><strong>{auditActionName(s(event.action))}</strong><small>{auditExcerptActor(event.actor_username)} <span>·</span> {dateValue(event.created_at)}</small></div>
                </li>
              ))}
            </ol>
          ) : <div className="audit-empty"><span aria-hidden="true">—</span><p>لا توجد إجراءات مدونة بعد.</p></div>}
        </section>
      )}
      </section>
    </>
  );
}
function CaseTable({
  rows,
  go,
  emptyMessage = "لا توجد ملفات مسجلة بعد.",
  emptyAction,
  density = "comfortable",
}: {
  rows: Row[];
  go: (p: string) => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  density?: "comfortable" | "compact";
}) {
  return rows.length ? (
    <>
      <div
        className={`table-wrap case-table ${density === "compact" ? "is-compact" : ""}`}
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
      <div className={`case-cards ${density === "compact" ? "is-compact" : ""}`} role="list" aria-label="ملفات المخالفات">
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
    <Empty action={emptyAction}>{emptyMessage}</Empty>
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
    ["attachments", "المستندات"],
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
    ["sequence", "رقم التسلسل"],
    ["action", "الإجراء"],
    ["target", "الأثر المرتبط"],
    ["actor", "المنفذ"],
    ["created_at", "التاريخ"],
    ["digest", "بصمة التحقق"],
  ],
  notifications: [
    ["topic", "الموضوع"],
    ["payload", "التفاصيل"],
    ["created_at", "التاريخ"],
    ["delivered_at", "تاريخ التسليم"],
  ],
};
const resourceTitles: Record<string, string> = {
  review: "مراجعة القضايا",
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
  review: "افتح ملفات المخالفات المتاحة لدورك وتابع خطوة المراجعة أو الاعتماد المصرح بها.",
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
const auditActionLabels: Record<string, string> = {
  "session.login": "تسجيل الدخول",
  "session.logout": "تسجيل الخروج",
  "case.created": "تسجيل مخالفة",
  "case.review": "مراجعة ملف مخالفة",
  "case.approval": "إحالة للاعتماد",
  "case.approved": "اعتماد مخالفة",
  "case.issued": "إصدار وتبليغ مخالفة",
  "case.appealed": "تسجيل اعتراض",
  "case.paid": "تسجيل السداد",
  "case.closed": "إغلاق ملف مخالفة",
  "case.cancelled": "إلغاء مخالفة",
  "cases.export": "تصدير ملفات المخالفات",
  "evidence.ingested": "إرفاق دليل",
  "evidence.download": "تنزيل دليل",
  "evidence.package": "تصدير حزمة الأدلة",
  "receipt.read": "عرض إيصال سداد",
  "user.created": "إنشاء حساب مستخدم",
  "vehicle.created": "إضافة مركبة",
  "camera.created": "إضافة جهاز رصد تجريبي",
  "rule.created": "إضافة قاعدة تقييم",
  "device.simulated_observation": "محاكاة قراءة جهاز رصد",
  "legacy.import": "استيراد بيانات قديمة",
};
function auditActionName(action: string) {
  return auditActionLabels[action] || "إجراء تشغيلي مسجل";
}
function auditActorLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "حساب مستخدم غير متاح";
  return s(value);
}
function auditExcerptActor(value: unknown) {
  if (value === null || value === undefined || value === "") return "منفّذ غير محدد";
  return `المنفّذ: ${s(value)}`;
}
function auditTargetLabel(action: string, value: unknown) {
  if (action === "session.login" || action === "session.logout")
    return "جلسة مستخدم · غير مرتبطة بملف مخالفة";
  if (action === "cases.export") return "تصدير قائمة ملفات المخالفات · CSV";
  if (action === "legacy.import") return "عملية استيراد · مرجع تحقق داخلي";
  const category = action.split(".")[0];
  const labels: Record<string, string> = {
    case: "ملف مخالفة",
    evidence: "دليل مرفق",
    user: "حساب مستخدم",
    vehicle: "سجل مركبة",
    camera: "جهاز رصد تجريبي",
    rule: "قاعدة تقييم",
    receipt: "سجل إيصال",
    device: "عملية محاكاة جهاز",
  };
  if (category === "payment") return `سجل سداد · مرجع داخلي ${s(value)}`;
  return labels[category]
    ? `${labels[category]} · مرجع داخلي ${s(value)}`
    : `سجل مرتبط · مرجع داخلي ${s(value)}`;
}
function CopyDigest({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const digest = s(value);
  async function copy() {
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="audit-digest">
      <code dir="ltr">{digest === "—" ? digest : `${digest.slice(0, 12)}…`}</code>
      {digest !== "—" && <button type="button" className="copy-digest" aria-label="نسخ بصمة SHA-256 كاملة" onClick={() => void copy()}>{copied ? "تم النسخ" : "نسخ"}</button>}
      {digest !== "—" && <details><summary>عرض البصمة كاملة</summary><code dir="ltr">{digest}</code></details>}
    </div>
  );
}
function AuditCard({ row }: { row: Row }) {
  return (
    <article className="audit-card" role="listitem">
      <header><span className="audit-event-mark"><Icon name="audit" /></span><strong>{auditActionName(s(row.action))}</strong><time>{dateValue(row.created_at)}</time></header>
      <dl>
        <div><dt>المنفّذ</dt><dd>{auditActorLabel(row.actor_username)}</dd></div>
        <div><dt>الأثر</dt><dd>{auditTargetLabel(s(row.action), row.target)}</dd></div>
      </dl>
      <details className="audit-card-details">
        <summary>تفاصيل التتبع والبصمة</summary>
        <div className="audit-secondary"><span>التسلسل <b>{s(row.sequence)}</b></span><CopyDigest value={row.digest} /></div>
      </details>
    </article>
  );
}
function ResourceValue({
  resource,
  field,
  row,
  session,
  go,
  onReview,
}: {
  resource: string;
  field: string;
  row: Row;
  session: Session;
  go: (path: string) => void;
  onReview: (row: Row) => void;
}) {
  if (resource === "audit") {
    if (field === "action") return <>{auditActionName(s(row.action))}</>;
    if (field === "target") return <>{auditTargetLabel(s(row.action), row.target)}</>;
    if (field === "actor") return <>{auditActorLabel(row.actor_username)}</>;
    if (field === "digest") return <CopyDigest value={row.digest} />;
  }
  if (
    (field === "case_reference" ||
      (resource === "appeals" && field === "reference")) &&
    row.case
  )
    return (
      <button className="reference" onClick={() => go(`cases/${row.case}`)}>
        {s(row[field])}
      </button>
    );
  if (resource === "appeals" && field === "attachments") {
    const attachments = Array.isArray(row.attachments)
      ? (row.attachments as Row[])
      : [];
    return attachments.length ? (
      <ul className="appeal-attachments">
        {attachments.map((file) => (
          <li key={file.id}>
            <a href={`${ROOT}evidence/${file.id}/download/`}>
              <Icon name="cases" />
              {s(file.original_name)}
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <>لا توجد مرفقات</>
    );
  }
  if (field === "status") return <Status value={row[field]} />;
  if (field === "payload") return <NotificationPayload value={row[field]} go={go} />;
  if (field === "topic") return <>{notificationTopics[s(row[field])] || s(row[field])}</>;
  if (field === "role")
    return <>{roleNames[row[field] as keyof typeof roleNames] || s(row[field])}</>;
  if (field.endsWith("_at")) return <>{dateValue(row[field])}</>;
  if (resource === "users" && field === "is_active") return <Status value={row[field] ? "online" : "offline"} label={row[field] ? "نشط" : "غير نشط"} />;
  if (typeof row[field] === "boolean") return <>{row[field] ? "نعم" : "لا"}</>;
  if (resource === "appeals" && field === "status" && row.status === "pending" && session.role === "appeals")
    return <button className="secondary" onClick={() => onReview(row)}>مراجعة الاعتراض</button>;
  return <>{s(row[field])}</>;
}
function Resource({
  resource,
  session,
  go,
  reviewQueue = false,
}: {
  resource: string;
  session: Session;
  go: (p: string) => void;
  reviewQueue?: boolean;
}) {
  const [data, setData] = useState<Page | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(reviewQueue && session.role === "approver" ? "approval" : reviewQueue && session.role === "reviewer" ? "review" : ""),
    [density, setDensity] = useState<"comfortable" | "compact">("comfortable"),
    [create, setCreate] = useState(false),
    [revision, setRevision] = useState(0),
    [decision, setDecision] = useState<Row | null>(null),
    [selectedAppealId, setSelectedAppealId] = useState<string | number | null>(null);
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
  const selectedAppeal = resource === "appeals"
    ? data?.results.find(row => row.id === selectedAppealId) || data?.results[0]
    : undefined;
  const tableColumns: [string, string][] = resource === "appeals"
    ? [["reference", "رقم القضية"], ["created_at", "تاريخ التقديم"], ["status", "الحالة"]]
    : listColumns[resource];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{reviewQueue ? resourceTitles.review : resourceTitles[resource]}</h1>
          <p>{reviewQueue ? resourceDescriptions.review : resourceDescriptions[resource]}</p>
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
              {resource === "cases" ? "تسجيل مخالفة" : resource === "users" ? "إضافة مستخدم" : "إضافة سجل"}
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
      {reviewQueue && session.role === "reviewer" && (
        <div className="review-queue-block">
          <div className="review-tabs" role="group" aria-label="تصنيفات ملفات المراجعة">
            <button type="button" aria-pressed={status === "review"} className={status === "review" ? "is-active" : ""} onClick={() => { setStatus("review"); setPage(1); }}>بانتظار المراجعة</button>
            <button type="button" aria-pressed="false" aria-disabled="true" disabled title="لا يوجد تصنيف مستقل للأدلة الناقصة في بيانات النظام الحالية.">أدلة ناقصة</button>
            <button type="button" aria-pressed={status === "approval"} className={status === "approval" ? "is-active" : ""} onClick={() => { setStatus("approval"); setPage(1); }}>تمت مراجعتها</button>
          </div>
          <p className="review-tab-note" role="note">تصنيف «أدلة ناقصة» غير متاح كمرشح مستقل في البيانات الحالية. يعرض تبويب «تمت مراجعتها» الملفات المحالة إلى الاعتماد بعد فحص الأدلة.</p>
        </div>
      )}
      {reviewQueue && session.role === "approver" && <div className="review-queue-note"><Icon name="review" /><span><strong>قائمة الاعتماد</strong><small>الملفات المحالة بعد مراجعة الأدلة.</small></span></div>}
      <div className={resource === "appeals" ? "appeals-layout" : undefined}>
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
              <span className="search-input"><Icon name="search" /><input
                aria-label="البحث في السجلات"
                placeholder={
                  resource === "cases"
                    ? "ابحث برقم الملف أو اللوحة أو الموقع…"
                    : "البحث في السجلات…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              /></span>
              <button className="secondary" type="submit">
                بحث
              </button>
            </form>
          )}
          {resource === "cases" && (
            <label className="status-filter">
              <Icon name="filter" />
              <span>تصفية</span>
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
            </label>
          )}
          {reviewQueue && <div className="density-control" role="group" aria-label="كثافة عرض الجدول"><span>كثافة العرض</span><button type="button" className={density === "comfortable" ? "is-active" : ""} aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}>مريح</button><button type="button" className={density === "compact" ? "is-active" : ""} aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>مضغوط</button></div>}
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
          <CaseTable
            rows={data?.results || []}
            go={go}
            density={density}
            emptyMessage={search || status
              ? "لا توجد ملفات تطابق البحث والحالة المحددين."
              : session.role === "registrar"
                ? "ابدأ مسار المعالجة بتسجيل أول ملف. ستبقى جميع الخطوات ضمن بيئة التقييم."
                : session.role === "citizen"
                  ? "لا توجد ملفات مرتبطة بحسابك حاليًا."
                  : "لا توجد ملفات متاحة ضمن نطاق الجهة. إذا كنت تتوقع ظهور ملفات، راجع مسؤول الجهة أو مسجل المخالفات."}
            emptyAction={search || status
              ? <button className="secondary" onClick={() => { setQuery(""); setSearch(""); setStatus(""); setPage(1); }}>مسح عوامل البحث</button>
              : session.role === "registrar"
                ? <button className="primary" onClick={() => setCreate(true)}><Icon name="plus" /> تسجيل أول مخالفة</button>
                : session.role === "citizen"
                  ? <button className="secondary" onClick={() => go("dashboard")}>العودة لمتابعة ملفاتك</button>
                  : undefined}
          />
        ) : data?.results.length ? (
          <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {tableColumns.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  {resource === "appeals" && (
                    <th>الإجراء</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row.id} className={resource === "appeals" && selectedAppeal?.id === row.id ? "is-selected" : undefined}>
                    {tableColumns.map(([key]) => (
                      <td
                        key={key}
                        className={key === "digest" ? "digest" : ""}
                      >
                        <ResourceValue resource={resource} field={key} row={row} session={session} go={go} onReview={setDecision} />
                        {resource === "appeals" && key === "reference" && Array.isArray(row.attachments) && row.attachments.length > 0 && <div className="appeal-row-attachments"><ResourceValue resource={resource} field="attachments" row={row} session={session} go={go} onReview={setDecision}/></div>}
                      </td>
                    ))}
                    {resource === "appeals" && (
                      <td>
                        <div className="appeal-row-actions">
                        <button className="text-button" onClick={() => setSelectedAppealId(row.id)} aria-label={`تفاصيل الاعتراض ${s(row.reference)}`} aria-pressed={selectedAppeal?.id === row.id}>التفاصيل <Icon name="chevron"/></button>
                        {row.status === "pending" && session.role === "appeals" && (
                          <button
                            className="secondary"
                            onClick={() => setDecision(row)}
                          >
                            مراجعة الاعتراض
                          </button>
                        )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`resource-cards ${resource === "audit" ? "audit-cards" : ""}`} role="list" aria-label={resourceTitles[resource]}>
            {resource === "audit" ? data.results.map((row) => <AuditCard key={row.id} row={row} />) : data.results.map((row) => (
              <article className="resource-card" role="listitem" key={row.id}>
                <dl>
                  {listColumns[resource].map(([field, label]) => (
                    <div key={field}>
                      <dt>{label}</dt>
                      <dd className={field === "digest" ? "digest" : undefined}>
                        <ResourceValue resource={resource} field={field} row={row} session={session} go={go} onReview={setDecision} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {resource === "appeals" && session.role === "appeals" && row.status === "pending" && (
                  <button className="secondary" onClick={() => setDecision(row)}>مراجعة الاعتراض</button>
                )}
              </article>
            ))}
          </div>
          </>
        ) : (
          <Empty action={
            ["appeals", "payments"].includes(resource)
              ? <button className="secondary" onClick={() => go("cases")}>فتح ملفات المخالفات <Icon name="arrow" /></button>
              : canCreate(resource, session)
                ? <button className="primary" onClick={() => setCreate(true)}><Icon name="plus" /> إضافة أول سجل</button>
                : undefined
          }>
            {resource === "appeals"
              ? session.role === "appeals"
                ? "لا توجد اعتراضات بانتظار اللجنة. عند ورود طلب جديد، ستظهر بياناته هنا ويمكن فتح ملف المخالفة المرتبط به."
                : "تظهر الاعتراضات بعد تقديمها من ملف مخالفة مبلّغ. لا يمكن إنشاء اعتراض من هذا السجل مباشرة."
              : resource === "payments"
                ? session.role === "finance"
                  ? "لا توجد تسويات مسجلة. بعد التحقق الخارجي من السداد، افتح ملفًا مبلّغًا لتسجيل التسوية؛ لا تجمع المنصة بيانات البطاقات."
                  : session.role === "citizen"
                    ? "لا توجد مبالغ مرتبطة بحسابك. إذا كان لديك ملف مبلّغ، افتحه للاطلاع على خيارات المتابعة المتاحة في بيئة التقييم."
                    : "لا توجد قيود سداد في سجلات الجهة. أي تسوية جديدة يجب أن تُسجّل من ملف مبلّغ وبعد التحقق الخارجي منها."
                : canCreate(resource, session)
                  ? "ابدأ بإضافة أول سجل باستخدام الإجراء أعلاه."
                  : "ستظهر السجلات هنا عند توفرها ضمن صلاحياتك."}
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
      {selectedAppeal && !busy && !error && (
        <aside className="panel appeal-detail-panel" aria-label="تفاصيل الاعتراض المحدد">
          <header><button className="reference" onClick={() => go(`cases/${selectedAppeal.case}`)}>{s(selectedAppeal.reference)}</button><Status value={selectedAppeal.status}/></header>
          <div><h3>سبب الاعتراض</h3><p className="appeal-reason">{s(selectedAppeal.reason)}</p></div>
          <div className="appeal-document-box"><Icon name="cases"/><div><h3>المستندات المؤيدة</h3><ResourceValue resource="appeals" field="attachments" row={selectedAppeal} session={session} go={go} onReview={setDecision}/></div></div>
          <dl className="appeal-facts"><div><dt>تاريخ التقديم</dt><dd>{dateValue(selectedAppeal.created_at)}</dd></div>{selectedAppeal.decision_reason ? <div><dt>أسباب القرار</dt><dd>{s(selectedAppeal.decision_reason)}</dd></div> : null}</dl>
          {selectedAppeal.status === "pending" && session.role === "appeals" && <><p className="subtle">يُسجّل القرار المسبّب في سجل التدقيق.</p><button className="primary wide" onClick={() => setDecision(selectedAppeal)}>مراجعة الاعتراض</button></>}
        </aside>
      )}
      </div>
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
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const files = data
                    .getAll("attachments")
                    .filter((item): item is File => item instanceof File && item.size > 0);
                  if (files.length > 5) {
                    setError("يمكن إرفاق خمسة مستندات كحد أقصى.");
                    return;
                  }
                  if (files.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) {
                    setError("إجمالي المرفقات لا يتجاوز 25 ميجابايت.");
                    return;
                  }
                  void mutate("appeals", data, "تم تسجيل الاعتراض للمراجعة.", form);
                }}
              >
                <Field label="سبب الاعتراض">
                  <textarea name="reason" rows={4} required minLength={5} />
                </Field>
                <Field label="المستندات المؤيدة" hint="اختياري: PDF أو JPEG أو PNG، حتى 10 ميجابايت لكل ملف وخمسة ملفات (25 ميجابايت إجمالًا).">
                  <input
                    name="attachments"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    multiple
                  />
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
  useEffect(() => {
    if (!menu) return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>("#primary-navigation nav button")?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        document.getElementById("mobile-nav-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menu]);
  const go = useCallback((v: string) => {
    window.location.hash = v;
  }, []);
  if (loading)
    return (
      <>
        <Loading />
      </>
    );
  if (!session)
    return (
      <>
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
    viewResource = resource === "review" ? "cases" : resource,
    authorized = nav.some((x) => x.id === resource);
  const managementResources = ["cameras", "rules", "users", "audit"];
  const navGroups = [
    { title: "العمليات", items: nav.filter(item => !managementResources.includes(item.id)) },
    { title: "الإدارة", items: nav.filter(item => managementResources.includes(item.id)) },
  ];
  return (
    <>
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
        {menu && <button className="sidebar-scrim" aria-label="إغلاق القائمة" onClick={() => { setMenu(false); document.getElementById("mobile-nav-toggle")?.focus(); }} />}
        <aside id="primary-navigation" className={`sidebar ${menu ? "is-open" : ""}`}>
          <Brand />
          <nav aria-label="التنقل الرئيسي">
            {navGroups.map(group => group.items.length > 0 && (
              <React.Fragment key={group.title}>
                <div className="nav-group-label">{group.title}</div>
                {group.items.map((item) => (
              <button
                key={item.id}
                className={resource === item.id ? "active" : ""}
                aria-label={item.label}
                title={item.label}
                onClick={() => {
                  go(item.id);
                  setMenu(false);
                }}
                aria-current={resource === item.id ? "page" : undefined}
              >
                <Icon name={item.id} />
                {item.label}
                {resource === item.id && <i />}
              </button>
                ))}
              </React.Fragment>
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
              id="mobile-nav-toggle"
              className="mobile-toggle secondary"
              aria-label="فتح أو إغلاق القائمة"
              aria-expanded={menu}
              aria-controls="primary-navigation"
              onClick={() => setMenu((v) => !v)}
            >
              <Icon name="menu" /> <span>القائمة</span>
            </button>
            <div className="topbar-context">
              <div className="breadcrumb">
                <span>الرئيسية</span> <Icon name="chevron" /> <strong>{resource === "dashboard" ? "لوحة المعلومات" : resourceTitles[resource] || "لوحة المعلومات"}</strong>
              </div>
            </div>
            <div className="topbar-end">
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
                resource={viewResource}
                session={session}
                go={go}
                reviewQueue={resource === "review"}
              />
            )}
          </main>
          <footer className="workspace-footer">
            <span>رَصد · منصة إدارة المخالفات والسلامة المرورية</span>
            <span>{session.agency_name} · بيئة تقييم مستقلة — غير معتمدة للإنفاذ الفعلي{session.simulation ? " · الدفع والأجهزة والإشعارات محاكاة" : ""}</span>
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
