import Constants from "expo-constants";

const DEFAULT_REMOTE_API_URL = "https://innova-dashboard.com:443/api";
const LOCAL_API_PORT = 8080;
const API_PATH = "api";

function normalizeUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  return value.trim().replace(/\/$/, "");
}

function extractHost(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.includes("://")
    ? trimmed
    : ["http:/", "", trimmed].join("/");
  try {
    return new URL(candidate).hostname;
  } catch {
    return trimmed.split(":")[0] || null;
  }
}

function isPrivateNetworkHost(host) {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }

  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;

  const match = host.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function getExpoHost() {
  const manifestHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    null;

  return extractHost(manifestHost);
}

export function resolveApiBaseUrl() {
  const envUrl = normalizeUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const isDevelopmentRuntime =
    typeof __DEV__ !== "undefined"
      ? __DEV__
      : process.env.NODE_ENV !== "production";

  if (!isDevelopmentRuntime) {
    return envUrl || DEFAULT_REMOTE_API_URL;
  }

  const expoHost = getExpoHost();
  const expoGoMode = Constants.appOwnership === "expo";

  if (
    isDevelopmentRuntime &&
    expoGoMode &&
    expoHost &&
    (!envUrl || isPrivateNetworkHost(extractHost(envUrl)))
  ) {
    return ["http:/", "", `${expoHost}:${LOCAL_API_PORT}`, API_PATH].join("/");
  }

  if (envUrl) {
    return envUrl;
  }

  if (isDevelopmentRuntime && expoHost) {
    return ["http:/", "", `${expoHost}:${LOCAL_API_PORT}`, API_PATH].join("/");
  }

  return DEFAULT_REMOTE_API_URL;
}
