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
import { POST as startInterviewHandler } from "../app/api/interview/start/route";

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

async function runStartRouteTests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: START ROUTE JD INTEGRATION TEST SUITE   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const timestamp = Date.now();
  const userAEmail = `phase5_user_a_${timestamp}@example.com`;
  const userBEmail = `phase5_user_b_${timestamp}@example.com`;

  let userA: any = null;
  let userB: any = null;
  let jdA: any = null;
  let jdB: any = null;

  const createdSessionIds: string[] = [];

  try {
    userA = await prisma.user.create({
      data: {
        email: userAEmail,
        role: "USER",
        domain: "Software_Engineering",
      },
    });
    console.log(`Created test User A: ${userA.id} (${userA.email})`);

    userB = await prisma.user.create({
      data: {
        email: userBEmail,
        role: "USER",
        domain: "Software_Engineering",
      },
    });
    console.log(`Created test User B: ${userB.id} (${userB.email})`);

    jdA = await prisma.jobDescription.create({
      data: {
        userId: userA.id,
        rawText: "Senior Backend Engineer JD with Node.js and PostgreSQL",
        extractedRole: "Senior Backend Engineer",
        extractedSeniority: "senior",
        extractedSkills: ["Node.js", "PostgreSQL"],
        extractedResponsibilities: ["Build scalable services"],
        extractionConfidence: "ok",
      },
    });
    console.log(`Created JobDescription for User A: ${jdA.id}`);

    jdB = await prisma.jobDescription.create({
      data: {
        userId: userB.id,
        rawText: "Frontend Engineer JD with React and TypeScript",
        extractedRole: "Frontend Engineer",
        extractedSeniority: "mid",
        extractedSkills: ["React", "TypeScript"],
        extractedResponsibilities: ["Build web UI"],
        extractionConfidence: "ok",
      },
    });
    console.log(`Created JobDescription for User B: ${jdB.id}`);
  } catch (err: any) {
    console.error("Failed to set up test fixtures in PostgreSQL:", err);
    process.exit(1);
  }

  try {
    // ========================================================================
    // TEST 1: Start WITHOUT jobDescriptionId -> works as before, null in DB
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 1: Start WITHOUT jobDescriptionId ---${RESET}`);
    mockAuthSession = { user: { id: userA.id, email: userA.email } };

    const req1 = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
      }),
    });

    const res1 = await startInterviewHandler(req1);
    const body1 = await res1.json();

    assert(res1.status === 200, "Test 1.1: Start without jobDescriptionId returns 200", `status=${res1.status}`);
    assert(body1.error === false, "Test 1.2: body1.error is false");
    assert(typeof body1.data?.sessionId === "string", "Test 1.3: Returns sessionId");

    if (body1.data?.sessionId) {
      createdSessionIds.push(body1.data.sessionId);
      const dbSession1 = await prisma.interviewSession.findUnique({
        where: { id: body1.data.sessionId },
      });
      assert(dbSession1 !== null, "Test 1.4: Session row created in DB");
      assert(dbSession1?.jobDescriptionId === null, "Test 1.5: dbSession.jobDescriptionId is NULL when not provided");
    }

    // ========================================================================
    // TEST 2: Start WITH own valid jobDescriptionId -> stored in DB
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 2: Start WITH own valid jobDescriptionId ---${RESET}`);
    mockAuthSession = { user: { id: userA.id, email: userA.email } };

    const req2 = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        jobDescriptionId: jdA.id,
      }),
    });

    const res2 = await startInterviewHandler(req2);
    const body2 = await res2.json();

    assert(res2.status === 200, "Test 2.1: Start with valid own jobDescriptionId returns 200", `status=${res2.status}`);
    assert(body2.error === false, "Test 2.2: body2.error is false");
    assert(typeof body2.data?.sessionId === "string", "Test 2.3: Returns sessionId");

    if (body2.data?.sessionId) {
      createdSessionIds.push(body2.data.sessionId);
      const dbSession2 = await prisma.interviewSession.findUnique({
        where: { id: body2.data.sessionId },
      });
      assert(dbSession2 !== null, "Test 2.4: Session row created in DB");
      assert(dbSession2?.jobDescriptionId === jdA.id, `Test 2.5: dbSession.jobDescriptionId matches jdA.id (${jdA.id})`);
    }

    // ========================================================================
    // TEST 3: Start with jobDescriptionId belonging to ANOTHER user -> rejected
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 3: Start with ANOTHER user's jobDescriptionId ---${RESET}`);
    mockAuthSession = { user: { id: userA.id, email: userA.email } };

    const sessionCountBeforeTest3 = await prisma.interviewSession.count({
      where: { userId: userA.id },
    });

    const req3 = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        jobDescriptionId: jdB.id, // jdB belongs to userB!
      }),
    });

    const res3 = await startInterviewHandler(req3);
    const body3 = await res3.json();

    assert(res3.status === 404, "Test 3.1: Request with other user's JD returns 404", `status=${res3.status}`);
    assert(body3.error === true, "Test 3.2: body3.error is true");

    const sessionCountAfterTest3 = await prisma.interviewSession.count({
      where: { userId: userA.id },
    });
    assert(sessionCountAfterTest3 === sessionCountBeforeTest3, "Test 3.3: No session created in DB for other user's JD");

    // ========================================================================
    // TEST 4: Start with NONEXISTENT jobDescriptionId -> rejected
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 4: Start with NONEXISTENT jobDescriptionId ---${RESET}`);
    mockAuthSession = { user: { id: userA.id, email: userA.email } };

    const sessionCountBeforeTest4 = await prisma.interviewSession.count({
      where: { userId: userA.id },
    });

    const req4 = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        jobDescriptionId: "cuid_fake_nonexistent_jd_999",
      }),
    });

    const res4 = await startInterviewHandler(req4);
    const body4 = await res4.json();

    assert(res4.status === 404, "Test 4.1: Request with nonexistent JD returns 404", `status=${res4.status}`);
    assert(body4.error === true, "Test 4.2: body4.error is true");

    const sessionCountAfterTest4 = await prisma.interviewSession.count({
      where: { userId: userA.id },
    });
    assert(sessionCountAfterTest4 === sessionCountBeforeTest4, "Test 4.3: No session created in DB for nonexistent JD");

    // ========================================================================
    // TEST 5: Same rejection response shape for tests 3 and 4 (no leaking)
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 5: Rejection Shape Invariance (No Leaks) ---${RESET}`);
    assert(res3.status === res4.status, "Test 5.1: Status codes match exactly (both 404)");
    assert(body3.error === body4.error, "Test 5.2: Error flags match exactly (both true)");
    assert(body3.message === body4.message, `Test 5.3: Messages match exactly ("${body3.message}")`);
    assert(
      JSON.stringify(body3) === JSON.stringify(body4),
      "Test 5.4: Entire JSON response body matches byte-for-byte between tests 3 and 4"
    );

    // ========================================================================
    // TEST 6: Unauthenticated request -> unchanged behavior (401)
    // ========================================================================
    console.log(`\n${YELLOW}--- Test 6: Unauthenticated Request ---${RESET}`);
    mockAuthSession = null;

    const req6 = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        jobDescriptionId: jdA.id,
      }),
    });

    const res6 = await startInterviewHandler(req6);
    const body6 = await res6.json();

    assert(res6.status === 401, "Test 6.1: Unauthenticated request returns 401", `status=${res6.status}`);
    assert(body6.error === true, "Test 6.2: body6.error is true");
    assert(body6.message === "Unauthorized. Please sign in first.", "Test 6.3: Returns standard unauthorized message");

  } finally {
    // ========================================================================
    // CLEANUP: Clean up test data
    // ========================================================================
    console.log(`\n${YELLOW}--- Cleaning Up Test Rows ---${RESET}`);
    try {
      if (createdSessionIds.length > 0) {
        await prisma.interviewMessage.deleteMany({
          where: { sessionId: { in: createdSessionIds } },
        });
        await prisma.interviewSession.deleteMany({
          where: { id: { in: createdSessionIds } },
        });
        console.log(`  Cleaned up ${createdSessionIds.length} test interview sessions.`);
      }

      if (jdA?.id || jdB?.id) {
        const jdIds = [jdA?.id, jdB?.id].filter(Boolean);
        await prisma.jobDescription.deleteMany({
          where: { id: { in: jdIds } },
        });
        console.log(`  Cleaned up ${jdIds.length} test JobDescription rows.`);
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
  console.log(`${CYAN}${BOLD}Start Route Test Suite Summary: ${passedCount} Passed, ${failedCount} Failed${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStartRouteTests().catch((err) => {
  console.error("Unhandled error running start route tests:", err);
  process.exit(1);
});
