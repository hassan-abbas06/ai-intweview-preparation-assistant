import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const key = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/)?.[1];

async function diagnose() {
  if (!key) {
    console.log("No GEMINI_API_KEY");
    return;
  }
  const ai = new GoogleGenAI({ apiKey: key });

  const prompt = "In exactly two short sentences, introduce yourself as Alex Chen, senior software architect.";
  console.log("PROMPT:", prompt);

  // Test 1: generateContent with maxOutputTokens: 200 (current default)
  console.log("\n--- TEST 1: generateContent with maxOutputTokens: 200 ---");
  try {
    const res1 = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 200,
        temperature: 0.5,
      },
    });
    console.log("res1.text:", JSON.stringify(res1.text));
    console.log("res1 candidate 0:", JSON.stringify(res1.candidates?.[0], null, 2));
    console.log("res1 usageMetadata:", JSON.stringify(res1.usageMetadata, null, 2));
  } catch (e: any) {
    console.error("Test 1 error:", e);
  }

  // Test 2: generateContent with maxOutputTokens: 1000 and thinkingConfig: { thinkingBudget: 0 }
  console.log("\n--- TEST 2: with maxOutputTokens: 1000 & thinkingBudget: 0 (or disabled) ---");
  try {
    const res2 = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.5,
      },
    });
    console.log("res2.text:", JSON.stringify(res2.text));
    console.log("res2 finishReason:", res2.candidates?.[0]?.finishReason);
    console.log("res2 usageMetadata:", JSON.stringify(res2.usageMetadata, null, 2));
  } catch (e: any) {
    console.error("Test 2 error:", e);
  }

  // Test 3: generateContentStream
  console.log("\n--- TEST 3: generateContentStream chunks ---");
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.5,
      },
    });
    let chunkIndex = 0;
    let full = "";
    for await (const chunk of stream) {
      chunkIndex++;
      console.log(`Chunk ${chunkIndex}:`, {
        text: chunk.text,
        finishReason: chunk.candidates?.[0]?.finishReason,
      });
      full += chunk.text || "";
    }
    console.log("Full streamed text:", JSON.stringify(full));
  } catch (e: any) {
    console.error("Test 3 error:", e);
  }
}

diagnose();
