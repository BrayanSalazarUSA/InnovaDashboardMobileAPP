export type AttendanceEmployee = {
  id: number;
  name: string;
  image?: string | null;
  employeeCode?: string | null;
  email?: string | null;
  roleName?: string | null;
  requiresSecurityCode?: boolean;
};

export type AttendanceExpectedShift = {
  scheduleId?: number | null;
  title?: string | null;
  operationalDate: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduled: boolean;
  offDay: boolean;
};

export type AttendanceSessionSummary = {
  sessionId: number;
  scheduleId?: number | null;
  status: "ACTIVE" | "ON_BREAK" | "COMPLETED";
  closeType?: "EMPLOYEE" | "ADMIN" | "AUTO" | null;
  reviewStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | null;
  closeReason?: string | null;
  operationalDate: string;
  shiftLabel: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  clockInAt: string;
  clockOutAt?: string | null;
  clockInSelfie?: string | null;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  activeBreak: boolean;
  openBreakId?: number | null;
};

export type AttendanceLookupResponse = {
  employee: AttendanceEmployee;
  expectedShift: AttendanceExpectedShift;
  currentSession?: AttendanceSessionSummary | null;
  message: string;
};

export type AttendanceTeamRow = {
  employeeId: number;
  employeeName: string;
  employeeImage?: string | null;
  employeeCode?: string | null;
  currentSessionId?: number | null;
  closeType?: "EMPLOYEE" | "ADMIN" | "AUTO" | null;
  reviewStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | null;
  status:
    | "Trabajando"
    | "En descanso"
    | "Finalizado"
    | "Pendiente"
    | "No fichado"
    | "Descanso"
    | "Sin turno";
  shiftLabel: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  offDay: boolean;
  scheduled: boolean;
  activeBreak: boolean;
};

export type AttendanceDashboard = {
  operationalDate: string;
  assignedCount: number;
  activeCount: number;
  onBreakCount: number;
  completedCount: number;
  offDayCount: number;
  pendingCount: number;
  rows: AttendanceTeamRow[];
};

export type AttendancePendingClosure = {
  sessionId: number;
  employeeId: number;
  employeeName: string;
  employeeImage?: string | null;
  employeeCode?: string | null;
  operationalDate: string;
  shiftLabel: string;
  scheduledEnd?: string | null;
  clockInAt: string;
  clockOutAt: string;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  closeType: "AUTO" | "ADMIN" | "EMPLOYEE";
  reviewStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED";
  closeReason?: string | null;
};

export type TimeAdjustmentApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AttendanceOvertimeRequest = {
  id: number;
  jibbleUserId: string;
  date: string;
  totalMinutes: number;
  approvedMinutes?: number | null;
  category: "EXTRA_HOUR" | "ATTENDANCE_ISSUE";
  extraHourType?: "DIURNA" | "NOCTURNA" | "FESTIVA" | null;
  note?: string | null;
  sourceSessionId?: number | null;
  shiftLabel?: string | null;
  approvalStatus: TimeAdjustmentApprovalStatus;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
};
