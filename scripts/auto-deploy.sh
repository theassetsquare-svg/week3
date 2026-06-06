#!/bin/bash
# ═══════════════════════════════════════
#  24시간 자동 빌드 + SEO 감사 + 배포
#  Usage: bash scripts/auto-deploy.sh
#  (Ctrl+C to stop)
# ═══════════════════════════════════════

cd /home/user/week3
INTERVAL=3600  # 1시간마다 실행

echo "═══════════════════════════════════════"
echo "  놀쿨 24시간 자동화 시스템 시작"
echo "  간격: ${INTERVAL}초 (1시간)"
echo "═══════════════════════════════════════"

while true; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $(date '+%Y-%m-%d %H:%M:%S') — 빌드 시작"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Step 1: Build
  echo "[1/4] 103개 업소 페이지 빌드..."
  node scripts/gen-card-copy.js 2>&1 | tail -3

  # Step 2: Post-build SEO fix
  echo "[2/4] 정적 페이지 SEO URL 보정..."
  node scripts/post-build-seo.js 2>&1

  # Step 3: SEO Audit
  echo "[3/4] SEO 감사 실행..."
  node scripts/seo-audit.js 2>&1 | tail -5

  # Step 4: Deploy
  echo "[4/4] Cloudflare Pages 배포..."
  CLOUDFLARE_API_TOKEN=Rmyh9BB6lKFsRjqHZvpMFOBwsbi36MaOEPdWg9sS \
    npx wrangler pages deploy /home/user/week3 \
    --project-name=week3 --commit-dirty=true 2>&1 | tail -3

  echo ""
  echo "✅ 완료 — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "다음 실행: $(date -d "+${INTERVAL} seconds" '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  sleep $INTERVAL
done
