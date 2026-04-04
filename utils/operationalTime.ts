export type ShiftKey = "MORNING" | "AFTERNOON" | "NIGHT";

export function getShift(dateIso: string): ShiftKey {
  const date = new Date(dateIso);
  const hour = date.getHours();

  if (hour >= 6 && hour < 14) return "MORNING"; // 6am - 2pm
  if (hour >= 14 && hour < 22) return "AFTERNOON"; // 2pm - 10pm
  return "NIGHT"; // 10pm - 6am
}

export function getShiftLabel(shift: ShiftKey) {
  switch (shift) {
    case "MORNING":
      return "Turno Mañana (6am - 2pm)";
    case "AFTERNOON":
      return "Turno Tarde (2pm - 10pm)";
    case "NIGHT":
      return "Turno Noche (10pm - 6am)";
  }
}

export function getOperationalDate(dateISO: string) {
  const d = new Date(dateISO);

  // antes de las 6am → pertenece al día anterior
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }

  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export function formatOperationalHeader(dateISO: string) {
  const today = new Date();
  const op = new Date(dateISO);

  today.setHours(0, 0, 0, 0);
  op.setHours(0, 0, 0, 0);

  const diff = (today.getTime() - op.getTime()) / (1000 * 60 * 60 * 24);

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";

  return op.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
