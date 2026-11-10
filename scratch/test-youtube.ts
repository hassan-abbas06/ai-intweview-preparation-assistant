import fs from "fs";
import path from "path";

// Simple env loader
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || "").trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  }
}

import { searchVideos } from "../lib/youtube/client";

async function test() {
  console.log("Testing YouTube search with API key...");
  try {
    const t0 = Date.now();
    const results = await searchVideos("Financial Modeling Fundamentals explained tutorial", 5);
    console.log(`Success in ${Date.now() - t0}ms! Found ${results.length} results:`);
    console.log(JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error("YouTube Search Error:", err.message, err.status, err.reason);
  }
}

test();
