import { runWithCacheFallback } from "@/utils/apiCache";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import { resolveApiBaseUrl } from "@/utils/apiBaseUrl";
import { Platform } from "react-native";

const API_URL = resolveApiBaseUrl();
const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_REPORTS_CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_PENDING_REPORT_EVIDENCES = 2;

function parseApiPayload(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return raw;
  }
}

function getErrorMessageFromPayload(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (payload.error && payload.details) {
    return `${payload.error} ${payload.details}`;
  }
  return payload.message || payload.error || payload.details || null;
}

function normalizeNetworkErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/network request failed|failed to fetch|networkerror/i.test(message)) {
    return "No se pudo conectar con el servidor. Revisa la conexión a internet o WiFi e intenta enviar el reporte nuevamente.";
  }

  if (/timeout|timed out|aborted/i.test(message)) {
    return "La subida tardó demasiado. Revisa la conexión WiFi o datos móviles e intenta nuevamente. El reporte se mantiene guardado en este formulario.";
  }

  return message || "No se pudo enviar el reporte. Revisa la información e intenta nuevamente.";
}

function buildPendingReportPayload(data) {
  const date = new Date();
  const formattedDate = (d) =>
    d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return {
    property: data.property,
    contributedBy: data.contributedBy,
    caseType: data.caseType,
    incidentDate: formattedDate(date),
    incidentStartTime: data.incidentStartTime,
    incidentEndTime: data.incidentEndTime,
    followings: data.followings,
    priority: data.priority,
    policeFirstResponderNotified: data.policeFirstResponderNotified ?? false,
    policeFirstResponderScene: data.policeFirstResponderNotified
      ? data.policeFirstResponderScene
      : null,
    reportDetails: data.reportDetails,
    incidentLocations: (data.incidentLocations || []).map((loc) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      floor: loc.floor ?? null,
      building: loc.building ? { id: loc.building.id } : null,
    })),
  };
}

function inferEvidenceType(file) {
  const providedType = file?.type?.trim();
  if (providedType) return providedType;

  const source = `${file?.name || file?.uri || ""}`.toLowerCase();
  if (source.includes(".png")) return "image/png";
  if (source.includes(".webp")) return "image/webp";
  if (source.includes(".heic")) return "image/heic";
  if (source.includes(".heif")) return "image/heif";
  if (source.includes(".mp4")) return "video/mp4";
  if (source.includes(".mov")) return "video/quicktime";
  return "image/jpeg";
}

function inferEvidenceName(file, index) {
  const rawName =
    file?.name ||
    file?.uri?.split(/[\\/]/).pop()?.split("?")[0] ||
    `evidence_${index}.jpg`;

  return rawName.trim().replace(/\s+/g, "_") || `evidence_${index}.jpg`;
}

function normalizeEvidenceFiles(evidences = []) {
  return evidences
    .filter((file) => file?.uri)
    .map((file, index) => ({
      uri: file.uri,
      type: inferEvidenceType(file),
      name: inferEvidenceName(file, index),
      file: file.file,
    }));
}

async function resolveWebEvidenceBlob(file) {
  if (typeof Blob !== "undefined" && file?.file instanceof Blob) {
    return file.file;
  }

  if (!file?.uri || typeof fetch !== "function") {
    return null;
  }

  if (
    file.uri.startsWith("blob:") ||
    file.uri.startsWith("data:") ||
    file.uri.startsWith("http")
  ) {
    const response = await fetch(file.uri);
    if (!response.ok) {
      throw new Error(
        `No se pudo leer la evidencia ${file.name || ""} antes de enviarla.`,
      );
    }
    return await response.blob();
  }

  return null;
}

async function appendEvidenceToFormData(formData, file, index) {
  const name = file.name || `evidence_${index}.jpg`;
  const type = file.type || "image/jpeg";

  if (Platform.OS === "web") {
    const blob = await resolveWebEvidenceBlob(file);
    if (!blob) {
      throw new Error(
        `No se pudo preparar la evidencia ${index + 1} para subirla.`,
      );
    }

    formData.append("evidences", blob, name);
    return;
  }

  formData.append("evidences", {
    uri: file.uri,
    type,
    name,
  });
}

async function appendEvidencesToFormData(formData, evidenceFiles) {
  for (const [index, file] of evidenceFiles.entries()) {
    await appendEvidenceToFormData(formData, file, index);
  }
}

async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  try {
    const res = await fetchWithRetry(url, {
      headers: {
        "Content-Type": "application/json",
        Role: "Admin",
        ...(options.headers || {}),
      },
      ...options,
    });

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!res.ok) {
      console.error(`Error HTTP ${res.status} (${res.statusText})`);
      throw new Error(
        `API Error ${res.status}: ${
          typeof data === "string" ? data : JSON.stringify(data)
        }`,
      );
    }

    return data;
  } catch (err) {
    console.error(`Error en apiFetch [${url}]:`, err.message);
    throw err;
  }
}

async function apiFetchWithCache(endpoint, cacheKey, maxAgeMs, options = {}) {
  return runWithCacheFallback({
    cacheKey,
    maxAgeMs,
    loader: () => apiFetch(endpoint, options),
  });
}

const formattedDate = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}/${date.getFullYear()}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryUpload(operation, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastError;
}

