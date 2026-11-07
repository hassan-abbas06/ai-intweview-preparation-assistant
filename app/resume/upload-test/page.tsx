"use client";
// TEMPORARY Stage 1 test page. Delete once the real resume UI is built.
import { useState } from "react";

export default function UploadTestPage() {
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult("");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/resume/upload", { method: "POST", body });
      setResult(`HTTP ${res.status}\n` + JSON.stringify(await res.json(), null, 2));
    } catch (err) {
      setResult("Request failed: " + String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Resume upload test (Stage 1)</h1>
      <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={onChange} disabled={busy} />
      <pre style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{busy ? "Uploading..." : result}</pre>
    </main>
  );
}
