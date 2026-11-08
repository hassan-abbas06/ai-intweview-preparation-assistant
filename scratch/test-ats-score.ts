import { ParsedResume } from "../lib/resume/parse";
import { scoreResume } from "../lib/resume/ats-score";
import {
  extractJdKeywords,
  matchKeywords,
  extractJdKeywordsWithFallback,
  termMatches,
  termLiterallyInJd,
} from "../lib/resume/keywords";

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
    contact: "Alice Dev\nalice.dev@example.com | +1-555-019-2834 | github.com/alicedev",
    summary:
      "Full Stack Software Engineer with 5+ years of experience building scalable web applications and distributed systems using React, TypeScript, Node.js, and AWS.",
    experience: `Senior Software Engineer - Tech Solutions Inc (2022 - Present)
- Architected high-throughput microservices using Node.js, TypeScript, and PostgreSQL, increasing system throughput by 42%.
- Built real-time analytics dashboard with React, Next.js, and Redis, reducing dashboard load times by 150ms.
- Spearheaded migration of 14 monolithic services to Docker and Kubernetes on AWS, cutting cloud infrastructure costs by 28%.
- Automated CI/CD deployment pipelines using GitHub Actions, enabling daily production releases with 99.9% uptime.
- Led cross-functional team of 6 engineers across Agile sprints and code reviews.

Software Engineer - DataCorp (2019 - 2022)
- Developed secure REST APIs and GraphQL endpoints handling over 2M requests daily.
- Optimized PostgreSQL database queries and indexing strategies, reducing query latency by 35%.
- Implemented automated unit testing and integration testing with Jest, achieving 90% test coverage.`,
    education: "Bachelor of Science in Computer Science - University of California, Berkeley (2015 - 2019)",
    skills:
      "Languages: JavaScript, TypeScript, Python, SQL, C++, HTML, CSS\nFrameworks: React, Next.js, Node, Express, GraphQL\nDatabases: PostgreSQL, Redis, MongoDB, AWS, Docker, Kubernetes, CI/CD, Git",
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

// -------------------------------------------------------------
// Fixture: Entry-Level Resume (Clean DOCX)
// 218 words, 2 roles Jun 2025 to Present and Jan 2025 to May 2025,
// 12 recognized skills, bullets starting with Assisted, Tracked,
// Entered, Coordinated, Resolved, Maintained, Collaborated, Built,
// Organised, no LinkedIn, numbers in every bullet.
// -------------------------------------------------------------
const ENTRY_LEVEL_EXPERIENCE = `Junior Software Engineer - Acquired Solutions (Jun 2025 - Present)
- Built 4 responsive front-end user interface components using React and CSS for over 1000 active users.
- Coordinated with 3 team members to implement responsive layouts and reduce front-end bugs by 15%.
- Resolved 12 customer issues in Jira, improving system reliability across 2 production releases.
- Organised 5 technical documentation guides for code review procedures, decreasing onboarding time by 20%.

Junior Developer - Tech Labs (Jan 2025 - May 2025)
- Assisted 2 senior developers with database query testing and debugging 10 microservices.
- Tracked 25 weekly software releases across internal staging environments with 100% schedule adherence.
- Entered 50 test records and verified API response times across 3 endpoints.
- Maintained 8 software documentation modules for engineering teams, supporting 40 internal colleagues.
- Collaborated with 6 cross-functional designers to prepare 14 interactive UI mockups.`;

const ENTRY_LEVEL_SUMMARY =
  "Motivated junior software developer with foundational background in web development and creating responsive web applications for modern platforms.";

const ENTRY_LEVEL_RESUME_TEXT = `John Smith
john.smith@example.com | +1-555-019-2834 | New York, NY

Summary
${ENTRY_LEVEL_SUMMARY}

Experience
${ENTRY_LEVEL_EXPERIENCE}

Education
Bachelor of Science in Computer Science - State University (2021 - 2025)

Skills
JavaScript, TypeScript, React, Node, Express, HTML, CSS, SQL, PostgreSQL, MongoDB, Agile, Jira`;

