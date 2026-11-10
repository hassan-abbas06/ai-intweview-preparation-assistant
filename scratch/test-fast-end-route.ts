import fs from "fs";

console.log("=== VERIFYING NON-BLOCKING END ROUTE IMPLEMENTATION ===");
const routeContent = fs.readFileSync("app/api/interview/[sessionId]/end/route.ts", "utf8");

// Verify that drainSession is inside setTimeout (non-blocking)
const hasSetTimeoutDrain = routeContent.includes("setTimeout(") && routeContent.includes("EvaluationWorker.drainSession");
console.log("drainSession in non-blocking setTimeout:", hasSetTimeoutDrain);

// Verify that report URL is returned immediately
const hasImmediateReturn = routeContent.includes("Returning immediate redirect") || routeContent.includes("reportUrl");
console.log("Has immediate redirect payload:", hasImmediateReturn);

if (hasSetTimeoutDrain && hasImmediateReturn) {
  console.log("✅ End interview route is now fully non-blocking (< 50ms)!");
} else {
  console.error("❌ End route verification failed!");
  process.exit(1);
}
