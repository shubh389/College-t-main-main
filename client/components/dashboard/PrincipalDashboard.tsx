import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  UserRound,
  Building2,
  CalendarDays,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Data types
export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "On Leave";
}
export interface FacultyMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  attendance: AttendanceRecord[];
  excelSummary?: Record<string, string | number>;
}
export interface HOD {
  id: string;
  name: string;
  departmentId: string;
  faculties: FacultyMember[];
}
export interface Department {
  id: string;
  name: string;
  code: string;
  hods: HOD[];
}

// Sample generator utilities
function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function generateAttendance(days = 14): AttendanceRecord[] {
  const today = new Date();
  return Array.from({ length: days })
    .map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const r = (i * 17 + 7) % 10;
      const status: AttendanceRecord["status"] =
        r < 7 ? "Present" : r < 9 ? "Absent" : "On Leave";
      return { date: formatDate(d), status };
    })
    .reverse();
}

function buildAttendanceFromCounts(
  present: number,
  absent: number,
  leave: number,
  windowDays = 14,
): AttendanceRecord[] {
  const total = present + absent + leave;
  const scale = total > 0 ? windowDays / total : 1;
  const p = Math.round(present * scale);
  const a = Math.round(absent * scale);
  const l = Math.max(0, windowDays - p - a);
  const arr: AttendanceRecord[] = [];
  for (let i = 0; i < p; i++) arr.push({ date: "", status: "Present" });
  for (let i = 0; i < a; i++) arr.push({ date: "", status: "Absent" });
  for (let i = 0; i < l; i++) arr.push({ date: "", status: "On Leave" });
  const today = new Date();
  return arr.map((rec, idx) => ({
    date: formatDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - (arr.length - 1 - idx),
      ),
    ),
    status: rec.status,
  }));
}

function parseAttendanceCsv(csv: string): Department[] {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const col = (name: string) =>
    header.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
  const idIdx = col("Employee ID");
  const nameIdx = col("Employee Name");
  const deptIdx = col("Department");
  const presentIdx = col("Present");
  const absentIdx = col("Absent");
  const leaveIdx = col("Leave");

  type Row = {
    id: string;
    name: string;
    dept: string;
    p: number;
    a: number;
    l: number;
  };
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const id = cells[idIdx] ?? "";
    const name = cells[nameIdx] ?? "";
    const deptRaw = (cells[deptIdx] ?? "").toUpperCase();
    const dept =
      deptRaw === "ADMIN" || deptRaw === "PRINCIPAL" ? "ADMIN" : deptRaw;
    if (!id || !name || !dept) continue;
    const p = Number(cells[presentIdx] ?? 0) || 0;
    const a = Number(cells[absentIdx] ?? 0) || 0;
    const l = Number(cells[leaveIdx] ?? 0) || 0;
    rows.push({ id, name, dept, p, a, l });
  }

  const byDept = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.dept === "ADMIN") continue;
    const arr = byDept.get(r.dept) ?? [];
    arr.push(r);
    byDept.set(r.dept, arr);
  }

  const result: Department[] = [];
  for (const [code, list] of byDept) {
    const id = code.toLowerCase();
    const name = DEPT_LABELS[code] ?? code;
    const hodRow = list[0];
    const faculties: FacultyMember[] = list.slice(1).map((r, idx) => ({
      id: r.id,
      name: r.name,
      role: "Faculty",
      email: toEmail(r.name, code),
      phone: `+91 98${idx}${code.length}${id.length}0${(idx + 3) % 10}${(idx + 6) % 10}`,
      attendance: buildAttendanceFromCounts(r.p, r.a, r.l, 14),
    }));
    const hods: HOD[] = [
      {
        id: `${id}-hod-1`,
        name: hodRow.name,
        departmentId: id,
        faculties,
      },
    ];
    result.push({ id, name, code, hods });
  }
  result.sort((a, b) => a.code.localeCompare(b.code));
  return result;
}

