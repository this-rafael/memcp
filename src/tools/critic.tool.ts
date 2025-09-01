import { GeminiExecutor, TerminalExecutor } from "../executors/index.js";

/**
 * CriticTools provides evaluation and critical analysis capabilities using Gemini
 */
export class CriticTools {
  private geminiExecutor: GeminiExecutor;
  private terminalExecutor: TerminalExecutor;

  constructor(workingDirectory?: string) {
    this.geminiExecutor = GeminiExecutor.createWithOptions(workingDirectory);
    this.terminalExecutor =
      TerminalExecutor.createWithOptions(workingDirectory);
  }

  /**
   * Execute a critical evaluation of a generated response against a command
   */
  async kritiq(
    command: string,
    generatedResponse: string,
    timeout = 600
  ): Promise<string> {
    try {
      return await this.geminiExecutor.execute(
        command,
        generatedResponse,
        timeout
      );
    } catch (error) {
      throw new Error(`Kritiq execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a simpler evaluation using Gemini
   */
  async evaluateWithGemini(
    command: string,
    generatedResponse: string,
    timeout = 600
  ): Promise<string> {
    try {
      return await this.geminiExecutor.evaluateWithGemini(
        command,
        generatedResponse,
        timeout
      );
    } catch (error) {
      throw new Error(`Gemini evaluation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a Portuguese kritiq evaluation
   */
  async kritiqPt(
    command: string,
    generatedResponse: string,
    timeout = 600
  ): Promise<string> {
    try {
      return await this.geminiExecutor.executeKritiq(
        command,
        generatedResponse,
        timeout
      );
    } catch (error) {
      throw new Error(
        `Kritiq PT execution failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Execute a terminal command
   */
  async executeCommand(command: string, timeout?: number): Promise<string> {
    try {
      return await this.terminalExecutor.execute(command, timeout);
    } catch (error) {
      throw new Error(
        `Terminal command execution failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Set working directory for both executors
   */
  async setWorkingDirectory(directory: string): Promise<void> {
    await this.geminiExecutor.setWorkingDirectory(directory);
    await this.terminalExecutor.setWorkingDirectory(directory);
  }

  /**
   * Get current working directory
   */
  getWorkingDirectory(): string {
    return this.geminiExecutor.getWorkingDirectory();
  }

  /**
   * Set environment variable for both executors
   */
  setEnvironmentVariable(key: string, value: string): void {
    this.geminiExecutor.setEnvironmentVariable(key, value);
    this.terminalExecutor.setEnvironmentVariable(key, value);
  }

  /**
   * Get environment variable
   */
  getEnvironmentVariable(key: string, defaultValue = ""): string {
    return this.geminiExecutor.getEnvironmentVariable(key, defaultValue);
  }

  /**
   * Get information about the current execution environment
   */
  getExecutionInfo(): {
    workingDirectory: string;
    terminalInfo: ReturnType<TerminalExecutor["getShellInfo"]>;
    geminiInfo: ReturnType<GeminiExecutor["getTerminalInfo"]>;
  } {
    return {
      workingDirectory: this.getWorkingDirectory(),
      terminalInfo: this.terminalExecutor.getShellInfo(),
      geminiInfo: this.geminiExecutor.getTerminalInfo(),
    };
  }
}
