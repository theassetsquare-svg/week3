# NOLCOOL Sub — Single Store Nightlife Site
## MUST
- DELETE all shared content pools! Write UNIQUE content for EACH venue! Time does not matter! SEO is #1!
- base: "/" ONLY. BrowserRouter ONLY. No # in URL
- Store name FIRST in title. No "놀쿨" in title!
- Keyword density 1.5-2.5% (1000c=5-7x, 2000c=8-12x)
- Logo "놀쿨" text: font-weight: 300 (thin/light). NOT bold! Thin = elegant = stands out!
CSS: .logo-text { font-weight: 300; letter-spacing: 0.05em; }
Only "놀쿨" word is thin. Other text stays normal weight.
Mobile: 16px font, 1.7 line-height, 44px touch
- useEffect cleanup ALL. persistSession:true. ErrorBoundary
- Bestseller writing. No AI text.
- All links open in new tab! target="_blank" rel="noopener noreferrer" Internal search ONLY

★★★ TITLE RULES — 서브사이트도 놀쿨 + 후킹! ★★★
Sub-site = same as main site! Just different content inside!
Sub-site purpose = drive traffic to main site!

Homepage title: "놀쿨 — unique hook" (each sub different hook!)
Sub-site looks like main site. Only content inside is different.

Example — 6 sub-sites, ALL "놀쿨 + different hook":
sub1: "놀쿨 — 매주 500명이 선택하는 곳"
sub2: "놀쿨 — 검색 그만, 여기서 끝내자"
sub3: "놀쿨 — 오늘 밤 실패 없는 선택"
sub4: "놀쿨 — 한번 가면 단골 되는 이유"
sub5: "놀쿨 — 아는 사람만 아는 진짜 밤"
sub6: "놀쿨 — 여기서 고르면 후회 없다"

meta description도 각 도메인마다 전부 다르게!
SAME hook on 2 domains = Google DUPLICATE PENALTY!
Each sub = "놀쿨" + DIFFERENT hook!
Detail pages inside = Store name + hook (no 놀쿨)
WRONG: "장안동호빠 장안동호빠" → DELETE duplicate!
WRONG: "강남클럽 레이스 강남 최고" → "강남" twice → DELETE!
RIGHT: "강남클럽 레이스 — 한번 가면 단골 되는 이유"
RIGHT: "장안동호빠 — 직접 가본 사람만 아는 진짜 이야기"
meta description: 150 chars. Store name + hooking. NO duplicate words!
Check EVERY page title. Same word appears twice = DELETE immediately!
Do NOT ask. Just fix. Report all titles when done.
- react-helmet-async for unique title/meta per page! SPA bots fix!
- Every page UNIQUE hookTitle! No duplicate titles! Fix gold-content.ts!
## SEO 2026
- title: Store name + hook. Under 60 chars
- meta: 150 chars. H1+H2 with store name 3+ times
- Schema: JSON-LD NightClub. og:image: real photo + nickname
- robots.txt Allow ALL bots! NO Disallow! sitemap.xml list ALL pages! llms.txt for AI search! + llms.txt
- Core Web Vitals: LCP<2.5s, INP<200ms, CLS<0.1
- E-E-A-T: real experience tone. Canonical URL. NEVER duplicate title/content across domains!. og:image 1200x1200 (1:1) every page!

- NEVER use shared content pools! Write UNIQUE 1000+ chars per venue! Takes time = OK! SEO = #1 priority!
- Time does not matter! Write UNIQUE 1000+ chars per venue! SEO > speed!
## NEVER
- NEVER use fake phone numbers! NEVER use placeholder data! Only REAL advertiser phone numbers! No number = leave empty!
- Auto page transition. Next.js. Change URLs
- Brand path. Stuffing. Baby/family/kids images. No family content (parents birthday/family gathering/reunion/anniversary = DELETE!). Banned adult words (adult/prostitution/illegal = DELETE ALL!). Adult words
