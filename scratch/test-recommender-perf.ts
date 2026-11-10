import { searchVideos } from "../lib/youtube/client";

async function testPerformance() {
  console.log("=== 1. TESTING searchVideos In-Memory Caching & Performance ===");
  const q = "Financial Modeling Fundamentals explained tutorial";

  const t0 = Date.now();
  const res1 = await searchVideos(q, 3);
  const dur1 = Date.now() - t0;
  console.log(`Call 1 (Network or Curated) took: ${dur1}ms, items: ${res1.length}`);

  const t1 = Date.now();
  const res2 = await searchVideos(q, 3);
  const dur2 = Date.now() - t1;
  console.log(`Call 2 (In-Memory Cache) took: ${dur2}ms, items: ${res2.length}`);

  if (dur2 > 50) {
    throw new Error(`Cache call took too long: ${dur2}ms`);
  }
  console.log("PASS: In-memory cache returns in < 50ms!");

  console.log("\n=== 2. TESTING Curated Fallback on Unreachable Query ===");
  const fallbackRes = await searchVideos("some completely unknown random gibberish 1234567890", 3);
  console.log(`Fallback items: ${fallbackRes.length}, first title: ${fallbackRes[0]?.title}`);
  if (fallbackRes.length === 0) {
    throw new Error("Expected fallback items, got 0");
  }
  console.log("PASS: Curated fallback provides instant educational videos!");

  console.log("\nALL RECOMMENDER PERFORMANCE TESTS PASSED!");
}

testPerformance().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