export const ApiService = {
  getProperties: () =>
    apiFetchWithCache(
      "properties",
      "catalog/properties",
      CATALOG_CACHE_TTL_MS,
    ),
  getBuildings: (propertyId) => apiFetch(`buildings/${propertyId}`),
  getIncidents: () =>
    apiFetchWithCache("cases", "catalog/incidents", CATALOG_CACHE_TTL_MS),
  getMonitors: () =>
    apiFetchWithCache(
      "users/agents",
      "catalog/monitors",
      CATALOG_CACHE_TTL_MS,
    ),
  getReportById: async (reportId) => {
    try {
      return await apiFetch(`pending-reports/${reportId}`);
    } catch (err) {
      if (err.message.includes("404")) {
        console.warn(`⚠️ Reporte ${reportId} no encontrado (404)`);
        return null;
      }
      throw err;
    }
  },
  createReport: async (data) => {
    try {
      const evidenceFiles = normalizeEvidenceFiles(data.evidences || []);

      if (evidenceFiles.length < MIN_PENDING_REPORT_EVIDENCES) {
        throw new Error(
          `Debes adjuntar al menos ${MIN_PENDING_REPORT_EVIDENCES} evidencias antes de enviar el reporte.`,
        );
      }

      const formData = new FormData();
      formData.append(
        "pendingReport",
        JSON.stringify(buildPendingReportPayload(data)),
      );
      await appendEvidencesToFormData(formData, evidenceFiles);

      const response = await fetch(`${API_URL}/pending-reports`, {
        method: "POST",
        headers: {
          Userid: data.contributedBy.id.toString(),
        },
        body: formData,
      });

      const textResponse = await response.text();
      const result = parseApiPayload(textResponse);

      if (!response.ok) {
        const backendMessage = getErrorMessageFromPayload(result);
        throw new Error(
          backendMessage ||
            `Error HTTP ${response.status}: ${JSON.stringify(result)}`,
        );
      }

      return result;
    } catch (error) {
      console.error("Error completo al enviar reporte:", error);
      throw new Error(normalizeNetworkErrorMessage(error));
    }
  },
  addPendingEvidences: async (reportId, evidences, userId) => {
    try {
      const formData = new FormData();
      const evidenceFiles = normalizeEvidenceFiles(evidences);

      await appendEvidencesToFormData(formData, evidenceFiles);

      const response = await fetch(
        `${API_URL}/pending-reports/${reportId}/asignar-evidencia`,
        {
          method: "PUT",
          headers: {
            Userid: userId?.toString() || "0",
            // 👇 Importante: NO pongas "Content-Type", fetch lo calcula solo
          },
          body: formData,
        },
      );

      const text = await response.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = text;
      }

      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}: ${JSON.stringify(result)}`,
        );
      }

      return result;
    } catch (error) {
      console.error("Error al añadir evidencias:", error);
      throw error;
    }
  },
  uploadPendingEvidencesSafely: async (reportId, evidences = [], userId) => {
    if (!reportId || evidences.length === 0) return 0;

    let failedEvidenceCount = 0;
    for (const [index, file] of evidences.entries()) {
      try {
        await retryUpload(
          () =>
            ApiService.addPendingEvidences(
              reportId,
              [
                {
                  uri: file.uri,
                  type: inferEvidenceType(file),
                  name: inferEvidenceName(file, index),
                },
              ],
              userId,
            ),
          2,
        );
      } catch (uploadError) {
        console.error(
          `Error al subir evidencia ${index + 1}/${evidences.length}:`,
          uploadError,
        );
        failedEvidenceCount += 1;
      }
    }

    return failedEvidenceCount;
  },
  updateReport: async (id, data, userId) => {
    try {
      const response = await fetch(`${API_URL}/pending-reports/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Userid: userId?.toString() || "0",
        },
        body: JSON.stringify({
          property: data.property,
          contributedBy: data.contributedBy,
          caseType: data.caseType,
          incidentDate: formattedDate(new Date()),
          incidentStartTime: data.incidentStartTime,
          incidentEndTime: data.incidentEndTime,
          reportDetails: data.reportDetails,
          priority: data.priority,
          policeFirstResponderNotified:
            data.policeFirstResponderNotified ?? false,
          policeFirstResponderScene: data.policeFirstResponderNotified
            ? data.policeFirstResponderScene
            : null,
          //evidences: data.evidences || [],
          followings: data.followings || [],
          persist: data.persist ?? false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(" Error al actualizar reporte:", result);
        throw new Error(result?.error || "Error al actualizar reporte");
      }

      return result;
    } catch (error) {
      console.error(" Error en updateReport:", error.message);
      throw error;
    }
  },

  getRecentPendingReports: async (days = 2) => {
    try {
      return await apiFetchWithCache(
        `pending-reports/recent-summary?days=${days}`,
        `reports/recent-summary/${days}`,
        RECENT_REPORTS_CACHE_TTL_MS,
      );
    } catch (err) {
      console.error("Error cargando reportes recientes:", err.message);
      throw err;
    }
  },

  deleteReport: async (id, userId) => {
    try {
      const response = await fetch(`${API_URL}/pending-reports/${id}`, {
        method: "DELETE",
        headers: {
          Userid: userId?.toString() || "0",
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        console.error(" Error al eliminar reporte:", result);
        throw new Error(result?.error || "Error al eliminar reporte");
      }

      return { success: true };
    } catch (error) {
      console.error(" Error en deleteReport:", error.message);
      throw error;
    }
  },
  deletePendingEvidence: async (reportId, evidence, userId) => {
    try {
      const response = await fetch(
        `${API_URL}/pending-reports/${reportId}/eliminar-evidencia`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Userid: userId?.toString() || "0",
          },
          body: JSON.stringify(evidence), // se envía el objeto Evidence completo
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        console.error("Error al eliminar evidencia:", result);
        throw new Error(result?.error || "Error al eliminar evidencia");
      }

      const updatedReport = await response.json();
      return updatedReport; // Devuelve el PendingReport actualizado
    } catch (error) {
      console.error(" Error en deletePendingEvidence:", error.message);
      throw error;
    }
  },
};
