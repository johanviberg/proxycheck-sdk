/**
 * Enhanced List Management Service for ProxyCheck SDK
 * Provides improved developer experience for managing whitelist and blacklist entries
 */

import { ProxyCheckListError, ProxyCheckValidationError } from "../errors";
import type { ListResponse } from "../types";
import { ensureError } from "../utils/error";
import { BaseService } from "./base";
import { ListingService } from "./listing";

/**
 * Structured list entry with metadata
 */
export interface ListEntry {
  address: string;
  type: "ip" | "email" | "domain" | "cidr" | "unknown";
  addedAt?: Date;
  lastModified?: Date;
  notes?: string;
}

/**
 * Enhanced list response with structured data
 */
export interface EnhancedListResponse {
  entries: Array<ListEntry>;
  count: number;
  lastModified?: Date;
  listType: "whitelist" | "blacklist";
}

/**
 * List operation result
 */
export interface ListOperationResult {
  success: boolean;
  message: string;
  affectedCount: number;
  entries?: Array<ListEntry>;
  errors?: Array<{
    entry: string;
    error: string;
  }>;
}

/**
 * List validation result
 */
export interface ListValidationResult {
  valid: Array<string>;
  invalid: Array<{
    entry: string;
    reason: string;
  }>;
}

/**
 * List comparison result
 */
export interface ListComparisonResult {
  inWhitelistOnly: Array<string>;
  inBlacklistOnly: Array<string>;
  inBothLists: Array<string>;
  totalWhitelist: number;
  totalBlacklist: number;
}

/**
 * Enhanced list management service
 */
export class ListManagementService extends BaseService {
  private readonly _listingService: ListingService;

  constructor(http: any, config: any) {
    super(http, config);
    this._listingService = new ListingService(http, config);
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return "ListManagement";
  }

  // Enhanced list operations with structured responses

  /**
   * Add entries to a list with validation and structured response
   */
  async addEntries(
    listType: "whitelist" | "blacklist",
    entries: Array<string>,
    options: {
      validateBeforeAdd?: boolean;
      allowDuplicates?: boolean;
      notes?: string;
    } = {},
  ): Promise<ListOperationResult> {
    const { validateBeforeAdd = true, allowDuplicates = false, notes } = options;

    // Validate entries if requested
    if (validateBeforeAdd) {
      const validation = this.validateEntries(entries);
      if (validation.invalid.length > 0) {
        const validationErrors = validation.invalid.map((item) => ({
          path: item.entry,
          message: item.reason,
        }));
        throw new ProxyCheckValidationError(
          `${validation.invalid.length} invalid entries found`,
          "entries",
          entries,
          validationErrors,
        );
      }
    }

    // Check for duplicates if not allowed
    let finalEntries = entries;
    if (!allowDuplicates) {
      const currentList = await this.getList(listType);
      const existingAddresses = new Set(currentList.entries.map((e) => e.address));
      finalEntries = entries.filter((entry) => !existingAddresses.has(entry));

      if (finalEntries.length === 0) {
        return {
          success: true,
          message: "No new entries to add (all entries already exist)",
          affectedCount: 0,
          entries: [],
        };
      }
    }

    try {
      const response = await this._listingService.addToList(listType, finalEntries);
      this.transformListResponse(response, listType);

      return {
        success: true,
        message: `Successfully added ${finalEntries.length} entries to ${listType}`,
        affectedCount: finalEntries.length,
        entries: finalEntries.map((address) => ({
          address,
          type: this.detectAddressType(address),
          addedAt: new Date(),
          ...(notes && { notes }),
        })),
      };
    } catch (error) {
      const err = ensureError(error);
      throw new ProxyCheckListError(err.message, "addEntries", listType, finalEntries, err);
    }
  }

  /**
   * Remove entries from a list with structured response
   */
  async removeEntries(
    listType: "whitelist" | "blacklist",
    entries: Array<string>,
  ): Promise<ListOperationResult> {
    try {
      const response = await this._listingService.removeFromList(listType, entries);
      this.transformListResponse(response, listType);

      return {
        success: true,
        message: `Successfully removed ${entries.length} entries from ${listType}`,
        affectedCount: entries.length,
        entries: entries.map((address) => ({
          address,
          type: this.detectAddressType(address),
          lastModified: new Date(),
        })),
      };
    } catch (error) {
      const err = ensureError(error);
      throw new ProxyCheckListError(err.message, "removeEntries", listType, entries, err);
    }
  }

  /**
   * Get a list with structured response
   */
  async getList(listType: "whitelist" | "blacklist"): Promise<EnhancedListResponse> {
    const response = await this._listingService.getList(listType);
    return this.transformListResponse(response, listType);
  }

