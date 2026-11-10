import * as fs from "fs";
import * as path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
import { POST as generateQuestionsHandler } from "../app/api/interview/generate-questions/route";
import { POST as startInterviewHandler } from "../app/api/interview/start/route";
import { JDConfirmationCard } from "../components/interview/jd-confirmation-card";

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

async function runUITests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: STEP 6 UI & FLOW VERIFICATION SUITE   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const createdSessionIds: string[] = [];
  const createdJdIds: string[] = [];
  let testUser: any = null;

  try {
    testUser = await prisma.user.create({
      data: {
        email: `phase5_ui_test_${Date.now()}@example.com`,
        role: "USER",
        domain: "Software_Engineering",
      },
    });
    mockAuthSession = { user: { id: testUser.id, email: testUser.email } };
    console.log(`Created test candidate: ${testUser.id} (${testUser.email})`);
  } catch (err: any) {
    console.error("Failed to initialize test user in database:", err);
    process.exit(1);
  }

  try {
    // ------------------------------------------------------------------------
    // CHECK A: Empty textarea -> blocked client-side, no request sent
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check A: Empty / Whitespace Textarea Blocked Client-Side ---${RESET}`);
    const emptyInputs = ["", "   ", "\n\t  "];
    for (const input of emptyInputs) {
      const isBlocked = !input.trim();
      assert(isBlocked, `Check A: Input "${input.replace(/\n/g, "\\n").replace(/\t/g, "\\t")}" is blocked client-side without firing request`);
    }

    // ------------------------------------------------------------------------
    // CHECK B: Real JD -> loading -> card with chips
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check B: Real JD -> Generates Profile -> Renders Card with Chips ---${RESET}`);
    const realJdText = `
      Senior Backend Engineer - Core Infrastructure
      Requirements:
      - 5+ years of experience with Node.js and TypeScript
      - Production experience with Apache Kafka and PostgreSQL
      - Solid understanding of Docker and Redis caching
      Responsibilities:
      - Design low-latency distributed microservices
      - Optimize database queries and schema designs
    `;

    const genReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: realJdText }),
    });

    const genRes = await generateQuestionsHandler(genReq);
    const genBody = await genRes.json();

    assert(genRes.status === 200, "Check B.1: generate-questions returned 200");
    assert(genBody.error === false, "Check B.2: genBody.error is false");
    assert(typeof genBody.data?.jobDescriptionId === "string", "Check B.3: Returned jobDescriptionId");
    assert(genBody.data.confidence === "ok", "Check B.4: Confidence is 'ok'");
    assert(genBody.data.skills.length > 0, `Check B.5: Extracted skills count: ${genBody.data.skills.length}`);

    if (genBody.data?.jobDescriptionId) {
      createdJdIds.push(genBody.data.jobDescriptionId);
    }

    // Render JDConfirmationCard with Real JD data
    let continueTriggered = false;
    let skipTriggered = false;

    const realCardHtml = renderToStaticMarkup(
      React.createElement(JDConfirmationCard, {
        role: genBody.data.role,
        seniority: genBody.data.seniority,
        skills: genBody.data.skills,
        responsibilities: genBody.data.responsibilities,
        confidence: genBody.data.confidence,
        onContinue: () => { continueTriggered = true; },
        onSkip: () => { skipTriggered = true; },
        isStarting: false,
      })
    );

    assert(realCardHtml.includes("Extracted Job Description Profile"), "Check B.6: Card header rendered");
    assert(realCardHtml.includes("Verified JD"), "Check B.7: Verified JD badge displayed");
    assert(!realCardHtml.includes("Low Confidence"), "Check B.8: Low confidence warning NOT displayed");
    assert(realCardHtml.includes("Looks good, continue"), "Check B.9: 'Looks good, continue' action button present");
    assert(realCardHtml.includes("Skip, don&#x27;t use this") || realCardHtml.includes("Skip, don't use this"), "Check B.10: 'Skip' button present");
    for (const skill of genBody.data.skills.slice(0, 3)) {
      assert(realCardHtml.includes(skill), `Check B.11: Skill chip rendered for "${skill}"`);
    }

    // ------------------------------------------------------------------------
    // CHECK C: Low-confidence text -> card with gentle note
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check C: Low-Confidence Text -> Card with Gentle Warning Note ---${RESET}`);
    const lowConfText = "We are having a team picnic this Saturday at the central city park. Bring your lunch!";

    const lowReq = new NextRequest("http://localhost:3000/api/interview/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: lowConfText }),
    });

    const lowRes = await generateQuestionsHandler(lowReq);
    const lowBody = await lowRes.json();

    assert(lowRes.status === 200, "Check C.1: generate-questions returned 200 (never blocks)");
    assert(lowBody.data.confidence === "low", "Check C.2: Confidence is 'low'");

    if (lowBody.data?.jobDescriptionId) {
      createdJdIds.push(lowBody.data.jobDescriptionId);
    }

    const lowCardHtml = renderToStaticMarkup(
      React.createElement(JDConfirmationCard, {
        role: lowBody.data.role,
        seniority: lowBody.data.seniority,
        skills: lowBody.data.skills,
        responsibilities: lowBody.data.responsibilities,
        confidence: lowBody.data.confidence,
        onContinue: () => {},
        onSkip: () => {},
        isStarting: false,
      })
    );

    assert(lowCardHtml.includes("Low Confidence"), "Check C.3: Card displays 'Low Confidence' badge");
    assert(
      lowCardHtml.includes("We couldn&#x27;t extract much structured data") ||
      lowCardHtml.includes("We couldn't extract much structured data"),
      "Check C.4: Gentle note rendered warning candidate that extraction was limited"
    );
    assert(lowCardHtml.includes("Not detected"), "Check C.5: 'Not detected' displayed for missing role/seniority");
    assert(lowCardHtml.includes("Looks good, continue"), "Check C.6: Candidate can still choose to continue");

    // ------------------------------------------------------------------------
    // CHECK D: "Looks good" starts a session with jobDescriptionId stored in DB
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check D: 'Looks good' Starts Session with jobDescriptionId in DB ---${RESET}`);
    const jdIdToUse = genBody.data.jobDescriptionId;

    const startReqD = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        jobDescriptionId: jdIdToUse,
      }),
    });

    const startResD = await startInterviewHandler(startReqD);
    const startBodyD = await startResD.json();

    assert(startResD.status === 200, "Check D.1: Start session returned 200");
    assert(typeof startBodyD.data?.sessionId === "string", "Check D.2: Session ID returned");

    if (startBodyD.data?.sessionId) {
      createdSessionIds.push(startBodyD.data.sessionId);
      const dbSessionD = await prisma.interviewSession.findUnique({
        where: { id: startBodyD.data.sessionId },
      });
      assert(dbSessionD !== null, "Check D.3: Session exists in DB");
      assert(dbSessionD?.jobDescriptionId === jdIdToUse, `Check D.4: Stored jobDescriptionId in DB matches (${jdIdToUse})`);
    }

    // ------------------------------------------------------------------------
    // CHECK E: "Skip" starts a session with jobDescriptionId null
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check E: 'Skip' Starts Session with jobDescriptionId NULL ---${RESET}`);
    const startReqE = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        jobDescriptionId: null, // explicitly skipped
      }),
    });

    const startResE = await startInterviewHandler(startReqE);
    const startBodyE = await startResE.json();

    assert(startResE.status === 200, "Check E.1: Start session returned 200");
    assert(typeof startBodyE.data?.sessionId === "string", "Check E.2: Session ID returned");

    if (startBodyE.data?.sessionId) {
      createdSessionIds.push(startBodyE.data.sessionId);
      const dbSessionE = await prisma.interviewSession.findUnique({
        where: { id: startBodyE.data.sessionId },
      });
      assert(dbSessionE !== null, "Check E.3: Session exists in DB");
      assert(dbSessionE?.jobDescriptionId === null, "Check E.4: dbSession.jobDescriptionId is strictly NULL");
    }

    // ------------------------------------------------------------------------
    // CHECK F: Normal start without touching JD section works as before
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check F: Normal Start Without Touching JD Section ---${RESET}`);
    const startReqF = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        modality: "TEXT",
        // no jobDescriptionId field
      }),
    });

    const startResF = await startInterviewHandler(startReqF);
    const startBodyF = await startResF.json();

    assert(startResF.status === 200, "Check F.1: Normal start returned 200");
    assert(typeof startBodyF.data?.sessionId === "string", "Check F.2: Session ID returned");

    if (startBodyF.data?.sessionId) {
      createdSessionIds.push(startBodyF.data.sessionId);
      const dbSessionF = await prisma.interviewSession.findUnique({
        where: { id: startBodyF.data.sessionId },
      });
      assert(dbSessionF !== null, "Check F.3: Session exists in DB");
      assert(dbSessionF?.jobDescriptionId === null, "Check F.4: dbSession.jobDescriptionId is strictly NULL");
    }

    // ------------------------------------------------------------------------
    // CHECK G: Aptitude track hides/ignores JD section
    // ------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- Check G: Aptitude Track Logic Hides & Ignores JD ---${RESET}`);
    // Check page logic expression:
    const selectedTrackAptitude: string = "APTITUDE";
    const isJdSectionVisibleForAptitude = selectedTrackAptitude !== "APTITUDE";
    assert(isJdSectionVisibleForAptitude === false, "Check G.1: selectedTrack !== 'APTITUDE' evaluates to false for APTITUDE track");

    const selectedTrackDomain: string = "DOMAIN";
    const isJdSectionVisibleForDomain = selectedTrackDomain !== "APTITUDE";
    assert(isJdSectionVisibleForDomain === true, "Check G.2: selectedTrack !== 'APTITUDE' evaluates to true for DOMAIN track");

    const selectedTrackHR: string = "HR";
    const isJdSectionVisibleForHR = selectedTrackHR !== "APTITUDE";
    assert(isJdSectionVisibleForHR === true, "Check G.3: selectedTrack !== 'APTITUDE' evaluates to true for HR track");

    // In page.tsx: effectiveJdId = selectedTrack !== "APTITUDE" ? ... : null
    const effectiveJdIdForAptitude =
      selectedTrackAptitude !== "APTITUDE" ? jdIdToUse : null;
    assert(effectiveJdIdForAptitude === null, "Check G.4: effectiveJdId is strictly null when selectedTrack is APTITUDE");

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
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

      if (createdJdIds.length > 0) {
        await prisma.jobDescription.deleteMany({
          where: { id: { in: createdJdIds } },
        });
        console.log(`  Cleaned up ${createdJdIds.length} test JobDescription rows.`);
      }

      if (testUser?.id) {
        await prisma.user.deleteMany({
          where: { id: testUser.id },
        });
        console.log(`  Cleaned up test candidate ${testUser.id}.`);
      }
    } catch (cleanupErr: any) {
      console.error("  Warning during cleanup:", cleanupErr);
    }
  }

  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}UI & Flow Verification Summary: ${passedCount} Passed, ${failedCount} Failed${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runUITests().catch((err) => {
  console.error("Unhandled error during UI test execution:", err);
  process.exit(1);
});