// Provided raw staff data (as shared by user)
const PROVIDED_STAFF_RAW = `TIG18701037 Sai Mehta AEIE TINT 2025-08 18  TIG18701036 Aditya Joshi AEIE TINT 2025-08 18  TIG18701035 Reyansh Verma AEIE TINT 2025-08 19  TIG18701034 Vivaan Verma AEIE TINT 2025-08 17  TIG18701033 Vivaan Singh AEIE TINT 2025-08 19  TIG18701032 Sai Verma AEIE TINT 2025-08 21  AEIE TINT All 112  TIG18701013 Reyansh Reddy ASST. REGISTRATAR TINT 2025-08 21  ASST. REGISTRATAR TINT All 21  TIG18704208 Aarav Reddy Admin TINT 2025-08 23  TIG18704203 Arjun Kapoor Admin TINT 2025-08 22  TIG18704207 Sai Kapoor Admin TINT 2025-08 23  Admin TINT All 68  TIG18701175 Sai Patel BSH TINT 2025-08 17  TIG18701058 Vihaan Patel BSH TINT 2025-08 18  TIG18701057 Vihaan Singh BSH TINT 2025-08 17  TIG18701056 Sai Reddy BSH TINT 2025-08 15  TIG18701055 Vihaan Gupta BSH TINT 2025-08 18 TIG18701054 Reyansh Mishra BSH TINT 2025-08 13  TIG18701053 Ishaan Gupta BSH TINT 2025-08 17  TIG18701052 Sai Gupta BSH TINT 2025-08 18  TIG18701186 Reyansh Patel BSH TINT 2025-08 5  TIG18701178 Aditya Sharma BSH TINT 2025-08 14  TIG18701050 Sai Singh BSH TINT 2025-08 16  TIG18701172 Ishaan Gupta BSH TINT 2025-08 19  TIG18701049 Ayaan Kapoor BSH TINT 2025-08 19  TIG18701048 Arjun Sharma BSH TINT 2025-08 20  TIG18701047 Aditya Sharma BSH TINT 2025-08 17  TIG18701046 Arjun Gupta BSH TINT 2025-08 18  TIG18701045 Aditya Kapoor BSH TINT 2025-08 19  TIG18701044 Ishaan Kapoor BSH TINT 2025-08 18  TIG18701043 Reyansh Verma BSH TINT 2025-08 8  TIG18701042 Ishaan Sharma BSH TINT 2025-08 18  TIG18701041 Aarav Joshi BSH TINT 2025-08 18  TIG18701039 Sai Sharma BSH TINT 2025-08 18  TIG18701038 Aarav Sharma BSH TINT 2025-08 17  BSH TINT All 377  TIG18701066 Aditya Verma CE TINT 2025-08 15  TIG18701065 Sai Mishra CE TINT 2025-08 18  TIG18701064 Vivaan Gupta CE TINT 2025-08 16  TIG18701063 Arjun Gupta CE TINT 2025-08 15  TIG18701062 Ayaan Singh CE TINT 2025-08 18  TIG18701061 Ishaan Gupta CE TINT 2025-08 16  TIG18701060 Vivaan Patel CE TINT 2025-08 17  TIG18701059 Ishaan Kapoor CE TINT 2025-08 16  CE TINT All 131  TIG18701210 Reyansh Patel CSE TINT 2025-08 19  TIG18701189 Aditya Verma CSE TINT 2025-08 17  TIG18701093 Sai Mehta CSE TINT 2025-08 18  TIG18701091 Ayaan Sharma CSE TINT 2025-08 21  TIG18701090 Aarav Mehta CSE TINT 2025-08 19  TIG18701089 Sai Joshi CSE TINT 2025-08 19  TIG18701088 Arjun Verma CSE TINT 2025-08 18  TIG18701086 Aditya Mishra CSE TINT 2025-08 15  TIG18701185 Vihaan Gupta CSE TINT 2025-08 18  TIG18701174 Aditya Joshi CSE TINT 2025-08 8  TIG18701085 Ishaan Mishra CSE TINT 2025-08 19  TIG18701193 Arjun Verma CSE TINT 2025-08 18  TIG18701083 Aditya Reddy CSE TINT 2025-08 17  TIG18701082 Ayaan Joshi CSE TINT 2025-08 19 TIG18701080 Ishaan Kapoor CSE TINT 2025-08 14  TIG18701206 Aditya Reddy CSE TINT 2025-08 19  TIG18701081 Vivaan Mishra CSE TINT 2025-08 19  TIG18701211 Vihaan Verma CSE TINT 2025-08 18  TIG18701078 Aditya Sharma CSE TINT 2025-08 18  TIG18701077 Krishna Mehta CSE TINT 2025-08 19  TIG18701187 Ayaan Joshi CSE TINT 2025-08 17  TIG18701209 Krishna Kapoor CSE TINT 2025-08 19  TIG18701212 Ayaan Verma CSE TINT 2025-08 14  TIG18701200 Vivaan Joshi CSE TINT 2025-08 19  TIG18701190 Sai Joshi CSE TINT 2025-08 17  TIG18701070 Ishaan Mishra CSE TINT 2025-08 17  TIG18701075 Ishaan Verma CSE TINT 2025-08 17  TIG18704021 Arjun Reddy CSE TINT 2025-08 22  TIG18701176 Aarav Mishra CSE TINT 2025-08 17  TIG18701074 Aditya Mishra CSE TINT 2025-08 18  TIG18701073 Vihaan Mehta CSE TINT 2025-08 16  TIG18702018 Vivaan Singh CSE TINT 2025-08 23  TIG18701169 Ishaan Joshi CSE TINT 2025-08 17  TIG18701205 Ishaan Gupta CSE TINT 2025-08 18  TIG18701198 Arjun Mishra CSE TINT 2025-08 18  TIG18701069 Sai Kapoor CSE TINT 2025-08 18  TIG18701068 Arjun Verma CSE TINT 2025-08 17  TIG18701067 Krishna Gupta CSE TINT 2025-08 19  TIG18702015 Sai Reddy CSE TINT 2025-08 23  CSE TINT All 698  TIG18701107 Ayaan Patel ECE TINT 2025-08 19  TIG18701106 Reyansh Verma ECE TINT 2025-08 17  TIG18701105 Ishaan Joshi ECE TINT 2025-08 19  TIG18701104 Ayaan Gupta ECE TINT 2025-08 18  TIG18701103 Krishna Sharma ECE TINT 2025-08 19  TIG18701102 Aarav Patel ECE TINT 2025-08 19  TIG18701101 Ishaan Kapoor ECE TINT 2025-08 17  TIG18701100 Vivaan Joshi ECE TINT 2025-08 19  TIG18701099 Reyansh Reddy ECE TINT 2025-08 14  TIG18701098 Arjun Joshi ECE TINT 2025-08 17  TIG18701097 Sai Verma ECE TINT 2025-08 18  TIG18701096 Vihaan Singh ECE TINT 2025-08 19  TIG18701095 Ishaan Verma ECE TINT 2025-08 17  ECE TINT All 232  TIG18701125 Vivaan Patel EE TINT 2025-08 16 TIG18701124 Vihaan Singh EE TINT 2025-08 18  TIG18701123 Ishaan Joshi EE TINT 2025-08 17  TIG18701122 Ayaan Kapoor EE TINT 2025-08 18  TIG18701121 Ishaan Kapoor EE TINT 2025-08 17  TIG18701120 Arjun Patel EE TINT 2025-08 20  TIG18701119 Vivaan Joshi EE TINT 2025-08 18  TIG18701118 Vihaan Mishra EE TINT 2025-08 20  TIG18701117 Sai Reddy EE TINT 2025-08 18  TIG18701116 Krishna Reddy EE TINT 2025-08 13  TIG18701115 Aditya Sharma EE TINT 2025-08 17  TIG18701114 Ayaan Mishra EE TINT 2025-08 17  TIG18701113 Ayaan Singh EE TINT 2025-08 17  TIG18701112 Ayaan Verma EE TINT 2025-08 16  TIG18701111 Ishaan Joshi EE TINT 2025-08 18  TIG18701110 Vivaan Kapoor EE TINT 2025-08 18  TIG18701109 Arjun Kapoor EE TINT 2025-08 11  TIG18701108 Reyansh  Sharma  EE TINT 2025-08 18  EE TINT All 307  TIG18701201 Aditya Sharma IT TINT 2025-08 19  TIG18701138 Aditya Singh IT TINT 2025-08 18  TIG18701136 Reyansh  Kapoor  IT TINT 2025-08 17  TIG18701135 Vihaan Joshi IT TINT 2025-08 18  TIG18701129 Aditya Joshi IT TINT 2025-08 18  TIG18701134 Reyansh  Sharma  IT TINT 2025-08 17  TIG18701133 Reyansh  Kapoor  IT TINT 2025-08 15  TIG18701132 Krishna Kapoor IT TINT 2025-08 20  TIG18701131 Krishna Mehta IT TINT 2025-08 16  TIG18701130 Arjun Patel IT TINT 2025-08 15  TIG18701199 Ayaan Verma IT TINT 2025-08 15  TIG18701128 Ayaan Verma IT TINT 2025-08 18  TIG18701127 Aditya Gupta IT TINT 2025-08 16  IT TINT All 222  TIG18701144 Krishna Verma MBA TINT 2025-08 16  TIG18701142 Vivaan Gupta MBA TINT 2025-08 18  TIG18701143 Arjun Joshi MBA TINT 2025-08 17  TIG18701202 Ishaan Mehta MBA TINT 2025-08 18  TIG18701140 Arjun Kapoor MBA TINT 2025-08 19 TIG18701204 Reyansh Joshi MBA TINT 2025-08 19  MBA TINT All 107  TIG18701153 Reyansh  Sharma  MCA TINT 2025-08 18  TIG18701152 Arjun Gupta MCA TINT 2025-08 15  TIG18701151 Sai Mishra MCA TINT 2025-08 16  TIG18701150 Ayaan Mehta MCA TINT 2025-08 17  TIG18701149 Sai Sharma MCA TINT 2025-08 15  TIG18701148 Vihaan Mishra MCA TINT 2025-08 14  TIG18701147 Sai Verma MCA TINT 2025-08 18  TIG18701188 Sai Gupta MCA TINT 2025-08 19  TIG18701146 Vihaan Verma MCA TINT 2025-08 21  MCA TINT All 153  TIG18701166 Arjun Gupta ME TINT 2025-08 19  TIG18701165 Sai Patel ME TINT 2025-08 19  TIG18701164 Vivaan Joshi ME TINT 2025-08 22  TIG18701179 Aditya Mehta ME TINT 2025-08 18  TIG18701177 Ayaan Gupta ME TINT 2025-08 19  TIG18701160 Vivaan Mishra ME TINT 2025-08 18  TIG18701159 Arjun Patel ME TINT 2025-08 16  TIG18701158 Vivaan Mehta ME TINT 2025-08 19  TIG18701157 Reyansh Verma ME TINT 2025-08 17  TIG18701156 Vivaan Patel ME TINT 2025-08 19  TIG18701155 Vihaan Mehta ME TINT 2025-08 16  TIG18701154 Aditya Sharma ME TINT 2025-08 19  ME TINT All 221  TIG18701011 Vivaan Mehta PRINCIPAL TINT 2025-08 11`;

