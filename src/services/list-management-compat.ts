/**
 * Backward compatibility wrapper for ListManagementService
 *
 * This wrapper maintains the old behavior of returning error objects
 * instead of throwing exceptions. Use this if you need to maintain
 * backward compatibility during migration.
 *
 * @deprecated Use ListManagementService directly and handle thrown errors
 */

import { ProxyCheckListError, ProxyCheckValidationError } from "../errors";
import { ensureError } from "../utils/error";
import type { ListOperationResult } from "./list-management";
import { ListManagementService } from "./list-management";

export class ListManagementCompatService extends ListManagementService {
  /**
   * Add entries to a list (backward compatible version)
   */
  override async addEntries(
    listType: "whitelist" | "blacklist",
    entries: Array<string>,
    options: {
      validateBeforeAdd?: boolean;
      allowDuplicates?: boolean;
      notes?: string;
    } = {},
  ): Promise<ListOperationResult> {
    try {
      return await super.addEntries(listType, entries, options);
    } catch (error) {
      if (error instanceof ProxyCheckValidationError) {
        return {
          success: false,
          message: error.message,
          affectedCount: 0,
          errors:
            error.validationErrors?.map((e) => ({
              entry: e.path,
              error: e.message,
            })) ||
            entries.map((entry) => ({
              entry,
              error: error.message,
            })),
        };
      }

      if (error instanceof ProxyCheckListError) {
        return {
          success: false,
          message: error.message,
          affectedCount: 0,
          errors: entries.map((entry) => ({
            entry,
            error: error.message,
          })),
        };
      }

      const err = ensureError(error);
      return {
        success: false,
        message: err.message,
        affectedCount: 0,
        errors: entries.map((entry) => ({
          entry,
          error: err.message,
        })),
      };
    }
  }

  /**
   * Remove entries from a list (backward compatible version)
   */
  override async removeEntries(
    listType: "whitelist" | "blacklist",
    entries: Array<string>,
  ): Promise<ListOperationResult> {
    try {
      return await super.removeEntries(listType, entries);
    } catch (error) {
      const err = ensureError(error);
      return {
        success: false,
        message: err.message,
        affectedCount: 0,
        errors: entries.map((entry) => ({
          entry,
          error: err.message,
        })),
      };
    }
  }

  /**
   * Set list entries (backward compatible version)
   */
  override async setList(
    listType: "whitelist" | "blacklist",
    entries: Array<string>,
  ): Promise<ListOperationResult> {
    try {
      return await super.setList(listType, entries);
    } catch (error) {
      const err = ensureError(error);
      return {
        success: false,
        message: err.message,
        affectedCount: 0,
        errors: entries.map((entry) => ({
          entry,
          error: err.message,
        })),
      };
    }
  }

  /**
   * Clear all entries from a list (backward compatible version)
   */
  override async clearList(listType: "whitelist" | "blacklist"): Promise<ListOperationResult> {
    try {
      return await super.clearList(listType);
    } catch (error) {
      const err = ensureError(error);
      return {
        success: false,
        message: err.message,
        affectedCount: 0,
      };
    }
  }

  /**
   * Import entries (backward compatible version)
   */
  override async importEntries(
    listType: "whitelist" | "blacklist",
    data: string,
    format: "csv" | "json" | "txt" = "txt",
  ): Promise<ListOperationResult> {
    try {
      return await super.importEntries(listType, data, format);
    } catch (error) {
      const err = ensureError(error);
      return {
        success: false,
        message: err.message,
        affectedCount: 0,
      };
    }
  }
}
