import { Buffer } from "buffer";
const API_URL = process.env.EXPO_PUBLIC_SERVER_IP || "http://localhost:8080/api";
global.Buffer = Buffer;

async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  try {
    const res = await fetch(url, {
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
        }`
      );
    }

    return data;
  } catch (err) {
    console.error("Error en apiFetch:", err.message);
    throw err;
  }
}
 const formattedDate = (date) => `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;

export const ApiService = {
  getProperties: () => apiFetch("properties"),
  getBuildings: (propertyId) => apiFetch(`buildings/${propertyId}`),
  getIncidents: () => apiFetch("cases"),
  getMonitors: () => apiFetch("users/agents"),
  getReportById: (reportId) => apiFetch("pending-reports/"+reportId),
  createReport: async (data) => {
  const formData = new FormData();


    const date = new Date();
   

    console.log(" Fecha del reporte:", formattedDate);
formData.append("pendingReport", {
  uri: `data:application/json;base64,${Buffer.from(JSON.stringify({
    property: data.property,
    contributedBy: data.contributedBy,
    caseType: data.caseType,
    incidentDate: formattedDate(date), // 🔹 En formato dd/MM/yyyy
    incidentStartTime: data.incidentStartTime,
    followings:data.followings,
    incidentEndTime: data.incidentEndTime,
    reportDetails: data.reportDetails,
    incidentLocations: data.incidentLocations,
  })).toString("base64")}`,
  name: "pendingReport.json",
  type: "application/json",
});


  // Archivos (Expo los maneja bien si vienen del picker)
  if (data.evidences?.length > 0) {
    data.evidences.forEach((file, i) => {
      formData.append("evidences", {
        uri: file.uri,
        type: file.type || "image/jpeg",
        name: file.name || `evidence_${i}.jpg`,
      });
    });
  }

  console.log("📡 Endpoint:", `${API_URL}/pending-reports`);

  try {
 const response = await fetch(`${API_URL}/pending-reports`, {
  method: "POST",
  headers: {
    "Userid": data.contributedBy.id.toString(), // 👈 Usa el mismo id del monitor
  },
  body: formData,
});

    const result = await response.json();
    console.log(" Reporte creado:", result);
    return result;

  } catch (error) {
    console.error("🚨 Error completo al enviar:", error);
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
          "Userid": data.contributedBy.id.toString(),
        },
        body: JSON.stringify({
          property: data.property,
          contributedBy: data.contributedBy,
          caseType: data.caseType,
          //incidentDate: data.incidentDate,
          incidentStartTime: data.incidentStartTime,
          incidentEndTime: data.incidentEndTime,
          reportDetails: data.reportDetails,
          evidences: data.evidences || [],
          followings: data.followings || [],
          persist: data.persist ?? false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("⚠️ Error al actualizar reporte:", result);
        throw new Error(result?.error || "Error al actualizar reporte");
      }

      console.log("✅ Reporte actualizado:", result);
      return result;
    } catch (error) {
      console.error("🚨 Error en updateReport:", error.message);
      throw error;
    }
  },
  deleteReport: async (id, userId) => {
    try {
      console.log(` Eliminando reporte ID: ${id}`);

      const response = await fetch(`${API_URL}/pending-reports/${id}`, {
        method: "DELETE",
        headers: {
          "Userid": userId?.toString() || "0",
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
};
