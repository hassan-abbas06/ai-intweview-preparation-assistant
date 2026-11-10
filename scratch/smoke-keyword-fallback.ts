import fs from "fs";
import path from "path";
import {
  extractJdKeywords,
  extractJdKeywordsWithFallback,
  termLiterallyInJd,
} from "../lib/resume/keywords";

// Load .env file into process.env if present
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Intercept console.log and console.warn to capture LLM serving details
const llmLogs: string[] = [];
const originalLog = console.log;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  if (msg.includes("[LLM") || msg.includes("Served by")) {
    llmLogs.push(msg);
  }
  originalLog(...args);
};

console.warn = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  if (msg.includes("[LLM") || msg.includes("fallback") || msg.includes("failed")) {
    llmLogs.push(msg);
  }
  originalWarn(...args);
};

const MARKETING_JD = `
Senior Digital Marketing Specialist

We are seeking a creative and data-driven Digital Marketing Specialist to lead our organic and paid acquisition efforts.

Key Responsibilities:
- Design and execute comprehensive content strategy across multiple channels.
- Implement high-impact SEO optimizations to grow organic website traffic.
- Analyze campaign performance and conversion funnels using Google Analytics.
- Create automated email campaigns and workflows to nurture incoming leads.
- Craft persuasive copywriting for landing pages, ad creatives, and promotional assets.
- Ensure consistent brand voice and messaging across all digital touchpoints.

Required Qualifications:
- 4+ years of hands-on digital marketing experience.
- Deep expertise in SEO, content strategy, and Google Analytics.
- Proven track record with email campaigns, copywriting, and maintaining brand voice.
- Excellent communication and collaborative teamwork abilities.
`.trim();

const NURSING_JD = `
Registered Nurse - Acute Care Unit

Our healthcare center is seeking a compassionate and skilled Registered Nurse for our fast-paced Acute Care Unit.

Key Responsibilities:
- Deliver direct, high-quality patient care to adult medical-surgical patients.
- Perform rapid emergency triage and patient assessment upon admission.
- Maintain accurate and comprehensive documentation in electronic health records.
- Routinely monitor, record, and interpret patient vital signs.
- Ensure strict compliance with hospital safety standards in medication administration.
- Place peripheral intravenous lines and monitor continuous iv therapy.

Required Qualifications:
- Active Registered Nurse (RN) license in good standing.
- Demonstrated clinical competency in patient care and acute triage.
- Proficiency in electronic health records systems and vital signs monitoring.
- Documented certification and experience in medication administration and iv therapy.
`.trim();

const ACCOUNTING_JD = `
Staff Accountant

We are seeking a detail-oriented Staff Accountant to manage general ledger accounting, prepare monthly balance sheet reconciliations, execute accounts payable processing, and assist with financial auditing. You will prepare journal entries, perform tax compliance reporting, maintain fixed asset schedules, and generate financial statements. Requirements: Bachelor's degree in accounting or finance, proficiency in QuickBooks and payroll processing, and strong attention to detail.
`.trim();

interface SmokeTestScenario {
  title: string;
  jd: string;
}

const scenarios: SmokeTestScenario[] = [
  { title: "Marketing JD", jd: MARKETING_JD },
  { title: "Nursing JD", jd: NURSING_JD },
  { title: "Accounting JD (~60 words)", jd: ACCOUNTING_JD },
];

async function runSmokeTests() {
  originalLog("\n=======================================================");
  originalLog("REAL-LLM KEYWORD FALLBACK SMOKE TEST");
  originalLog("=======================================================\n");

  for (let s = 0; s < scenarios.length; s++) {
    const scenario = scenarios[s];
    originalLog(`\n>>> SCENARIO ${s + 1}: ${scenario.title} <<<`);

    const deterministic = extractJdKeywords(scenario.jd);
    originalLog(`Deterministic Keyword Count: ${deterministic.length}`);
    originalLog(`Deterministic Keywords: [${deterministic.join(", ")}]`);

    llmLogs.length = 0; // Clear logs before call
    const startLogsIdx = llmLogs.length;

    let resultKeywords: string[] = [];
    let inferred: string[] = [];
    let failureReason: string | null = null;

    try {
      const res = await extractJdKeywordsWithFallback(scenario.jd);
      resultKeywords = res.keywords || res;
      inferred = res.inferredFromLlm || [];
    } catch (err: any) {
      failureReason = err?.message || String(err);
    }

    // Extract serving model/provider from captured logs
    const relevantLogs = llmLogs.slice(startLogsIdx);
    let servingInfo = "Not determined (check logs)";
    for (let l = 0; l < relevantLogs.length; l++) {
      const line = relevantLogs[l];
      if (line.includes("Served by")) {
        const match = line.match(/Served by\s+([^\s]+)\s+\(([^)]+)\)/);
        if (match) {
          servingInfo = `${match[1]} (${match[2]})`;
        } else {
          servingInfo = line;
        }
      }
    }

    originalLog(`Serving Provider / Model: ${servingInfo}`);
    if (failureReason) {
      originalLog(`Provider Error / Failure: ${failureReason}`);
    }

    originalLog(`Final Extracted Keywords (${resultKeywords.length}):`);
    originalLog(`  [${resultKeywords.join(", ")}]`);

    originalLog(`Inferred from LLM (${inferred.length}):`);
    originalLog(`  [${inferred.join(", ")}]`);

    originalLog("Literal Appearance in JD Verification (alias-aware whole-word):");
    let allPassed = true;
    for (let i = 0; i < resultKeywords.length; i++) {
      const kw = resultKeywords[i];
      const appears = termLiterallyInJd(scenario.jd, kw);
      const status = appears ? "PASS" : "FAIL";
      if (!appears) allPassed = false;
      originalLog(`  - [${status}] "${kw}"`);
    }

    originalLog(`Scenario Result: ${allPassed ? "ALL KEYWORDS PRESENT IN JD" : "SOME KEYWORDS FAILED LITERAL CHECK"}`);
    originalLog("-------------------------------------------------------");
  }
}

runSmokeTests().catch((err) => {
  originalLog("Smoke test failed with unhandled error:", err);
  process.exit(1);
});
