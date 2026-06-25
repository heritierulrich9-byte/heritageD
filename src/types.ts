export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  className: string;
  gender: "M" | "F";
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  registrationType: "inscription" | "reinscription";
  status: "en_attente" | "approuvé" | "rejeté";
  paymentStatus: "payé" | "partiel" | "non_payé";
  tuitionPaid: number;
  totalTuition: number;
  dateCreated: string;
  medicalInfo?: string;
  previousSchool?: string;
  photoUrl?: string;
  academicYear?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  category: "événement" | "académique" | "annonce" | "sport";
  imageUrl: string;
  active: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  targetAudience: string;
  critical: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  dateReceived: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  amount: number;
  purpose: string;
  paymentMethod: string;
  transactionId: string;
  date: string;
  status: "validé" | "échec";
}

export interface AppConfig {
  schoolName: string;
  homeTitle: string;
  homeSubtitle: string;
  welcomeMessage: string;
  historyText: string;
  address: string;
  phone: string;
  email: string;
  registrationFee: number;
  monthlyFee: number;
  bannerMessage: string;
  showBanner: boolean;
  registrationOpen: boolean;
}

export const SCHOOL_CLASSES = [
  "Pré-maternelle (TPS)",
  "Maternelle (Petite Section)",
  "Maternelle (Moyenne Section)",
  "Maternelle (Grande Section)",
  "CP",
  "CE1",
  "CE2",
  "CM1",
  "CM2",
  "6ème (Collège)",
  "5ème (Collège)"
];

export const ACADEMIC_YEARS = [
  "2031/2032",
  "2030/2031",
  "2029/2030",
  "2028/2029",
  "2027/2028",
  "2026/2027",
  "2025/2026",
  "2024/2025",
  "2023/2024"
];

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: "vacances" | "examens" | "fete" | "reunion" | "autre";
  description: string;
  location?: string;
}

export type UserRole = "admin" | "secretaire" | "educateur";

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface FinancialReport {
  id: string;
  year: string; // e.g., "2025-2026" or "2026"
  type: "mensuel" | "annuel";
  period: string; // e.g., "Octobre 2026", "Bilan Annuel 2025-2026"
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  comments?: string;
  recordedBy: string;
  dateCreated: string;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  category: string;
  year: string;
  url: string;
  dateCreated?: string;
}


