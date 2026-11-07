import { splitSections, looksLikeResume, NotAResumeError } from "../lib/resume/parse";

interface TestCase {
  name: string;
  text: string;
  expectedAccepted: boolean;
}

const testCases: TestCase[] = [
  {
    name: "Event invitation text (poster with 'About the College', 'Rules and Regulations', contacts)",
    expectedAccepted: false,
    text: `
TechNova 2026 - Annual Engineering Symposium
Organized by Department of Computer Science & Engineering
St. Xavier Institute of Technology

About the College:
Established in 1998, St. Xavier Institute of Technology is an autonomous institution accredited with an 'A+' Grade by NAAC.

Rules and Regulations:
1. All participants must carry their valid college identity card.
2. Teams can consist of a maximum of 4 members per team.
3. Registration fees must be paid online via the portal.

Important Dates:
Submission Deadline: March 15, 2026
Event Day: March 28, 2026

Contact Us:
Staff Coordinator: Dr. Robert Vance
Student Lead: Amanda Clark
Email: symposium2026@stxavier.edu
Phone: (555) 349-2041 or +1-555-892-1234
Website: https://stxavier.edu/technova
`,
  },
  {
    name: "News-article style paragraph",
    expectedAccepted: false,
    text: `
Global Semiconductor Industry Reports Record Growth in Q3

Silicon Valley, CA — The global semiconductor alliance published its quarterly market analysis today, revealing an unprecedented 18% quarter-over-quarter expansion driven by enterprise artificial intelligence infrastructure demand. Analysts attribute the surge to hyperscale data center investments in high-bandwidth memory and advanced packaging technologies. Foundry capacity utilization reached 94% across leading fabrication hubs in Taiwan and South Korea, with automotive microcontroller supply finally stabilizing following three years of inventory adjustments. Leading chip designers signaled continued capital expenditures through the upcoming fiscal year.
`,
  },
  {
    name: "Normal resume with Summary, Skills, Experience, Education",
    expectedAccepted: true,
    text: `
Sarah Jenkins
sarah.jenkins@example.com | (555) 234-5678 | San Francisco, CA

Summary:
Results-driven software engineer with over 5 years of experience architecting distributed systems and cloud services. Proven expertise in full-stack web applications and microservices.

Skills:
Languages: TypeScript, JavaScript, Python, Go, SQL
Frameworks: React, Next.js, Node.js, Express, TailwindCSS
Tools & Cloud: Docker, Kubernetes, AWS, PostgreSQL, Redis, Git

Experience:
Senior Software Engineer - CloudScale Technologies (2021 - Present)
- Architected and deployed microservices handling 50k requests per second with 99.99% uptime.
- Led migration of legacy monolithic backend to containerized Kubernetes cluster.

Education:
B.S. in Computer Science - University of California, Berkeley (2016 - 2020)
Dean's Honor List, GPA: 3.85/4.0
`,
  },
  {
    name: "Minimal student resume with only Education and Projects",
    expectedAccepted: true,
    text: `
David Kim
Seattle, WA | github.com/davidkim

Education:
Bachelor of Science in Informatics
University of Washington, Seattle (2022 - 2026)
Relevant Coursework: Data Structures, Web Development, Database Design

Projects:
TaskFlow - Collaborative Productivity Web App
- Built a real-time task manager using React, Node.js, and WebSockets.
- Integrated PostgreSQL database with Prisma ORM for relational queries.

Campus Market - Student Marketplace App
- Developed a peer-to-peer textbook marketplace with Stripe payment integration.
- Designed responsive user interface using Tailwind CSS and Next.js.
`,
  },
  {
    name: "Resume with only Experience plus email and phone",
    expectedAccepted: true,
    text: `
Marcus Brody
Email: marcus.brody@consultingfirm.com
Mobile: +1 (555) 789-0123
Chicago, IL

Experience:
Senior Operations Consultant - Apex Business Advisory (2018 - 2024)
- Led operational transformation initiatives across 14 enterprise manufacturing clients.
- Streamlined supply chain logistics resulting in $2.4M in annual procurement savings.
- Facilitated quarterly executive stakeholder reviews and continuous improvement workshops.
- Mentored junior analysts on root-cause analysis and business intelligence reporting.
`,
  },
  {
    name: "Document with only one core heading and no contact info and no secondary headings",
    expectedAccepted: false,
    text: `
Technical Skills and Frameworks Overview

Skills:
Java, C++, Python, Spring Boot, Microservices, Kubernetes, Docker, RabbitMQ, Kafka, SQL Server, Redis

This document provides a comprehensive technical overview of backend architectures commonly utilized in high-throughput enterprise systems. Message brokers such as Kafka and RabbitMQ enable decoupled event-driven workflows, ensuring message persistence and reliable fault tolerance during intermittent network partitions across distributed compute nodes.
`,
  },
  {
    name: "Resume with one core heading and a secondary heading (Education + Certifications)",
    expectedAccepted: true,
    text: `
Candidate Profile
Dallas, TX

Education:
B.S. in Computer Engineering, University of Texas (2018 - 2022)

Certifications:
AWS Certified Solutions Architect - Associate
Cisco Certified Network Associate (CCNA)
`,
  },
];

console.log("=================================================");
console.log("RESUME GUARD VALIDATION TEST SUITE");
console.log("=================================================\n");

let passedCount = 0;
let failedCount = 0;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const sections = splitSections(tc.text);
  const accepted = looksLikeResume(tc.text, sections);
  const success = accepted === tc.expectedAccepted;

  if (success) {
    passedCount++;
    console.log(`[PASS] ${tc.name}`);
    console.log(
      `       Result: ${accepted ? "ACCEPTED" : "REJECTED"} (Expected: ${
        tc.expectedAccepted ? "ACCEPTED" : "REJECTED"
      })`
    );
  } else {
    failedCount++;
    console.error(`[FAIL] ${tc.name}`);
    console.error(
      `       Result: ${accepted ? "ACCEPTED" : "REJECTED"} (Expected: ${
        tc.expectedAccepted ? "ACCEPTED" : "REJECTED"
      })`
    );
  }
}

console.log("\n-------------------------------------------------");
console.log(`Results: ${passedCount} Passed, ${failedCount} Failed`);
console.log("=================================================");

if (failedCount > 0) {
  process.exit(1);
}
