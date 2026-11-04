import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const envPath = path.join(process.cwd(), ".env");
let key = process.env.GEMINI_API_KEY;
if (!key && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
  if (match) key = match[1];
}

async function testGemini() {
  if (!key) {
    console.log("No GEMINI_API_KEY found");
    return;
  }
  const ai = new GoogleGenAI({ apiKey: key });

  const candidateModels = [
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.5-pro",
  ];

  for (const model of candidateModels) {
    const t0 = Date.now();
    try {
      console.log(`Testing Gemini model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: "Respond with the single word: OK",
      });
      const latency = Date.now() - t0;
      console.log(`[SUCCESS] ${model} responded in ${latency}ms: "${response.text?.trim()}"`);
    } catch (err: any) {
      const latency = Date.now() - t0;
      console.log(`[FAILED] ${model} failed in ${latency}ms: ${err.message}`);
    }
  }
}

testGemini();
