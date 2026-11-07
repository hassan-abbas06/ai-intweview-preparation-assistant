import { ParsedResume } from "../lib/resume/parse";
import { scoreResume } from "../lib/resume/ats-score";
import { extractJdKeywords } from "../lib/resume/keywords";

const GOOD_RESUME_TEXT = `
Alice Dev
alice.dev@example.com | +1-555-019-2834 | San Francisco, CA | github.com/alicedev

Summary
Full Stack Software Engineer with 5+ years of experience building scalable web applications and distributed systems using React, TypeScript, Node.js, and AWS.

Experience
Senior Software Engineer - Tech Solutions Inc (2022 - Present)
- Architected high-throughput microservices using Node.js, TypeScript, and PostgreSQL, increasing system throughput by 42%.
- Built real-time analytics dashboard with React, Next.js, and Redis, reducing dashboard load times by 150ms.
- Spearheaded migration of 14 monolithic services to Docker and Kubernetes on AWS, cutting cloud infrastructure costs by 28%.
- Automated CI/CD deployment pipelines using GitHub Actions, enabling daily production releases with 99.9% uptime.
- Led cross-functional team of 6 engineers across Agile sprints and code reviews.

Software Engineer - DataCorp (2019 - 2022)
- Developed secure REST APIs and GraphQL endpoints handling over 2M requests daily.
- Optimized PostgreSQL database queries and indexing strategies, reducing query latency by 35%.
- Implemented automated unit testing and integration testing with Jest, achieving 90% test coverage.

Education
Bachelor of Science in Computer Science - University of California, Berkeley (2015 - 2019)

Skills
Languages: JavaScript, TypeScript, Python, SQL, C++, HTML, CSS
Frameworks & Libraries: React, Next.js, Node, Express, GraphQL
Databases & Cloud: PostgreSQL, Redis, MongoDB, AWS, Docker, Kubernetes, CI/CD, Git
Methodologies: Agile, Scrum, System Design, Unit Testing, Microservices
`.trim();

