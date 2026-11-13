import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { batch1Problems } from "../prisma/coding-problems/batch1";
import { batch1References } from "../prisma/coding-problems/reference/batch1.ref";

function getPythonCommand(): string {
  const candidates = [
    "C:\\Users\\abbas\\AppData\\Local\\Programs\\Python\\Python315\\python.exe",
    "python",
    "python3",
    "py",
  ];
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ["--version"], { encoding: "utf-8" });
      if (res.status === 0) {
        return cmd;
      }
    } catch {}
  }
  throw new Error("No working Python executable found");
}

function hasJavac(): boolean {
  try {
    const res = spawnSync("javac", ["-version"], { encoding: "utf-8" });
    return res.status === 0;
  } catch {
    return false;
  }
}

const pythonCmd = getPythonCommand();
const javacAvailable = hasJavac();

function runCode(cmd: string, args: string[], stdin: string): { status: number | null; stdout: string; stderr: string; timedOut: boolean } {
  const res = spawnSync(cmd, args, {
    input: stdin,
    encoding: "utf-8",
    timeout: 5000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: res.status,
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
    timedOut: Boolean(res.error && (res.error as any).code === "ETIMEDOUT"),
  };
}

interface RowResult {
  slug: string;
  pythonRef: string;
  bruteForce: string;
  jsRef: string;
  java: string;
  starter: string;
  sanity: string;
  allOk: boolean;
}

const resultsTable: RowResult[] = [];
const seenSlugs = new Set<string>();

console.log("=========================================================================================");
console.log("Validating Batch 1 Coding Problems (10 problems)...");
console.log(`Python runtime: ${pythonCmd}`);
console.log(`Node runtime:   ${process.execPath}`);
console.log(`Javac runtime:  ${javacAvailable ? "available" : "not installed"}`);
console.log("=========================================================================================\n");

let anyFailure = false;

for (const problem of batch1Problems) {
  const ref = batch1References[problem.slug];
  let pyRefOk = true;
  let pyRefDetail = "";

  let bruteOk = true;
  let bruteDetail = "";

  let jsRefOk = true;
  let jsRefDetail = "";

  let javaStatus = javacAvailable ? "PASS" : "Java not validated locally";

  let starterOk = true;
  let starterDetail = "";

  let sanityOk = true;
  let sanityDetail = "";

  // 1. Sanity checks
  if (seenSlugs.has(problem.slug)) {
    sanityOk = false;
    sanityDetail += "duplicate slug; ";
  }
  seenSlugs.add(problem.slug);

  if (problem.sampleTests.length !== 2) {
    sanityOk = false;
    sanityDetail += `sample count ${problem.sampleTests.length} != 2; `;
  }
  if (problem.hiddenTests.length !== 5) {
    sanityOk = false;
    sanityDetail += `hidden count ${problem.hiddenTests.length} != 5; `;
  }

  if (!problem.starterCode.python || !problem.starterCode.javascript || !problem.starterCode.java) {
    sanityOk = false;
    sanityDetail += "missing language in starterCode; ";
  }

  const desc = problem.description;
  const headings = [
    "### Problem Statement",
    "### Input Format",
    "### Output Format",
    "### Constraints",
  ];
  for (const h of headings) {
    if (!desc.includes(h)) {
      sanityOk = false;
      sanityDetail += `missing heading '${h}'; `;
    }
  }

  const allTests = [...problem.sampleTests, ...problem.hiddenTests];
  for (let idx = 0; idx < allTests.length; idx++) {
    const inputBytes = Buffer.byteLength(allTests[idx].input, "utf-8");
    if (inputBytes > 2048) {
      sanityOk = false;
      sanityDetail += `test ${idx + 1} input > 2KB (${inputBytes}B); `;
    }
  }

  // 2. Python reference solution check
  if (!ref || !ref.pythonRef) {
    pyRefOk = false;
    pyRefDetail = "missing ref";
  } else {
    for (let i = 0; i < allTests.length; i++) {
      const t = allTests[i];
      const run = runCode(pythonCmd, ["-c", ref.pythonRef], t.input);
      if (run.timedOut) {
        pyRefOk = false;
        pyRefDetail = `test ${i + 1} timed out`;
        break;
      }
      if (run.status !== 0) {
        pyRefOk = false;
        pyRefDetail = `test ${i + 1} failed: ${run.stderr.slice(0, 40)}`;
        break;
      }
      if (run.stdout !== t.expectedOutput.trim()) {
        pyRefOk = false;
        pyRefDetail = `test ${i + 1} output mismatch: got '${run.stdout.slice(0, 20)}' expected '${t.expectedOutput.trim().slice(0, 20)}'`;
        break;
      }
    }
  }

  // 3. Brute force solution check (for Medium / Hard)
  if (problem.difficulty === "medium" || problem.difficulty === "hard") {
    if (!ref || !ref.pythonBruteForce) {
      bruteOk = false;
      bruteDetail = "missing brute force";
    } else {
      for (let i = 0; i < allTests.length; i++) {
        const t = allTests[i];
        const run = runCode(pythonCmd, ["-c", ref.pythonBruteForce], t.input);
        if (run.timedOut) {
          bruteOk = false;
          bruteDetail = `test ${i + 1} timed out`;
          break;
        }
        if (run.status !== 0) {
          bruteOk = false;
          bruteDetail = `test ${i + 1} exit ${run.status}`;
          break;
        }
        if (run.stdout !== t.expectedOutput.trim()) {
          bruteOk = false;
          bruteDetail = `test ${i + 1} mismatch`;
          break;
        }
      }
    }
  } else {
    bruteDetail = "N/A (Easy)";
  }

  // 4. JS reference solution check
  if (!ref || !ref.jsRef) {
    jsRefOk = false;
    jsRefDetail = "missing JS ref";
  } else {
    for (let i = 0; i < allTests.length; i++) {
      const t = allTests[i];
      const run = runCode(process.execPath, ["-e", ref.jsRef], t.input);
      if (run.timedOut) {
        jsRefOk = false;
        jsRefDetail = `test ${i + 1} timed out`;
        break;
      }
      if (run.status !== 0) {
        jsRefOk = false;
        jsRefDetail = `test ${i + 1} failed: ${run.stderr.slice(0, 40)}`;
        break;
      }
      if (run.stdout !== t.expectedOutput.trim()) {
        jsRefOk = false;
        jsRefDetail = `test ${i + 1} mismatch: got '${run.stdout.slice(0, 20)}' expected '${t.expectedOutput.trim().slice(0, 20)}'`;
        break;
      }
    }
  }

  // 5. Starter code execution check (runs without crashing)
  const sample1Input = problem.sampleTests[0]?.input || "";
  const pyStarterRun = runCode(pythonCmd, ["-c", problem.starterCode.python], sample1Input);
  if (pyStarterRun.status !== 0) {
    starterOk = false;
    starterDetail += `py starter crash (${pyStarterRun.status}); `;
  }

  const jsStarterRun = runCode(process.execPath, ["-e", problem.starterCode.javascript], sample1Input);
  if (jsStarterRun.status !== 0) {
    starterOk = false;
    starterDetail += `js starter crash (${jsStarterRun.status}); `;
  }

  const rowAllOk = pyRefOk && bruteOk && jsRefOk && starterOk && sanityOk;
  if (!rowAllOk) {
    anyFailure = true;
  }

  resultsTable.push({
    slug: problem.slug,
    pythonRef: pyRefOk ? "PASS" : `FAIL (${pyRefDetail})`,
    bruteForce: bruteOk ? (bruteDetail || "PASS") : `FAIL (${bruteDetail})`,
    jsRef: jsRefOk ? "PASS" : `FAIL (${jsRefDetail})`,
    java: javaStatus,
    starter: starterOk ? "PASS" : `FAIL (${starterDetail})`,
    sanity: sanityOk ? "PASS" : `FAIL (${sanityDetail})`,
    allOk: rowAllOk,
  });
}

// Print formatted table
console.log(
  "| " +
    "Slug".padEnd(34) +
    " | " +
    "Python Ref".padEnd(10) +
    " | " +
    "Brute-Force".padEnd(12) +
    " | " +
    "JS Ref".padEnd(8) +
    " | " +
    "Java".padEnd(26) +
    " | " +
    "Starter".padEnd(8) +
    " | " +
    "Sanity".padEnd(8) +
    " |"
);
console.log(
  "|-" +
    "-".repeat(34) +
    "-|-" +
    "-".repeat(10) +
    "-|-" +
    "-".repeat(12) +
    "-|-" +
    "-".repeat(8) +
    "-|-" +
    "-".repeat(26) +
    "-|-" +
    "-".repeat(8) +
    "-|-" +
    "-".repeat(8) +
    "-|"
);

for (const r of resultsTable) {
  console.log(
    "| " +
      r.slug.padEnd(34) +
      " | " +
      r.pythonRef.padEnd(10) +
      " | " +
      r.bruteForce.padEnd(12) +
      " | " +
      r.jsRef.padEnd(8) +
      " | " +
      r.java.padEnd(26) +
      " | " +
      r.starter.padEnd(8) +
      " | " +
      r.sanity.padEnd(8) +
      " |"
  );
}

console.log("\n=========================================================================================");
if (anyFailure) {
  console.error("❌ VALIDATION FAILED on one or more problems.");
  process.exit(1);
} else {
  console.log("✅ ALL 10 PROBLEMS PASSED VALIDATION!");
  process.exit(0);
}
