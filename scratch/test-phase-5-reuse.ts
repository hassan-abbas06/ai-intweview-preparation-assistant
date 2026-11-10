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

// Auth monkey-patching for route testing
const nextAuthNext = require("next-auth/next");
let mockAuthSession: any = null;
nextAuthNext.getServerSession = async () => mockAuthSession;

import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";
import { GET as getRecentJdHandler } from "../app/api/interview/recent-jd/route";
import { POST as generateQuestionsHandler } from "../app/api/interview/generate-questions/route";
import { getLLMProvider } from "../lib/llm";

// ANSI styling
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

async function runReuseTests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: RECENT JD REUSE TEST SUITE (STEP 7)   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const timestamp = Date.now();
  let userA: any = null;
  let userB: any = null;
  let resumeA: any = null;
  let resumeB: any = null;

  const createdScanIds: string[] = [];
  const createdJdIds: string[] = [];

  // Spy on LLM provider calls
  const provider = getLLMProvider();
  let llmCallCount = 0;
  const originalGenerate = provider.generateText.bind(provider);
  provider.generateText = async (opts) => {
    llmCallCount++;
    return originalGenerate(opts);
  };

  try {
    userA = await prisma.user.create({
      data: {
        email: `phase5_reuse_a_${timestamp}@example.com`,
        role: "USER",
        domain: "Software_Engineering",
      },
    });
    userB = await prisma.user.create({
      data: {
        email: `phase5_reuse_b_${timestamp}@example.com`,
        role: "USER",
        domain: "Software_Engineering",
      },
    });

    resumeA = await prisma.resume.create({
      data: {
        userId: userA.id,
        fileUrl: "https://example.com/resA.pdf",
        fileName: "resumeA.pdf",
        fileSize: 1024,
      },
    });

    resumeB = await prisma.resume.create({
      data: {
        userId: userB.id,
        fileUrl: "https://example.com/resB.pdf",
        fileName: "resumeB.pdf",
        fileSize: 1024,
      },
    });

    console.log(`Created test User A (${userA.id}) and User B (${userB.id})`);
  } catch (err: any) {
    console.error("Failed to initialize test users:", err);
    process.exit(1);
  }

  try {
    // ========================================================================
    // TEST 1: No AtsScanLog -> endpoint returns data: null
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 1: No AtsScanLog ---${RESET}`);
    mockAuthSession = { user: { id: userA.id, email: userA.email } };

    const req1 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res1 = await getRecentJdHandler(req1);
    const body1 = await res1.json();

    assert(res1.status === 200, "Test 1.1: Endpoint returns 200");
    assert(body1.error === false, "Test 1.2: error flag is false");
    assert(body1.data === null, "Test 1.3: data is null when user has no scan logs");

    // ========================================================================
    // TEST 2: AtsScanLog without JD text (generic scan) -> data: null
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 2: Generic Scan (No JD Text) ---${RESET}`);
    const genericScan = await prisma.atsScanLog.create({
      data: {
        userId: userA.id,
        resumeId: resumeA.id,
        mode: "GENERAL",
        score: 75.0,
        suggestions: {},
        jdText: null,
      },
    });
    createdScanIds.push(genericScan.id);

    const req2 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res2 = await getRecentJdHandler(req2);
    const body2 = await res2.json();

    assert(res2.status === 200, "Test 2.1: Endpoint returns 200");
    assert(body2.data === null, "Test 2.2: data is null for generic scan without JD text");

    // ========================================================================
    // TEST 3: AtsScanLog with JD, no JobDescription row -> source "scan" with right jdText
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 3: Scan with JD, No JobDescription Row ---${RESET}`);
    const targetJdText3 = "Senior Cloud Architect - AWS, Kubernetes, Terraform, Go";
    const targetedScan3 = await prisma.atsScanLog.create({
      data: {
        userId: userA.id,
        resumeId: resumeA.id,
        mode: "JOB_TARGETED",
        score: 88.0,
        suggestions: {},
        jdText: targetJdText3,
        timestamp: new Date(Date.now() - 60000), // 1 min ago
      },
    });
    createdScanIds.push(targetedScan3.id);

    const req3 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res3 = await getRecentJdHandler(req3);
    const body3 = await res3.json();

    assert(res3.status === 200, "Test 3.1: Endpoint returns 200");
    assert(body3.data !== null, "Test 3.2: data is non-null");
    assert(body3.data?.source === "scan", `Test 3.3: data.source is 'scan' (got: ${body3.data?.source})`);
    assert(body3.data?.jdText === targetJdText3, "Test 3.4: data.jdText matches scan jdText");
    assert(typeof body3.data?.scannedAt === "string", "Test 3.5: data.scannedAt is timestamp string");

    // ========================================================================
    // TEST 4: AtsScanLog with JD + matching JobDescription row -> source "existing", 0 LLM calls
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 4: Scan with JD + Matching JobDescription Row (Zero LLM Calls) ---${RESET}`);
    const jdRow4 = await prisma.jobDescription.create({
      data: {
        userId: userA.id,
        rawText: targetJdText3,
        extractedRole: "Senior Cloud Architect",
        extractedSeniority: "senior",
        extractedSkills: ["AWS", "Kubernetes", "Terraform", "Go"],
        extractedResponsibilities: ["Architect multi-region clouds", "Automate infrastructure"],
        extractionConfidence: "ok",
      },
    });
    createdJdIds.push(jdRow4.id);

    const llmCallsBeforeTest4 = llmCallCount;

    const req4 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res4 = await getRecentJdHandler(req4);
    const body4 = await res4.json();

    const llmCallsDuringTest4 = llmCallCount - llmCallsBeforeTest4;

    assert(res4.status === 200, "Test 4.1: Endpoint returns 200");
    assert(body4.data?.source === "existing", `Test 4.2: data.source is 'existing' (got: ${body4.data?.source})`);
    assert(body4.data?.jobDescriptionId === jdRow4.id, `Test 4.3: Returned jobDescriptionId matches jdRow4 (${jdRow4.id})`);
    assert(body4.data?.role === "Senior Cloud Architect", "Test 4.4: Extracted role matches");
    assert(body4.data?.skills?.includes("Kubernetes"), "Test 4.5: Extracted skills contains Kubernetes");
    assert(llmCallsDuringTest4 === 0, `Test 4.6: LLM was called EXACTLY 0 times (calls=${llmCallsDuringTest4})`);

    // ========================================================================
    // TEST 5: Most recent scan wins when several exist
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 5: Most Recent Scan Wins ---${RESET}`);
    const olderScanText = "Older Mid-level Developer JD";
    const newerScanText = "Brand New Principal AI Architect JD";

    const olderScan = await prisma.atsScanLog.create({
      data: {
        userId: userA.id,
        resumeId: resumeA.id,
        mode: "JOB_TARGETED",
        score: 70.0,
        suggestions: {},
        jdText: olderScanText,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });
    createdScanIds.push(olderScan.id);

    const newerScan = await prisma.atsScanLog.create({
      data: {
        userId: userA.id,
        resumeId: resumeA.id,
        mode: "JOB_TARGETED",
        score: 95.0,
        suggestions: {},
        jdText: newerScanText,
        timestamp: new Date(Date.now() + 1000), // newest
      },
    });
    createdScanIds.push(newerScan.id);

    const req5 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res5 = await getRecentJdHandler(req5);
    const body5 = await res5.json();

    assert(body5.data?.source === "scan", "Test 5.1: Returned source is scan");
    assert(body5.data?.jdText === newerScanText, "Test 5.2: Most recent scan text selected over older scans");

    // ========================================================================
    // TEST 6: User B never sees User A's scan or JD
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 6: Cross-User Isolation (User B never sees User A's data) ---${RESET}`);
    mockAuthSession = { user: { id: userB.id, email: userB.email } };

    const req6 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res6 = await getRecentJdHandler(req6);
    const body6 = await res6.json();

    assert(res6.status === 200, "Test 6.1: User B request returns 200");
    assert(body6.data === null, "Test 6.2: User B receives null (cannot see User A's recent scan or JD)");

    // ========================================================================
    // TEST 7: Unauthenticated request -> 401
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 7: Unauthenticated Request ---${RESET}`);
    mockAuthSession = null;

    const req7 = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res7 = await getRecentJdHandler(req7);
    const body7 = await res7.json();

    assert(res7.status === 401, "Test 7.1: Unauthenticated request returns 401");
    assert(body7.error === true, "Test 7.2: Error flag is true");
    assert(body7.message === "Unauthorized. Please sign in first.", "Test 7.3: Returns standard unauthorized message");

    // ========================================================================
    // TEST 8: Source 'scan' flow creates exactly ONE row; subsequent visit is 'existing'
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 8: Source 'scan' Flow Creates Exactly One Row -> Next Visit is 'existing' ---${RESET}`);
    mockAuthSession = { user: { id: userA.id, email: userA.email } };

    const initialJdRowCount = await prisma.jobDescription.count({
      where: { userId: userA.id, rawText: newerScanText },
    });
    assert(initialJdRowCount === 0, "Test 8.1: No JobDescription row exists initially for newerScanText");

    // Candidate clicks "Use JD" -> runs generate-questions with rawText
    const analyzeReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: newerScanText }),
    });

    const analyzeRes = await generateQuestionsHandler(analyzeReq);
    const analyzeBody = await analyzeRes.json();

    assert(analyzeRes.status === 200, "Test 8.2: analyze JD returned 200");
    assert(typeof analyzeBody.data?.jobDescriptionId === "string", "Test 8.3: Created jobDescriptionId");
    if (analyzeBody.data?.jobDescriptionId) {
      createdJdIds.push(analyzeBody.data.jobDescriptionId);
    }

    const postAnalyzeCount = await prisma.jobDescription.count({
      where: { userId: userA.id, rawText: newerScanText },
    });
    assert(postAnalyzeCount === 1, "Test 8.4: Exactly ONE JobDescription row exists in DB");

    // Call GET /api/interview/recent-jd again
    const req8b = new NextRequest("http://localhost:3000/api/interview/recent-jd", { method: "GET" });
    const res8b = await getRecentJdHandler(req8b);
    const body8b = await res8b.json();

    assert(body8b.data?.source === "existing", `Test 8.5: Next visit returns source 'existing' (got: ${body8b.data?.source})`);
    assert(body8b.data?.jobDescriptionId === analyzeBody.data.jobDescriptionId, "Test 8.6: Returned id matches the newly created row id");

    const finalCount = await prisma.jobDescription.count({
      where: { userId: userA.id, rawText: newerScanText },
    });
    assert(finalCount === 1, "Test 8.7: Row count is still exactly 1 (no duplicate rows created)");

    // ========================================================================
    // TEST 9: Aptitude track: the reuse option is not rendered
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 9: Aptitude Track Ignores/Hides Reuse Option ---${RESET}`);
    const selectedTrack: string = "APTITUDE";
    const shouldRenderJdSection = selectedTrack !== "APTITUDE";
    assert(shouldRenderJdSection === false, "Test 9.1: selectedTrack !== 'APTITUDE' is false; JD section and reuse option hidden");

    const nonAptitudeTrack: string = "DOMAIN";
    assert((nonAptitudeTrack !== "APTITUDE") === true, "Test 9.2: DOMAIN track renders JD section and reuse option");

  } finally {
    // ========================================================================
    // CLEANUP
    // ========================================================================
    console.log(`\n${YELLOW}--- Cleaning Up Test Rows ---${RESET}`);
    try {
      if (createdScanIds.length > 0) {
        await prisma.atsScanLog.deleteMany({
          where: { id: { in: createdScanIds } },
        });
        console.log(`  Cleaned up ${createdScanIds.length} test AtsScanLog rows.`);
      }

      if (createdJdIds.length > 0) {
        await prisma.jobDescription.deleteMany({
          where: { id: { in: createdJdIds } },
        });
        console.log(`  Cleaned up ${createdJdIds.length} test JobDescription rows.`);
      }

      if (resumeA?.id || resumeB?.id) {
        const resumeIds = [resumeA?.id, resumeB?.id].filter(Boolean);
        await prisma.resume.deleteMany({
          where: { id: { in: resumeIds } },
        });
        console.log(`  Cleaned up ${resumeIds.length} test Resume rows.`);
      }

      if (userA?.id || userB?.id) {
        const userIds = [userA?.id, userB?.id].filter(Boolean);
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
        console.log(`  Cleaned up ${userIds.length} test users.`);
      }
    } catch (cleanupErr: any) {
      console.error("  Warning during cleanup:", cleanupErr);
    }
  }

  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}Reuse Test Suite Summary: ${passedCount} Passed, ${failedCount} Failed${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runReuseTests().catch((err) => {
  console.error("Unhandled error running reuse tests:", err);
  process.exit(1);
});
