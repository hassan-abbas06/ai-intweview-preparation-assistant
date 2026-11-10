import { termMatches } from "../lib/resume/keywords";

console.log("=================================================");
console.log("TESTING termMatches BOUNDARIES AND PUNCTUATION");
console.log("=================================================");

const testCases = [
  // C++ tests
  { text: "Languages: JavaScript, TypeScript, Python, SQL, C++, HTML, CSS", term: "c++", expected: true },
  { text: "Developed backend systems in C++.", term: "c++", expected: true },
  { text: "Experienced in (C++) and systems programming", term: "c++", expected: true },
  { text: "Proficient in C++, Java, and Go", term: "c++", expected: true },
  { text: "Experience with C++/CLI", term: "c++", expected: true },

  // Node.js tests
  { text: "Built microservices using Node.js, Express, and PostgreSQL", term: "node.js", expected: true },
  { text: "Backend built with Node.js.", term: "node.js", expected: true },
  { text: "Skills: (Node.js) runtime", term: "node.js", expected: true },
  { text: "Node.js; Express; TypeScript", term: "node.js", expected: true },
  { text: "Node.js/TypeScript backend", term: "node.js", expected: true },

  // Node (standalone should not match Node.js)
  { text: "Delivered mission-critical API gateway with GraphQL and Node.js", term: "node", expected: false },
  { text: "Architected scalable platforms using React, Node, TypeScript", term: "node", expected: true },
  { text: "Backend service running on Node.", term: "node", expected: true },

  // Next.js tests
  { text: "Skills: React, Next.js, Vue, Node", term: "next.js", expected: true },
  { text: "Built real-time analytics dashboard with React, Next.js, and Redis.", term: "next.js", expected: true },
  { text: "Frontend framework is Next.js.", term: "next.js", expected: true },
  { text: "Using (Next.js) for SSR", term: "next.js", expected: true },

  // CI/CD tests
  { text: "Automated deployment with CI/CD, Docker, and Kubernetes", term: "ci/cd", expected: true },
  { text: "Maintained robust CI/CD.", term: "ci/cd", expected: true },
  { text: "Configured (CI/CD) pipelines", term: "ci/cd", expected: true },
  { text: "Experience with CI/CD/DevOps", term: "ci/cd", expected: true },

  // .NET tests
  { text: "Enterprise application developed with .NET framework", term: ".net", expected: true },
  { text: "Expert in ASP.NET and .NET.", term: ".net", expected: true },
  { text: "Legacy codebase in (.NET)", term: ".net", expected: true },
  { text: "Visited company website at domain.net yesterday", term: ".net", expected: false },

  // C# tests
  { text: "Developed desktop application in C#", term: "c#", expected: true },
  { text: "Proficient in C#.", term: "c#", expected: true },
  { text: "Languages: C#, C++, Java", term: "c#", expected: true },
  { text: "Experienced with (C#)", term: "c#", expected: true },

  // General terms with punctuation
  { text: "Experience with React, Vue, Angular.", term: "react", expected: true },
  { text: "Experience with React.", term: "react", expected: true },
  { text: "Experience with React,", term: "react", expected: true },
  { text: "Experience with (React)", term: "react", expected: true },
  { text: "Experience with TypeScript.", term: "typescript", expected: true },
  { text: "Experience with AWS.", term: "aws", expected: true },
  { text: "Experience with Docker.", term: "docker", expected: true },
  { text: "Experience with Kubernetes.", term: "kubernetes", expected: true },
  { text: "Experience with iv therapy.", term: "iv therapy", expected: true },
];

let allPassed = true;
for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const actual = termMatches(tc.text, tc.term);
  const passed = actual === tc.expected;
  if (!passed) allPassed = false;
  console.log(
    `[${passed ? "PASS" : "FAIL"}] Term '${tc.term}' in "${tc.text}" -> got ${actual}, expected ${tc.expected}`
  );
}

console.log(`\nOverall punctuation & boundary matching: ${allPassed ? "ALL TESTS PASSED" : "FAILURES DETECTED"}`);