  /**
   * Set list entries (replace all existing entries)
   */
  async setList(
    listType: "whitelist" | "blacklist",
    entries: Array<string>,
  ): Promise<ListOperationResult> {
    try {
      const response = await this._listingService.setList(listType, entries);
      this.transformListResponse(response, listType);

      return {
        success: true,
        message: `Successfully set ${entries.length} entries in ${listType}`,
        affectedCount: entries.length,
        entries: entries.map((address) => ({
          address,
          type: this.detectAddressType(address),
          lastModified: new Date(),
        })),
      };
    } catch (error) {
      const err = ensureError(error);
      throw new ProxyCheckListError(err.message, "setList", listType, entries, err);
    }
  }

  /**
   * Clear all entries from a list
   */
  async clearList(listType: "whitelist" | "blacklist"): Promise<ListOperationResult> {
    try {
      const response = await this._listingService.clearList(listType);
      this.transformListResponse(response, listType);

      return {
        success: true,
        message: `Successfully cleared ${listType}`,
        affectedCount: 0,
        entries: [],
      };
    } catch (error) {
      const err = ensureError(error);
      throw new ProxyCheckListError(err.message, "clearList", listType, undefined, err);
    }
  }

  // Advanced list operations

  /**
   * Get both whitelist and blacklist entries
   */
  async getAllLists(): Promise<{
    whitelist: EnhancedListResponse;
    blacklist: EnhancedListResponse;
  }> {
    const [whitelist, blacklist] = await Promise.all([
      this.getList("whitelist"),
      this.getList("blacklist"),
    ]);

    return { whitelist, blacklist };
  }

  /**
   * Compare whitelist and blacklist entries
   */
  async compareLists(): Promise<ListComparisonResult> {
    const { whitelist, blacklist } = await this.getAllLists();

    const whitelistAddresses = new Set(whitelist.entries.map((e) => e.address));
    const blacklistAddresses = new Set(blacklist.entries.map((e) => e.address));

    const inWhitelistOnly = whitelist.entries
      .filter((e) => !blacklistAddresses.has(e.address))
      .map((e) => e.address);

    const inBlacklistOnly = blacklist.entries
      .filter((e) => !whitelistAddresses.has(e.address))
      .map((e) => e.address);

    const inBothLists = whitelist.entries
      .filter((e) => blacklistAddresses.has(e.address))
      .map((e) => e.address);

    return {
      inWhitelistOnly,
      inBlacklistOnly,
      inBothLists,
      totalWhitelist: whitelist.count,
      totalBlacklist: blacklist.count,
    };
  }

  /**
   * Find entries that exist in both lists (conflicts)
   */
  async findConflicts(): Promise<Array<string>> {
    const comparison = await this.compareLists();
    return comparison.inBothLists;
  }

  /**
   * Resolve conflicts by removing entries from specified list
   */
  async resolveConflicts(
    removeFrom: "whitelist" | "blacklist" = "blacklist",
  ): Promise<ListOperationResult> {
    const conflicts = await this.findConflicts();

    if (conflicts.length === 0) {
      return {
        success: true,
        message: "No conflicts found",
        affectedCount: 0,
        entries: [],
      };
    }

    return this.removeEntries(removeFrom, conflicts);
  }

  /**
   * Search for entries across both lists
   */
  async searchEntries(
    query: string,
    options: {
      caseSensitive?: boolean;
      exactMatch?: boolean;
    } = {},
  ): Promise<{
    whitelist: Array<ListEntry>;
    blacklist: Array<ListEntry>;
  }> {
    const { caseSensitive = false, exactMatch = false } = options;
    const { whitelist, blacklist } = await this.getAllLists();

    const searchTerm = caseSensitive ? query : query.toLowerCase();

    const matchesQuery = (entry: ListEntry): boolean => {
      const address = caseSensitive ? entry.address : entry.address.toLowerCase();
      return exactMatch ? address === searchTerm : address.includes(searchTerm);
    };

    return {
      whitelist: whitelist.entries.filter(matchesQuery),
      blacklist: blacklist.entries.filter(matchesQuery),
    };
  }

  /**
   * Get list statistics
   */
  async getListStatistics(): Promise<{
    whitelist: {
      total: number;
      byType: Record<string, number>;
    };
    blacklist: {
      total: number;
      byType: Record<string, number>;
    };
    conflicts: number;
  }> {
    const { whitelist, blacklist } = await this.getAllLists();
    const conflicts = await this.findConflicts();

    const getTypeStats = (entries: Array<ListEntry>) => {
      const byType: Record<string, number> = {};
      for (const entry of entries) {
        byType[entry.type] = (byType[entry.type] || 0) + 1;
      }
      return byType;
    };

    return {
      whitelist: {
        total: whitelist.count,
        byType: getTypeStats(whitelist.entries),
      },
      blacklist: {
        total: blacklist.count,
        byType: getTypeStats(blacklist.entries),
      },
      conflicts: conflicts.length,
    };
  }

