import { test, expect, type Page } from "@playwright/test";

const password = process.env.DEMO_PASSWORD;
test.skip(
  !password,
  "Set DEMO_PASSWORD for synthetic accounts in a disposable evaluation backend.",
);
async function login(page: Page, role: string) {
  if (await page.getByRole("button", { name: "تسجيل الخروج" }).count())
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await page.getByLabel("اسم المستخدم", { exact: true }).fill(`demo.${role}`);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "الدخول إلى المنصة" }).click();
  await expect(page.locator(".sidebar-bottom strong")).toHaveText(
    `demo.${role}`,
  );
}
async function openCase(page: Page, id: string) {
  await page.goto(`/#cases/${id}`);
  await expect(page.locator(".case-title")).toBeVisible();
}
async function transition(page: Page, action: string) {
  await page.locator('select[name="action"]').selectOption(action);
  await page
    .locator('.action-panel textarea[name="reason"]')
    .fill("إجراء تقييم آلي على بيانات صناعية فقط");
  await page.getByRole("button", { name: "تأكيد الإجراء" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "تم تحديث حالة الملف." }),
  ).toBeVisible();
  await expect(
    page.locator(`select[name="action"] option[value="${action}"]`),
  ).toHaveCount(0);
}
test("real case lifecycle, evidence, separated duties, appeal, simulated payment and audit", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "تسجيل الدخول", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "تنبيه بيئة التقييم" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("login-desktop.png"),
    fullPage: true,
  });
  await login(page, "registrar");
  await expect(
    page.getByRole("navigation").getByText("إدارة المستخدمين"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "ملفات المخالفات", exact: true })
    .click();
  await page.getByRole("button", { name: "تسجيل مخالفة", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('select[name="vehicle"] option')).not.toHaveCount(
    1,
  );
  await dialog.locator('select[name="vehicle"]').selectOption({ index: 1 });
  await dialog.locator('select[name="rule"]').selectOption({ index: 1 });
  await dialog.getByLabel("مرجع المصدر الفريد").fill(`e2e-${Date.now()}`);
  await dialog
    .getByLabel("موقع المخالفة")
    .fill("موقع اختبار آلي — بيانات صناعية");
  await dialog.getByLabel("تاريخ ووقت الواقعة").fill("2026-01-01T12:00");
  await dialog.getByRole("button", { name: "حفظ السجل" }).click();
  await expect(dialog).not.toBeVisible();
  await page.locator(".reference").first().click();
  const id = page.url().split("/").at(-1)!;
  const reference = await page.locator(".case-title").textContent();
  const fixture = await page.screenshot();
  await page
    .locator('input[name="file"]')
    .setInputFiles({
      name: "synthetic-evaluation-screenshot.png",
      mimeType: "image/png",
      buffer: fixture,
    });
  await page
    .getByLabel("مصدر الدليل")
    .fill("لقطة تطبيق اختبار صناعية — ليست دليلًا ميدانيًا");
  await page.getByLabel("وقت التقاط الدليل").fill("2026-01-01T12:00");
  await page.getByRole("button", { name: "رفع الدليل", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "تم إرفاق الدليل" }),
  ).toBeVisible();
  await expect(
    page.getByText("synthetic-evaluation-screenshot.png"),
  ).toBeVisible();
  await transition(page, "submit");
  await login(page, "reviewer");
  await openCase(page, id);
  await transition(page, "review");
  await login(page, "approver");
  await openCase(page, id);
  await transition(page, "approve");
  await expect(
    page.locator('select[name="action"] option[value="issue"]'),
  ).toHaveCount(1);
  await transition(page, "issue");
  await login(page, "citizen");
  await openCase(page, id);
  await expect(page.locator(".case-title")).toHaveCSS("white-space", "nowrap");
  await expect(
    page.getByRole("navigation").getByText("أجهزة الرصد"),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "تنزيل", exact: true }).click();
  expect((await download).suggestedFilename()).toContain(
    "synthetic-evaluation",
  );
  await page
    .getByLabel("سبب الاعتراض", { exact: true })
    .fill("اعتراض صناعي للتحقق من مسار المراجعة");
  await page
    .getByRole("button", { name: "إرسال الاعتراض", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "تم تسجيل الاعتراض" }),
  ).toBeVisible();
  await login(page, "appeals");
  await page.getByRole("button", { name: "الاعتراضات", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: reference! })
    .getByRole("button", { name: "مراجعة الاعتراض" })
    .click();
  await page.getByLabel("القرار", { exact: true }).selectOption("rejected");
  await page
    .getByLabel("أسباب القرار")
    .fill("رفض الاعتراض الصناعي لاستكمال اختبار السداد");
  await page.getByRole("button", { name: "تثبيت القرار" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await login(page, "citizen");
  await openCase(page, id);
  await page.getByRole("button", { name: /تنفيذ محاكاة سداد/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "تم تسجيل سداد محاكى" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "عرض الإيصال" }).click();
  await expect(
    page.getByRole("heading", { name: "إيصال محاكاة — ليس دفعًا حقيقيًا" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("case-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("case-mobile.png"),
    fullPage: true,
  });
  const caseOverflow = await page.evaluate(() => ({
    screen: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(caseOverflow.document).toBeLessThanOrEqual(caseOverflow.screen);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "finance");
  await openCase(page, id);
  await transition(page, "close");
  await login(page, "auditor");
  await page.getByRole("button", { name: "سجل التدقيق", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.getByRole("button", { name: "نظرة عامة", exact: true }).click();
  await expect(page.locator(".metrics")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("dashboard-mobile.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("list", { name: "ملفات المخالفات" }),
  ).toBeVisible();
  await expect(page.locator(".table-wrap")).toBeHidden();
  const dashboardOverflow = await page.evaluate(() => ({
    screen: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dashboardOverflow.document).toBeLessThanOrEqual(dashboardOverflow.screen);
  expect(browserErrors).toEqual([]);
});
