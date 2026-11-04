import fs from "fs";
import path from "path";
import { GroqProvider } from "../lib/llm/groq";
import { GeminiProvider } from "../lib/llm/gemini";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");

const groqKey = envContent.match(/GROQ_API_KEY\s*=\s*["']?([^"'\r\n]+)/)?.[1];
const geminiKey = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/)?.[1];

async function runStreamTests() {
  console.log("==================================================");
  console.log("TESTING REAL STREAMED CALLS TO GROQ AND GEMINI");
  console.log("==================================================");

  // 1. GROQ STREAM TEST
  if (groqKey) {
    console.log("\n[1] Starting Groq Real Streamed Call...");
    const groq = new GroqProvider(groqKey);
    const t0 = Date.now();
    let ttft: number | null = null;
    let accumulated = "";

    try {
      await groq.streamText({
        messages: [
          {
            role: "user",
            content: "In exactly two short sentences, introduce yourself as Alex Chen, senior software architect.",
          },
        ],
        systemInstruction: "You are an expert technical interviewer.",
        onChunk: (chunk) => {
          if (ttft === null) {
            ttft = Date.now() - t0;
          }
          accumulated += chunk;
        },
      });
      const totalTime = Date.now() - t0;
      console.log(`✓ GROQ STREAM SUCCESS!`);
      console.log(`  • Time to First Token (TTFT) : ${ttft}ms`);
      console.log(`  • Total Stream Latency      : ${totalTime}ms`);
      console.log(`  • Response Text (${accumulated.length} chars):`);
      console.log(`    "${accumulated.trim()}"`);
    } catch (err: any) {
      console.error(`✗ GROQ STREAM FAILED in ${Date.now() - t0}ms:`, err.message);
    }
  } else {
    console.log("\n[1] Groq API Key missing in .env");
  }

  // 2. GEMINI STREAM TEST
  if (geminiKey) {
    console.log("\n[2] Starting Gemini Real Streamed Call...");
    const gemini = new GeminiProvider(geminiKey);
    const t0 = Date.now();
    let ttft: number | null = null;
    let accumulated = "";

    try {
      await gemini.streamText({
        messages: [
          {
            role: "user",
            content: "In exactly two short sentences, introduce yourself as Alex Chen, senior software architect.",
          },
        ],
        systemInstruction: "You are an expert technical interviewer.",
        onChunk: (chunk) => {
          if (ttft === null) {
            ttft = Date.now() - t0;
          }
          accumulated += chunk;
        },
      });
      const totalTime = Date.now() - t0;
      console.log(`✓ GEMINI STREAM SUCCESS!`);
      console.log(`  • Time to First Token (TTFT) : ${ttft}ms`);
      console.log(`  • Total Stream Latency      : ${totalTime}ms`);
      console.log(`  • Response Text (${accumulated.length} chars):`);
      console.log(`    "${accumulated.trim()}"`);
    } catch (err: any) {
      console.error(`✗ GEMINI STREAM FAILED in ${Date.now() - t0}ms:`, err.message);
    }
  } else {
    console.log("\n[2] Gemini API Key missing in .env");
  }

  console.log("\n==================================================");
}

runStreamTests();
