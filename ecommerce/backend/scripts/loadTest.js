const axios = require('axios');

const baseUrl = process.env.LOAD_TEST_URL || 'http://localhost:4000';
const totalRequests = Number(process.env.LOAD_TEST_REQUESTS || 1000);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 1000);
const path = process.env.LOAD_TEST_PATH || '/health';

async function run() {
  const startedAt = Date.now();
  let success = 0;
  let failed = 0;
  const latencies = [];
  let completed = 0;
  let nextRequest = 0;

  async function runOne() {
    const requestIndex = nextRequest++;
    if (requestIndex >= totalRequests) return;
    const requestStarted = Date.now();
    try {
      const response = await axios.get(`${baseUrl}${path}`, { timeout: 10000, validateStatus: () => true });
      latencies.push(Date.now() - requestStarted);
      if (response.status >= 200 && response.status < 500) {
        success += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
    } finally {
      completed += 1;
      if (completed % 100 === 0 || completed === totalRequests) {
        process.stdout.write(`\rCompleted ${completed}/${totalRequests}`);
      }
    }
    await runOne();
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, () => runOne()));

  const elapsedMs = Date.now() - startedAt;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const avg = sorted.length ? Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length) : 0;

  console.log('\nLoad test complete');
  console.log(JSON.stringify({
    baseUrl,
    path,
    totalRequests,
    concurrency,
    success,
    failed,
    elapsedMs,
    requestsPerSecond: Math.round((totalRequests / elapsedMs) * 1000),
    avgLatencyMs: avg,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
  }, null, 2));

  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
