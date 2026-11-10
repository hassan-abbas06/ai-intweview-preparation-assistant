import * as fs from "fs";
import * as path from "path";
import { extractJobDescription, ExtractedJD, isSkillInText } from "../lib/interview/jd-extractor";
import { getLLMProvider } from "../lib/llm";

// Load .env and .env.local
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

// ANSI styling for test outputs
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓ PASS:${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${RED}✗ FAIL:${RESET} ${testName}`);
    if (detail) console.error(`    ${YELLOW}Detail:${RESET} ${detail}`);
    failedCount++;
  }
}

async function runTests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: JD EXTRACTOR VERIFICATION TEST SUITE   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  // ==========================================================================
  // TEST 1: Real Detailed Backend JD (Kafka, PostgreSQL)
  // ==========================================================================
  console.log(`${YELLOW}--- Test 1: Real Detailed Backend JD ---${RESET}`);
  const REAL_BACKEND_JD = `
Senior Backend Engineer - Core Infrastructure

About the Role:
We are seeking an experienced Senior Backend Engineer to design and scale our distributed event-driven data streaming platform. You will work on high-throughput microservices handling millions of events daily.

Responsibilities:
- Architect, build, and maintain low-latency backend microservices using Node.js and TypeScript.
- Design scalable event streaming pipelines using Apache Kafka for high-volume asynchronous messaging.
- Model, optimize, and maintain relational databases using PostgreSQL with advanced indexing and query tuning.
- Implement robust fault tolerance, distributed caching with Redis, and containerized deployment with Docker and Kubernetes.
- Drive automated CI/CD deployment pipelines, unit testing, and telemetry with Prometheus and Grafana.

Requirements:
- 5+ years of software development experience in backend engineering.
- Deep expertise in Node.js, TypeScript, and distributed systems.
- Production experience with PostgreSQL, schema design, and query optimization.
- Strong hands-on experience with Kafka or similar message brokers.
- Bachelor's or Master's degree in Computer Science or equivalent work experience.
`.trim();

  const t0 = Date.now();
  const res1: ExtractedJD = await extractJobDescription(REAL_BACKEND_JD);
  const elapsed1 = Date.now() - t0;

  console.log(`  Extracted Role: "${res1.role}"`);
  console.log(`  Seniority: "${res1.seniority}"`);
  console.log(`  Skills (${res1.skills.length}): [${res1.skills.join(", ")}]`);
  console.log(`  Responsibilities (${res1.responsibilities.length}):`);
  res1.responsibilities.slice(0, 3).forEach((r) => console.log(`    - ${r}`));
  console.log(`  Confidence: "${res1.confidence}" (Latency: ${elapsed1}ms)`);

  assert(Boolean(res1.role && res1.role.length > 0), "Test 1.1: Role is populated");
  const hasKafka = res1.skills.some((s) => s.toLowerCase().includes("kafka"));
  const hasPostgres = res1.skills.some((s) => s.toLowerCase().includes("postgres"));
  assert(hasKafka, "Test 1.2: Skills list contains Kafka");
  assert(hasPostgres, "Test 1.3: Skills list contains PostgreSQL");
  assert(res1.confidence === "ok", "Test 1.4: Extraction confidence is 'ok'");
  assert(res1.skills.length >= 2, "Test 1.5: Multiple valid skills extracted");

  // ==========================================================================
  // TEST 2: Short Vague JD
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 2: Short Vague JD ---${RESET}`);
  const VAGUE_JD = "We are looking for a good engineer to join our team.";
  const res2: ExtractedJD = await extractJobDescription(VAGUE_JD);

  console.log(`  Extracted Role: ${JSON.stringify(res2.role)}`);
  console.log(`  Seniority: ${JSON.stringify(res2.seniority)}`);
  console.log(`  Skills: [${res2.skills.join(", ")}]`);
  console.log(`  Confidence: "${res2.confidence}"`);

  assert(res2.confidence === "low", "Test 2.1: Confidence is 'low' for vague JD lacking technical skills");
  assert(res2.role === null, "Test 2.2: Normalized role is real null (not the string 'null')");
  assert(res2.seniority === null, "Test 2.3: Normalized seniority is real null");

  // ==========================================================================
  // TEST 3: Non-JD Text (News Paragraph)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 3: Non-JD Text (News Paragraph) ---${RESET}`);
  const NON_JD_TEXT = `
Astronomers using the James Webb Space Telescope have discovered a cluster of massive primeval galaxies dating back to the early universe. The observations revealed unexpected brightness and rapid star formation occurring less than 400 million years after the Big Bang, challenging existing cosmological models of early galactic evolution.
`.trim();

  const res3: ExtractedJD = await extractJobDescription(NON_JD_TEXT);

  console.log(`  Extracted Role: ${JSON.stringify(res3.role)}`);
  console.log(`  Seniority: ${JSON.stringify(res3.seniority)}`);
  console.log(`  Skills: [${res3.skills.join(", ")}]`);
  console.log(`  Responsibilities: [${res3.responsibilities.join(", ")}]`);
  console.log(`  Confidence: "${res3.confidence}"`);

  assert(res3.role === null, "Test 3.1: Role is null for non-JD text");
  assert(res3.skills.length === 0, "Test 3.2: Skills array is empty for non-JD text");
  assert(res3.confidence === "low", "Test 3.3: Confidence is 'low' for non-JD text");

  // ==========================================================================
  // TEST 4: Empty String / Whitespace (LLM Guard)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 4: Empty String / Whitespace (LLM Guard) ---${RESET}`);

  // Spy on LLM provider to verify it is NEVER called on empty input
  const provider = getLLMProvider();
  let llmCallCount = 0;
  const originalGenerateText = provider.generateText.bind(provider);
  provider.generateText = async (opts) => {
    llmCallCount++;
    return originalGenerateText(opts);
  };

  try {
    const resEmpty = await extractJobDescription("");
    const resWhitespace = await extractJobDescription("   \n\t  \r\n  ");

    console.log(`  Empty string result: confidence="${resEmpty.confidence}", role=${resEmpty.role}, skills=[${resEmpty.skills}]`);
    console.log(`  Whitespace result:   confidence="${resWhitespace.confidence}", role=${resWhitespace.role}, skills=[${resWhitespace.skills}]`);
    console.log(`  Total LLM calls triggered: ${llmCallCount}`);

    assert(resEmpty.confidence === "low", "Test 4.1: Empty string returns low confidence");
    assert(resEmpty.role === null, "Test 4.2: Empty string role is null");
    assert(resEmpty.skills.length === 0, "Test 4.3: Empty string skills is empty array");
    assert(resWhitespace.confidence === "low", "Test 4.4: Whitespace string returns low confidence");
    assert(llmCallCount === 0, "Test 4.5: LLM provider was NOT called for empty/whitespace inputs (callCount === 0)");
  } finally {
    provider.generateText = originalGenerateText;
  }

  // ==========================================================================
  // TEST 5: Resiliency Checks (Sanity Drops, Provider Error, JSON Retry)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 5: Resiliency & Sanity Filtering Checks ---${RESET}`);

  // 5.1 Sanity Check Drop Logic
  assert(isSkillInText("Kafka", "Experience with Apache Kafka messaging"), "Test 5.1: isSkillInText substring match");
  assert(isSkillInText("PostgreSQL", "Must know postgresql databases"), "Test 5.1b: isSkillInText case-insensitive");
  assert(isSkillInText("Node.js", "Hands-on experience with Nodejs"), "Test 5.1c: isSkillInText punctuation-stripped match");
  assert(!isSkillInText("Ruby on Rails", "We use Python and Django"), "Test 5.1d: isSkillInText drops ungrounded skill");

  // 5.2 Provider Error Resilience (Never throws, returns low-confidence empty result)
  const testProvider = getLLMProvider();
  const savedGenerate = testProvider.generateText.bind(testProvider);
  testProvider.generateText = async () => {
    throw new Error("Simulated dual-provider upstream network timeout");
  };

  try {
    const resError = await extractJobDescription("Software Engineer with Go experience");
    assert(resError.confidence === "low", "Test 5.2a: Provider failure returns low-confidence");
    assert(resError.role === null, "Test 5.2b: Provider failure returns null role");
    assert(resError.skills.length === 0, "Test 5.2c: Provider failure returns empty skills array without throwing");
  } finally {
    testProvider.generateText = savedGenerate;
  }

  // 5.3 Retry on Invalid JSON
  let retryTriggered = false;
  testProvider.generateText = async (opts) => {
    const isRetry = opts.messages[0].content.includes("IMPORTANT: Your previous output was not valid JSON");
    if (isRetry) {
      retryTriggered = true;
      return JSON.stringify({
        role: "DevOps Engineer",
        seniority: "mid",
        skills: ["Docker", "Kubernetes"],
        responsibilities: ["Manage clusters", "Maintain CI/CD"],
      });
    }
    // First attempt returns corrupted JSON
    return "INVALID JSON {{{ unclosed";
  };

  try {
    const resRetry = await extractJobDescription("DevOps Engineer. Required: Docker, Kubernetes.");
    assert(retryTriggered, "Test 5.3a: LLM call was retried once on invalid JSON");
    assert(resRetry.role === "DevOps Engineer", "Test 5.3b: Successfully recovered parsed payload from retry");
    assert(resRetry.confidence === "ok", "Test 5.3c: Confidence is 'ok' after successful retry");
  } finally {
    testProvider.generateText = savedGenerate;
  }

  // ==========================================================================
  // TEST 6: Mock LLM Returning String "null" / "none" / "N/A" Normalization
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 6: String 'null' / 'N/A' Normalization ---${RESET}`);
  testProvider.generateText = async () => {
    return JSON.stringify({
      role: "null",
      seniority: "N/A",
      skills: ["Python"],
      responsibilities: ["Write backend automation scripts"],
    });
  };

  try {
    const resNorm = await extractJobDescription("Python developer for backend automation scripts.");
    console.log(`  Raw role returned from LLM was '"null"' -> normalized: ${JSON.stringify(resNorm.role)}`);
    console.log(`  Raw seniority was '"N/A"'              -> normalized: ${JSON.stringify(resNorm.seniority)}`);
    assert(resNorm.role === null, "Test 6.1: String 'null' normalized to strict null");
    assert(resNorm.seniority === null, "Test 6.2: String 'N/A' normalized to strict null");
    assert(resNorm.confidence === "low", "Test 6.3: Confidence is 'low' because normalized role is null");
  } finally {
    testProvider.generateText = savedGenerate;
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}Test Suite Summary: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? RED : GREEN}${failedCount} Failed${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
