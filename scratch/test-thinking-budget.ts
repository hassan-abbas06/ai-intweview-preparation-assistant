import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const key = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/)?.[1];

async function testThinking() {
  const ai = new GoogleGenAI({ apiKey: key! });
  const prompt = "In exactly two short sentences, introduce yourself as Alex Chen, senior software architect.";

  // Test with thinkingBudget: 0
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 800,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });
    console.log("thinkingBudget 0 text:", res.text);
    console.log("thinkingBudget 0 usage:", res.usageMetadata);
  } catch (e: any) {
    console.log("thinkingBudget 0 error:", e.message);
  }
}

testThinking();
