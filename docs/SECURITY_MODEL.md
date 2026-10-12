# نموذج الأمان والتهديدات
هدف التصميم OWASP ASVS 5.0 L2؛ حماية الأدلة والمال وإدارة الهوية تتطلب تقييم L3 مستقل. هذه ليست شهادة امتثال.
المراجع: [ASVS](https://owasp.org/www-project-application-security-verification-standard/)، [API Security](https://owasp.org/www-project-api-security/)، [NIST CSF 2.0](https://www.nist.gov/cyberframework).

| تهديد | الضبط المنفذ | التحقق/المتبقي |
|---|---|---|
| IDOR بين جهات/مواطنين | query جهة + owner snapshot + FK scoped | اختبارات 404 وعزل الربط |
| CSRF/session fixation | Django CSRF بما فيه login، session rotation، logout فعلي | اختبارات cookie/CSRF |
| سرقة حساب | password hashing، rate limits، TOTP encrypted، رفض replay | إنتاج يفرض MFA؛ لا recovery آلي بعد |
| تزوير اعتماد | أدوار منفصلة + منع creator/reviewer من الاعتماد | يحتاج حوكمة provision ومراقبة مسؤول الهوية |
| تغيير دليل | SHA256 عند المراجعة والإصدار والتنزيل، append-only metadata، custody | ملفات محلية ليست WORM؛ malware scanning وredaction لم ينفذا |
| ملف نشط خبيث | حجم10MiB، magic والتحقق من الصورة، attachment/octet-stream، nosniff | PDF validation ليست فحص برمجيات خبيثة؛ قبل الإنتاج اعزل وافحص |
| دفع مكرر/سباق | قفل Case + unique reference/key + مطابقة amount/currency | اختبار تزامن PostgreSQL؛ لا بوابة مالية حقيقية |
| تزوير التدقيق | hash chain + قفل متسلسل + trigger | DBA يستطيع إعادة البناء؛ anchor خارجي مطلوب |
| SSRF من كاميرا | لا قبول URL/RTSP عشوائي؛ simulator لا شبكة خارجية | الشبكة والأجهزة الفعلية تحتاج allowlist/mTLS |
| تسريب أسرار | env، MFA Fernet، لا tokens في localStorage، لا public media | خزنة مفاتيح وتدوير وإدارة وصول التشغيل |

الإنتاج يرفض الإقلاع دون PostgreSQL/Redis/مفتاح قوي/MFA encryption key أو مع simulation/debug.
TLS عند reverse proxy موثوق؛ لا تثق بX-Forwarded-* من الإنترنت مباشرة. قاعدة البيانات وشبكة الأدلة غير معلنتين.
تحديد المعدل في الذاكرة للتطوير فقط؛ Redis للإنتاج. إضافة edge rate limit قبل الإنترنت مطلوبة.
مدة جلسة30 دقيقة منذ login، cookie HttpOnly/SameSite Lax/Secure في الإنتاج.
المنصة لا تجمع بيانات بطاقات. تسجيل التحصيل يتطلب مرجعًا يتحقق منه موظف المالية خارج النظام؛ المحاكاة موسومة ومعطلة في الإنتاج.
CSF: Govern (ملكية مخاطر/اعتمادات)، Identify (حصر أصول/تهديدات)، Protect (ضوابط أعلاه)، Detect (audit/alerts مستقبلية)، Respond (runbook)، Recover (restore drill).
المتبقي: independent pentest/DAST، OIDC حكومي، recovery MFA، ABAC إقليمي، فصل حساب migrator/runtime، S3 Object Lock، DLP/AV، قرارات احتفاظ وحذف قانونية. لا تشغيل ببيانات مواطنين حقيقية قبل هذه البوابات.

