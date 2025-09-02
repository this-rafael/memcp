import { TerminalExecutor } from "./terminal-executor.js";

/**
 * Escape a string for shell usage
 */
function shellEscape(str: string): string {
  return `'${str.replace(/'/g, "'\"'\"'")}'`;
}

/**
 * GeminiExecutor executes evaluations using Gemini through the terminal
 */
export class GeminiExecutor {
  private terminal: TerminalExecutor;

  constructor(workingDirectory?: string, shell?: string) {
    this.terminal = new TerminalExecutor(workingDirectory, shell);
  }

  /**
   * Create a new instance of the Gemini executor
   */
  static create(): GeminiExecutor {
    return new GeminiExecutor();
  }

  /**
   * Create a Gemini executor with custom options
   */
  static createWithOptions(
    workingDirectory?: string,
    shell?: string
  ): GeminiExecutor {
    return new GeminiExecutor(workingDirectory, shell);
  }

  /**
   * Execute an evaluation using Gemini to check if the command was met by the response
   */
  async execute(
    command: string,
    generatedResponse: string,
    timeout = 600
  ): Promise<string> {
    // Build the prompt for Gemini (same prompt as Python version)
    const prompt = `
> You are a senior analytical critic, specialized in evaluating technical work based on **evidence, standards, and logic**. Your goal is to review a generated artifact (code, diagram, documentation, process, architecture, etc.) and produce a highly detailed, well-founded, and actionable technical-critical report. You must not modify any artifact; instead, write a response that analyzes the artifact against the established criteria.

---

### **INPUTS**

1. **📄 Request Text** — a detailed description of what should have been produced (explicit and implicit requirements).
2. **📦 Generated Result** — the artifact to be evaluated.

---

### **THINKING AND ACTION MODE**

1. **Criteria Extraction**

	- Identify **all explicit criteria** (what was clearly requested).
	- Detect **implicit criteria** (best practices and expected quality standards even if not mentioned).
	- Map **priorities** (what is essential vs. what is optional).

2. **Contextual Analysis**

	- Check **coherence between the artifact and its context of use**.
	- Assess **the suitability of the approach** to the proposed problem.
	- Consider **technical trade-offs** (e.g., performance vs. readability, simplicity vs. extensibility).

3. **Structured Evaluation**

	- **Requirement Coverage** → does it fully meet the request?
	- **Logical Consistency** → are there contradictions, inconsistencies, or gaps?
	- **Technical Quality** → clarity, readability, correct use of patterns.
	- **Standards and Best Practices** → does it follow accepted conventions for the domain?
	- **Scalability and Maintainability** → is it sustainable in the long term?

4. **Issue Identification**

	- Categorize by **severity**:

	  - 🚨 **Critical** → severe violations or issues that make usage unfeasible.
	  - ⚠️ **Important** → problems that compromise quality/maintainability.
	  - ℹ️ **Note** → minor adjustments or refinement suggestions.

	- Always cite **concrete evidence** from the artifact to support the critique.

5. **Actionable Recommendations**

	- Provide **clear and feasible suggestions** for each issue.
	- Explain **why** the change is necessary and **how** it improves the outcome.
	- If there are multiple solutions, present pros and cons.

6. **Continuous Improvement View**

	- Point out **opportunities for evolution** beyond the requested scope.
	- Identify recurring patterns that indicate systemic issues.

---

### **OUTPUT FORMAT**

\`\`\`
📋 Overall Assessment
Objective summary of how well the result meets the request, highlighting high-level strengths and weaknesses.

✅ Strengths
- [Positive point] + justification.
- [Positive point] + justification.

⚠️ Issues Found
1. [Severity] Problem description + artifact evidence + violated criterion.
2. [Severity] ...

💡 Recommendations
- [Recommendation] + explanation + expected impact.
- [Alternative/option] with trade-offs.

📈 Evolution Notes
Suggestions for future improvements aligned with excellence standards.
\`\`\`

---

### **ESSENTIAL RULES**

- Always cite concrete examples from the artifact.
- Do not soften critical issues.
- Keep a constructive but direct tone.
- Avoid jargon without explanation.
- Question omissions and inconsistencies even if they are not in the original scope.
- Assume the requester expects **clarity, assertiveness, and depth**.

**📄 Original Request:**
${command}

**📦 Generated Response:**
${generatedResponse}
	 `;

    // Execute the Gemini command using the TerminalExecutor
    const geminiCommand = `gemini -p ${shellEscape(prompt)}`;

    const result = await this.terminal.execute(geminiCommand, timeout);

    // Clean the output removing Gemini cache messages
    const cleanedResult = result
      .replace(/Loaded cached credentials\./g, "")
      .trim();

    return cleanedResult;
  }

