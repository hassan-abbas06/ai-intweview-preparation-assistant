"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  Target,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { compressImageIfNeeded } from "@/lib/client/compress-image";

interface ScanHistoryItem {
  scanId: string;
  fileName: string;
  mode: "JOB_TARGETED" | "GENERAL";
  score: number;
  coverage: number;
  timestamp: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.jpg,.jpeg,.png,.webp,.heic,.heif";

function getErrorMessage(res: Response, json: any): string {
  if (json && typeof json.message === "string" && json.message.trim().length > 0) {
    return json.message.trim();
  }
  if (json && typeof json.error === "string" && json.error.trim().length > 0) {
    return json.error.trim();
  }
  switch (res.status) {
    case 401:
      return "Please sign in.";
    case 403:
      return "Access denied.";
    case 413:
      return "File is larger than 10 MB.";
    case 422:
      return "We couldn't read this file.";
    case 429:
      return "Too many attempts. Try again later.";
    case 503:
      return "Reading images is temporarily unavailable.";
    default:
      return "Something went wrong (HTTP " + res.status + ").";
  }
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  timeoutErrorMessage: string
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return fetch(url, Object.assign({}, options, { signal: controller.signal }))
    .then((res) => {
      clearTimeout(timer);
      return res;
    })
    .catch((err) => {
      clearTimeout(timer);
      if (err && err.name === "AbortError") {
        throw new Error(timeoutErrorMessage);
      }
      throw err;
    });
}

interface CloudinaryUploadResult {
  ok: boolean;
  status: number;
  data: any;
}

function uploadToCloudinaryWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
  timeoutMs: number,
  timeoutErrorMessage: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    };

    xhr.onerror = () => {
      reject(new Error("Failed to upload document to storage provider. Check your connection."));
    };

    xhr.ontimeout = () => {
      reject(new Error(timeoutErrorMessage));
    };

    xhr.onabort = () => {
      reject(new Error("Upload was cancelled."));
    };

    xhr.send(formData);
  });
}

