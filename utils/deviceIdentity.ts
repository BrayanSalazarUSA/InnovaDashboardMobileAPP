import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "innova_device_id";
const DEVICE_NAME_KEY = "innova_device_name";

function normalizeDeviceName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function getStoredDeviceIdAsync() {
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

export async function getOrCreateDeviceIdAsync() {
  const stored = await getStoredDeviceIdAsync();
  if (stored && stored.trim()) {
    return stored.trim();
  }

  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export async function getStoredDeviceNameAsync() {
  const value = await SecureStore.getItemAsync(DEVICE_NAME_KEY);
  const normalized = value ? normalizeDeviceName(value) : null;
  return normalized && normalized.length > 0 ? normalized : null;
}

export async function storeDeviceNameAsync(deviceName: string) {
  const normalized = normalizeDeviceName(deviceName);
  if (!normalized) {
    throw new Error("Device name is required");
  }

  const deviceId = await getOrCreateDeviceIdAsync();
  await SecureStore.setItemAsync(DEVICE_NAME_KEY, normalized);

  return {
    deviceId,
    deviceName: normalized,
  };
}

export async function getDeviceIdentityAsync() {
  const deviceId = await getOrCreateDeviceIdAsync();
  const deviceName = await getStoredDeviceNameAsync();

  return {
    deviceId,
    deviceName,
  };
}