const goodResume: ParsedResume = {
  fileType: "docx",
  text: GOOD_RESUME_TEXT,
  wordCount: GOOD_RESUME_TEXT.split(/\s+/).length,
  sections: {
    contact: "Alice Dev\nalice.dev@example.com | +1-555-019-2834",
    summary: "Full Stack Software Engineer with 5+ years of experience...",
    experience: "- Architected high-throughput microservices using Node.js...\n- Built real-time analytics dashboard...",
    education: "Bachelor of Science in Computer Science",
    skills: "Languages: JavaScript, TypeScript, Python, SQL...",
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

const BAD_RESUME_TEXT = `
John Doe
About Me
Responsible for fixing bugs and worked on website.
Helped with customer support and duties included updating spreadsheets.
Involved in meetings every week.
High School Diploma
`.trim();

const badResume: ParsedResume = {
  fileType: "image",
  text: BAD_RESUME_TEXT,
  wordCount: BAD_RESUME_TEXT.split(/\s+/).length,
  sections: {
    contact: "John Doe",
    summary: "Responsible for fixing bugs and worked on website.",
    experience: "Helped with customer support and duties included updating spreadsheets.",
    education: "High School Diploma",
    skills: null,
    projects: null,
  },
  structure: {
    fileType: "image",
    ocrUsed: true,
    pageCount: 1,
    tableCount: 3,
    imageCount: 2,
    columnCount: 2,
    hasHeaderFooterContent: true,
    distinctFontCount: 5,
  },
  warnings: ["Image resume"],
};

// Stuff the good resume with 25 repetitions of "kubernetes"
const stuffedRepeats: string[] = [];
for (let i = 0; i < 25; i++) {
  stuffedRepeats.push("kubernetes");
}
const STUFFED_TEXT = GOOD_RESUME_TEXT + "\n\nKeywords: " + stuffedRepeats.join(" ");

const stuffedResume: ParsedResume = {
  fileType: "docx",
  text: STUFFED_TEXT,
  wordCount: STUFFED_TEXT.split(/\s+/).length,
  sections: {
    ...goodResume.sections,
  },
  structure: {
    ...goodResume.structure,
  },
  warnings: [],
};

const pdfResume: ParsedResume = {
  fileType: "pdf",
  text: GOOD_RESUME_TEXT,
  wordCount: GOOD_RESUME_TEXT.split(/\s+/).length,
  sections: {
    ...goodResume.sections,
  },
  structure: {
    fileType: "pdf",
    ocrUsed: false,
    pageCount: 1,
    tableCount: null,
    imageCount: null,
    columnCount: null,
    hasHeaderFooterContent: null,
    distinctFontCount: null,
  },
  warnings: [],
};

const SAMPLE_JD = `
Senior Full Stack Engineer (React, Node.js, TypeScript, AWS)

We are looking for a Senior Full Stack Engineer to build scalable microservices and responsive web applications.

Responsibilities:
- Build and maintain modern web applications using React, TypeScript, and Next.js.
- Design resilient REST APIs and backend services using Node.js, Express, and PostgreSQL.
- Architect cloud infrastructure on AWS using Docker, Kubernetes, and CI/CD pipelines.
- Collaborate with cross-functional teams in an Agile environment using Jira.
- Optimize database queries and caching layers with Redis and MongoDB.
- Write robust unit testing and integration testing using Jest.

Requirements:
- 5+ years of experience with JavaScript, TypeScript, Python, and C++.
- Strong background with PostgreSQL, Redis, Docker, and Kubernetes.
- Experience with GraphQL, system design, and distributed systems.
`.trim();

console.log("=================================================");
console.log("ATS SCORE & KEYWORD EXTRACTOR TEST SUITE");
console.log("=================================================\n");

// 1. Test JD Keyword Extraction
console.log("--- 1. Testing extractJdKeywords on Sample JD ---");
const extractedKeywords = extractJdKeywords(SAMPLE_JD);
console.log(`Extracted ${extractedKeywords.length} keywords from JD:`);
console.log(JSON.stringify(extractedKeywords, null, 2));

// 2. Score Good Resume (General mode)
console.log("\n--- 2. Good Resume (General Mode) ---");
const goodScore = scoreResume(goodResume);
console.log(`Final Score: ${goodScore.score} / 100 (Raw: ${goodScore.rawScore}, Mode: ${goodScore.mode})`);
console.log(`Coverage: ${goodScore.coverage}% (Not Checked: [${goodScore.notChecked.join(", ")}])`);
console.log(`Cap Reason: ${goodScore.capReason ?? "none"}`);
for (let i = 0; i < goodScore.checks.length; i++) {
  const c = goodScore.checks[i];
  console.log(`  [${c.status.toUpperCase()}] ${c.id} (weight ${c.weight}): ${c.detail}`);
}

// 3. Score Bad Resume
console.log("\n--- 3. Bad Resume ---");
const badScore = scoreResume(badResume);
console.log(`Final Score: ${badScore.score} / 100 (Raw: ${badScore.rawScore}, Mode: ${badScore.mode})`);
console.log(`Coverage: ${badScore.coverage}% (Not Checked: [${badScore.notChecked.join(", ")}])`);
console.log(`Cap Reason: ${badScore.capReason ?? "none"}`);
for (let i = 0; i < badScore.checks.length; i++) {
  const c = badScore.checks[i];
  console.log(`  [${c.status.toUpperCase()}] ${c.id} (weight ${c.weight}): ${c.detail}`);
}

// 4. Score Stuffed Resume
console.log("\n--- 4. Keyword Stuffed Resume ---");
const stuffedScore = scoreResume(stuffedResume);
console.log(`Final Score: ${stuffedScore.score} / 100 (Raw: ${stuffedScore.rawScore}, Mode: ${stuffedScore.mode})`);
console.log(`Coverage: ${stuffedScore.coverage}%`);
console.log(`Cap Reason: ${stuffedScore.capReason ?? "none"}`);
for (let i = 0; i < stuffedScore.checks.length; i++) {
  const c = stuffedScore.checks[i];
  if (c.id === "keyword_density") {
    console.log(`  -> KEYWORD DENSITY CHECK: [${c.status.toUpperCase()}] ${c.detail}`);
  }
}

// 5. Score PDF Resume (Structure Null)
console.log("\n--- 5. PDF Resume with null structure ---");
const pdfScore = scoreResume(pdfResume);
console.log(`Final Score: ${pdfScore.score} / 100 (Raw: ${pdfScore.rawScore}, Mode: ${pdfScore.mode})`);
console.log(`Coverage: ${pdfScore.coverage}% (Not Checked: [${pdfScore.notChecked.join(", ")}])`);
console.log(`Cap Reason: ${pdfScore.capReason ?? "none"}`);
for (let i = 0; i < pdfScore.checks.length; i++) {
  const c = pdfScore.checks[i];
  if (c.status === "not_checked") {
    console.log(`  -> NOT CHECKED: ${c.id} (weight ${c.weight}): ${c.detail}`);
  }
}

// 6. Good Resume with JD (Job-Targeted Mode)
console.log("\n--- 6. Good Resume with Sample JD (Job-Targeted Mode) ---");
const targetedScore = scoreResume(goodResume, SAMPLE_JD);
console.log(`Final Score: ${targetedScore.score} / 100 (Raw: ${targetedScore.rawScore}, Mode: ${targetedScore.mode})`);
console.log(`Coverage: ${targetedScore.coverage}% (Not Checked: [${targetedScore.notChecked.join(", ")}])`);
console.log(`Keyword Match: ${targetedScore.keywords?.matchPercent}%`);
console.log(`Matched: ${targetedScore.keywords?.matched.join(", ")}`);
console.log(`Missing: ${targetedScore.keywords?.missing.join(", ")}`);
for (let i = 0; i < targetedScore.checks.length; i++) {
  const c = targetedScore.checks[i];
  if (c.id === "jd_match") {
    console.log(`  -> JD MATCH CHECK: [${c.status.toUpperCase()}] ${c.detail}`);
  }
}

// 7. Assertions
console.log("\n=================================================");
console.log("ASSERTION VERIFICATIONS");
console.log("=================================================");

function assert(description: string, passed: boolean) {
  console.log(`${passed ? "[PASS]" : "[FAIL]"} ${description}`);
  if (!passed) {
    throw new Error(`Assertion failed: ${description}`);
  }
}

assert("good score > bad score", goodScore.score > badScore.score);

const badReadabilityCheck = badScore.checks.find((c) => c.id === "file_readability");
assert("bad has file_readability fail", badReadabilityCheck?.status === "fail");

const notCheckedCount = pdfScore.checks.filter((c) => c.status === "not_checked").length;
assert("null structure fields produce not_checked (at least 5 checks)", notCheckedCount === 5);

const stuffedDensityCheck = stuffedScore.checks.find((c) => c.id === "keyword_density");
assert("stuffed resume fails keyword_density", stuffedDensityCheck?.status === "fail");

assert(
  "stuffed resume now scores <= 70 and has capReason set",
  stuffedScore.score <= 70 && typeof stuffedScore.capReason === "string" && stuffedScore.capReason.length > 0
);

assert(
  "bad image resume scores <= 50",
  badScore.score <= 50
);

assert(
  "PDF with null structure shows coverage below 100 and a non-empty notChecked",
  pdfScore.coverage < 100 && pdfScore.notChecked.length > 0
);

assert(
  "good DOCX resume still scores 100 with coverage 100",
  goodScore.score === 100 && goodScore.coverage === 100 && goodScore.notChecked.length === 0
);

assert(
  "running good resume with sample JD gives different keyword results than without one",
  goodScore.keywords === null && targetedScore.keywords !== null && targetedScore.mode === "JOB_TARGETED"
);

console.log("\nAll 9 assertions passed successfully!");