  /**
   * Execute a raw prompt (no evaluation wrapper). Designed for agents that need direct JSON back.
   * Uses a temporary file to avoid shell length limits with big prompts.
   */
  async executeDirectPrompt(prompt: string, timeout = 120): Promise<string> {
    const fs = await import("fs");
    const os = await import("os");
    const path = await import("path");
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `gemini-prompt-${Date.now()}.txt`);
    await fs.promises.writeFile(filePath, prompt, "utf8");
    try {
      // -y para resposta direta sem confirmação, redirecionando stdin
      const geminiCommand = `gemini -y < ${shellEscape(filePath)}`;
      const result = await this.terminal.execute(geminiCommand, timeout);
      return result.replace(/Loaded cached credentials\./g, "").trim();
    } finally {
      try {
        await fs.promises.unlink(filePath);
      } catch {}
    }
  }

  /**
   * Execute kritiq evaluation (critical analysis)
   */
  async executeKritiq(
    command: string,
    generatedResponse: string,
    timeout = 600
  ): Promise<string> {
    const prompt = `
Você é um crítico analítico sênior, especializado em avaliar trabalhos técnicos com base em **evidências, padrões e lógica**. Seu objetivo é revisar um artefato gerado e produzir um relatório técnico-crítico altamente detalhado, bem fundamentado e acionável.

### **ENTRADAS**

1. **📄 Texto da Solicitação** — descrição detalhada do que deveria ter sido produzido.
2. **📦 Resultado Gerado** — o artefato a ser avaliado.

### **ANÁLISE ESTRUTURADA**

1. **Cobertura de Requisitos** → atende completamente à solicitação?
2. **Consistência Lógica** → há contradições, inconsistências ou lacunas?
3. **Qualidade Técnica** → clareza, legibilidade, uso correto de padrões.
4. **Padrões e Melhores Práticas** → segue convenções aceitas para o domínio?
5. **Escalabilidade e Manutenibilidade** → é sustentável a longo prazo?

### **FORMATO DE SAÍDA**

\`\`\`
📋 Avaliação Geral
Resumo objetivo de quão bem o resultado atende à solicitação.

✅ Pontos Fortes
- [Ponto positivo] + justificativa.

⚠️ Problemas Encontrados
1. [Severidade] Descrição do problema + evidência do artefato.

💡 Recomendações
- [Recomendação] + explicação + impacto esperado.

📈 Notas de Evolução
Sugestões para melhorias futuras alinhadas com padrões de excelência.
\`\`\`

**📄 Solicitação Original:**
${command}

**📦 Resposta Gerada:**
${generatedResponse}
    `;

    const geminiCommand = `gemini -p ${shellEscape(prompt)}`;
    const result = await this.terminal.execute(geminiCommand, timeout);

    return result.replace(/Loaded cached credentials\./g, "").trim();
  }

  /**
   * Execute a simple evaluation check
   */
  async evaluateWithGemini(
    command: string,
    generatedResponse: string,
    timeout = 600
  ): Promise<string> {
    const prompt = `
Analise se a resposta gerada atende adequadamente ao comando solicitado.

**Comando:**
${command}

**Resposta Gerada:**
${generatedResponse}

Forneça uma análise concisa indicando:
1. Se a resposta atende ao comando (SIM/NÃO)
2. Principais pontos positivos
3. Principais problemas ou omissões
4. Sugestões de melhoria (se aplicável)
    `;

    const geminiCommand = `gemini -p ${shellEscape(prompt)}`;
    const result = await this.terminal.execute(geminiCommand, timeout);

    return result.replace(/Loaded cached credentials\./g, "").trim();
  }

  /**
   * Set the working directory of the underlying terminal
   */
  async setWorkingDirectory(directory: string): Promise<void> {
    return this.terminal.setWorkingDirectory(directory);
  }

  /**
   * Get the current working directory of the underlying terminal
   */
  getWorkingDirectory(): string {
    return this.terminal.getWorkingDirectory();
  }

  /**
   * Set an environment variable in the underlying terminal
   */
  setEnvironmentVariable(key: string, value: string): void {
    this.terminal.setEnvironmentVariable(key, value);
  }

  /**
   * Get the value of an environment variable from the underlying terminal
   */
  getEnvironmentVariable(key: string, defaultValue = ""): string {
    return this.terminal.getEnvironmentVariable(key, defaultValue);
  }

  /**
   * Get terminal information
   */
  getTerminalInfo(): {
    shell: string;
    workingDirectory: string;
    env: Record<string, string>;
  } {
    return this.terminal.getShellInfo();
  }
}