const entryLevelResume: ParsedResume = {
  fileType: "docx",
  text: ENTRY_LEVEL_RESUME_TEXT,
  wordCount: 218, // Clean DOCX 218 words
  sections: {
    contact: "John Smith\njohn.smith@example.com | +1-555-019-2834 | New York, NY",
    summary: ENTRY_LEVEL_SUMMARY,
    experience: ENTRY_LEVEL_EXPERIENCE,
    education: "Bachelor of Science in Computer Science - State University (2021 - 2025)",
    skills: "JavaScript, TypeScript, React, Node, Express, HTML, CSS, SQL, PostgreSQL, MongoDB, Agile, Jira",
    projects: null,
  },
  structure: {
    fileType: "docx",
    ocrUsed: false,
    pageCount: 1,
    tableCount: 0,
    imageCount: 0,
    columnCount: 1,
    hasHeaderFooterContent: false,
    distinctFontCount: 2,
  },
  warnings: [],
};

// -------------------------------------------------------------
// Fixture: Strong Resume (Clean DOCX)
// 4 roles over 48 months, 22 recognized skills, strong verbs,
// LinkedIn and GitHub links, quantified results, a good summary.
// Score 90 or higher.
// -------------------------------------------------------------
const STRONG_SUMMARY =
  "Strategic Principal Software Engineer with 8+ years architecting scalable cloud platforms and high-throughput microservices using React, Node, TypeScript, and AWS to serve over 10M daily active users.";

const STRONG_EXPERIENCE = `Principal Systems Architect - CloudSphere Technologies (Jun 2024 - Present)
- Spearheaded company-wide cloud transformation on AWS with Kubernetes and Docker, cutting compute spend by 34%.
- Architected event-driven microservices processing 45M events daily with Kafka, Redis, and PostgreSQL.

Senior Engineering Lead - Apex Systems (Jan 2023 - May 2024)
- Led high-performing team of 12 engineers building real-time dashboards with React, Next.js, and TypeScript.
- Delivered mission-critical API gateway with GraphQL and Node.js, improving endpoint response latency by 55%.

Software Engineer - DataWave Corp (Jan 2021 - Dec 2022)
- Built automated continuous integration pipelines with GitHub Actions, reducing release cycle time by 40%.
- Optimized database indexing and query plans in PostgreSQL, boosting overall system throughput by 30%.

Junior Software Engineer - DevWorks (Jan 2020 - Dec 2020)
- Developed responsive web interfaces using JavaScript, HTML, CSS, and Vue, improving user engagement by 25%.
- Implemented robust unit test suites with Jest, increasing backend code test coverage to 92%.`;

const STRONG_RESUME_TEXT = `Sarah Connor
sarah.connor@example.com | +1-555-019-9988 | San Francisco, CA
linkedin.com/in/sarahconnor | github.com/sarahconnor

Summary
${STRONG_SUMMARY}

Experience
${STRONG_EXPERIENCE}

Education
Master of Science in Computer Science - Stanford University (2018 - 2020)
Bachelor of Science in Software Engineering - UC Berkeley (2014 - 2018)

Skills
JavaScript, TypeScript, Python, Go, SQL, HTML, CSS, React, Next.js, Vue, Node, Express, GraphQL, PostgreSQL, MySQL, Redis, MongoDB, AWS, Docker, Kubernetes, CI/CD, Agile`;

