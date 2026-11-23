# OCR Benchmark Script

## Overview

The OCR benchmark script (T3.2) tests receipt parsing latency using GPT-4o-mini vision API.

**Purpose:** Verify that the OCR service meets latency targets (<10s p95).

**Status:** Bench script ships in stub phase. Real receipt images will be added once the receipt upload flow is complete (see `docs/ocr-setup.md` for implementation roadmap).

## Usage

### Mock Mode (Stub Phase)

```bash
npm run ocr-bench
```

**Expected:** p50 < 1s, p95 < 2s (stub implementation)

### Real GPT-4o-mini Mode

```bash
OPENAI_API_KEY=your-key-here npm run ocr-bench
```

**Expected:** p50 2-4s, p95 5-8s (typical vision API latency)

## Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `SAMPLE_SIZE` | 20 | Number of sample receipts to test |
| `TIMEOUT_MS` | 30,000 | Hard timeout per request (30s) |
| `SAMPLE_IMAGE_PATHS` | (configurable) | GCS paths to receipt images |

## Running the Benchmark

### Step 1: Install Dependencies

```bash
npm install --save-dev dotenv
```

### Step 2: Set Up Sample Images

**Current status:** Placeholder paths documented below (not yet available).

**Future action:** Replace `SAMPLE_IMAGE_PATHS` in `scripts/ocr-bench.mts` with actual receipt image paths:

```typescript
const SAMPLE_IMAGE_PATHS: string[] = [
  'gs://your-bucket/receipts/sample-001.jpg',
  'gs://your-bucket/receipts/sample-002.jpg',
  // ... up to 20 images
];
```

### Step 3: Run Benchmark

```bash
# Mock mode (no API key required)
npm run ocr-bench

# Real mode (requires OpenAI API key)
OPENAI_API_KEY=sk-... npm run ocr-bench
```

## Benchmark Results

### Expected Performance (T3.2 Requirements)

| Metric | Target | Stub Phase | Real Phase (GPT-4o-mini) |
|--------|--------|------------|--------------------------|
| p50    | <5s    | <1s        | 2-4s                     |
| p95    | <10s   | <2s        | 5-8s                     |
| p99    | <15s   | <3s        | 8-12s                    |
| Timeout| 30s    | <1s        | <10s                     |

### Interpretation

- **p50**: Median latency (50% of requests faster than this)
- **p95**: 95th percentile (5% of requests slower than this)
- **p95 target**: <10s is per task specification (FR-2.2)

### Failure Criteria

The benchmark is considered failed if:
- p95 > 10s (exceeds latency target)
- >20% of requests fail
- Any request exceeds 30s timeout

## Risk #1 Mitigation

**Risk:** Bench script depends on receipt images to be meaningful, but receipt upload flow not yet complete.

**Mitigation:**
1. Bench script ships with placeholder paths and clear documentation
2. Script runs successfully even without real images (mock mode)
3. Real receipt images can be added after upload flow completion
4. Bench script provides clear path for execution (see `docs/ocr-setup.md`)

## Implementation Status

| Task | Status | Notes |
|------|--------|-------|
| Bench script created | ✅ | `scripts/ocr-bench.mts` |
| README documentation | ✅ | `scripts/README-ocr-bench.md` |
| Sample image paths | ⏳ | Placeholder documented, to be added |
| Real execution | ⏳ | Requires receipt images (future work) |
| Integration test | ⏳ | To be added after receipt upload flow |

## Related

- Task T3.2: Cloud OCR parse service (FR-2.2)
- Task T7.2: OCR meter hook implementation
- Implementation roadmap: `docs/ocr-setup.md` (to be created)
- Code: `functions/src/ocr.ts`, `src/services/ocr.ts`
