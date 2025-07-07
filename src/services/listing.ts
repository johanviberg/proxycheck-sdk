/**
 * Listing Service for whitelist/blacklist management
 */

import { ProxyCheckValidationError } from "../errors";
import type { ListOptions, ListResponse } from "../types";
import { API_ENDPOINTS } from "../types/constants";
import { ListOptionsSchema } from "../types/schemas";
import { stripUndefined } from "../utils/object";
import { BaseService } from "./base";

/**
 * Service for managing whitelists and blacklists
 */
export class ListingService extends BaseService {
  /**
   * Get service name
   */
  getServiceName(): string {
    return "Listing";
  }

  /**
   * Add entries to a list (whitelist or blacklist)
   */
  async addToList(
    listType: "whitelist" | "blacklist",
    entries: string | Array<string>,
  ): Promise<ListResponse> {
    return this.manageList(listType, "add", entries);
  }

  /**
   * Remove entries from a list
   */
  async removeFromList(
    listType: "whitelist" | "blacklist",
    entries: string | Array<string>,
  ): Promise<ListResponse> {
    return this.manageList(listType, "remove", entries);
  }

  /**
   * Set list entries (replace all existing entries)
   */
  async setList(
    listType: "whitelist" | "blacklist",
    entries: string | Array<string>,
  ): Promise<ListResponse> {
    return this.manageList(listType, "set", entries);
  }

  /**
   * Get all entries from a list
   */
  async getList(listType: "whitelist" | "blacklist"): Promise<ListResponse> {
    return this.manageList(listType, "get");
  }

  /**
   * Clear all entries from a list
   */
  async clearList(listType: "whitelist" | "blacklist"): Promise<ListResponse> {
    return this.manageList(listType, "set", []);
  }

  /**
   * Add entries to whitelist
   */
  async addToWhitelist(entries: string | Array<string>): Promise<ListResponse> {
    return this.addToList("whitelist", entries);
  }

  /**
   * Remove entries from whitelist
   */
  async removeFromWhitelist(entries: string | Array<string>): Promise<ListResponse> {
    return this.removeFromList("whitelist", entries);
  }

  /**
   * Set whitelist entries
   */
  async setWhitelist(entries: string | Array<string>): Promise<ListResponse> {
    return this.setList("whitelist", entries);
  }

  /**
   * Get whitelist entries
   */
  async getWhitelist(): Promise<ListResponse> {
    return this.getList("whitelist");
  }

  /**
   * Clear whitelist
   */
  async clearWhitelist(): Promise<ListResponse> {
    return this.clearList("whitelist");
  }

  /**
   * Add entries to blacklist
   */
  async addToBlacklist(entries: string | Array<string>): Promise<ListResponse> {
    return this.addToList("blacklist", entries);
  }

  /**
   * Remove entries from blacklist
   */
  async removeFromBlacklist(entries: string | Array<string>): Promise<ListResponse> {
    return this.removeFromList("blacklist", entries);
  }

  /**
   * Set blacklist entries
   */
  async setBlacklist(entries: string | Array<string>): Promise<ListResponse> {
    return this.setList("blacklist", entries);
  }

  /**
   * Get blacklist entries
   */
  async getBlacklist(): Promise<ListResponse> {
    return this.getList("blacklist");
  }

  /**
   * Clear blacklist
   */
  async clearBlacklist(): Promise<ListResponse> {
    return this.clearList("blacklist");
  }

  /**
   * Core list management method
   */
  private async manageList(
    listType: "whitelist" | "blacklist",
    action: "add" | "remove" | "set" | "get",
    entries?: string | Array<string>,
  ): Promise<ListResponse> {
    // Validate configuration
    this.validateConfiguration();

    // Build options
    const options: ListOptions = {
      apiKey: this.getApiKey(),
      tlsSecurity: this.config.isTlsEnabled(),
      listSelection: listType,
      listAction: action,
    };

    // Add entries if provided
    if (entries !== undefined) {
      const entryArray = Array.isArray(entries) ? entries : [entries];

      // Validate entries for non-get operations
      if (action !== "get" && entryArray.length > 0) {
        this.validateEntries(entryArray);
      }

      options.listEntries = entryArray;
    }

    // Validate options
    const validatedOptions = this.validateOptions(options);

    // Build URL and request data
    // Map 'get' action to 'print' as per API documentation
    const apiAction = action === "get" ? "print" : action;

    // For print action, get all lists instead of specific list type
    const url =
      apiAction === "print"
        ? `${API_ENDPOINTS.LISTS}${apiAction}/`
        : `${API_ENDPOINTS.LISTS}${apiAction}/${listType}/`;

    const queryParams = {
      key: validatedOptions.apiKey,
    };

    // Build POST data
    let postData = "";
    if (validatedOptions.listEntries && validatedOptions.listEntries.length > 0) {
      postData = `data=${validatedOptions.listEntries.join("\r\n")}`;
    }

    // Make request
    const fullUrl = this.http.buildUrl(url, queryParams);

    // Use GET for print (list retrieval) operations, POST for modifications
    let response: ListResponse;
    if (apiAction === "print") {
      response = await this.http.get<ListResponse>(fullUrl);
    } else {
      response = await this.http.postForm<ListResponse>(
        fullUrl,
        postData ? { data: postData.replace("data=", "") } : undefined,
      );
    }

    return this.processResponse(response);
  }

  /**
   * Validate list entries
   */
  private validateEntries(entries: Array<string>): void {
    if (!Array.isArray(entries)) {
      throw new ProxyCheckValidationError("Entries must be an array", "entries", entries);
    }

    for (const entry of entries) {
      if (typeof entry !== "string" || entry.trim().length === 0) {
        throw new ProxyCheckValidationError(
          "Each entry must be a non-empty string",
          "entries",
          entry,
        );
      }
    }
  }

  /**
   * Validate options using Zod schema
   */
  private validateOptions(options: ListOptions): ListOptions {
    try {
      const parsed = ListOptionsSchema.parse(options) as any;
      return stripUndefined(parsed) as ListOptions;
    } catch (_error) {
      throw new ProxyCheckValidationError("Invalid list options provided", "options", options);
    }
  }
}
