/**
 * MapLibre Performance Test Script
 *
 * Run this in Chrome DevTools console to verify that performance violations
 * are eliminated after the optimizations.
 *
 * Usage:
 *   1. Open the app in Chrome
 *   2. Open DevTools → Console
 *   3. Paste this script
 *   4. Call: await runPerformanceTest()
 *   5. Check the report
 */

(async function() {
  'use strict';

  const TEST_DURATION_MS = 10000; // 10 seconds
  const VIOLATION_THRESHOLD_MS = 50; // Above this is a violation

  // Store original console.warn to intercept violations
  const originalWarn = console.warn;
  const originalLog = console.log;
  const violations = [];

  function interceptConsole() {
    console.warn = function(...args) {
      const msg = args.join(' ');
      if (msg.includes('[Violation]')) {
        const match = msg.match(/took (\d+)ms/);
        if (match) {
          const duration = parseInt(match[1]);
          violations.push({
            type: msg.includes('setTimeout') ? 'setTimeout' :
                  msg.includes('requestAnimationFrame') ? 'RAF' :
                  msg.includes('Forced reflow') ? 'reflow' : 'other',
            duration,
            message: msg,
            timestamp: performance.now(),
          });
        }
      }
      originalWarn.apply(console, args);
    };
  }

  function restoreConsole() {
    console.warn = originalWarn;
    console.log = originalLog;
  }

  function analyzeViolations() {
    const rafViolations = violations.filter(v => v.type === 'RAF');
    const timeoutViolations = violations.filter(v => v.type === 'setTimeout');
    const reflowViolations = violations.filter(v => v.type === 'reflow');

    const maxRaf = rafViolations.length > 0 ? Math.max(...rafViolations.map(v => v.duration)) : 0;
    const maxTimeout = timeoutViolations.length > 0 ? Math.max(...timeoutViolations.map(v => v.duration)) : 0;
    const maxReflow = reflowViolations.length > 0 ? Math.max(...reflowViolations.map(v => v.duration)) : 0;

    return {
      total: violations.length,
      raf: { count: rafViolations.length, max: maxRaf, avg: rafViolations.reduce((a, v) => a + v.duration, 0) / (rafViolations.length || 1) },
      timeout: { count: timeoutViolations.length, max: maxTimeout, avg: timeoutViolations.reduce((a, v) => a + v.duration, 0) / (timeoutViolations.length || 1) },
      reflow: { count: reflowViolations.length, max: maxReflow, avg: reflowViolations.reduce((a, v) => a + v.duration, 0) / (reflowViolations.length || 1) },
    };
  }

  function generateReport(analysis) {
    console.log('%c=== MAPLIBRE PERFORMANCE TEST REPORT ===', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
    console.log(`Test duration: ${TEST_DURATION_MS / 1000}s`);
    console.log(`Violation threshold: ${VIOLATION_THRESHOLD_MS}ms`);
    console.log('');

    const pass = analysis.raf.max <= 100 && analysis.timeout.max <= 100 && analysis.reflow.max <= 50;

    if (pass) {
      console.log('%c✅ PASS — All violations within acceptable limits', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
    } else {
      console.log('%c❌ FAIL — Some violations exceed acceptable limits', 'color: #f44336; font-size: 14px; font-weight: bold;');
    }

    console.log('');
    console.log('RAF Violations:');
    console.log(`  Count: ${analysis.raf.count}`);
    console.log(`  Max: ${analysis.raf.max.toFixed(1)}ms ${analysis.raf.max > 100 ? '⚠️' : '✅'}`);
    console.log(`  Avg: ${analysis.raf.avg.toFixed(1)}ms`);

    console.log('');
    console.log('setTimeout Violations:');
    console.log(`  Count: ${analysis.timeout.count}`);
    console.log(`  Max: ${analysis.timeout.max.toFixed(1)}ms ${analysis.timeout.max > 100 ? '⚠️' : '✅'}`);
    console.log(`  Avg: ${analysis.timeout.avg.toFixed(1)}ms`);

    console.log('');
    console.log('Reflow Violations:');
    console.log(`  Count: ${analysis.reflow.count}`);
    console.log(`  Max: ${analysis.reflow.max.toFixed(1)}ms ${analysis.reflow.max > 50 ? '⚠️' : '✅'}`);
    console.log(`  Avg: ${analysis.reflow.avg.toFixed(1)}ms`);

    if (violations.length > 0) {
      console.log('');
      console.log('Top 5 longest violations:');
      violations
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .forEach((v, i) => {
          console.log(`  ${i + 1}. [${v.type}] ${v.duration}ms — ${v.message.substring(0, 80)}...`);
        });
    }

    console.log('');
    console.log('%c=== END REPORT ===', 'font-size: 16px; font-weight: bold; color: #4CAF50;');

    return pass;
  }

  // Expose to global scope
  window.runPerformanceTest = async function() {
    console.log('%cStarting performance test...', 'color: #2196F3; font-size: 14px;');
    console.log('Monitoring for', TEST_DURATION_MS / 1000, 'seconds...');

    interceptConsole();
    violations.length = 0;

    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));

    restoreConsole();
    const analysis = analyzeViolations();
    const pass = generateReport(analysis);

    return { pass, analysis, violations };
  };

  console.log('%cPerformance test script loaded. Call: await runPerformanceTest()', 'color: #2196F3; font-size: 14px;');
})();
