/**
 * OCR Benchmark Script (T3.2).
 *
 * Runs 20 sample receipt images through the OCR parser and reports p50/p95 latency.
 *
 * Usage:
 *   npm run ocr-bench              # Run with mock provider
 *   OPENAI_API_KEY=xxx npm run ocr-bench  # Run with real OpenAI API
 *
 * Note: This script uses placeholder paths for sample images. Real receipt images
 * will be added once the receipt upload flow is complete (see docs/ocr-setup.md).
 *
 * Expected results (p95 < 10s):
 * - Mock provider: <1s (stub implementation)
 * - GPT-4o-mini: 2-8s (typical vision API latency)
 *
 * Risk #1 mitigation: Bench script ships before receipt images are available,
 * but provides clear documentation for future execution.
 */

import { parseReceipt } from '../functions/src/ocr';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SAMPLE_SIZE = 20;
const TIMEOUT_MS = 30_000; // 30s hard timeout per request

// Placeholder paths for sample receipts
// TODO: Replace with actual receipt images once upload flow is complete
const SAMPLE_IMAGE_PATHS: string[] = Array.from({ length: SAMPLE_SIZE }, (_, i) => {
  return `gs://car-tracker-test-bucket/receipts/sample-${String(i + 1).padStart(3, '0')}.jpg`;
});

/**
 * Run benchmark and report statistics.
 */
async function runBenchmark(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log('🧪 OCR Benchmark (T3.2, FR-2.2)');
  console.log('='.repeat(50));
  console.log(`Sample size: ${SAMPLE_SIZE}`);
  console.log(`Timeout per request: ${TIMEOUT_MS}ms`);
  console.log(`Provider: ${apiKey ? 'GPT-4o-mini' : 'mock'}`);
  console.log('');

  if (!apiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set. Running in mock mode (expect <1s p95).');
    console.log('To run with real GPT-4o-mini, set OPENAI_API_KEY environment variable.');
    console.log('');
  }

  const latencies: number[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  console.log('Running benchmarks...');
  console.log('-'.repeat(50));

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const imagePath = SAMPLE_IMAGE_PATHS[i];
    const startTime = Date.now();

    try {
      const result = await parseReceipt(
        imagePath,
        apiKey || '',
        'gpt-4o-mini',
        TIMEOUT_MS
      );

      const latency = Date.now() - startTime;

      if (result) {
        successCount++;
        latencies.push(latency);
        console.log(
          `[${i + 1}/${SAMPLE_SIZE}] ✓ ${imagePath} (${latency}ms) - ${result.provider}`
        );
      } else {
        failureCount++;
        errors.push(`${imagePath}: parse failed (no result)`);
        console.log(`[${i + 1}/${SAMPLE_SIZE}] ✗ ${imagePath} - parse failed`);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      failureCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${imagePath}: ${errorMsg}`);
      console.log(`[${i + 1}/${SAMPLE_SIZE}] ✗ ${imagePath} - ${errorMsg}`);
    }
  }

  // Calculate statistics
  if (latencies.length > 0) {
    const sorted = latencies.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    console.log('');
    console.log('='.repeat(50));
    console.log('Benchmark Results');
    console.log('='.repeat(50));
    console.log(`Total requests: ${SAMPLE_SIZE}`);
    console.log(`Success: ${successCount} (${((successCount / SAMPLE_SIZE) * 100).toFixed(1)}%)`);
    console.log(`Failure: ${failureCount} (${((failureCount / SAMPLE_SIZE) * 100).toFixed(1)}%)`);
    console.log('');
    console.log('Latency Statistics (ms):');
    console.log(`  Min:   ${min}`);
    console.log(`  Max:   ${max}`);
    console.log(`  Avg:   ${avg.toFixed(2)}`);
    console.log(`  p50:   ${p50}`);
    console.log(`  p95:   ${p95}`);
    console.log(`  p99:   ${p99}`);
    console.log('');

    // Check against latency target
    const p95Exceeded = p95 > 10_000; // 10s = 10,000ms
    if (p95Exceeded) {
      console.warn(`⚠️  WARNING: p95 (${p95}ms) exceeds 10s target!`);
    } else {
      console.log(`✓ p95 (${p95}ms) is within 10s target`);
    }
  } else {
    console.warn('No successful parses to report statistics for.');
  }

  // Report errors
  if (errors.length > 0) {
    console.log('');
    console.log('Errors:');
    console.log('-'.repeat(50));
    errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
}

// Run benchmark
runBenchmark().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
