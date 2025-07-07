/**
 * Rules Service for custom rule management
 */

import { ProxyCheckValidationError } from "../errors";
import type { RuleOptions, RuleResponse } from "../types";
import { API_ENDPOINTS } from "../types/constants";
import { RuleOptionsSchema } from "../types/schemas";
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
   * Add a new rule
   */
  async addRule(name: string, conditions: string): Promise<RuleResponse> {
    return this.manageRule("add", name, conditions);
  }

  /**
   * Remove a rule
   */
  async removeRule(name: string): Promise<RuleResponse> {
    return this.manageRule("remove", name);
  }

  /**
   * Set/update a rule
   */
  async setRule(name: string, conditions: string): Promise<RuleResponse> {
    return this.manageRule("set", name, conditions);
  }

  /**
   * Get all rules
   */
  async getRules(): Promise<RuleResponse> {
    return this.manageRule("get");
  }

  /**
   * Test a rule
   */
  async testRule(name: string): Promise<RuleResponse> {
    return this.manageRule("test", name);
  }

  /**
   * Create a rule with validation
   */
  async createRule(name: string, conditions: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    this.validateRuleConditions(conditions);
    return this.addRule(name, conditions);
  }

  /**
   * Update an existing rule
   */
  async updateRule(name: string, conditions: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    this.validateRuleConditions(conditions);
    return this.setRule(name, conditions);
  }

  /**
   * Delete a rule
   */
  async deleteRule(name: string): Promise<RuleResponse> {
    this.validateRuleName(name);
    return this.removeRule(name);
  }

  /**
   * List all rules
   */
  async listRules(): Promise<RuleResponse> {
    return this.getRules();
  }

  /**
   * Validate a rule by testing it
   */
  async validateRule(name: string): Promise<RuleResponse> {
    this.validateRuleName(name);
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
    let postData = "";
    const postFields: Array<string> = [];

    if (validatedOptions.ruleSelection) {
      postFields.push(`name=${validatedOptions.ruleSelection}`);
    }

    if (validatedOptions.ruleEntries) {
      postFields.push(`data=${validatedOptions.ruleEntries}`);
    }

    if (postFields.length > 0) {
      postData = postFields.join("&");
    }

    // Make request
    const fullUrl = this.http.buildUrl(url, queryParams);
    const response = await this.http.post<RuleResponse>(fullUrl, postData, {
      "Content-Type": "application/x-www-form-urlencoded",
    });

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
      return this.stripUndefined(parsed) as RuleOptions;
    } catch (_error) {
      throw new ProxyCheckValidationError("Invalid rule options provided", "options", options);
    }
  }

  private stripUndefined<T extends Record<string, unknown>>(obj: T): T {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key as keyof T] = value as T[keyof T];
      }
    }
    return result;
  }
}
