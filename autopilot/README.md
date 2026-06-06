# NOLCOOL Autopilot (week1 / week2 / week3 공유 Worker)

24시간 무인 감시 + 안전 자동수정 Cloudflare Worker. **코드는 완비**되어 있고,
아래 **1회 설정**만 사용자가 직접 하면 가동됩니다 (보안상 토큰·로그인은 사용자만 가능).

설정 전 상태: **코드 완비 · 미가동**. 설정 후: 매일 09:00 KST 자동 실행.

---

## 무엇을 하는가
- **읽기 전용 라이브 점검** (사장님 수동 0):
  - 깨진 글자 범위스캔 `[㐀-䶿]` · 위험단어 · 다크패턴 문구
  - soft-404 (없는 경로가 200 반환하는지) · 놀쿨 메인 직결(200·무경유)
  - sitemap 도달 · 페이지 200 · (키 있으면) PSI 점수 / GSC
- **안전 자동수정만**: IndexNow 핑(크롤 유도) · Pages Deploy Hook 재배포(→ sitemap 재생성 + 빌드 게이트 재실행). *sitemap/디스커버리 이슈에 한정.*
- **절대 자동수정 안 함(알림만)**: 콘텐츠·결제·보안·깨진글자·위험단어·다크패턴·놀쿨링크 → 사람이 확인.
- **알림**: Resend(인증 도메인 발신) → theassetsquare@gmail.com, 제목 `[WEEK3-AUTOPILOT]` 태그, KV 중복제거(약 22h 자가청소).
- **빌드 게이트**(1~5단계 누적: 깨진글자·위험어·반복·스터핑·meta·soft-404·dead-end·고아·놀쿨직결·다크패턴)는 매 배포마다 `scripts/gen-card-copy.js`에서 상시 작동 — 이 Worker는 라이브 결과만 감시.

---

## 1회 설정 (사용자 — 약 10분, 한 번만)

```bash
cd autopilot

# ① Cloudflare 로그인 (1회, 브라우저)
wrangler login

# ② KV 네임스페이스 생성 → 출력된 id를 wrangler.toml의 REPLACE_WITH_KV_NAMESPACE_ID에 붙여넣기
wrangler kv namespace create AUTOPILOT_KV

# ③ 시크릿 등록 (값은 사용자만 입력)
wrangler secret put RESEND_API_KEY      # Resend API 키 (발신 도메인 인증 필요)
wrangler secret put ALERT_TO            # theassetsquare@gmail.com
wrangler secret put ALERT_FROM          # 예: autopilot@<인증도메인>
wrangler secret put DEPLOY_HOOK_WEEK3   # CF Pages > week3 > Settings > Deploy hooks 에서 생성한 URL
# (선택) 더 강력한 감시:
wrangler secret put INDEXNOW_KEY        # IndexNow 키(아무 32자 hex). + /<KEY>.txt 파일을 각 사이트 루트에 둘 것
wrangler secret put PSI_KEY             # PageSpeed Insights API 키 → CWV 점수 측정
wrangler secret put GSC_SA_JSON         # GSC 서비스계정 JSON → 색인/검색분석(확장 시)

# ④ 배포 (sites.json을 SITES var로 주입하며 배포)
wrangler deploy --var SITES:"$(node -e 'process.stdout.write(JSON.stringify(require(\"./sites.json\")))')"
```

수동 점검(테스트): 배포된 Worker URL에 `?run=1` → JSON 리포트 즉시 반환.

---

## week1 / week2 등록
`sites.json`의 week1·week2 항목 `base`/`repo`/`sitemap`을 실제 값으로 교체하고,
각 사이트 Deploy Hook을 `DEPLOY_HOOK_WEEK1` / `DEPLOY_HOOK_WEEK2` 시크릿으로 추가 후 재배포.

---

## 정직한 한계
- **PSI_KEY 미설정 시 CWV(LCP/INP/CLS) 수치 미측정**, **GSC_SA_JSON 미설정 시 실제 색인 상태·검색 분석 미측정** — 이 두 키가 없으면 해당 항목은 "확인 불가"로 계속 표시됩니다(가짜 값 생성 금지).
- GA4(체류시간/이탈률)는 선택. 설치 시 공통 푸터/`engage.js`에 gtag 1줄 추가하면 측정 가능(미설치 시 구조 신호만 100점).
- 실제 색인·순위 반영 시점은 Google 영역(보장 불가).
