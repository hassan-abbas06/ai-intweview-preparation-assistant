import * as fs from "fs";
import * as path from "path";

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

// Auth monkey-patching for route testing (MUST run before next-auth is imported by route)
const nextAuthNext = require("next-auth/next");
let mockAuthSession: any = null;
nextAuthNext.getServerSession = async () => mockAuthSession;

import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";
import { POST as generateQuestionsHandler } from "../app/api/interview/generate-questions/route";
import { getLLMProvider } from "../lib/llm";

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

async function runRouteTests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: GENERATE-QUESTIONS ROUTE TEST SUITE   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const testUserEmail = `phase5_test_candidate_${Date.now()}@example.com`;
  let testUser: any = null;

  try {
    testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        role: "USER",
      },
    });
    console.log(`Created test candidate: ${testUser.id} (${testUser.email})`);
  } catch (err: any) {
    console.error("Failed to create test candidate in database:", err);
    process.exit(1);
  }

  // Spy on LLM provider calls
  const provider = getLLMProvider();
  let llmCallCount = 0;
  const originalGenerate = provider.generateText.bind(provider);
  provider.generateText = async (opts) => {
    llmCallCount++;
    return originalGenerate(opts);
  };

  try {
    // ========================================================================
    // TEST 1: Unauthenticated request -> 401
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 1: Unauthenticated Request ---${RESET}`);
    mockAuthSession = null;

    const unauthReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: "Software Engineer with Python experience" }),
    });

    const res1 = await generateQuestionsHandler(unauthReq);
    const body1 = await res1.json();

    console.log(`  Status: ${res1.status}, Body: ${JSON.stringify(body1)}`);
    assert(res1.status === 401, "Test 1.1: Unauthenticated request returns 401");
    assert(body1.error === true, "Test 1.2: Response body sets error: true");

    // ========================================================================
    // TEST 2: Empty / Whitespace rawText -> 400 (LLM not called)
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 2: Empty / Whitespace rawText (400, No LLM) ---${RESET}`);
    mockAuthSession = { user: { id: testUser.id, email: testUser.email } };
    const prevLlmCount2 = llmCallCount;

    const emptyReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: "   \n\t  \r\n  " }),
    });

    const res2 = await generateQuestionsHandler(emptyReq);
    const body2 = await res2.json();

    console.log(`  Status: ${res2.status}, Body: ${JSON.stringify(body2)}`);
    console.log(`  LLM calls during this step: ${llmCallCount - prevLlmCount2}`);

    assert(res2.status === 400, "Test 2.1: Whitespace rawText returns 400");
    assert(body2.error === true, "Test 2.2: Response sets error: true");
    assert(llmCallCount === prevLlmCount2, "Test 2.3: LLM provider was NOT called");

    // ========================================================================
    // TEST 3: rawText of 20,001 chars -> 400 (LLM not called)
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 3: rawText of 20,001 chars (400, No LLM) ---${RESET}`);
    const prevLlmCount3 = llmCallCount;
    const overLimitText = "a".repeat(20001);

    const overLimitReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: overLimitText }),
    });

    const res3 = await generateQuestionsHandler(overLimitReq);
    const body3 = await res3.json();

    console.log(`  Status: ${res3.status}, Body: ${JSON.stringify(body3)}`);
    console.log(`  LLM calls during this step: ${llmCallCount - prevLlmCount3}`);

    assert(res3.status === 400, "Test 3.1: 20,001 chars returns 400");
    assert(body3.error === true, "Test 3.2: Response sets error: true");
    assert(llmCallCount === prevLlmCount3, "Test 3.3: LLM provider was NOT called");

    // ========================================================================
    // TEST 4: Real Detailed JD -> 200, row saved with full text, confidence "ok"
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 4: Real Detailed Backend JD ---${RESET}`);
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

    const realReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: REAL_BACKEND_JD }),
    });

    const res4 = await generateQuestionsHandler(realReq);
    const body4 = await res4.json();

    console.log(`  Status: ${res4.status}`);
    console.log(`  Response message: "${body4.message}"`);
    console.log(`  Extracted Data:`, body4.data);

    assert(res4.status === 200, "Test 4.1: Real JD returns 200");
    assert(body4.error === false, "Test 4.2: body.error is false");
    assert(body4.message === "Job description processed", "Test 4.3: body.message matches standard format");
    assert(Boolean(body4.data?.jobDescriptionId), "Test 4.4: data.jobDescriptionId returned");
    assert(body4.data?.confidence === "ok", "Test 4.5: data.confidence is 'ok'");
    assert(Array.isArray(body4.data?.skills) && body4.data.skills.length >= 2, "Test 4.6: data.skills is non-empty array");

    // Verify database row
    const row4 = await prisma.jobDescription.findUnique({
      where: { id: body4.data.jobDescriptionId },
    });
    assert(Boolean(row4), "Test 4.7: Row exists in PostgreSQL database");
    assert(row4?.userId === testUser.id, "Test 4.8: Row correctly linked to requesting userId");
    assert(row4?.rawText === REAL_BACKEND_JD, "Test 4.9: Full rawText stored verbatim without truncation");
    assert(row4?.extractionConfidence === "ok", "Test 4.10: Database row has extractionConfidence='ok'");

    // ========================================================================
    // TEST 5: Non-JD Text -> 200, confidence "low", empty skills, row saved
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 5: Non-JD Text (News Paragraph) ---${RESET}`);
    const NON_JD_TEXT = `
