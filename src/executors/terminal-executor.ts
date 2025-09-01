import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * TerminalExecutor executes commands in terminal maintaining their characteristics
 */
export class TerminalExecutor {
  private workingDirectory: string;
  private shell: string;
  private env: Record<string, string>;

  constructor(workingDirectory?: string, shell?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
    this.shell = shell || this.detectDefaultShell();
    this.env = Object.fromEntries(
      Object.entries(process.env).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;
  }

  /**
   * Create a new instance of the terminal executor
   */
  static create(): TerminalExecutor {
    return new TerminalExecutor();
  }

  /**
   * Create a terminal executor with custom options
   */
  static createWithOptions(
    workingDirectory?: string,
    shell?: string
  ): TerminalExecutor {
    return new TerminalExecutor(workingDirectory, shell);
  }

  /**
   * Detect the user's default shell; fall back to zsh, then bash
   */
  private detectDefaultShell(): string {
    const userShell = process.env.SHELL;
    if (userShell) {
      return userShell;
    }

    // Prefer zsh when available on this system
    const zshPaths = ["/bin/zsh", "/usr/bin/zsh"];
    for (const zshPath of zshPaths) {
      if (fs.existsSync(zshPath)) {
        return zshPath;
      }
    }

    return "/bin/bash";
  }

  /**
   * Execute a command in the terminal and return the result
   */
  async execute(command: string, timeout?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeoutMs = timeout ? timeout * 1000 : undefined;

      // Create command (loading ~/.zshrc when applicable)
      let args = ["-c", command];
      if (this.isZsh(this.shell)) {
        // Silent sourcing of ~/.zshrc avoids side effects of an interactive shell
        const src = "test -f ~/.zshrc && . ~/.zshrc >/dev/null 2>&1; ";
        args = ["-c", src + command];
      }

      const child = spawn(this.shell, args, {
        cwd: this.workingDirectory,
        env: this.env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timeoutId: NodeJS.Timeout | undefined;

      // Set up timeout if specified
      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          child.kill("SIGTERM");
          reject(
            new Error(`Command '${command}' timed out after ${timeout} seconds`)
          );
        }, timeoutMs);
      }

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const output = stdout + stderr;

        if (code === 0) {
          resolve(output);
        } else {
          // For commands that fail, still return the output
          resolve(`Command failed with exit code ${code}\nOutput: ${output}`);
        }
      });

      child.on("error", (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(
          new Error(`Failed to execute command '${command}': ${error.message}`)
        );
      });
    });
  }

  /**
   * Set the working directory
   */
  async setWorkingDirectory(directory: string): Promise<void> {
    const absPath = path.resolve(directory);

    try {
      await fs.promises.access(absPath);
      const stats = await fs.promises.stat(absPath);

      if (!stats.isDirectory()) {
        throw new Error(`'${absPath}' is not a directory`);
      }

      this.workingDirectory = absPath;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(`Directory '${absPath}' does not exist`);
      }
      throw new Error(
        `Cannot access directory '${absPath}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Get the current working directory
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set an environment variable
   */
  setEnvironmentVariable(key: string, value: string): void {
    this.env[key] = value;
  }

  /**
   * Get the value of an environment variable
   */
  getEnvironmentVariable(key: string, defaultValue = ""): string {
    return this.env[key] ?? defaultValue;
  }

  /**
   * Execute a command interactively
   */
  async executeInteractive(command: string): Promise<string> {
    try {
      let args = ["-c", command];
      if (this.isZsh(this.shell)) {
        const src = "test -f ~/.zshrc && . ~/.zshrc >/dev/null 2>&1; ";
        args = ["-c", src + command];
      }

      const { stdout, stderr } = await execAsync(
        this.shell + " " + args.join(" "),
        {
          cwd: this.workingDirectory,
          env: this.env,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        }
      );

      return stdout + stderr;
    } catch (error) {
      // For interactive commands, still return the output even with error
      if (error instanceof Error && "stdout" in error && "stderr" in error) {
        return (error.stdout as string) + (error.stderr as string);
      }
      throw error;
    }
  }

  /**
   * Check if the shell configured is zsh
   */
  private isZsh(shellPath: string): boolean {
    const shellBasename = path.basename(shellPath.trim());
    return shellBasename === "zsh" || shellBasename.includes("zsh");
  }

  /**
   * Get shell information
   */
  getShellInfo(): {
    shell: string;
    workingDirectory: string;
    env: Record<string, string>;
  } {
    return {
      shell: this.shell,
      workingDirectory: this.workingDirectory,
      env: { ...this.env },
    };
  }
}
