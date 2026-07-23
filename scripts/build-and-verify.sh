#!/usr/bin/env bash
# Script para compilar y verificar marine-instrumentation-ui
# Uso: ./scripts/build-and-verify.sh

set -e

echo "=== Building marine-instrumentation-ui ==="
cd marine-instrumentation-ui

echo "1. TypeScript check..."
npx tsc --noEmit

echo "2. Angular build (production)..."
npx ng build --configuration production

echo "=== Build successful ==="
echo ""
echo "Next steps:"
echo "  1. Serve the app: npx ng serve"
echo "  2. Open Chrome DevTools → Console"
echo "  3. Paste: src/app/features/chart/services/performance-test.js"
echo "  4. Call: await runPerformanceTest()"
echo "  5. Verify no [Violation] warnings exceed 100ms"
