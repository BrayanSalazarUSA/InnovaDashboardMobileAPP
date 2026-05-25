import { runWithCacheFallback } from "@/utils/apiCache";
import resolveApiBaseUrl from "@/utils/apiBaseUrl";
import { fetchWithRetry } from "@/utils/fetchWithRetry";

const API_URL = resolveApiBaseUrl();
const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_REPORTS_CACHE_TTL_MS = 15 * 60 * 1000;

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
    const date = new Date();
    const formattedDate = (d) =>
      d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    try {
      console.log("[createReport] Iniciando envío de reporte...");

      const reportPayload = {
        property: data.property,
        contributedBy: data.contributedBy,
        caseType: data.caseType,
        incidentDate: formattedDate(date),
        incidentStartTime: data.incidentStartTime,
        incidentEndTime: data.incidentEndTime,
        followings: data.followings,
        priority: data.priority,
        reportDetails: data.reportDetails,
        incidentLocations: data.incidentLocations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          floor: loc.floor ?? null,
          building: loc.building ? { id: loc.building.id } : null,
        })),
      };

      const endpoint = `${API_URL}/pending-reports/json`;
      console.log("Enviando a:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Userid: data.contributedBy.id.toString(),
        },
        body: JSON.stringify(reportPayload),
      });

      console.log(" Respuesta recibida con código:", response.status);
      const textResponse = await response.text();
      console.log(" Respuesta completa (texto):", textResponse);

      let result;
      try {
        result = JSON.parse(textResponse);
      } catch {
        console.warn(" Respuesta no es JSON válido.");
        result = textResponse;
      }

      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}: ${JSON.stringify(result)}`,
        );
      }

      console.log("Reporte creado correctamente:", result);

      const failedEvidences = [];
      const reportId = result?.reportId;

      if (reportId && data.evidences?.length > 0) {
        for (const [index, file] of data.evidences.entries()) {
          try {
            await ApiService.addPendingEvidences(
              reportId,
              [
                {
                  uri: file.uri,
                  type: file.type || "image/jpeg",
                  name: file.name || `evidence_${index}.jpg`,
                },
              ],
              data.contributedBy.id,
            );
          } catch (uploadError) {
            console.error(
              `Error al subir evidencia ${index + 1}/${data.evidences.length}:`,
              uploadError,
            );
            failedEvidences.push(index);
          }
        }
      }

      return {
        ...result,
        failedEvidenceCount: failedEvidences.length,
      };
    } catch (error) {
      console.error("Error completo al enviar reporte:", error);
      throw error;
    }
  },
  addPendingEvidences: async (reportId, evidences, userId) => {
    try {
      console.log(
        `📤 Enviando ${evidences.length} evidencias al PendingReport ID: ${reportId}`,
      );

      const formData = new FormData();

      evidences.forEach((file, index) => {
        formData.append("evidences", {
          uri: file.uri,
          type: file.type || "image/jpeg",
          name: file.name || `evidence_${index}.jpg`,
        });
      });

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
      console.log("🧾 Respuesta:", text);

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

      console.log("Evidencias añadidas correctamente:", result);
      return result;
    } catch (error) {
      console.error("Error al añadir evidencias:", error);
      throw error;
    }
  },
  updateReport: async (id, data) => {
    try {
      console.log(`✏️ Actualizando reporte ID: ${id}`);
      console.log("📦 Payload:", data);

      const response = await fetch(`${API_URL}/pending-reports/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Userid: "123",
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

      console.log(" Reporte actualizado:", result);
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
      console.log(` Eliminando reporte ID: ${id}`);

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

      console.log(" Reporte eliminado correctamente");
      return { success: true };
    } catch (error) {
      console.error(" Error en deleteReport:", error.message);
      throw error;
    }
  },
  deletePendingEvidence: async (reportId, evidence) => {
    try {
      console.log(
        ` Eliminando evidencia del reporte pendiente ID: ${reportId}`,
      );

      const response = await fetch(
        `${API_URL}/pending-reports/${reportId}/eliminar-evidencia`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Userid: "123",
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
      console.log(" Evidencia eliminada correctamente.");
      return updatedReport; // Devuelve el PendingReport actualizado
    } catch (error) {
      console.error(" Error en deletePendingEvidence:", error.message);
      throw error;
    }
  },
};
