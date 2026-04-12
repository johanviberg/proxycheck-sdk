/**
 * Rules Service for custom rule management
 */

import { z } from "zod";
import { ProxyCheckValidationError } from "../errors";
import type { RuleOptions, RuleResponse } from "../types";
import { API_ENDPOINTS } from "../types/constants";
import { RuleOptionsSchema } from "../types/schemas";
import { stripUndefined } from "../utils/object";
import { BaseService } from "./base";

/**
 * Service for managing custom rules
 */
export class RulesService extends BaseService {
  /**
   * Get service name
   */
  getServiceName(): string {
    return "Rules";
  }

  /**
   * Add a new rule (validates name and conditions)
   */
  async addRule(name: string, conditions: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    this.validateRuleConditions(conditions);
    return this.manageRule("add", name, conditions);
  }

  /**
   * Remove a rule (validates name)
   */
  async removeRule(name: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    return this.manageRule("remove", name);
  }

  /**
   * Set/update a rule (validates name and conditions)
   */
  async setRule(name: string, conditions: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    this.validateRuleConditions(conditions);
    return this.manageRule("set", name, conditions);
  }

  /**
   * Get all rules
   */
  async getRules(): Promise<RuleResponse> {
    return this.manageRule("get");
  }

  /**
   * Test a rule (validates name)
   */
  async testRule(name: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    return this.manageRule("test", name);
  }

  /** Alias for addRule */
  async createRule(name: string, conditions: string): Promise<RuleResponse> {
    return this.addRule(name, conditions);
  }

  /** Alias for setRule */
  async updateRule(name: string, conditions: string): Promise<RuleResponse> {
    return this.setRule(name, conditions);
  }

  /** Alias for removeRule */
  async deleteRule(name: string): Promise<RuleResponse> {
    return this.removeRule(name);
  }

  /** Alias for getRules */
  async listRules(): Promise<RuleResponse> {
    return this.getRules();
  }

  /** Alias for testRule */
  async validateRule(name: string): Promise<RuleResponse> {
    return this.testRule(name);
  }

  /**
   * Core rule management method
   */
  private async manageRule(
    action: "add" | "remove" | "set" | "get" | "test",
    name?: string,
    conditions?: string,
  ): Promise<RuleResponse> {
    // Validate configuration
    this.validateConfiguration();

    // Build options
    const options: RuleOptions = {
      apiKey: this.getApiKey(),
      tlsSecurity: this.config.isTlsEnabled(),
      ruleAction: action,
    };

    // Add rule name if provided
    if (name !== undefined) {
      options.ruleSelection = name;
    }

    // Add rule conditions if provided
    if (conditions !== undefined) {
      options.ruleEntries = conditions;
    }

    // Validate options
    const validatedOptions = this.validateOptions(options);

    // Build URL and request data
    const url = `${API_ENDPOINTS.RULES}${action}/`;

    const queryParams = {
      key: validatedOptions.apiKey,
    };

    // Build POST data
    const postData: Record<string, unknown> = {};

    if (validatedOptions.ruleSelection) {
      postData["name"] = validatedOptions.ruleSelection;
    }

    if (validatedOptions.ruleEntries) {
      postData["data"] = validatedOptions.ruleEntries;
    }

    // Make request
    const fullUrl = this.http.buildUrl(url, queryParams);
    const response = await this.http.postForm<RuleResponse>(
      fullUrl,
      Object.keys(postData).length > 0 ? postData : undefined,
    );

    return this.processResponse(response);
  }

  /**
   * Validate rule name
   */
  private validateRuleName(name: string): void {
    if (!name || typeof name !== "string") {
      throw new ProxyCheckValidationError(
        "Rule name is required and must be a string",
        "name",
        name,
      );
    }

    if (name.trim().length === 0) {
      throw new ProxyCheckValidationError("Rule name cannot be empty", "name", name);
    }

    // Rule name validation (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new ProxyCheckValidationError(
        "Rule name can only contain letters, numbers, and underscores",
        "name",
        name,
      );
    }

    if (name.length > 50) {
      throw new ProxyCheckValidationError("Rule name cannot exceed 50 characters", "name", name);
    }
  }

  /**
   * Validate rule conditions
   */
  private validateRuleConditions(conditions: string): void {
    if (!conditions || typeof conditions !== "string") {
      throw new ProxyCheckValidationError(
        "Rule conditions are required and must be a string",
        "conditions",
        conditions,
      );
    }

    if (conditions.trim().length === 0) {
      throw new ProxyCheckValidationError(
        "Rule conditions cannot be empty",
        "conditions",
        conditions,
      );
    }

    // Basic validation - conditions should contain logical operators
    const hasValidOperators = /\b(AND|OR|NOT|==|!=|>|<|>=|<=)\b/i.test(conditions);
    if (!hasValidOperators) {
      throw new ProxyCheckValidationError(
        "Rule conditions must contain valid logical operators (AND, OR, NOT, ==, !=, >, <, >=, <=)",
        "conditions",
        conditions,
      );
    }
  }

  /**
   * Validate options using Zod schema
   */
  private validateOptions(options: RuleOptions): RuleOptions {
    try {
      const parsed = RuleOptionsSchema.parse(options) as any;
      return stripUndefined(parsed) as RuleOptions;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        }));
        throw new ProxyCheckValidationError(
          "Invalid rule options provided",
          undefined,
          options,
          validationErrors,
        );
      }
      throw error;
    }
  }
}
