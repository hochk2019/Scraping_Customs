import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import http from "node:http";
import https from "node:https";
import * as dns from "node:dns";
import { type LookupFunction } from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const NETWORK_ERROR_CODES = new Set([
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const execFileAsync = promisify(execFile);

if (typeof dns.setDefaultResultOrder === "function") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (error) {
    console.warn("[Network] Không thể đặt thứ tự DNS mặc định:", error);
  }
}

const lookup: LookupFunction = (hostname, options, callback) => {
  const opts =
    typeof options === "object" && options !== null
      ? options
      : typeof options === "number"
        ? { family: options }
        : {};

  return dns.lookup(hostname, {
    ...opts,
    family: 4,
    hints: (opts?.hints ?? 0) | dns.ADDRCONFIG | dns.V4MAPPED,
  }, callback);
};

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  lookup,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  lookup,
});

const DEFAULT_TIMEOUT = 20000;

function mergeConfig(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return {
    timeout: DEFAULT_TIMEOUT,
    proxy: false,
    ...config,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ...(config.headers ?? {}),
    },
    httpAgent,
    httpsAgent,
  };
}

function shouldRetry(error: AxiosError | Error): boolean {
  const axiosError = error as AxiosError;
  const code = axiosError.code ?? (axiosError.cause as NodeJS.ErrnoException | undefined)?.code;
  return code !== undefined && NETWORK_ERROR_CODES.has(code);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getWithNetwork<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
  retries = 2,
): Promise<AxiosResponse<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await axios.get<T>(url, mergeConfig(config));
    } catch (error) {
      lastError = error;

      const networkIssue = shouldRetry(error as AxiosError);

      if (attempt === retries || !networkIssue) {
        if (networkIssue) {
          return fetchWithCurl<T>(url, config);
        }

        throw error;
      }

      const delay = 500 * 2 ** attempt;
      await wait(delay);
    }
  }

  if (lastError) {
    return fetchWithCurl<T>(url, config);
  }

  throw new Error("Unknown network error");
}

export function getNetworkConfig(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return mergeConfig(config);
}

async function fetchWithCurl<T>(
  url: string,
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const mergedConfig = mergeConfig(config);
  const timeoutSeconds = Math.ceil((mergedConfig.timeout ?? DEFAULT_TIMEOUT) / 1000);
  const args = [
    "-sSL",
    "--compressed",
    "--connect-timeout",
    String(timeoutSeconds),
    "--max-time",
    String(timeoutSeconds + 10),
    url,
  ];

  const headers = mergedConfig.headers ?? {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "undefined") continue;
    if (Array.isArray(value)) {
      for (const single of value) {
        if (single) {
          args.push("-H", `${key}: ${single}`);
        }
      }
    } else {
      args.push("-H", `${key}: ${value}`);
    }
  }

  try {
    const { stdout } = await execFileAsync("curl", args, {
      encoding: "buffer",
      maxBuffer: 1024 * 1024 * 100,
    });

    const data = mergedConfig.responseType === "arraybuffer"
      ? (stdout as unknown as T)
      : (stdout.toString("utf8") as unknown as T);

    return {
      data,
      status: 200,
      statusText: "OK",
      headers: {},
      config: mergedConfig,
      request: { adapter: "curl" },
    } satisfies AxiosResponse<T>;
  } catch (error) {
    console.error(`[Network] curl fallback failed cho ${url}:`, error);
    throw error;
  }
}
