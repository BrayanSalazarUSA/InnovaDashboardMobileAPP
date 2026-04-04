import Constants from "expo-constants";
import { Platform } from "react-native";

const PRODUCTION_API_URL = "https://innova-dashboard.com:443/api";
const RAW_REMOTE_API_URL =
  process.env.EXPO_PUBLIC_SERVER_IP || PRODUCTION_API_URL;
const RAW_LOCAL_API_URL =
  process.env.EXPO_PUBLIC_LOCAL_SERVER_IP || "http://localhost:8080/api";
const USE_LOCAL_API = process.env.EXPO_PUBLIC_USE_LOCAL_API === "true";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function extractHostname(candidate) {
  if (!candidate || typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.includes("://")
    ? candidate
    : `exp://${candidate}`;

  try {
    return new URL(normalized).hostname || null;
  } catch {
    return candidate.split(":")[0] || null;
  }
}

function getExpoDevHostname() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.experienceUrl,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const host = extractHostname(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

function isLocalUrl(candidate) {
  try {
    return LOCAL_HOSTS.has(new URL(candidate).hostname);
  } catch {
    return false;
  }
}

function resolveCandidateUrl(candidate) {
  if (Platform.OS === "web") {
    return trimTrailingSlash(candidate);
  }

  try {
    const url = new URL(candidate);

    if (!LOCAL_HOSTS.has(url.hostname)) {
      return trimTrailingSlash(candidate);
    }

    const expoHost = getExpoDevHostname();

    if (!expoHost) {
      return trimTrailingSlash(candidate);
    }

    url.hostname = expoHost;
    return trimTrailingSlash(url.toString());
  } catch {
    return trimTrailingSlash(candidate);
  }
}

export function getApiBaseUrl() {
  if (USE_LOCAL_API) {
    return resolveCandidateUrl(RAW_LOCAL_API_URL);
  }

  const safeRemoteUrl = isLocalUrl(RAW_REMOTE_API_URL)
    ? PRODUCTION_API_URL
    : RAW_REMOTE_API_URL;

  return resolveCandidateUrl(safeRemoteUrl);
}

export default getApiBaseUrl;