export default function ResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  // Scan configuration state
  const [scanMode, setScanMode] = useState<"GENERAL" | "JOB_TARGETED">("JOB_TARGETED");
  const [jobDescription, setJobDescription] = useState("");
  const [scanning, setScanning] = useState(false);

  // History and UI message state
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load past scans on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/resume/history");
      if (res.ok) {
        const json = await res.json();
        if (!json.error && Array.isArray(json.data)) {
          setHistory(json.data);
        }
      }
    } catch {
      // Ignore network errors on background history fetch
    } finally {
      setLoadingHistory(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "File exceeds 10MB limit. Please upload a smaller file.";
    }
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const typeAllowed = ACCEPTED_TYPES.indexOf(file.type) !== -1;
    const extAllowed = ACCEPTED_EXTENSIONS.indexOf(ext) !== -1;
    if (!typeAllowed && !extAllowed) {
      return "Invalid file format. Please upload a PDF, DOCX, JPG, PNG, WEBP, or HEIC file.";
    }
    return null;
  };

  const handleFile = async (rawFile: File) => {
    if (uploading || optimizing) return;

    setErrorMessage(null);
    setUploadWarning(null);

    let file = rawFile;
    setOptimizing(true);
    try {
      file = await compressImageIfNeeded(rawFile, 10 * 1024 * 1024 - 1);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          "This photo format can't be read in your browser. Please convert it to JPG or PNG and try again."
      );
      setOptimizing(false);
      return;
    } finally {
      setOptimizing(false);
    }

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setSelectedFile(file);
    setUploading(true);
    setUploadStep("Preparing upload...");
    setUploadProgress(null);

    try {
      // Step 1: Request signed upload authorization from server (20s timeout)
      const signRes = await fetchWithTimeout(
        "/api/resume/upload/sign",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
        },
        20000,
        "Upload took too long. Check your connection and try again."
      );

      let signData: any = null;
      try {
        signData = await signRes.json();
      } catch {
        // Non-JSON response
      }

      if (!signRes.ok || (signData && signData.error)) {
        const msg = getErrorMessage(signRes, signData);
        setErrorMessage(msg);
        setSelectedFile(null);
        setUploadedResumeId(null);
        return;
      }

      const { cloudName, apiKey, timestamp, signature, folder, type } = signData.data;

      // Step 2: Direct browser-to-Cloudinary raw upload (120s timeout with progress)
      setUploadStep("Uploading to storage...");
      setUploadProgress(0);

      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append("file", file);
      cloudinaryFormData.append("api_key", apiKey);
      cloudinaryFormData.append("timestamp", String(timestamp));
      cloudinaryFormData.append("signature", signature);
      cloudinaryFormData.append("folder", folder);
      cloudinaryFormData.append("type", type);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
      const cldResult = await uploadToCloudinaryWithProgress(
        uploadUrl,
        cloudinaryFormData,
        (percent) => {
          setUploadProgress(percent);
        },
        120000,
        "Upload took too long. Check your connection and try again."
      );

      const cldData = cldResult.data;
      if (!cldResult.ok || !cldData || !cldData.public_id) {
        const cldError =
          (cldData && cldData.error && cldData.error.message) ||
          "Failed to upload document to storage provider.";
        setErrorMessage(cldError);
        setSelectedFile(null);
        setUploadedResumeId(null);
        return;
      }

      const publicId = cldData.public_id;

      // Step 3: Complete upload and parse resume server-side (90s timeout)
      setUploadStep("Reading your resume...");
      setUploadProgress(null);

      const completeRes = await fetchWithTimeout(
        "/api/resume/upload/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, fileName: file.name }),
        },
        90000,
        "Reading the resume took too long. Try again, or upload a text-based PDF or DOCX."
      );

      let completeData: any = null;
      try {
        completeData = await completeRes.json();
      } catch {
        // Non-JSON response
      }

      if (!completeRes.ok || (completeData && completeData.error)) {
        const msg = getErrorMessage(completeRes, completeData);
        setErrorMessage(msg);
        setSelectedFile(null);
        setUploadedResumeId(null);
        return;
      }

      const uploadData = completeData?.data;
      if (!uploadData?.resumeId) {
        setErrorMessage("Upload succeeded but no resume ID was returned.");
        setSelectedFile(null);
        setUploadedResumeId(null);
        return;
      }

      setUploadedResumeId(uploadData.resumeId);
      if (uploadData.structure?.ocrUsed) {
        setUploadWarning("Scanned or image-based document detected: text was extracted via AI Vision OCR.");
      } else if (uploadData.warnings && uploadData.warnings.length > 0) {
        setUploadWarning(uploadData.warnings[0]);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to upload resume. Please try again.");
      setSelectedFile(null);
      setUploadedResumeId(null);
    } finally {
      setUploading(false);
      setUploadStep("");
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      e.target.value = "";
      handleFile(f);
    }
  };

  const jdCharCount = jobDescription.trim().length;
  const isJdValid = scanMode === "GENERAL" || (jdCharCount >= 50 && jdCharCount <= 8000);
  const canScan = Boolean(uploadedResumeId && !uploading && !scanning && isJdValid);

  const handleStartScan = async () => {
    if (!uploadedResumeId || !canScan) return;

    setScanning(true);
    setErrorMessage(null);

    try {
      const payload: { resumeId: string; jobDescription?: string | null } = {
        resumeId: uploadedResumeId,
        jobDescription: scanMode === "JOB_TARGETED" ? jobDescription.trim() : null,
      };

      const res = await fetch("/api/resume/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok || (data && data.error)) {
        setErrorMessage(getErrorMessage(res, data));
        setScanning(false);
        return;
      }

      if (data?.data?.scanId) {
        // Redirect to detailed scan results
        router.push(`/resume/${data.data.scanId}`);
      } else {
        setErrorMessage("Scan completed but no scan ID was returned.");
        setScanning(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Network error occurred while scanning.");
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0"
              title="Home"
            >
              AI
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
          <ThemeToggle />
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> Stage 2 ATS Scanner & Optimizer
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
            ATS Resume Scanner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Get an instant ATS compatibility score, audit key sections, uncover missing keywords, and receive strictly grounded AI bullet rewrites.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 text-rose-700 dark:text-rose-300">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="text-sm">
              <span className="font-semibold">Error: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Warning Banner (e.g. OCR fallback notification) */}
        {uploadWarning && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div className="text-sm leading-relaxed">
              <span className="font-semibold">Notice: </span>
              {uploadWarning}
            </div>
          </div>
        )}

        {/* Main Work Area: Step 1 Upload & Step 2 Target */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* STEP 1: RESUME UPLOAD */}
          <Card className="flex flex-col border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <CardTitle className="text-base font-semibold">Upload Your Resume</CardTitle>
                </div>
                {uploadedResumeId && (
                  <Badge variant="success" className="text-xs">
                    Uploaded
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Supports PDF, DOCX, JPG, PNG, WEBP, HEIC (Max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => !uploading && !optimizing && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]"
                    : uploadedResumeId
                    ? "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                } ${uploading || optimizing ? "pointer-events-none opacity-80" : ""}`}
              >
                {optimizing ? (
                  <div className="space-y-3 py-4 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Optimizing image...
                    </p>
                    <p className="text-xs text-slate-400">
                      Compressing photo for faster ATS scanning
                    </p>
                  </div>
                ) : uploading ? (
                  <div className="space-y-3 py-4 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {uploadStep === "Uploading to storage..." && uploadProgress !== null
                        ? `Uploading to storage... ${uploadProgress}%`
                        : uploadStep || "Uploading document..."}
                    </p>
                    {uploadStep === "Uploading to storage..." && uploadProgress !== null && (
                      <div className="w-48 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-slate-400">
                      {uploadStep === "Preparing upload..."
                        ? "Verifying file and preparing secure transfer"
                        : uploadStep === "Uploading to storage..."
                        ? "Uploading document to cloud storage"
                        : "Scanning sections, skills, and experience"}
                    </p>
                  </div>
                ) : uploadedResumeId && selectedFile ? (
                  <div className="space-y-2 py-2 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click or drop to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 py-4 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Drop your resume here, or <span className="text-blue-600 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        High accuracy text parser & OCR for scans
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: JOB TARGETING */}
          <Card className="flex flex-col border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <CardTitle className="text-base font-semibold">Job Description Targeting</CardTitle>
                </div>
                <Badge variant={scanMode === "JOB_TARGETED" ? "primary" : "neutral"} className="text-xs">
                  {scanMode === "JOB_TARGETED" ? "Job-Targeted" : "General"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Do you have a specific role you are applying to?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setScanMode("JOB_TARGETED")}
                  className={`py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    scanMode === "JOB_TARGETED"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" /> Target a Job
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode("GENERAL")}
                  className={`py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    scanMode === "GENERAL"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> General ATS Audit
                </button>
              </div>

              {scanMode === "JOB_TARGETED" ? (
                <div className="flex-1 flex flex-col space-y-1.5">
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here (requirements, responsibilities, technical skills)..."
                    rows={5}
                    className="w-full flex-1 p-3 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`${
                        jdCharCount > 0 && jdCharCount < 50
                          ? "text-rose-500 font-medium"
                          : jdCharCount > 8000
                          ? "text-rose-500 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {jdCharCount < 50
                        ? `${jdCharCount} / 50 min characters required`
                        : `${jdCharCount} / 8000 characters`}
                    </span>
                    {jdCharCount >= 50 && jdCharCount <= 8000 && (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready for matching
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <FileText className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    General Comprehensive Audit
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    Evaluates formatting, structure, quantifiable impact, action verbs, and section coverage without requiring a specific job post.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scan Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            {!uploadedResumeId ? (
              <span>&bull; Please upload a resume in Step 1 to begin.</span>
            ) : scanMode === "JOB_TARGETED" && jdCharCount < 50 ? (
              <span className="text-amber-600 dark:text-amber-400">
                &bull; Please enter at least 50 characters in the job description to run a targeted scan.
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Ready to scan. AI suggestions will be generated after scoring.
              </span>
            )}
          </div>
          <Button
            size="lg"
            variant="primary"
            disabled={!canScan}
            onClick={handleStartScan}
            className="w-full sm:w-auto px-8 font-semibold shadow-md shadow-blue-500/20"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing ATS Scoring & Suggestions...
              </>
            ) : (
              <>
                Scan Resume Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Scan History Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Previous Scan Reports
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="text-xs text-slate-500"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-slate-400" />
              Loading your scan history...
            </div>
          ) : history.length === 0 ? (
            <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
              <CardContent className="py-8 text-center text-xs text-slate-400">
                No past scans found. Upload a resume above to run your first ATS audit.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {history.map((item) => (
                <Link
                  key={item.scanId}
                  href={`/resume/${item.scanId}`}
                  className="group block"
                >
                  <Card className="h-full border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {item.fileName}
                          </p>
                          <Badge
                            variant={item.mode === "JOB_TARGETED" ? "primary" : "neutral"}
                            className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0"
                          >
                            {item.mode === "JOB_TARGETED" ? "Targeted" : "General"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          Scanned {new Date(item.timestamp).toLocaleDateString()} at{" "}
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-xl font-extrabold ${
                              item.score >= 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : item.score >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {item.score}
                            <span className="text-xs text-slate-400 font-normal">/100</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.coverage}% coverage
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