  /**
   * Validate entries before adding to list
   */
  validateEntries(entries: Array<string>): ListValidationResult {
    const valid: Array<string> = [];
    const invalid: Array<{ entry: string; reason: string }> = [];

    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const cidrRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;

    for (const entry of entries) {
      if (typeof entry !== "string" || entry.trim().length === 0) {
        invalid.push({
          entry,
          reason: "Entry must be a non-empty string",
        });
        continue;
      }

      const trimmed = entry.trim();

      if (
        ipv4Regex.test(trimmed) ||
        ipv6Regex.test(trimmed) ||
        emailRegex.test(trimmed) ||
        domainRegex.test(trimmed) ||
        cidrRegex.test(trimmed)
      ) {
        valid.push(trimmed);
      } else {
        invalid.push({
          entry: trimmed,
          reason: "Invalid format (must be IP, email, domain, or CIDR)",
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Bulk operations for better performance
   */
  async bulkAddEntries(
    operations: Array<{
      listType: "whitelist" | "blacklist";
      entries: Array<string>;
      notes?: string;
    }>,
  ): Promise<Array<ListOperationResult>> {
    const results: Array<ListOperationResult> = [];

    for (const operation of operations) {
      const result = await this.addEntries(
        operation.listType,
        operation.entries,
        operation.notes ? { notes: operation.notes } : undefined,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Import entries from various formats
   */
  async importEntries(
    listType: "whitelist" | "blacklist",
    data: string,
    format: "csv" | "json" | "txt" = "txt",
  ): Promise<ListOperationResult> {
    let entries: Array<string> = [];

    try {
      switch (format) {
        case "csv":
          entries = data
            .split("\n")
            .map((line) => line.split(",")[0]?.trim())
            .filter((entry): entry is string => entry != null && entry.length > 0);
          break;

        case "json": {
          const parsed = JSON.parse(data);
          entries = Array.isArray(parsed) ? parsed : [parsed];
          break;
        }

        default:
          entries = data
            .split("\n")
            .map((line) => line.trim())
            .filter((entry) => entry && entry.length > 0);
          break;
      }
    } catch (error) {
      const err = ensureError(error);
      throw new ProxyCheckValidationError(
        `Failed to parse ${format} format: ${err.message}`,
        "data",
        data,
        undefined,
        err,
      );
    }

    return this.addEntries(listType, entries);
  }

  /**
   * Export entries to various formats
   */
  async exportEntries(
    listType: "whitelist" | "blacklist",
    format: "csv" | "json" | "txt" = "txt",
  ): Promise<string> {
    const list = await this.getList(listType);

    switch (format) {
      case "csv":
        return ["Address,Type,Added At"]
          .concat(
            list.entries.map(
              (entry) => `${entry.address},${entry.type},${entry.addedAt?.toISOString() || ""}`,
            ),
          )
          .join("\n");

      case "json":
        return JSON.stringify(list.entries, null, 2);

      default:
        return list.entries.map((entry) => entry.address).join("\n");
    }
  }

  // Private helper methods

  /**
   * Transform raw list response to structured format
   */
  private transformListResponse(
    response: ListResponse,
    listType: "whitelist" | "blacklist",
  ): EnhancedListResponse {
    let entries: Array<ListEntry> = [];

    if (typeof response === "object" && response !== null) {
      // Handle different response formats
      if (Array.isArray(response)) {
        entries = response.map((item) => this.transformListEntry(item));
      } else if (typeof response === "object") {
        // Handle object format where keys might be addresses
        const responseObj = response as Record<string, any>;

        // Look for entries property first
        if (responseObj["entries"] && Array.isArray(responseObj["entries"])) {
          entries = responseObj["entries"].map((item) => this.transformListEntry(item));
        } else {
          // Treat object keys as addresses
          entries = Object.keys(responseObj)
            .filter((key) => key !== "status" && key !== "message")
            .map((address) => this.transformListEntry(address));
        }
      }
    }

    return {
      entries,
      count: entries.length,
      listType,
      lastModified: new Date(),
    };
  }

  /**
   * Transform a single list entry
   */
  private transformListEntry(item: any): ListEntry {
    if (typeof item === "string") {
      return {
        address: item,
        type: this.detectAddressType(item),
      };
    }

    if (typeof item === "object" && item !== null) {
      const entry: ListEntry = {
        address: item.address || item.ip || String(item),
        type: this.detectAddressType(item.address || item.ip || String(item)),
      };

      if (item.addedAt) {
        entry.addedAt = new Date(item.addedAt);
      }

      if (item.lastModified) {
        entry.lastModified = new Date(item.lastModified);
      }

      if (item.notes) {
        entry.notes = item.notes;
      }

      return entry;
    }

    return {
      address: String(item),
      type: this.detectAddressType(String(item)),
    };
  }

  /**
   * Detect the type of address
   */
  private detectAddressType(address: string): "ip" | "email" | "domain" | "cidr" | "unknown" {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const cidrRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;

    if (cidrRegex.test(address)) {
      return "cidr";
    }
    if (ipv4Regex.test(address) || ipv6Regex.test(address)) {
      return "ip";
    }
    if (emailRegex.test(address)) {
      return "email";
    }
    if (domainRegex.test(address)) {
      return "domain";
    }
    return "unknown";
  }
}