const strongResume: ParsedResume = {
  fileType: "docx",
  text: STRONG_RESUME_TEXT,
  wordCount: STRONG_RESUME_TEXT.split(/\s+/).length,
  sections: {
    contact: "Sarah Connor\nsarah.connor@example.com | +1-555-019-9988 | linkedin.com/in/sarahconnor | github.com/sarahconnor",
    summary: STRONG_SUMMARY,
    experience: STRONG_EXPERIENCE,
    education: "Master of Science in Computer Science - Stanford University\nBachelor of Science in Software Engineering - UC Berkeley",
    skills:
      "JavaScript, TypeScript, Python, Go, SQL, HTML, CSS, React, Next.js, Vue, Node, Express, GraphQL, PostgreSQL, MySQL, Redis, MongoDB, AWS, Docker, Kubernetes, CI/CD, Agile",
    projects: null,
  },
  structure: {
    fileType: "docx",
    ocrUsed: false,
    pageCount: 2,
    tableCount: 0,
    imageCount: 0,
    columnCount: 1,
    hasHeaderFooterContent: false,
    distinctFontCount: 2,
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

// 1-Keyword Job Description for Low-Trust check
const SINGLE_KEYWORD_JD = "We are seeking a specialist who has dedicated industry experience in Python.";

// -------------------------------------------------------------
// Fixtures: Marketing JD, Nursing JD, and Candidate Resume
// -------------------------------------------------------------
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

const MARKETING_CANDIDATE_SUMMARY =
  "Dedicated Growth and SEO Specialist with over 4 years of professional experience scaling organic traffic, executing high-converting digital advertising campaigns, and analyzing user conversion funnels using Google Analytics to drive revenue growth.";

const MARKETING_CANDIDATE_EXPERIENCE = `Digital Acquisition Specialist - Growth Media Co (Jun 2022 - Present)
- Spearheaded organic search engine optimization and SEO strategies, increasing organic web traffic by 48%.
- Analyzed website user journeys using Google Analytics to optimize funnel conversion rates by 18%.
- Wrote compelling ad copywriting across social channels, boosting click-through rates by 22%.
- Coordinated with cross-functional creative teams across 15 promotional launches.

Growth Coordinator - BrandVentures (Jan 2020 - May 2022)
- Managed weekly growth performance reports and tracked lead acquisition across 4 channels.
- Assisted 3 senior brand managers with market research and competitor benchmarking.
- Optimized landing page layouts, improving user form completion rate by 14%.`;

const MARKETING_CANDIDATE_TEXT = `Jordan Taylor
jordan.taylor@example.com | +1-555-019-4455 | Chicago, IL | linkedin.com/in/jordantaylor

Summary
${MARKETING_CANDIDATE_SUMMARY}

Experience
${MARKETING_CANDIDATE_EXPERIENCE}

Education
Bachelor of Arts in Communications - Northwestern University (2016 - 2020)

Skills
SEO, Google Analytics, Copywriting, Digital Marketing, Market Research, Social Media, Communication, Teamwork, Microsoft Excel`.trim();

const marketingCandidateResume: ParsedResume = {
  fileType: "docx",
  text: MARKETING_CANDIDATE_TEXT,
  wordCount: MARKETING_CANDIDATE_TEXT.split(/\s+/).length,
  sections: {
    contact: "Jordan Taylor\njordan.taylor@example.com | +1-555-019-4455 | Chicago, IL | linkedin.com/in/jordantaylor",
    summary: MARKETING_CANDIDATE_SUMMARY,
    experience: MARKETING_CANDIDATE_EXPERIENCE,
    education: "Bachelor of Arts in Marketing - Northwestern University (2016 - 2020)",
    skills:
      "SEO, Google Analytics, Copywriting, Digital Marketing, Market Research, Social Media, Communication, Teamwork, Microsoft Excel",
    projects: null,
  },
  structure: {
    fileType: "docx",
    ocrUsed: false,
    pageCount: 1,
    tableCount: 0,
    imageCount: 0,
    columnCount: 1,
    hasHeaderFooterContent: false,
    distinctFontCount: 2,
  },
  warnings: [],
};

console.log("=================================================");
console.log("ATS SCORE & KEYWORD EXTRACTOR TEST SUITE");
console.log("=================================================\n");

// Helper to log a score result
function logScoreResult(title: string, res: ReturnType<typeof scoreResume>) {
  console.log(`\n--- ${title} ---`);
  console.log(`Final Score: ${res.score} / 100 (Raw: ${res.rawScore}, Mode: ${res.mode})`);
  console.log(
    `Sub-Scores: Formatting: ${res.subScores.formatting}% | Content: ${res.subScores.content}%`
  );
  console.log(`Coverage: ${res.coverage}% (Not Checked: [${res.notChecked.join(", ")}])`);
  console.log(`Cap Reason: ${res.capReason ?? "none"}`);
  console.log("Check Details:");
  for (let i = 0; i < res.checks.length; i++) {
    const c = res.checks[i];
    console.log(`  [${c.status.toUpperCase()}] [${c.group.toUpperCase()}] ${c.id} (weight ${c.weight}): ${c.detail}`);
  }
}

// 1. Test JD Keyword Extraction
console.log("--- 1. Testing extractJdKeywords on Sample JD ---");
const extractedKeywords = extractJdKeywords(SAMPLE_JD);
console.log(`Extracted ${extractedKeywords.length} keywords from JD:`);
console.log(JSON.stringify(extractedKeywords, null, 2));

// 1b. Test Non-Technical JD Keyword Extraction
const NON_TECH_JD =
  "We are hiring an entry-level Operations Associate to support our customer service and inventory team. You will greet customers, track inventory levels, maintain accurate records in Excel, and communicate clearly with colleagues. Requirements: strong communication skills, attention to detail, teamwork, time management, and basic knowledge of Microsoft Excel. Experience with data entry, scheduling, and customer support is a plus.";
console.log("\n--- 1b. Testing extractJdKeywords on Non-Technical JD ---");
const nonTechKeywords = extractJdKeywords(NON_TECH_JD);
console.log(`Extracted ${nonTechKeywords.length} keywords from Non-Technical JD:`);
console.log(JSON.stringify(nonTechKeywords, null, 2));

// 2. Score Good Resume (General mode)
const goodScore = scoreResume(goodResume);
logScoreResult("Good Resume (General Mode)", goodScore);

// 3. Score Bad Resume
const badScore = scoreResume(badResume);
logScoreResult("Bad Resume (Image Format)", badScore);

// 4. Score Stuffed Resume
const stuffedScore = scoreResume(stuffedResume);
logScoreResult("Keyword Stuffed Resume", stuffedScore);

// 5. Score PDF Resume (Structure Null)
const pdfScore = scoreResume(pdfResume);
logScoreResult("PDF Resume with null structure", pdfScore);

// 6. Good Resume with JD (Job-Targeted Mode)
const targetedScore = scoreResume(goodResume, SAMPLE_JD);
logScoreResult("Good Resume with Sample JD (Job-Targeted Mode)", targetedScore);

// 7. Entry-Level Resume (General Mode)
const entryLevelScore = scoreResume(entryLevelResume);
logScoreResult("Entry-Level Resume (General Mode)", entryLevelScore);

// 8. Strong Resume (General Mode)
const strongScore = scoreResume(strongResume);
logScoreResult("Strong Resume (General Mode)", strongScore);

// 9. Single-Keyword JD Test (Low-Trust Job-Targeted Mode)
const singleJdScore = scoreResume(goodResume, SINGLE_KEYWORD_JD);
logScoreResult("Job-Targeted Mode with 1-Keyword JD (Low-Trust)", singleJdScore);

// Assertions
console.log("\n=================================================");
console.log("ASSERTION VERIFICATIONS");
console.log("=================================================");

function assert(description: string, passed: boolean) {
  console.log(`${passed ? "[PASS]" : "[FAIL]"} ${description}`);
  if (!passed) {
    throw new Error(`Assertion failed: ${description}`);
  }
}

// Comparison assertions
assert("good score > bad score", goodScore.score > badScore.score);
assert("strong score >= 90", strongScore.score >= 90);

const badReadabilityCheck = badScore.checks.find((c) => c.id === "file_readability");
assert("bad has file_readability fail", badReadabilityCheck?.status === "fail");

const notCheckedCount = pdfScore.checks.filter((c) => c.status === "not_checked").length;
assert("null structure fields produce not_checked (at least 5 checks)", notCheckedCount === 5);

const stuffedDensityCheck = stuffedScore.checks.find((c) => c.id === "keyword_density");
assert("stuffed resume fails keyword_density", stuffedDensityCheck?.status === "fail");

assert(
  "stuffed resume scores <= 70 and has capReason set",
  stuffedScore.score <= 70 && typeof stuffedScore.capReason === "string" && stuffedScore.capReason.length > 0
);

assert("bad image resume scores <= 50", badScore.score <= 50);

assert(
  "PDF with null structure shows coverage below 100 and a non-empty notChecked",
  pdfScore.coverage < 100 && pdfScore.notChecked.length > 0
);

// Entry-level assertions
assert(
  "entry-level resume general mode score between 70 and 85",
  entryLevelScore.score >= 70 && entryLevelScore.score <= 85
);
assert(
  "entry-level resume formatting sub-score 95 or higher",
  entryLevelScore.subScores.formatting >= 95
);
assert(
  "entry-level resume content sub-score below 85",
  entryLevelScore.subScores.content < 85
);

// Strong resume assertions
assert(
  "strong resume scores 90 or higher",
  strongScore.score >= 90
);
assert(
  "strong resume content sub-score 90 or higher",
  strongScore.subScores.content >= 90
);

// Low-trust JD test
const singleJdMatchCheck = singleJdScore.checks.find((c) => c.id === "jd_match");
assert(
  "1-keyword JD run has jd_match status 'not_checked'",
  singleJdMatchCheck?.status === "not_checked"
);
assert(
  "1-keyword JD run has jd_match detail 'Too few keywords found in the job description to score a match.'",
  singleJdMatchCheck?.detail === "Too few keywords found in the job description to score a match."
);

// Good resume mode verification
assert(
  "running good resume with sample JD gives different keyword results than without one",
  goodScore.keywords === null && targetedScore.keywords !== null && targetedScore.mode === "JOB_TARGETED"
);

// Non-Technical JD Assertions
assert(
  "non-technical JD keywords do not include 'strong communication skills'",
  nonTechKeywords.indexOf("strong communication skills") === -1
);
assert(
  "non-technical JD keywords do not include 'customer'",
  nonTechKeywords.indexOf("customer") === -1
);
assert(
  "non-technical JD keywords do not include 'operations'",
  nonTechKeywords.indexOf("operations") === -1
);
assert(
  "non-technical JD keywords still include 'communication'",
  nonTechKeywords.indexOf("communication") !== -1
);
assert("non-technical JD extracts at least 9 keywords", nonTechKeywords.length >= 9);

const requiredNonTechTerms = [
  "customer service",
  "inventory",
  "data entry",
  "scheduling",
  "teamwork",
  "attention to detail",
  "microsoft excel",
];

for (let i = 0; i < requiredNonTechTerms.length; i++) {
  const term = requiredNonTechTerms[i];
  assert(
    `non-technical JD keywords include '${term}'`,
    nonTechKeywords.indexOf(term) !== -1
  );
}

// Low-trust guard verification: < 6 keywords yields lowTrust: true
const lowCountKeywords = ["javascript", "typescript", "react"];
const lowTrustResult = matchKeywords("React developer with javascript", lowCountKeywords);
assert("fewer than 6 keywords produces lowTrust: true", lowTrustResult.lowTrust === true);

const normalTrustResult = matchKeywords("Customer service representative with inventory and excel", nonTechKeywords);
assert("6 or more keywords does not produce lowTrust: true", normalTrustResult.lowTrust !== true);

// Technical Sample JD Assertions
const unwantedTechnicalTerms = ["senior", "full", "stack", "engineer", "build"];
for (let i = 0; i < unwantedTechnicalTerms.length; i++) {
  const term = unwantedTechnicalTerms[i];
  assert(
    `technical JD keywords do not include '${term}'`,
    extractedKeywords.indexOf(term) === -1
  );
}

const requiredTechnicalTerms = [
  "react",
  "typescript",
  "postgresql",
  "docker",
  "kubernetes",
  "aws",
];
for (let i = 0; i < requiredTechnicalTerms.length; i++) {
  const term = requiredTechnicalTerms[i];
  assert(
    `technical JD keywords include '${term}'`,
    extractedKeywords.indexOf(term) !== -1
  );
}

console.log("\nFinal Extracted Keywords for Technical Sample JD:");
console.log(JSON.stringify(extractedKeywords, null, 2));

console.log("\nAll synchronous assertions passed successfully!");

async function runAsyncFallbackTests() {
  console.log("\n=================================================");
  console.log("ASYNC LLM FALLBACK & CROSS-MODE TESTS");
  console.log("=================================================");

  // 10. Test Marketing JD and Nursing JD Fallback
  console.log("\n--- 10. Testing extractJdKeywordsWithFallback on Marketing and Nursing JDs ---");

  const fakeMarketingLlm = async (_prompt: string): Promise<string> => {
    return JSON.stringify([
      "seo",
      "content strategy",
      "google analytics",
      "email campaigns",
      "copywriting",
      "brand voice",
    ]);
  };

  const marketingFallback = await extractJdKeywordsWithFallback(MARKETING_JD, fakeMarketingLlm);
  console.log(`Marketing fallback returned ${marketingFallback.length} keywords:`);
  console.log(JSON.stringify(marketingFallback, null, 2));

  const fakeNursingLlm = async (_prompt: string): Promise<string> => {
    return JSON.stringify([
      "patient care",
      "triage",
      "electronic health records",
      "vital signs",
      "medication administration",
      "iv therapy",
    ]);
  };

  const nursingFallback = await extractJdKeywordsWithFallback(NURSING_JD, fakeNursingLlm);
  console.log(`\nNursing fallback returned ${nursingFallback.length} keywords:`);
  console.log(JSON.stringify(nursingFallback, null, 2));

  // 11. Test Fake LLM returning hallucinated keywords not in JD
  console.log("\n--- 11. Testing Fake LLM returning hallucinated keywords ---");
  const fakeHallucinatingLlm = async (_prompt: string): Promise<string> => {
    return JSON.stringify([
      "seo",
      "content strategy",
      "kubernetes",
      "patient care",
      "copywriting",
      "brand voice",
    ]);
  };

  const hallucinationResult = await extractJdKeywordsWithFallback(MARKETING_JD, fakeHallucinatingLlm);
  console.log(`Extracted with hallucination guard (${hallucinationResult.length} keywords):`);
  console.log(JSON.stringify(hallucinationResult, null, 2));

  // 12. Test Fake LLM that throws
  console.log("\n--- 12. Testing Fake LLM that throws ---");
  let threwError = false;
  let throwingResult: string[] = [];
  try {
    throwingResult = await extractJdKeywordsWithFallback(MARKETING_JD, async () => {
      throw new Error("Simulated LLM network/provider failure");
    });
  } catch {
    threwError = true;
  }

  // 13. Test Operations Associate JD (assert LLM not called)
  console.log("\n--- 13. Testing Operations Associate JD (No LLM called) ---");
  let opsLlmCalled = false;
  const opsFallback = await extractJdKeywordsWithFallback(NON_TECH_JD, async () => {
    opsLlmCalled = true;
    return JSON.stringify(["unexpected", "llm", "skill"]);
  });
  console.log(`Operations fallback returned ${opsFallback.length} keywords (LLM called: ${opsLlmCalled})`);

  // 14. Test Cross-Mode Score Divergence on same resume
  console.log("\n--- 14. Testing Cross-Mode Score Divergence ---");
  const generalCandidateScore = scoreResume(marketingCandidateResume);
  const marketingTargetedScore = scoreResume(marketingCandidateResume, MARKETING_JD, marketingFallback);
  const nursingTargetedScore = scoreResume(marketingCandidateResume, NURSING_JD, nursingFallback);

  logScoreResult("Marketing Candidate (General Mode)", generalCandidateScore);
  logScoreResult("Marketing Candidate (Marketing Targeted Mode)", marketingTargetedScore);
  logScoreResult("Marketing Candidate (Nursing Targeted Mode)", nursingTargetedScore);

  console.log("\nScores comparison for same candidate:");
  console.log(`  General Mode Score:   ${generalCandidateScore.score} / 100`);
  console.log(`  Marketing Mode Score: ${marketingTargetedScore.score} / 100`);
  console.log(`  Nursing Mode Score:   ${nursingTargetedScore.score} / 100`);

  // Assertions for Fallback & Cross-Mode tests
  console.log("\n=================================================");
  console.log("FALLBACK & CROSS-MODE ASSERTION VERIFICATIONS");
  console.log("=================================================");

  // Marketing Fallback assertions
  assert("Marketing fallback returns at least 6 keywords", marketingFallback.length >= 6);
  for (let i = 0; i < marketingFallback.length; i++) {
    const kw = marketingFallback[i];
    assert(
      `Marketing keyword '${kw}' literally appears in marketing JD`,
      termLiterallyInJd(MARKETING_JD, kw)
    );
  }

  // Nursing Fallback assertions
  assert("Nursing fallback returns at least 6 keywords", nursingFallback.length >= 6);
  for (let i = 0; i < nursingFallback.length; i++) {
    const kw = nursingFallback[i];
    assert(
      `Nursing keyword '${kw}' literally appears in nursing JD`,
      termLiterallyInJd(NURSING_JD, kw)
    );
  }

  // Hallucination Guard assertions
  assert(
    "Hallucinated keyword 'kubernetes' is dropped from marketing results",
    hallucinationResult.indexOf("kubernetes") === -1
  );
  assert(
    "Hallucinated keyword 'patient care' is dropped from marketing results",
    hallucinationResult.indexOf("patient care") === -1
  );
  assert(
    "Legitimate keyword 'seo' (or its canonical 'search engine optimization') is retained in marketing results",
    hallucinationResult.indexOf("seo") !== -1 ||
      hallucinationResult.indexOf("search engine optimization") !== -1
  );
  assert(
    "Legitimate keyword 'copywriting' is retained in marketing results",
    hallucinationResult.indexOf("copywriting") !== -1
  );

  // Throw resilience assertions
  assert("Fake LLM throwing does not cause extractJdKeywordsWithFallback to throw", threwError === false);
  const deterministicMarketingKeywords = extractJdKeywords(MARKETING_JD);
  assert(
    "Fallback returns deterministic list when LLM throws",
    JSON.stringify(throwingResult) === JSON.stringify(deterministicMarketingKeywords)
  );

  // Operations Associate JD spy assertions
  assert("Operations Associate JD does not trigger LLM call", opsLlmCalled === false);
  assert("Operations Associate JD returns 10 keywords", opsFallback.length === 10);

  // Cross-mode score divergence assertions
  assert(
    "Marketing targeted score differs from General mode score",
    marketingTargetedScore.score !== generalCandidateScore.score
  );
  assert(
    "Nursing targeted score differs from General mode score",
    nursingTargetedScore.score !== generalCandidateScore.score
  );
  assert(
    "Marketing targeted score differs from Nursing targeted score",
    marketingTargetedScore.score !== nursingTargetedScore.score
  );

  // 15. Test Software Tester JD with Fake LLM & Stemming Fallback
  console.log("\n--- 15. Testing Software Tester JD with Fake LLM & Stemming Fallback ---");
  const SOFTWARE_TESTER_JD =
    "We are looking for a detail-oriented Software Tester to join our engineering team. In this role, you will review system requirements, design comprehensive test plans, and execute manual and automated tests to identify bugs and performance issues. You will work closely with developers, product managers, and designers to deliver high-quality, reliable software";

  const fakeTesterLlm = async (_prompt: string): Promise<string> => {
    return JSON.stringify([
      "software testing",
      "test plans",
      "manual testing",
      "automated testing",
      "performance testing",
      "bug identification",
      "selenium",
      "jira",
      "requirements review",
    ]);
  };

  const testerFallback = await extractJdKeywordsWithFallback(SOFTWARE_TESTER_JD, fakeTesterLlm);
  console.log(`Tester fallback returned ${testerFallback.length} keywords:`);
  console.log(JSON.stringify(testerFallback, null, 2));

  // Assert selenium and jira dropped
  assert("selenium is dropped from tester keywords", testerFallback.indexOf("selenium") === -1);
  assert("jira is dropped from tester keywords", testerFallback.indexOf("jira") === -1);

  // Assert others kept
  const expectedTesterKept = [
    "software testing",
    "test plans",
    "manual testing",
    "automated testing",
    "performance testing",
    "bug identification",
    "requirements review",
  ];
  for (let i = 0; i < expectedTesterKept.length; i++) {
    const kw = expectedTesterKept[i];
    assert(`tester keyword '${kw}' is kept`, testerFallback.indexOf(kw) !== -1);
  }

  // Assert at least 4 keywords remain
  assert("at least 4 keywords remain from tester fallback", testerFallback.length >= 4);

  // Score entry-level resume against Software Tester JD
  const entryLevelTesterScore = scoreResume(entryLevelResume, SOFTWARE_TESTER_JD, testerFallback);
  logScoreResult("Entry-Level Resume with Software Tester JD", entryLevelTesterScore);

  const testerJdMatchCheck = entryLevelTesterScore.checks.find((c) => c.id === "jd_match");
  assert(
    "job-targeted scan of entry-level resume against tester JD is scored (jd_match not not_checked)",
    Boolean(testerJdMatchCheck && testerJdMatchCheck.status !== "not_checked")
  );
  assert(
    "job-targeted scan of entry-level resume against tester JD differs from general mode",
    entryLevelTesterScore.score !== entryLevelScore.score ||
      entryLevelTesterScore.subScores.content !== entryLevelScore.subScores.content ||
      entryLevelTesterScore.mode !== entryLevelScore.mode
  );

  // 16. Threshold verification: 3 keywords is not_checked, 4 keywords is scored
  console.log("\n--- 16. Testing Keyword Threshold Boundaries (3 vs 4 keywords) ---");
  const threeKeywords = ["react", "typescript", "sql"];
  const threeKeywordsScore = scoreResume(entryLevelResume, SOFTWARE_TESTER_JD, threeKeywords);
  const threeJdMatch = threeKeywordsScore.checks.find((c) => c.id === "jd_match");
  assert(
    "3 keywords results in jd_match status 'not_checked'",
    threeJdMatch?.status === "not_checked"
  );

  const fourKeywords = ["react", "typescript", "sql", "jira"];
  const fourKeywordsScore = scoreResume(entryLevelResume, SOFTWARE_TESTER_JD, fourKeywords);
  const fourJdMatch = fourKeywordsScore.checks.find((c) => c.id === "jd_match");
  assert(
    "4 keywords results in scored jd_match (not not_checked)",
    Boolean(fourJdMatch && fourJdMatch.status !== "not_checked")
  );
  assert(
    "4 keywords still produces lowTrust: true (1-5 range)",
    fourKeywordsScore.keywords?.lowTrust === true
  );

  console.log("\nAll fallback and cross-mode assertions passed successfully!");
}

runAsyncFallbackTests().catch((err) => {
  console.error("Async test suite failed:", err);
  process.exit(1);
});
