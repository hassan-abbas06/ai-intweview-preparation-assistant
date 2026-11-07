import * as fs from "fs";
import * as path from "path";
import {
  generateSuggestions,
  SuggestionsOutput,
  BANNED_INFLATION_WORDS,
  OUTCOME_WORDS,
} from "../lib/resume/suggestions";
import { AtsCheckItem, scoreResume } from "../lib/resume/ats-score";
import { ParsedResume } from "../lib/resume/parse";

// Load .env and .env.local manually if present
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

const WEAK_RESUME_TEXT = `
John Doe
john.doe@example.com | 555-123-4567 | New York, NY

Summary
Experienced software developer with skills in web applications.

Experience
Software Engineer at Acme Corp (2020 - 2023)
- Responsible for backend work and fixing bugs
- Worked on the login page and improved authentication
- Helped with database optimization and queries

Education
BS in Computer Science, Tech University, 2020

Skills
JavaScript, Node.js, Express, SQL, Git
`.trim();

const SAMPLE_JD = `
We are looking for a Senior Backend Engineer to join our cloud platform team.
Requirements:
- 3+ years experience with Node.js and TypeScript.
- Strong knowledge of PostgreSQL, Redis, and database query optimization.
- Experience with Docker, Kubernetes, and AWS cloud architecture.
- Demonstrated ability to write clean, unit-tested code with Jest.
- Strong cross-functional communication and Agile experience.
`.trim();

