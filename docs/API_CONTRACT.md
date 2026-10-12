# Frontend/API contract
All URLs /api/v1/ trailing slash. JSON. Cookie session credentials same-origin. GET auth/csrf/ -> {csrfToken}; send X-CSRFToken on unsafe requests; refresh token after login. GET auth/session/ -> {id,username,role,agency,agency_name,simulation}; unauthenticated 403. POST auth/login/ {username,password,otp?} -> session. POST auth/logout/ {}.
Roles: admin, registrar, reviewer, approver, finance, appeals, auditor, citizen (single role).
GET dashboard/ -> {total,by_status:[{status,total}],collected:[{currency,total}],cameras_online,cameras_total,pending_outbox}.
Paginated resources GET vehicles/, cameras/, rules/, cases/, appeals/, payments/, audit/, notifications/, users/ -> {count,next,previous,results}. page_size=20 max100. All tenant scoped; citizen sees own issued/appealed/paid/closed/cancelled cases only, own vehicles, appeals, payments, notifications; no users/cameras/rules/audit.
POST vehicles/ {plate,country,region,model,color,owner:<user id>} admin/registrar only. User choice from users/ restricted list in tenant. IDs are UUID except user integer.
POST cameras/ {code,location,latitude?,longitude?,status:'offline',adapter:'simulator'} admin only. GET status available staff. Do not pretend live streams.
POST rules/ {code,title,amount:'100.00',currency:'XXX',appeal_days:30,active:true} admin only. Rules are configurable demo policy, not legislation.
POST cases/ {vehicle:<uuid>,rule:<uuid>,camera:<uuid|null>,source_ref:<unique string>,location,occurred_at:ISO,notes} registrar only; amounts snapshot from rule, not client.
Case fields: id,reference,vehicle,plate,rule,rule_title,camera,location,occurred_at,status,amount,currency,version,notes,created_at,created_by,reviewed_by,approved_by,issued_at,appeal_deadline, evidence:[{id,sha256,original_name,size,created_at,content_type}], history:[{id,from_status,to_status,reason,created_at,actor}], allowed_actions:string[].
GET cases/{uuid}/ detail includes evidence/history, list may include them too.
POST cases/{id}/transition/ {action,version,reason}. Actions: submit draft->review (registrar), review review->approval (reviewer), approve approval->approved (approver), issue approved->issued (approver), cancel draft/review/approval/approved/issued->cancelled (approver; no payments/open appeal); close paid->closed (finance).
All require reason and correct version. Review and approval cannot be creator, approval cannot be reviewer. Issue requires evidence bytes hash verified and active owner.
POST cases/{id}/evidence/ multipart {file,source,captured_at} registrar/reviewer only before issue; accepts JPEG/PNG/PDF <=10MiB and validates magic, attachment download only.
GET evidence/{uuid}/download/ file attachment; citizen only own issued case evidence; audit custody recorded.
POST cases/{id}/appeals/ {reason} citizen own issued case within deadline. GET appeals/ fields id,case,reference,reason,status,decision_reason,created_at. POST appeals/{id}/decide/ {decision:'accepted'|'rejected',reason} appeals role only.
POST cases/{id}/payments/ {reference,amount,currency,idempotency_key} finance only records externally verified settlement (no card collection). Citizen can POST cases/{id}/simulate-payment/ {idempotency_key} ONLY if session.simulation true, clearly labelled sandbox; result not real payment.
GET payments/ fields id,case,reference,amount,currency,created_at,simulated.
GET cases/{id}/receipt/ -> {reference,case_reference,amount,currency,created_at,simulated}; browser print layout optional.
GET cases/export/ CSV authenticated staff excluding citizen, mitigates formula injection.
GET audit/ fields id,sequence,action,target,actor,created_at,digest; auditor/admin only.
GET notifications/ {id,topic,payload,created_at,delivered_at}; authenticated user's case messages.
POST users/ {username,password,role} admin within tenant, no public registration; no owner assignment to arbitrary foreign user.
Errors DRF JSON {detail:string} or field:[messages]; show Arabic generic fallback and exact error, never fake success.
No mock data in frontend. Empty states guide actions. Arabic labels map statuses and roles. Charts reflect API data, distinguish empty from error. Bootstrapping accounts via management seed command with environment supplied password, names demo.registrar/demo.reviewer/demo.approver/demo.finance/demo.appeals/demo.admin/demo.auditor/demo.citizen.