Astronomers using the James Webb Space Telescope have discovered a cluster of massive primeval galaxies dating back to the early universe. The observations revealed unexpected brightness and rapid star formation occurring less than 400 million years after the Big Bang, challenging existing cosmological models of early galactic evolution.
`.trim();

    const nonJdReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: NON_JD_TEXT }),
    });

    const res5 = await generateQuestionsHandler(nonJdReq);
    const body5 = await res5.json();

    console.log(`  Status: ${res5.status}, Extracted Data:`, body5.data);

    assert(res5.status === 200, "Test 5.1: Non-JD text returns 200 (never blocks candidate)");
    assert(body5.error === false, "Test 5.2: body.error is false");
    assert(body5.data?.confidence === "low", "Test 5.3: data.confidence is 'low'");
    assert(Array.isArray(body5.data?.skills) && body5.data.skills.length === 0, "Test 5.4: data.skills is empty array");

    const row5 = await prisma.jobDescription.findUnique({
      where: { id: body5.data.jobDescriptionId },
    });
    assert(Boolean(row5), "Test 5.5: Non-JD row saved in database");
    assert(row5?.extractionConfidence === "low", "Test 5.6: Row stored with extractionConfidence='low'");

    // ========================================================================
    // TEST 6: Simulated Provider Failure -> 200, low-confidence empty row saved
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 6: Simulated Provider Failure ---${RESET}`);
    provider.generateText = async () => {
      throw new Error("Simulated upstream provider outage / rate limit");
    };

    const failReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: "Python engineer for cloud automation." }),
    });

    const res6 = await generateQuestionsHandler(failReq);
    const body6 = await res6.json();

    console.log(`  Status: ${res6.status}, Extracted Data:`, body6.data);

    assert(res6.status === 200, "Test 6.1: Provider failure returns 200 (never throws 500)");
    assert(body6.error === false, "Test 6.2: body.error is false");
    assert(body6.data?.confidence === "low", "Test 6.3: data.confidence is 'low'");
    assert(body6.data?.role === null, "Test 6.4: data.role is null on provider error");
    assert(Array.isArray(body6.data?.skills) && body6.data.skills.length === 0, "Test 6.5: data.skills is empty");

    const row6 = await prisma.jobDescription.findUnique({
      where: { id: body6.data.jobDescriptionId },
    });
    assert(Boolean(row6), "Test 6.6: Low-confidence empty row saved in database on provider failure");
    assert(row6?.extractionConfidence === "low", "Test 6.7: Row marked as low confidence");

  } finally {
    provider.generateText = originalGenerate;

    // Clean up test rows from database
    console.log(`\n${YELLOW}--- Cleaning Up Test Rows ---${RESET}`);
    if (testUser) {
      const deletedJDs = await prisma.jobDescription.deleteMany({
        where: { userId: testUser.id },
      });
      console.log(`  Deleted ${deletedJDs.count} test JobDescription rows.`);

      await prisma.user.delete({
        where: { id: testUser.id },
      });
      console.log(`  Deleted test candidate ${testUser.id}.`);
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}Route Test Suite Summary: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? RED : GREEN}${failedCount} Failed${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRouteTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
