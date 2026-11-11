export interface ExecutionRequest {
  language: string;        // normalized name, e.g. "python", "javascript", "java"
  code: string;
  stdin: string;           // test case input
  timeoutMs: number;       // hard cap, e.g. 10000
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  compileError: string | null; // non-null only for compiled languages that failed to compile
  runtimeMs: number;
}

export interface CodeExecutionProvider {
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
}
