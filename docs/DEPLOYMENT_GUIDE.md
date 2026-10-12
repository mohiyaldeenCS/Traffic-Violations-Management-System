# التشغيل والنشر
## محليًا
Python 3.14 وNode24 وPostgreSQL18 اختبرت في البيئة الحالية. PostgreSQL هو مسار الإنتاج؛ SQLite لتجربة سريعة.
من root:
```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
$env:SIMULATION_MODE='1'
$env:DEMO_PASSWORD='<choose a unique 12+ character test password>'
$env:CSRF_TRUSTED_ORIGINS='http://127.0.0.1:5173'
cd backend
..\.venv\Scripts\python manage.py migrate
..\.venv\Scripts\python manage.py seed_demo
..\.venv\Scripts\python manage.py runserver 127.0.0.1:8017
```
في terminal ثانٍ: `cd frontend; npm ci; npm run dev` ثم http://127.0.0.1:5173 .
الحسابات الصناعية demo.admin / demo.registrar / demo.reviewer / demo.approver / demo.finance / demo.appeals / demo.auditor / demo.citizen .
كلمة المرور من DEMO_PASSWORD وليست مثبتة في الكود. لا يعيد seed تعيين كلمات مرور موجودة.
.env.example مرجع؛ التطبيق لا يقرأ .env تلقائيًا. مرّر env من shell/مدير الأسرار. DATABASE_URL مثال `postgresql://user:encoded-password@host:5432/rasd`.

## حاويات تقييم
اضبط POSTGRES_PASSWORD وDJANGO_SECRET_KEY محليًا، ثم:
`docker compose build`
`docker compose up -d db redis`
`docker compose run --rm api python manage.py migrate`
`docker compose up -d`
ينشر web على loopback8080 فقط. لا توجد حسابات أو seed تلقائي. لا تستخدم إعداد development هذا على الإنترنت.
لتوليد demo مرر SIMULATION_MODE وDEMO_PASSWORD صراحة لأمر seed.
لإنشاء أول جهة/حساب دون محاكاة: `python manage.py provision_user --agency-code CODE --agency-name NAME --username USER --role admin --mfa`.
المفتاح MFA_ENCRYPTION_KEY بصيغة Fernet ويولد محليًا ويحفظ في خزنة؛ لا تضعه في Git.

## Linux / production gate
Gunicorn هو خادم Linux؛ Nginx يخدم frontend/dist ويحوّل /api/ إلى Gunicorn. لا تنشر legacy/ أو private-evidence/ كـweb root.
الإنتاج يتطلب APP_ENV=production، مفتاح Django>=50 حرفًا، PostgreSQL، Redis، MFA key، domains وCSRF origins صحيحة وTLS.
ضع API خلف proxy موثوق يزيل X-Forwarded-* من العميل ثم يضع X-Forwarded-Proto=https. فعّل TRUST_PROXY_HTTPS=1 فقط في هذه البنية المغلقة. لا تفتح منفذ API خارجيًا.
استخدم مستخدم runtime دون DDL وحساب migrator منفصل؛ volume أدلة خاص مع نسخ احتياطي/WORM لاحقًا.
لا يجري نشر production آليًا من CI. إصدار image، التراخيص، OIDC، AV، اختبارات اختراق وأحمال واستعادة وHA والموافقات القانونية بوابات إلزامية قبل الإطلاق الحقيقي.

## حدود النسخة
استعلام/دورة مخالفة/ملفات أصلية/اعتراض/تحصيل يدوي/inbox تعمل. التحصيل الآلي الحكومي، SMS، RTSP، ANPR فعلي، فيديو كبير، توقيع قضائي، S3 Object Lock، PDF/Excel server exports وGIS لم تُفعل. CSV وإيصال قابل للطباعة متاحان.

