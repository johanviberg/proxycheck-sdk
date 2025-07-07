/**
 * Check Service for IP/Email address checking
 */

import {
  buildPostData,
  buildQueryParams,
  mergeCountryOptions,
  processAddresses,
  shouldUsePostMethod,
} from "../config";
import { ProxyCheckValidationError } from "../errors";
import type { AddressCheckResult, CheckResponse, ProxyCheckOptions } from "../types";
import { API_ENDPOINTS } from "../types/constants";
import { ProxyCheckOptionsSchema } from "../types/schemas";
import { stripUndefined } from "../utils/object";
import { BaseService } from "./base";

/**
 * Service for checking IP addresses and email addresses
 */
export class CheckService extends BaseService {
  /**
   * Get service name
   */
  getServiceName(): string {
    return "Check";
  }

  /**
   * Check a single IP address or email
   */
  async checkAddress(address: string, options: ProxyCheckOptions = {}): Promise<CheckResponse> {
    return this.checkAddresses(address, options);
  }

  /**
   * Check multiple IP addresses or emails
   */
  async checkAddresses(
    addresses: string | Array<string>,
    options: ProxyCheckOptions = {},
  ): Promise<CheckResponse> {
    const addressCount = Array.isArray(addresses) ? addresses.length : 1;
    const startTime = Date.now();

    this.logger.info("Starting address check", {
      operation: "checkAddresses",
      service: this.getServiceName(),
      addressCount,
      options: Object.keys(options),
    });

    try {
      // Validate configuration
      this.validateConfiguration();

      // Validate inputs
      this.validateAddresses(addresses);
      const validatedOptions = this.validateOptions(options);

      // Process addresses (handle masking)
      const processedAddresses = processAddresses(addresses, validatedOptions.maskAddress);

      // Merge country options (enable ASN if needed)
      const mergedOptions = mergeCountryOptions(validatedOptions);

      this.logger.debug("Address processing completed", {
        operation: "checkAddresses",
        service: this.getServiceName(),
        processedCount: Array.isArray(processedAddresses) ? processedAddresses.length : 1,
        maskingEnabled: validatedOptions.maskAddress,
        asnEnabled: mergedOptions.asnData,
      });

      // Build request parameters
      const queryParams = buildQueryParams(mergedOptions, this.getApiKey());
      const postData = buildPostData(mergedOptions, processedAddresses);
      const usePostMethod = shouldUsePostMethod(processedAddresses);

      // Make request
      let response: CheckResponse;
      if (usePostMethod) {
        // Multiple addresses - use POST with form data
        const url = this.http.buildUrl(API_ENDPOINTS.CHECK, queryParams as Record<string, unknown>);
        this.logger.debug("Making POST request to check endpoint", {
          operation: "checkAddresses",
          service: this.getServiceName(),
          method: "POST",
          url,
        });
        response = await this.http.postForm<CheckResponse>(
          url,
          postData as Record<string, unknown>,
          queryParams as Record<string, unknown>,
        );
      } else {
        // Single address - use GET with address in URL path
        const singleAddress = Array.isArray(processedAddresses)
          ? processedAddresses[0]
          : processedAddresses;
        if (!singleAddress) {
          throw new ProxyCheckValidationError("No address provided", "address", processedAddresses);
        }
        const url = this.http.buildUrlWithAddress(
          API_ENDPOINTS.CHECK,
          singleAddress,
          queryParams as Record<string, unknown>,
        );
        this.logger.debug("Making GET request to check endpoint", {
          operation: "checkAddresses",
          service: this.getServiceName(),
          method: "GET",
          url,
        });
        response = await this.http.get<CheckResponse>(url);
      }

      // Process response for single address checks
      if (!Array.isArray(addresses)) {
        const finalAddress = Array.isArray(processedAddresses)
          ? processedAddresses[0]
          : processedAddresses;
        if (finalAddress) {
          this.addBlockingLogic(response, finalAddress, mergedOptions);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info("Address check completed successfully", {
        operation: "checkAddresses",
        service: this.getServiceName(),
        addressCount,
        duration,
        responseStatus: response.status,
      });

      return this.processResponse(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("Address check failed", error instanceof Error ? error : undefined, {
        operation: "checkAddresses",
        service: this.getServiceName(),
        addressCount,
        duration,
      });
      throw error;
    }
  }

  /**
   * Check if an address is a proxy/VPN
   */
  async isProxy(address: string, options: ProxyCheckOptions = {}): Promise<boolean> {
    const response = await this.checkAddress(address, options);
    const result = response[address] as AddressCheckResult;
    return result?.proxy === "yes";
  }

  /**
   * Check if an address is a VPN
   */
  async isVPN(address: string, options: ProxyCheckOptions = {}): Promise<boolean> {
    const response = await this.checkAddress(address, { ...options, vpnDetection: 1 });
    const result = response[address] as AddressCheckResult;
    return result?.type === "VPN";
  }

  /**
   * Check if an email is disposable
   */
  async isDisposableEmail(email: string, options: ProxyCheckOptions = {}): Promise<boolean> {
    const response = await this.checkAddress(email, options);
    const result = response[email] as AddressCheckResult;
    return result?.disposable === "yes";
  }

  /**
   * Get risk score for an address
   */
  async getRiskScore(
    address: string,
    options: ProxyCheckOptions = {},
  ): Promise<number | undefined> {
    const response = await this.checkAddress(address, { ...options, riskData: 2 });
    const result = response[address] as AddressCheckResult;
    return result?.risk;
  }

  /**
   * Get detailed information for an address
   */
  async getDetailedInfo(
    address: string,
    options: ProxyCheckOptions = {},
  ): Promise<AddressCheckResult | undefined> {
    const detailedOptions: ProxyCheckOptions = {
      asnData: true,
      riskData: 2,
      vpnDetection: 3,
    };

    // Only add defined options to avoid undefined properties
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) {
        (detailedOptions as any)[key] = value;
      }
    }

    const response = await this.checkAddress(address, detailedOptions);
    return response[address] as AddressCheckResult;
  }

  /**
   * Validate options using Zod schema
   */
  private validateOptions(options: ProxyCheckOptions): ProxyCheckOptions {
    try {
      const parsed = ProxyCheckOptionsSchema.parse(options) as any;
      return stripUndefined(parsed) as ProxyCheckOptions;
    } catch (_error) {
      throw new ProxyCheckValidationError("Invalid options provided", "options", options);
    }
  }

  /**
   * Add blocking logic for single address checks
   */
  private addBlockingLogic(
    response: CheckResponse,
    address: string,
    options: ProxyCheckOptions = {},
  ): void {
    const result = response[address] as AddressCheckResult;

    if (!result) {
      response.block = "na";
      response.block_reason = "na";
      return;
    }

    // Handle email checks
    if (address.includes("@") && result.disposable !== undefined) {
      response.block = result.disposable === "yes" ? "yes" : "no";
      response.block_reason = result.disposable === "yes" ? "disposable" : "na";
      return;
    }

    // Handle proxy/VPN detection
    if (result.proxy === "yes" && result.type === "VPN") {
      response.block = "yes";
      response.block_reason = "vpn";
    } else if (result.proxy === "yes") {
      response.block = "yes";
      response.block_reason = "proxy";
    } else {
      response.block = "no";
      response.block_reason = "na";
    }

    // Country blocking logic
    if (!result.country) {
      response.block = "na";
      response.block_reason = "na";
      return;
    }

    // Check blocked countries
    if (response.block === "no" && options.blockedCountries?.length) {
      const isBlocked =
        options.blockedCountries.includes(result.country) ||
        (result.isocode && options.blockedCountries.includes(result.isocode));

      if (isBlocked) {
        response.block = "yes";
        response.block_reason = "country";
      }
    }

    // Check allowed countries
    if (response.block === "yes" && options.allowedCountries?.length) {
      const isAllowed =
        options.allowedCountries.includes(result.country) ||
        (result.isocode && options.allowedCountries.includes(result.isocode));

      if (isAllowed) {
        response.block = "no";
        response.block_reason = "na";
      }
    }
  }
}