function normalizeForSubstr(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function checkBannedInflation(original: string, improved: string): boolean {
  for (let b = 0; b < BANNED_INFLATION_WORDS.length; b++) {
    const word = BANNED_INFLATION_WORDS[b];
    const regex = new RegExp("\\b" + word + "\\b", "i");
    if (regex.test(improved) && !regex.test(original)) {
      return true; // Contains banned inflation
    }
  }
  return false;
}

function checkOutcomeWord(original: string, improved: string): boolean {
  for (let o = 0; o < OUTCOME_WORDS.length; o++) {
    const word = OUTCOME_WORDS[o];
    const regex = new RegExp("\\b" + word + "\\b", "i");
    if (regex.test(improved) && !regex.test(original)) {
      return true; // Contains invented outcome word
    }
  }
  return false;
}

function checkWordCountExceeded(original: string, improved: string): boolean {
  const origWords = original.trim().split(/\s+/).filter(Boolean).length;
  const impWords = improved.trim().split(/\s+/).filter(Boolean).length;
  return origWords > 0 && impWords > origWords * 1.5;
}

async function runTests() {
  console.log("==================================================");
  console.log("STAGE 2B: Strict Grounding, Outcome & Word Count Guard Tests");
  console.log("==================================================\n");

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      totalPassed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || "Condition not met"}`);
      totalFailed++;
    }
  }

  // 1. First test deterministic score checks on the weak resume
  const parsedResume: ParsedResume = {
    fileType: "docx",
    text: WEAK_RESUME_TEXT,
    wordCount: WEAK_RESUME_TEXT.split(/\s+/).length,
    sections: {
      contact: "John Doe\njohn.doe@example.com | 555-123-4567",
      summary: "Experienced software developer with skills in web applications.",
      experience: "- Responsible for backend work and fixing bugs\n- Worked on the login page and improved authentication\n- Helped with database optimization and queries",
      education: "BS in Computer Science, Tech University, 2020",
      skills: "JavaScript, Node.js, Express, SQL, Git",
      projects: null,
    },
    structure: {
      fileType: "docx",
      ocrUsed: false,
      pageCount: null,
      tableCount: 0,
      imageCount: 0,
      columnCount: 1,
      hasHeaderFooterContent: false,
      distinctFontCount: 2,
    },
    warnings: [],
  };

  const scoreResult = scoreResume(parsedResume, SAMPLE_JD);
  console.log(`Weak Resume Score: ${scoreResult.score}/100, Mode: ${scoreResult.mode}`);
  console.log(`Checks with warn/fail: ${scoreResult.checks.filter(c => c.status === "warn" || c.status === "fail").map(c => c.id).join(", ")}`);
  console.log(`Missing JD Keywords: ${scoreResult.keywords?.missing.slice(0, 5).join(", ")}...\n`);

  // 2. Call generateSuggestions
  console.log("Calling generateSuggestions with tightened prompt and real LLM provider...");
  const suggestions = await generateSuggestions({
    text: parsedResume.text,
    checks: scoreResult.checks,
    keywords: scoreResult.keywords,
    mode: scoreResult.mode,
    jdText: SAMPLE_JD,
  });

  if (suggestions) {
    console.log(`\nSurviving Bullet Rewrites (${suggestions.bulletRewrites.length}):`);
    for (let i = 0; i < suggestions.bulletRewrites.length; i++) {
      const br = suggestions.bulletRewrites[i];
      const origWords = br.original.trim().split(/\s+/).filter(Boolean).length;
      const impWords = br.improved.trim().split(/\s+/).filter(Boolean).length;
      const ratio = (impWords / origWords).toFixed(2);
      console.log(`\n  Rewrite #${i + 1}:`);
      console.log(`    Original (${origWords} words): "${br.original}"`);
      console.log(`    Improved (${impWords} words, ${ratio}x of original): "${br.improved}"`);
      console.log(`    Reason: "${br.reason}"`);
    }

    console.log(`\nGenerated ${suggestions.formattingNotes.length} formatting notes:`);
    for (let i = 0; i < suggestions.formattingNotes.length; i++) {
      const fn = suggestions.formattingNotes[i];
      console.log(`  Note #${i + 1} (${fn.checkId}): "${fn.whyItMatters}"`);
    }

    console.log(`\nGenerated ${suggestions.jdGaps.length} JD gaps:`);
    for (let i = 0; i < suggestions.jdGaps.length; i++) {
      const jg = suggestions.jdGaps[i];
      console.log(`  Gap #${i + 1} (${jg.keyword}): "${jg.suggestion}"`);
    }

    // Verify Guard 1: Substring validation
    const normResume = normalizeForSubstr(parsedResume.text);
    let allOriginalsAreSubstrings = true;
    for (let i = 0; i < suggestions.bulletRewrites.length; i++) {
      const normOrig = normalizeForSubstr(suggestions.bulletRewrites[i].original);
      if (!normResume.includes(normOrig)) {
        allOriginalsAreSubstrings = false;
        console.error(`Substr mismatch on: "${suggestions.bulletRewrites[i].original}"`);
      }
    }
    assert(allOriginalsAreSubstrings, "All returned rewrite originals are verified substrings of the resume");

    // Verify Guard 2: Word count limit (<= 1.5x)
    let allWithinWordCount = true;
    for (let i = 0; i < suggestions.bulletRewrites.length; i++) {
      const r = suggestions.bulletRewrites[i];
      if (checkWordCountExceeded(r.original, r.improved)) {
        allWithinWordCount = false;
        console.error(`Rewrite exceeded 1.5x word count: "${r.improved}"`);
      }
    }
    assert(allWithinWordCount, "All returned rewrites stay within 1.5x word count of original");

    // Verify Guard 3: No invented unbracketed digits
    let noInventedNumbers = true;
    for (let i = 0; i < suggestions.bulletRewrites.length; i++) {
      const r = suggestions.bulletRewrites[i];
      const origDigits = new Set(Array.from(r.original.match(/\d/g) || []));
      const improvedNoBrackets = r.improved.replace(/\[[^\]]*\]/g, "");
      const impDigits = Array.from(improvedNoBrackets.match(/\d/g) || []);
      for (let j = 0; j < impDigits.length; j++) {
        if (!origDigits.has(impDigits[j])) {
          noInventedNumbers = false;
          console.error(`Hallucinated digit ${impDigits[j]} in rewrite: "${r.improved}"`);
        }
      }
    }
    assert(noInventedNumbers, "No hallucinated unbracketed digits in improved bullets");

    // Verify Guard 4: No banned inflation words
    let noBannedWords = true;
    for (let i = 0; i < suggestions.bulletRewrites.length; i++) {
      const r = suggestions.bulletRewrites[i];
      if (checkBannedInflation(r.original, r.improved)) {
        noBannedWords = false;
        console.error(`Banned word detected in returned rewrite: "${r.improved}"`);
      }
    }
    assert(noBannedWords, "No banned inflation words in any returned rewrite from real LLM");

    // Verify Guard 5: No ungrounded outcome words
    let noOutcomeWords = true;
    for (let i = 0; i < suggestions.bulletRewrites.length; i++) {
      const r = suggestions.bulletRewrites[i];
      if (checkOutcomeWord(r.original, r.improved)) {
        noOutcomeWords = false;
        console.error(`Invented outcome word detected in returned rewrite: "${r.improved}"`);
      }
    }
    assert(noOutcomeWords, "No ungrounded outcome words in any returned rewrite from real LLM");

    // Verify Guard 6: formattingNotes only for warn or fail checks
    const warnOrFailIds = new Set(
      scoreResult.checks
        .filter((c) => c.status === "warn" || c.status === "fail")
        .map((c) => c.id)
    );
    let notesOnlyForWarnFail = true;
    for (let i = 0; i < suggestions.formattingNotes.length; i++) {
      if (!warnOrFailIds.has(suggestions.formattingNotes[i].checkId)) {
        notesOnlyForWarnFail = false;
      }
    }
    assert(notesOnlyForWarnFail, "Formatting notes only reference checks that warned or failed");

    // Verify Guard 7: jdGaps conditional phrasing
    let allGapsPhrasedConditionally = true;
    for (let i = 0; i < suggestions.jdGaps.length; i++) {
      const g = suggestions.jdGaps[i];
      if (!g.suggestion.toLowerCase().includes("if")) {
        allGapsPhrasedConditionally = false;
        console.warn(`JD gap might not be phrased conditionally: "${g.suggestion}"`);
      }
    }
    assert(allGapsPhrasedConditionally || suggestions.jdGaps.length === 0, "JD gaps phrased conditionally ('If this is true...')");
  } else {
    console.log("Note: LLM Suggestions returned null (e.g. no API key or provider offline). Verifying guard unit logic directly...");
  }

  // 3. Test the exact filter logic with synthetic adversarial samples
  console.log("\nRunning Adversarial & Compliant Guard Unit Tests:");

  const normResume = normalizeForSubstr(WEAK_RESUME_TEXT);

  // Adversarial Case A: LLM hallucinates a bullet from another resume
  const fakeBullet = "Led an engineering team of 15 at Google and managed $2M budget";
  const fakeNorm = normalizeForSubstr(fakeBullet);
  assert(!normResume.includes(fakeNorm), "Adversarial: Hallucinated bullet correctly rejected by substring check");

  // Adversarial Case B: LLM invents a metric outside brackets
  const origBulletB = "Worked on the login page and improved authentication";
  const hallucinatedMetricB = "Contributed to login page, speeding up auth by 40% and saving 10 hours weekly";
  const origDigitsB = new Set(Array.from(origBulletB.match(/\d/g) || []));
  const impNoBracketsB = hallucinatedMetricB.replace(/\[[^\]]*\]/g, "");
  const impDigitsB = Array.from(impNoBracketsB.match(/\d/g) || []);
  let hasHallucinatedDigitB = false;
  for (let j = 0; j < impDigitsB.length; j++) {
    if (!origDigitsB.has(impDigitsB[j])) {
      hasHallucinatedDigitB = true;
      break;
    }
  }
  assert(hasHallucinatedDigitB, "Adversarial: Invented digits '4', '0', '1' outside brackets correctly detected");

  // Compliant Case C: Proper placeholder metric inside brackets
  const compliantMetricC = "Contributed to login flow, supporting [number] active users";
  const impNoBracketsC = compliantMetricC.replace(/\[[^\]]*\]/g, "");
  const impDigitsC = Array.from(impNoBracketsC.match(/\d/g) || []);
  let hasHallucinatedDigitC = false;
  for (let j = 0; j < impDigitsC.length; j++) {
    if (!origDigitsB.has(impDigitsC[j])) {
      hasHallucinatedDigitC = true;
      break;
    }
  }
  assert(!hasHallucinatedDigitC, "Compliant: Bracketed placeholder [number] safely passes digit validation");

  // Adversarial Case D: Banned-word inflation guard
  const origBulletD = "Responsible for backend work and fixing bugs";
  const inflatedBulletD1 = "Architected backend services and resolved critical bugs";
  const inflatedBulletD2 = "Spearheaded backend work and engineered bug fixes";
  const inflatedBulletD3 = "Drastically improved backend work, significantly fixing bugs";
  const inflatedBulletD4 = "Pioneered backend work and revolutionized bug tracking";

  assert(
    checkBannedInflation(origBulletD, inflatedBulletD1),
    "Adversarial: Banned words 'architected' and 'critical' correctly caught by guard"
  );
  assert(
    checkBannedInflation(origBulletD, inflatedBulletD2),
    "Adversarial: Banned words 'spearheaded' and 'engineered' correctly caught by guard"
  );
  assert(
    checkBannedInflation(origBulletD, inflatedBulletD3),
    "Adversarial: Banned words 'drastically' and 'significantly' correctly caught by guard"
  );
  assert(
    checkBannedInflation(origBulletD, inflatedBulletD4),
    "Adversarial: Banned words 'pioneered' and 'revolutionized' correctly caught by guard"
  );

  // Compliant Case E: Banned word was already in original bullet
  const origBulletE = "Resolved critical bugs in payment processing";
  const improvedBulletE = "Resolved critical bugs in payment processing for [number] accounts";
  assert(
    !checkBannedInflation(origBulletE, improvedBulletE),
    "Compliant: Banned word 'critical' allowed when already present in original bullet"
  );

  // Adversarial Case F: Word-count guard (> 1.5x original)
  const origBulletF = "Helped with database optimization and queries"; // 6 words (max 1.5x = 9 words)
  const tooLongBulletF = "Contributed to extensive database query optimization and resolved several backend queries across the app"; // 14 words (2.33x)
  assert(
    checkWordCountExceeded(origBulletF, tooLongBulletF),
    "Adversarial: Word count (14 words) > 1.5x original (6 words) correctly caught by guard"
  );

  // Compliant Case G: Word-count guard (<= 1.5x original)
  const compliantLengthBulletG = "Contributed to database query optimization and queries"; // 7 words (1.17x)
  assert(
    !checkWordCountExceeded(origBulletF, compliantLengthBulletG),
    "Compliant: Word count (7 words) <= 1.5x original (6 words) passes guard"
  );

  // Adversarial Case H: Outcome-word guard (invented outcome words not in original)
  const origBulletH = "Helped with database optimization and queries"; // does not contain reducing, serving, boosting, etc.
  const outcomeBulletH1 = "Contributed to database query optimization, reducing latency"; // contains "reducing"
  const outcomeBulletH2 = "Assisted with backend queries, serving active users"; // contains "serving"
  const outcomeBulletH3 = "Tuned database queries, boosting application speed"; // contains "boosting"
  const outcomeBulletH4 = "Refined SQL queries, enhancing data retrieval"; // contains "enhancing"
  const outcomeBulletH5 = "Optimized backend database queries, saving hours weekly"; // contains "saving"
  const outcomeBulletH6 = "Contributed to database tuning, accelerating response times"; // contains "accelerating"

  assert(checkOutcomeWord(origBulletH, outcomeBulletH1), "Adversarial: Invented outcome 'reducing' caught by guard");
  assert(checkOutcomeWord(origBulletH, outcomeBulletH2), "Adversarial: Invented outcome 'serving' caught by guard");
  assert(checkOutcomeWord(origBulletH, outcomeBulletH3), "Adversarial: Invented outcome 'boosting' caught by guard");
  assert(checkOutcomeWord(origBulletH, outcomeBulletH4), "Adversarial: Invented outcome 'enhancing' caught by guard");
  assert(checkOutcomeWord(origBulletH, outcomeBulletH5), "Adversarial: Invented outcome 'saving' caught by guard");
  assert(checkOutcomeWord(origBulletH, outcomeBulletH6), "Adversarial: Invented outcome 'accelerating' caught by guard");

  // Compliant Case I: Outcome word was already in original bullet
  const origBulletI = "Worked on the login page and improved authentication"; // contains "improved"
  const improvedBulletI = "Built login page features and improved authentication"; // contains "improved", allowed!
  assert(
    !checkOutcomeWord(origBulletI, improvedBulletI),
    "Compliant: Outcome word 'improved' allowed when already in original bullet"
  );

  // Compliant Case J: Rewrite without any outcome words
  const compliantBulletJ = "Contributed to database query optimization and queries";
  assert(
    !checkOutcomeWord(origBulletH, compliantBulletJ),
    "Compliant: Factual rewrite without outcome words passes guard"
  );

  console.log("\n==================================================");
  console.log(`Results: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log("==================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
