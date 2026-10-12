# استراتيجية الاختبار
الاختبارات تستعمل قواعد مؤقتة وبيانات صناعية فقط. لا توجيه DATABASE_URL إلى الإنتاج؛ Django ينشئ test_ database.
`python manage.py test`: unit + API integration + authorization + evidence + finance + appeals + import + MFA + outbox.
PostgreSQL مطلوب لتفعيل اختبارات أقفال التزامن وtrigger append-only. SQLite لا يثبتها.
`python manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn`: عقد OpenAPI مشتق من serializers/actions.
Frontend: build/typecheck وVitest وPlaywright على backend حقيقي. لا mocks في التطبيق؛ mocks في unit tests فقط لعزل fetch.
CI يعيد PostgreSQL tests والبناء وتدقيق التبعيات. لا يعد CI اختبار HA أو اعتماد قانوني.

| المتطلب | الاختبار |
|---|---|
| TEN-01 | cross_tenant_case_is_not_found / cross_tenant_foreign_key_rejected / citizen_cannot_see_draft_or_other_owner |
| ENF-01/02 | full_review_payment_and_close / separation_of_duties_survives_role_change / stale_version_and_missing_evidence / source_deduplication |
| EVD-01 | evidence_integrity_and_download_custody / executable_upload_rejected / evidence_cross_tenant_and_citizen_protection |
| FIN-01 | payment_amount_and_currency_must_match / simultaneous_payment_replay_has_one_ledger_entry / simulation_disabled |
| APP-01 | appeal_acceptance_and_no_payment / rejected_appeal_allows_settlement / expired_appeal |
| ID-01 | unauthenticated_and_csrf / mfa_required_and_replay |
| OPS-01 | import_dry_run_and_repeat_safety / import_bad_owner_rolls_back / backup_restore drill |

الحمل: scripts/benchmark.py يقيس قائمة الصفحات authenticated بحجم محدد؛ النتائج تقيس الجهاز والبيئة المذكورين فقط. اختبار مليون سجل وfailover وWAF/DAST مستقل لم يُنجز.

