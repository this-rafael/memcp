import { ZodError } from "zod";
import {
  Link,
  LinkSchema,
  MainMemory,
  MainMemorySchema,
  MemoryFrontmatter,
  MemoryFrontmatterSchema,
  Submemory,
  SubmemorySchema,
  ValidationResult,
} from "../types.js";

/**
 * Schema validation system for all memory layers
 */
export class ValidationSystem {
  /**
   * Validate main memory structure
   */
  static validateMainMemory(
    data: unknown
  ): ValidationResult & { data?: MainMemory } {
    try {
      const validated = MainMemorySchema.parse(data);
      return {
        valid: true,
        errors: [],
        warnings: [],
        data: validated,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate submemory structure
   */
  static validateSubmemory(
    data: unknown
  ): ValidationResult & { data?: Submemory } {
    try {
      const validated = SubmemorySchema.parse(data);

      const warnings: string[] = [];

      // Additional business logic validations
      if (validated.memories.length === 0) {
        warnings.push("Submemory has no memory references");
      }

      if (
        validated.priority &&
        (validated.priority < 1 || validated.priority > 10)
      ) {
        warnings.push("Priority should be between 1 and 10");
      }

      // Check for duplicate memory paths
      const memoryPaths = validated.memories.map((m) => m.path);
      const duplicates = memoryPaths.filter(
        (path, index) => memoryPaths.indexOf(path) !== index
      );
      if (duplicates.length > 0) {
        warnings.push(
          `Duplicate memory references found: ${duplicates.join(", ")}`
        );
      }

      return {
        valid: true,
        errors: [],
        warnings,
        data: validated,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate memory frontmatter
   */
  static validateMemoryFrontmatter(
    data: unknown
  ): ValidationResult & { data?: MemoryFrontmatter } {
    try {
      const validated = MemoryFrontmatterSchema.parse(data);

      const warnings: string[] = [];
      const errors: string[] = [];

      // Additional business logic validations
      const createdDate = new Date(validated.created_at);
      const updatedDate = new Date(validated.updated_at);

      if (updatedDate < createdDate) {
        errors.push("Updated date cannot be before created date");
      }

      if (validated.tags && validated.tags.length > 10) {
        warnings.push(
          "Consider reducing the number of tags (current: " +
            validated.tags.length +
            ")"
        );
      }

      // Check for empty or very short titles
      if (validated.title.trim().length < 3) {
        warnings.push("Title is very short");
      }

      if (validated.title.length > 100) {
        warnings.push("Title is very long, consider shortening");
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: validated,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate link structure
   */
  static validateLink(data: unknown): ValidationResult & { data?: Link } {
    try {
      const validated = LinkSchema.parse(data);

      const warnings: string[] = [];
      const errors: string[] = [];

      // Additional business logic validations
      if (validated.descricao_curta.length < 10) {
        warnings.push("Description is very short");
      }

      // Check context/subcontext naming conventions
      if (validated.contexto.includes("-")) {
        warnings.push("Context name should use underscores instead of hyphens");
      }

      if (validated.subcontexto.includes("-")) {
        warnings.push(
          "Subcontext name should use underscores instead of hyphens"
        );
      }

      // Check if path looks valid
      if (!validated.caminho_memoria.includes("/")) {
        warnings.push("Memory path should include directory structure");
      }

      if (!validated.caminho_memoria.endsWith(".md")) {
        warnings.push("Memory path should end with .md extension");
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: validated,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate memory content length and structure
   */
  static validateMemoryContent(content: string): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check content length
    if (content.trim().length === 0) {
      errors.push("Memory content cannot be empty");
    } else if (content.trim().length < 50) {
      warnings.push("Memory content is very short");
    }

    if (content.length > 100000) {
      warnings.push("Memory content is very long (>100KB), consider splitting");
    }

    // Check for common markdown issues
    const lines = content.split("\n");

    // Check for excessive blank lines
    let consecutiveBlankLines = 0;
    for (const line of lines) {
      if (line.trim() === "") {
        consecutiveBlankLines++;
        if (consecutiveBlankLines > 3) {
          warnings.push("Consider reducing consecutive blank lines");
          break;
        }
      } else {
        consecutiveBlankLines = 0;
      }
    }

    // Check for potential frontmatter in content
    if (content.trim().startsWith("---")) {
      warnings.push(
        "Content appears to contain frontmatter, ensure it's properly separated"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate context/subcontext naming
   */
  static validateContextNaming(
    name: string,
    type: "context" | "subcontext"
  ): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check naming conventions
    if (!name.match(/^[a-z_]+$/)) {
      errors.push(
        `${type} name must contain only lowercase letters and underscores`
      );
    }

    if (name.length < 2) {
      errors.push(`${type} name is too short`);
    }

    if (name.length > 50) {
      errors.push(`${type} name is too long (max 50 characters)`);
    }

    if (name.startsWith("_") || name.endsWith("_")) {
      warnings.push(`${type} name should not start or end with underscore`);
    }

    if (name.includes("__")) {
      warnings.push(`${type} name should not contain consecutive underscores`);
    }

    // Check for reserved names
    const reservedNames = [
      "config",
      "index",
      "main",
      "root",
      "system",
      "temp",
      "tmp",
    ];
    if (reservedNames.includes(name)) {
      warnings.push(
        `${type} name '${name}' is reserved, consider using a different name`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate tag array
   */
  static validateTags(tags: string[]): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const tag of tags) {
      if (tag.trim() !== tag) {
        warnings.push(`Tag '${tag}' has leading or trailing whitespace`);
      }

      if (tag.length === 0) {
        errors.push("Empty tags are not allowed");
      }

      if (tag.length > 30) {
        warnings.push(`Tag '${tag}' is very long`);
      }

      if (tag.includes(",")) {
        warnings.push(
          `Tag '${tag}' contains comma, which may cause CSV issues`
        );
      }
    }

    // Check for duplicates
    const uniqueTags = new Set(tags.map((t) => t.toLowerCase()));
    if (uniqueTags.size !== tags.length) {
      warnings.push("Duplicate tags found (case-insensitive)");
    }

    if (tags.length > 10) {
      warnings.push(
        `Too many tags (${tags.length}), consider using fewer, more focused tags`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate memory path format
   */
  static validateMemoryPath(path: string): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check basic path format
    if (!path.includes("/")) {
      errors.push("Memory path must include directory structure");
    }

    if (!path.endsWith(".md") && !path.endsWith(".markdown")) {
      errors.push("Memory path must end with .md or .markdown extension");
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      errors.push("Memory path contains invalid characters");
    }

    // Check path length
    if (path.length > 255) {
      errors.push("Memory path is too long");
    }

    // Check for relative path indicators
    if (path.includes("../") || path.includes("./")) {
      errors.push("Memory path should not contain relative path indicators");
    }

    // Check if path looks like it follows expected structure
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      warnings.push(
        "Memory path should follow structure: memories/context/subcontext/file.md"
      );
    }

    if (pathParts[0] !== "memories") {
      warnings.push("Memory path should start with 'memories/'");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Comprehensive validation for a complete memory object
   */
  static validateCompleteMemory(
    frontmatter: unknown,
    content: string
  ): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Validate frontmatter
    const frontmatterResult = this.validateMemoryFrontmatter(frontmatter);
    allErrors.push(...frontmatterResult.errors);
    allWarnings.push(...frontmatterResult.warnings);

    if (!frontmatterResult.valid) {
      return {
        valid: false,
        errors: allErrors,
        warnings: allWarnings,
      };
    }

    const validatedFrontmatter = frontmatterResult.data!;

    // Validate content
    const contentResult = this.validateMemoryContent(content);
    allErrors.push(...contentResult.errors);
    allWarnings.push(...contentResult.warnings);

    // Validate tags
    if (validatedFrontmatter.tags) {
      const tagsResult = this.validateTags(validatedFrontmatter.tags);
      allErrors.push(...tagsResult.errors);
      allWarnings.push(...tagsResult.warnings);
    }

    // Validate context naming
    const contextResult = this.validateContextNaming(
      validatedFrontmatter.context,
      "context"
    );
    allErrors.push(...contextResult.errors);
    allWarnings.push(...contextResult.warnings);

    const subcontextResult = this.validateContextNaming(
      validatedFrontmatter.subcontext,
      "subcontext"
    );
    allErrors.push(...subcontextResult.errors);
    allWarnings.push(...subcontextResult.warnings);

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Auto-fix common validation issues
   */
  static autoFixMemoryFrontmatter(frontmatter: MemoryFrontmatter): {
    fixed: MemoryFrontmatter;
    fixes_applied: string[];
  } {
    const fixed = { ...frontmatter };
    const fixesApplied: string[] = [];

    // Fix title
    if (fixed.title !== fixed.title.trim()) {
      fixed.title = fixed.title.trim();
      fixesApplied.push("Trimmed whitespace from title");
    }

    // Fix context and subcontext
    if (fixed.context !== fixed.context.toLowerCase()) {
      fixed.context = fixed.context.toLowerCase();
      fixesApplied.push("Converted context to lowercase");
    }

    if (fixed.subcontext !== fixed.subcontext.toLowerCase()) {
      fixed.subcontext = fixed.subcontext.toLowerCase();
      fixesApplied.push("Converted subcontext to lowercase");
    }

    // Fix context/subcontext naming
    fixed.context = fixed.context.replace(/[^a-z_]/g, "_").replace(/_+/g, "_");
    fixed.subcontext = fixed.subcontext
      .replace(/[^a-z_]/g, "_")
      .replace(/_+/g, "_");

    if (fixed.context !== frontmatter.context) {
      fixesApplied.push(
        "Fixed context naming to use only lowercase letters and underscores"
      );
    }

    if (fixed.subcontext !== frontmatter.subcontext) {
      fixesApplied.push(
        "Fixed subcontext naming to use only lowercase letters and underscores"
      );
    }

    // Fix tags
    if (fixed.tags) {
      const originalTags = [...fixed.tags];
      fixed.tags = fixed.tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates

      if (fixed.tags.length !== originalTags.length) {
        fixesApplied.push(
          "Cleaned up tags (removed empty tags and duplicates)"
        );
      }
    }

    // Ensure updated_at is current if we made changes
    if (fixesApplied.length > 0) {
      fixed.updated_at = new Date().toISOString();
      fixesApplied.push("Updated timestamp due to fixes");
    }

    return { fixed, fixes_applied: fixesApplied };
  }
}