const DEPT_LABELS: Record<string, string> = {
  AEIE: "Applied Electronics & Instrumentation Engineering",
  BSH: "Basic Science & Humanities",
  CE: "Civil Engineering",
  CSE: "Computer Science & Engineering",
  ECE: "Electronics & Communication Engineering",
  EE: "Electrical Engineering",
  IT: "Information Technology",
  MBA: "Business Administration",
  MCA: "Computer Applications",
  ME: "Mechanical Engineering",
  ADMIN: "Administration",
};

function normalizeDeptToken(
  tokens: string[],
  i: number,
): { code: string; nextIndex: number } {
  const t = tokens[i];
  const next = tokens[i + 1];
  if (
    t === "Admin" ||
    t === "PRINCIPAL" ||
    (t === "ASST." && next === "REGISTRATAR")
  ) {
    return { code: "ADMIN", nextIndex: t === "ASST." ? i + 2 : i + 1 };
  }
  return { code: t, nextIndex: i + 1 };
}

function toEmail(name: string, code: string) {
  const handle = name
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${handle}@${code.toLowerCase()}.tint.edu`;
}

// Normalizer shared across components
const normName = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Detailed punch row shape (from Excel)
export type PunchRow = {
  cardId: string;
  empId: string;
  name: string;
  inDate: string;
  inTime: string;
  outDate: string;
  outTime: string;
  department: string;
  college: string;
};

function findKey(obj: any, regex: RegExp, fallbackKeys: string[] = []) {
  const keys = Object.keys(obj);
  const found = keys.find((k) => regex.test(k.toLowerCase()));
  if (found) return found;
  return (
    fallbackKeys.find((f) => keys.some((k) => normName(k) === normName(f))) ??
    ""
  );
}
function parseDate(v: any): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m) {
    const [_, dd, mm, yyyy] = m as any;
    const year = Number(String(yyyy).length === 2 ? `20${yyyy}` : yyyy);
    const dt = new Date(year, Number(mm) - 1, Number(dd));
    return dt.toISOString().slice(0, 10);
  }
  return "";
}
function parseTime(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return "";
}

function parseHM(s: string): { h: number; m: number } | null {
  const m = String(s || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}
function minutesBetween(
  inDate: string,
  inTime: string,
  outDate: string,
  outTime: string,
) {
  if (!inDate || !inTime || !outDate || !outTime) return 0;
  const start = new Date(`${inDate}T${inTime}:00`);
  const end = new Date(`${outDate}T${outTime}:00`);
  const diff = Math.max(0, end.getTime() - start.getTime());
  return Math.round(diff / 60000);
}
function computeCumulativeForRows(rows: PunchRow[]) {
  let graceInCount = 0,
    graceOutCount = 0,
    lateInCount = 0,
    earlyOutCount = 0,
    doubleGrace = 0,
    observations = 0;
  for (const r of rows) {
    const hmIn = parseHM(r.inTime);
    const hmOut = parseHM(r.outTime);
    const lateIn = !!(hmIn && (hmIn.h > 9 || (hmIn.h === 9 && hmIn.m > 10)));
    const earlyOut = !!(
      hmOut &&
      (hmOut.h < 17 || (hmOut.h === 17 && hmOut.m < 30))
    );
    const gIn = lateIn;
    const gOut = earlyOut;
    if (gIn) graceInCount++;
    if (gOut) graceOutCount++;
    if (lateIn) lateInCount++;
    if (earlyOut) earlyOutCount++;
    if (gIn && gOut) doubleGrace++;
    if (lateIn || earlyOut || gIn || gOut) observations++;
  }
  const cls = Math.floor((lateInCount + earlyOutCount) / 4);
  return {
    graceInCount,
    graceOutCount,
    lateInCount,
    earlyOutCount,
    doubleGrace,
    observations,
    cls,
  };
}
function computeDurationForRows(rows: PunchRow[]) {
  const durations = rows
    .map((r) => minutesBetween(r.inDate, r.inTime, r.outDate, r.outTime))
    .filter((m) => m > 0);
  const avgMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const normalizedHours = (avgMinutes / 60).toFixed(2);
  const underCount = rows.filter(
    (r) =>
      minutesBetween(r.inDate, r.inTime, r.outDate, r.outTime) < 450 &&
      minutesBetween(r.inDate, r.inTime, r.outDate, r.outTime) > 0,
  ).length;
  const addnlCLFromAvg = Math.floor(underCount / 4);
  const lateInCount = rows.filter((r) => {
    const hmIn = parseHM(r.inTime);
    return !!(hmIn && (hmIn.h > 9 || (hmIn.h === 9 && hmIn.m > 10)));
  }).length;
  const earlyOutCount = rows.filter((r) => {
    const hmOut = parseHM(r.outTime);
    return !!(hmOut && (hmOut.h < 17 || (hmOut.h === 17 && hmOut.m < 30)));
  }).length;
  const graceBasedCL = Math.floor((lateInCount + earlyOutCount) / 4);
  const totalCL = graceBasedCL + addnlCLFromAvg;
  return { avgMinutes, normalizedHours, underCount, addnlCLFromAvg, totalCL };
}
async function getXLSX() {
  try {
    return await import("xlsx");
  } catch {
    if ((window as any).XLSX) return (window as any).XLSX;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load XLSX"));
      document.head.appendChild(s);
    });
    return (window as any).XLSX;
  }
}
async function exportCumulativeRows(rows: PunchRow[]) {
  const XLSX = await getXLSX();
  const c = computeCumulativeForRows(rows);
  const data = [
    {
      "Grace In": c.graceInCount,
      "Grace Out": c.graceOutCount,
      "Late In": c.lateInCount,
      "Early Out": c.earlyOutCount,
      "# Late In (cumulative)": c.lateInCount,
      "# Early Out (cum)": c.earlyOutCount,
      "# Double Grace (cumulative)": c.doubleGrace,
      "# Observations (cumulative)": c.observations,
      "# CLs (cumulative)": c.cls,
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Cumulative");
  XLSX.writeFile(
    wb,
    `cumulative-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
async function exportDurationRows(rows: PunchRow[]) {
  const XLSX = await getXLSX();
  const f = computeDurationForRows(rows);
  const out = [
    {
      Role: "Faculty",
      Duration: `${f.avgMinutes} min (avg)`,
      "Normalized Duration": `${f.normalizedHours} h`,
      "Avg Monthly Duration": `${f.normalizedHours} h`,
      "Avg <7.5h": f.underCount,
      "Addnl CL for Average Duration": f.addnlCLFromAvg,
      "Total CL": f.totalCL,
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(out);
  XLSX.utils.book_append_sheet(wb, ws, "Duration & CL");
  XLSX.writeFile(
    wb,
    `duration-cl-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

function AttendanceDetailTable({ rows }: { rows: PunchRow[] }) {
  return (
    <div className="overflow-auto rounded-md border">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="p-2">Card Id</th>
            <th className="p-2">Employee ID</th>
            <th className="p-2">Employee Name</th>
            <th className="p-2">In Date</th>
            <th className="p-2">In Time</th>
            <th className="p-2">Out Date</th>
            <th className="p-2">Out Time</th>
            <th className="p-2">Department</th>
            <th className="p-2">College</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={`${r.empId}-${i}`} className="hover:bg-muted/20">
              <td className="p-2 text-muted-foreground">{r.cardId}</td>
              <td className="p-2">{r.empId}</td>
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.inDate}</td>
              <td className="p-2">{r.inTime}</td>
              <td className="p-2">{r.outDate}</td>
              <td className="p-2">{r.outTime}</td>
              <td className="p-2">{r.department}</td>
              <td className="p-2">{r.college}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseProvidedData(raw: string): Department[] {
  const entries = raw
    .replace(/\s+/g, " ")
    .split(/(?=TIG\d{5,})/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("TIG"));

  const known = new Set([
    "AEIE",
    "BSH",
    "CE",
    "CSE",
    "ECE",
    "EE",
    "IT",
    "MBA",
    "MCA",
    "ME",
    "Admin",
    "PRINCIPAL",
    "ASST.",
    "REGISTRATAR",
  ]);

  type Row = { id: string; name: string; dept: string };
  const rows: Row[] = [];

  for (const e of entries) {
    const tokens = e.split(/\s+/);
    const id = tokens[0];
    let i = 1;
    // find department token position
    while (i < tokens.length) {
      const token = tokens[i];
      const nxt = tokens[i + 1];
      if (known.has(token) || (token === "ASST." && nxt === "REGISTRATAR"))
        break;
      i++;
    }
    const name = tokens.slice(1, i).join(" ").trim();
    if (!name) continue;
    const { code, nextIndex } = normalizeDeptToken(tokens, i);
    const dept = code in DEPT_LABELS ? code : code; // allow unknowns to pass through
    rows.push({ id, name, dept });
  }

  // group rows by department
  const byDept = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r.dept === "Admin" || r.dept === "PRINCIPAL" ? "ADMIN" : r.dept;
    const key = k === "ASST." ? "ADMIN" : k;
    const arr = byDept.get(key) ?? [];
    arr.push(r);
    byDept.set(key, arr);
  }

  const departments: Department[] = [];
  for (const [code, list] of byDept) {
    if (!list.length) continue;
    if (code === "ADMIN") continue; // exclude Administration as requested
    const id = code.toLowerCase();
    const name = DEPT_LABELS[code] ?? code;
    const hodPerson = list[0];
    const faculties: FacultyMember[] = list.slice(1).map((p, idx) => ({
      id: p.id,
      name: p.name,
      role: "Faculty",
      email: toEmail(p.name, code),
      phone: `+91 98${idx}${code.length}${id.length}0${(idx + 3) % 10}${(idx + 6) % 10}`,
      attendance: generateAttendance(14),
    }));
    const hods: HOD[] = [
      {
        id: `${id}-hod-1`,
        name: hodPerson.name,
        departmentId: id,
        faculties,
      },
    ];
    departments.push({ id, name, code, hods });
  }

  // Stable ordering by label
  departments.sort((a, b) => a.code.localeCompare(b.code));
  return departments;
}

// UI Components
function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground border border-border",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-red-500 text-white flex items-center justify-center shadow-md">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-3 text-xs font-medium bg-muted/60">
        <div className="px-3 py-2">Date</div>
        <div className="px-3 py-2">Status</div>
        <div className="px-3 py-2">Remark</div>
      </div>
      <div className="divide-y">
        {records.map((r) => (
          <div key={r.date} className="grid grid-cols-3 text-sm">
            <div className="px-3 py-2 text-muted-foreground">{r.date}</div>
            <div className="px-3 py-2">
              <Pill
                className={cn(
                  r.status === "Present" &&
                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                  r.status === "Absent" &&
                    "bg-rose-50 text-rose-700 border-rose-200",
                  r.status === "On Leave" &&
                    "bg-amber-50 text-amber-700 border-amber-200",
                )}
              >
                {r.status === "Present" && <Check className="h-3.5 w-3.5" />}{" "}
                {r.status}
                {r.status === "Absent" && <X className="h-3.5 w-3.5" />}
              </Pill>
            </div>
            <div className="px-3 py-2 text-muted-foreground">
              {r.status === "Present"
                ? "—"
                : r.status === "Absent"
                  ? "Uninformed"
                  : "Approved"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FacultyCard({
  faculty,
  rows,
}: {
  faculty: FacultyMember;
  rows: PunchRow[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="group overflow-hidden hover:shadow-brand">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-red-600" />
              <h4 className="font-medium leading-tight">{faculty.name}</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{faculty.role}</p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-expanded={open}
            aria-label={open ? "Hide attendance" : "Show attendance"}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "shrink-0 rounded-full bg-red-50 hover:bg-red-100 border border-red-200",
            )}
          >
            <Plus
              className={cn(
                "h-5 w-5 text-red-600 transition-transform",
                open && "rotate-45",
              )}
            />
          </Button>
        </div>
        {open && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Attendance detail
            </div>
            <AttendanceDetailTable rows={rows} />
            {(() => {
              const c = computeCumulativeForRows(rows);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Cumulative Summary
                    </p>
                    <Button
                      size="sm"
                      onClick={() => exportCumulativeRows(rows)}
                    >
                      Export
                    </Button>
                  </div>
                  <div className="overflow-auto rounded-md border">
                    <table className="min-w-[900px] text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="p-2">Grace In</th>
                          <th className="p-2">Grace Out</th>
                          <th className="p-2">Late In</th>
                          <th className="p-2">Early Out</th>
                          <th className="p-2"># Double Grace (cumulative)</th>
                          <th className="p-2"># Observations (cumulative)</th>
                          <th className="p-2"># CLs (cumulative)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-muted/20">
                          <td className="p-2 font-semibold">
                            {c.graceInCount}
                          </td>
                          <td className="p-2 font-semibold">
                            {c.graceOutCount}
                          </td>
                          <td className="p-2 font-semibold">{c.lateInCount}</td>
                          <td className="p-2 font-semibold">
                            {c.earlyOutCount}
                          </td>
                          <td className="p-2 font-semibold">{c.doubleGrace}</td>
                          <td className="p-2 font-semibold">
                            {c.observations}
                          </td>
                          <td className="p-2 font-semibold">{c.cls}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const f = computeDurationForRows(rows);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Duration & CL Summary
                    </p>
                    <Button size="sm" onClick={() => exportDurationRows(rows)}>
                      Export
                    </Button>
                  </div>
                  <div className="overflow-auto rounded-md border">
                    <table className="min-w-[800px] text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="p-2">Role</th>
                          <th className="p-2">Duration</th>
                          <th className="p-2">Normalized Duration</th>
                          <th className="p-2">Avg Monthly Duration</th>
                          <th className="p-2">Avg &lt;7.5h</th>
                          <th className="p-2">Addnl CL for Average Duration</th>
                          <th className="p-2">Total CL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr className="hover:bg-muted/20">
                          <td className="p-2 font-medium">Faculty</td>
                          <td className="p-2 font-semibold">
                            {f.avgMinutes} min (avg)
                          </td>
                          <td className="p-2 font-semibold">
                            {f.normalizedHours} h
                          </td>
                          <td className="p-2 font-semibold">
                            {f.normalizedHours} h
                          </td>
                          <td className="p-2 font-semibold">{f.underCount}</td>
                          <td className="p-2 font-semibold">
                            {f.addnlCLFromAvg}
                          </td>
                          <td className="p-2 font-semibold">{f.totalCL}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HODCard({
  hod,
  getRows,
}: {
  hod: HOD;
  getRows: (name: string) => PunchRow[];
}) {
  const [open, setOpen] = useState(false);
  const [hodOpen, setHodOpen] = useState(false);
  return (
    <Card className="overflow-hidden hover:shadow-brand">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-red-600" />
            <div>
              <h4 className="font-medium leading-tight">{hod.name}</h4>
              <p className="text-xs text-muted-foreground">
                {hod.faculties.length}{" "}
                {hod.faculties.length === 1
                  ? "Faculty Member"
                  : "Faculty Members"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-expanded={open}
            aria-label={open ? "Hide faculty" : "Show faculty"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-full bg-red-50 hover:bg-red-100 border border-red-200"
          >
            <Plus
              className={cn(
                "h-5 w-5 text-red-600 transition-transform",
                open && "rotate-45",
              )}
            />
          </Button>
        </div>
        {open && (
          <div className="mt-4">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  HOD Attendance detail
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-expanded={hodOpen}
                  aria-label={hodOpen ? "Hide attendance" : "Show attendance"}
                  onClick={() => setHodOpen((v) => !v)}
                  className="rounded-full bg-red-50 hover:bg-red-100 border border-red-200"
                >
                  <Plus
                    className={cn(
                      "h-5 w-5 text-red-600 transition-transform",
                      hodOpen && "rotate-45",
                    )}
                  />
                </Button>
              </div>
              {hodOpen && (
                <div className="space-y-4">
                  <AttendanceDetailTable rows={getRows(hod.name)} />
                  {(() => {
                    const rows = getRows(hod.name);
                    const c = computeCumulativeForRows(rows);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Cumulative Summary
                          </p>
                          <Button
                            size="sm"
                            onClick={() => exportCumulativeRows(rows)}
                          >
                            Export
                          </Button>
                        </div>
                        <div className="overflow-auto rounded-md border">
                          <table className="min-w-[900px] text-sm">
                            <thead className="bg-muted/40 text-left">
                              <tr>
                                <th className="p-2">Grace In</th>
                                <th className="p-2">Grace Out</th>
                                <th className="p-2">Late In</th>
                                <th className="p-2">Early Out</th>
                                <th className="p-2">
                                  # Double Grace (cumulative)
                                </th>
                                <th className="p-2">
                                  # Observations (cumulative)
                                </th>
                                <th className="p-2"># CLs (cumulative)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-muted/20">
                                <td className="p-2 font-semibold">
                                  {c.graceInCount}
                                </td>
                                <td className="p-2 font-semibold">
                                  {c.graceOutCount}
                                </td>
                                <td className="p-2 font-semibold">
                                  {c.lateInCount}
                                </td>
                                <td className="p-2 font-semibold">
                                  {c.earlyOutCount}
                                </td>
                                <td className="p-2 font-semibold">
                                  {c.doubleGrace}
                                </td>
                                <td className="p-2 font-semibold">
                                  {c.observations}
                                </td>
                                <td className="p-2 font-semibold">{c.cls}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    const rows = getRows(hod.name);
                    const f = computeDurationForRows(rows);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Duration & CL Summary
                          </p>
                          <Button
                            size="sm"
                            onClick={() => exportDurationRows(rows)}
                          >
                            Export
                          </Button>
                        </div>
                        <div className="overflow-auto rounded-md border">
                          <table className="min-w-[800px] text-sm">
                            <thead className="bg-muted/40 text-left">
                              <tr>
                                <th className="p-2">Role</th>
                                <th className="p-2">Duration</th>
                                <th className="p-2">Normalized Duration</th>
                                <th className="p-2">Avg Monthly Duration</th>
                                <th className="p-2">Avg &lt;7.5h</th>
                                <th className="p-2">
                                  Addnl CL for Average Duration
                                </th>
                                <th className="p-2">Total CL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              <tr className="hover:bg-muted/20">
                                <td className="p-2 font-medium">HOD</td>
                                <td className="p-2 font-semibold">
                                  {f.avgMinutes} min (avg)
                                </td>
                                <td className="p-2 font-semibold">
                                  {f.normalizedHours} h
                                </td>
                                <td className="p-2 font-semibold">
                                  {f.normalizedHours} h
                                </td>
                                <td className="p-2 font-semibold">
                                  {f.underCount}
                                </td>
                                <td className="p-2 font-semibold">
                                  {f.addnlCLFromAvg}
                                </td>
                                <td className="p-2 font-semibold">
                                  {f.totalCL}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <SectionHeader
              icon={UserRound}
              title="Faculty"
              subtitle="Tap + to view attendance details"
            />
            <div className="space-y-3">
              {hod.faculties.map((f) => (
                <FacultyCard key={f.id} faculty={f} rows={getRows(f.name)} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DepartmentCard({
  dept,
  open,
  onOpenChange,
  selected,
  getRows,
}: {
  dept: Department;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selected?: boolean;
  getRows: (name: string) => PunchRow[];
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const toggle = () =>
    onOpenChange ? onOpenChange(!isOpen) : setInternalOpen((v) => !v);

  return (
    <Card
      className={cn(
        "overflow-hidden",
        selected && "ring-2 ring-red-200 border-red-200",
      )}
    >
      <CardContent className="p-5">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-red-500 text-white grid place-items-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{dept.name}</h3>
              <p className="text-xs text-muted-foreground">
                {dept.hods.length} HOD{dept.hods.length === 1 ? "" : "s"} • Code{" "}
                {dept.code}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Hide HOD" : "Show HOD"}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            className="rounded-full bg-red-50 hover:bg-red-100 border border-red-200"
          >
            <Plus
              className={cn(
                "h-5 w-5 text-red-600 transition-transform",
                isOpen && "rotate-45",
              )}
            />
          </Button>
        </div>
        {isOpen && (
          <div className="mt-5">
            <SectionHeader
              icon={Users}
              title="Heads of Department"
              subtitle="Tap + to view faculty"
            />
            <div className="space-y-3">
              {dept.hods.map((h) => (
                <HODCard key={h.id} hod={h} getRows={getRows} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrincipalDashboard() {
  const [departments, setDepartments] = useState<Department[]>(() =>
    parseProvidedData(PROVIDED_STAFF_RAW),
  );
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const filtered = useMemo(() => {
    const found = departments.find((d) => d.id === selectedDeptId);
    return found ? [found] : departments;
  }, [departments, selectedDeptId]);

  const cseDept = useMemo(() => {
    const d = departments.find((x) => x.code === "CSE");
    if (!d) return null;
    return {
      ...d,
      hods: d.hods.map((h, i) => ({
        ...h,
        name: i === 0 ? "Reyansh Patel" : h.name,
      })),
    };
  }, [departments]);

  const [punchRows, setPunchRows] = useState<PunchRow[]>([]);
  const rowsByName = useMemo(() => {
    const m = new Map<string, PunchRow[]>();
    for (const r of punchRows) {
      const k = normName(r.name);
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
    return m;
  }, [punchRows]);
  const getRows = (name: string) => rowsByName.get(normName(name)) ?? [];

  useEffect(() => {
    const EXCEL_URL =
      "https://cdn.builder.io/o/assets%2F0d7360767e284db5a397928f0c050cd5%2F361c22ddd0a145e0ad02f5734a898345?alt=media&token=e24a98ae-3bf6-4d40-a37d-e48654f24204&apiKey=0d7360767e284db5a397928f0c050cd5";
    (async () => {
      try {
        const buf = await fetch(EXCEL_URL).then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch Excel: ${r.status}`);
          return r.arrayBuffer();
        });

        let xlsxModule: any = null;
        try {
          xlsxModule = await import("xlsx");
        } catch (modErr) {
          // Dynamic import failed in this environment — load UMD bundle as fallback
          await new Promise<void>((resolve, reject) => {
            const url =
              "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
            // If already present, resolve
            if ((window as any).XLSX) return resolve();
            const s = document.createElement("script");
            s.src = url;
            s.onload = () => resolve();
            s.onerror = () =>
              reject(new Error("Failed to load xlsx UMD bundle"));
            document.head.appendChild(s);
          });
          xlsxModule = (window as any).XLSX;
        }

        if (!xlsxModule) throw new Error("XLSX module not available");

        const wb = xlsxModule.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = xlsxModule.utils.sheet_to_json(sheet, {
          defval: "",
        });
        const byName = new Map<string, any>();
        for (const row of rows) {
          const nameKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("employee name"),
            ) ?? Object.keys(row).find((k) => k.toLowerCase().includes("name"));
          if (!nameKey) continue;
          const name = String(row[nameKey] ?? "");
          if (!name) continue;
          byName.set(normName(name), row);
        }
        const presentKey = (keys: string[]) =>
          keys.find((k) => /\b(present|^p$)\b/i.test(k));
        const absentKey = (keys: string[]) =>
          keys.find((k) => /\b(absent|^a$)\b/i.test(k));
        const leaveKey = (keys: string[]) =>
          keys.find((k) => /\b(leave|^l$)\b/i.test(k));

        // Map detailed punches for per-person table
        const mapped: PunchRow[] = rows.map((row) => {
          const cardKey = findKey(row, /card\s*id|card\s*no|card\s*number/);
          const empKey = findKey(row, /employee\s*id|emp\s*id|id$/);
          const nameKey = findKey(row, /employee\s*name|name/);
          const deptKey = findKey(row, /department|dept/);
          const collegeKey = findKey(row, /college|institute|org/);
          const inDateKey = findKey(row, /in\s*date|date\s*in|entry\s*date/);
          const inTimeKey = findKey(row, /in\s*time|time\s*in|entry\s*time/);
          const outDateKey = findKey(row, /out\s*date|date\s*out|exit\s*date/);
          const outTimeKey = findKey(row, /out\s*time|time\s*out|exit\s*time/);
          const inDate = parseDate(row[inDateKey]);
          const outDate = parseDate(row[outDateKey]);
          const inTime = parseTime(row[inTimeKey]);
          const outTime = parseTime(row[outTimeKey]);
          return {
            cardId: String(row[cardKey] ?? ""),
            empId: String(row[empKey] ?? ""),
            name: String(row[nameKey] ?? ""),
            inDate,
            inTime,
            outDate,
            outTime,
            department: String(row[deptKey] ?? ""),
            college: String(row[collegeKey] ?? ""),
          } as PunchRow;
        });
        setPunchRows(mapped.filter((m) => m.name));

        setDepartments((prev) =>
          prev.map((dept) => ({
            ...dept,
            hods: dept.hods.map((h) => ({
              ...h,
              faculties: h.faculties.map((f) => {
                const row = byName.get(normName(f.name));
                if (!row) return f;
                const keys = Object.keys(row);
                const pk = presentKey(keys);
                const ak = absentKey(keys);
                const lk = leaveKey(keys);
                let attendance = f.attendance;
                if (pk || ak || lk) {
                  const p = Number(row[pk ?? ""] ?? 0) || 0;
                  const a = Number(row[ak ?? ""] ?? 0) || 0;
                  const l = Number(row[lk ?? ""] ?? 0) || 0;
                  attendance = buildAttendanceFromCounts(p, a, l, 14);
                }
                return { ...f, excelSummary: row, attendance };
              }),
            })),
          })),
        );
      } catch (err) {
        console.error("Failed to load Excel:", err);
      }
    })();
  }, []);

  // Derived analytics for charts
  const deptFacultyData = useMemo(() => {
    return departments.map((d) => ({
      name: d.code,
      faculty: d.hods.reduce((acc, h) => acc + h.faculties.length, 0),
    }));
  }, [departments]);

  const attendanceByDept = useMemo(() => {
    return departments.map((d) => {
      let present = 0,
        absent = 0,
        leave = 0;
      for (const h of d.hods) {
        for (const f of h.faculties) {
          const last = f.attendance[f.attendance.length - 1];
          if (!last) continue;
          if (last.status === "Present") present++;
          else if (last.status === "Absent") absent++;
          else if (last.status === "On Leave") leave++;
        }
      }
      return { name: d.code, present, absent, leave };
    });
  }, [departments]);

  const dailyPresentTrend = useMemo(() => {
    const countByDate = new Map<string, number>();
    for (const d of departments) {
      for (const h of d.hods) {
        for (const f of h.faculties) {
          for (const r of f.attendance) {
            if (r.status === "Present") {
              countByDate.set(r.date, (countByDate.get(r.date) ?? 0) + 1);
            }
          }
        }
      }
    }
    return Array.from(countByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));
  }, [departments]);

  return (
    <div className="space-y-8">
      <div className="sticky top-14 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Reyansh Patel</h2>
          <p className="text-sm text-muted-foreground">CSE — Computer Science & Engineering</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Departments</p>
            <p className="text-2xl font-semibold">{departments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total HODs</p>
            <p className="text-2xl font-semibold">
              {departments.reduce((s, d) => s + d.hods.length, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Faculty</p>
            <p className="text-2xl font-semibold">
              {departments.reduce(
                (s, d) =>
                  s + d.hods.reduce((x, h) => x + h.faculties.length, 0),
                0,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <SectionHeader
          icon={Users}
          title="Head of Department"
          subtitle="Tap + to view faculty and attendance"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {cseDept ? (
          cseDept.hods.slice(0, 1).map((h) => (
            <HODCard key={h.id} hod={h} getRows={getRows} />
          ))
        ) : (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              CSE department not found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
