import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  GraduationCap, 
  Calendar, 
  Image as ImageIcon, 
  Bell, 
  Mail, 
  Settings, 
  CreditCard, 
  ClipboardCheck, 
  Phone, 
  ArrowRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  UserPlus, 
  Users, 
  ShieldAlert, 
  FileText, 
  Download, 
  Filter, 
  Send,
  Eye,
  Activity,
  UserCheck2,
  Lock,
  MessageSquare,
  Search
} from "lucide-react";
import Navbar from "./components/Navbar";
import CalendarSection from "./components/CalendarSection";
import { Student, NewsItem, NoteItem, ContactMessage, PaymentRecord, AppConfig, SCHOOL_CLASSES, ACADEMIC_YEARS, SchoolEvent, User, UserRole, FinancialReport, GalleryPhoto } from "./types";

export default function App() {
  // Navigation & General
  const [currentView, setView] = useState<string>("home");
  const [dbConfig, setDbConfig] = useState<AppConfig | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  
  // Loading & Action feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exportConfirm, setExportConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Gallery Filters
  const [galleryCategory, setGalleryCategory] = useState<string>("all");
  const [galleryYear, setGalleryYear] = useState<string>("2025-2026");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Inscription Form State
  const [registerForm, setRegisterForm] = useState(() => {
    try {
      const saved = localStorage.getItem("heritage_register_form");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading register form from localStorage", e);
    }
    return {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      className: "CP",
      gender: "M" as "M" | "F",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      registrationType: "inscription" as "inscription" | "reinscription",
      medicalInfo: "",
      previousSchool: "",
      photoUrl: ""
    };
  });

  // Tuition Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    studentId: "stud_extern",
    studentName: "",
    studentClass: "CP",
    amount: "",
    purpose: "Frais de scolarité - Tranche 1",
    paymentMethod: "Orange Money"
  });
  const [paymentStep, setPaymentStep] = useState<"form" | "confirm" | "success">("form");
  const [currentReceipt, setCurrentReceipt] = useState<PaymentRecord | null>(null);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [contactSending, setContactSending] = useState(false);

  // Admin section active sub-tab & credentials
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("heritage_current_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const isAdminLoggedIn = !!currentUser;
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [userList, setUserList] = useState<User[]>([]);
  const [adminTab, setAdminTab] = useState<"students" | "news" | "notes" | "config" | "messages" | "payments" | "events" | "users" | "gallery">("students");
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User>>({
    username: "",
    password: "",
    fullName: "",
    role: "secretaire"
  });
  const [adminPaymentSubTab, setAdminPaymentSubTab] = useState<"list" | "new" | "bilans">("list");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("2025/2026");
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
  const [studentSortField, setStudentSortField] = useState<"name" | "class" | "status" | "tuition">("name");
  const [studentSortDirection, setStudentSortDirection] = useState<"asc" | "desc">("asc");
  const [paymentClassFilter, setPaymentClassFilter] = useState<string>("all");
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newManualAcademicYear, setNewManualAcademicYear] = useState<string>("2025/2026");
  const [newReport, setNewReport] = useState({
    year: "2025/2026",
    type: "mensuel" as "mensuel" | "annuel",
    period: "Juin 2026",
    totalIncome: 0,
    totalExpense: 0,
    comments: ""
  });

  // Admin edits state
  const [editingNews, setEditingNews] = useState<Partial<NewsItem>>({
    title: "",
    content: "",
    category: "annonce",
    imageUrl: ""
  });
  const [editingNote, setEditingNote] = useState<Partial<NoteItem>>({
    title: "",
    content: "",
    targetAudience: "Tous les parents",
    critical: false
  });
  const [editingEvent, setEditingEvent] = useState<Partial<SchoolEvent>>({
    title: "",
    date: "",
    time: "",
    category: "examens",
    description: "",
    location: ""
  });

  // Auto clearance of toast notification
  const notify = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 6000);
  };

  // Fetch all DB information
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resConfig, resNews, resNotes, resStudents, resMessages, resPayments, resEvents, resReports, resGallery] = await Promise.all([
        fetch("/api/config").then((r) => r.json()),
        fetch("/api/news").then((r) => r.json()),
        fetch("/api/notes").then((r) => r.json()),
        fetch("/api/students").then((r) => r.json()),
        fetch("/api/messages").then((r) => r.json()),
        fetch("/api/payments").then((r) => r.json()),
        fetch("/api/events").then((r) => r.json()),
        fetch("/api/reports").then((r) => r.json()),
        fetch("/api/gallery").then((r) => r.json())
      ]);

      setDbConfig(resConfig);
      setNews(resNews);
      setNotes(resNotes);
      setStudents(resStudents);
      setMessages(resMessages);
      setPayments(resPayments);
      setEvents(resEvents);
      setReports(resReports || []);
      setGalleryPhotos(resGallery || []);
    } catch (err) {
      console.error("Error loading data:", err);
      notify("Une erreur est survenue lors du chargement des informations scolaires.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync enrollment form to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("heritage_register_form", JSON.stringify(registerForm));
    } catch (e) {
      console.error("Error writing register form to localStorage", e);
    }
  }, [registerForm]);

  // Handle profile photo processing with downscaling and compression
  const handlePhotoFile = (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      notify("Format de fichier non supporté. Veuillez sélectionner une image valide.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8); // Compress as JPEG at 80% quality
          setRegisterForm(prev => ({ ...prev, photoUrl: dataUrl }));
          notify("Photo de profil chargée et optimisée avec succès !");
        } else {
          notify("Erreur lors de l'optimisation de l'image.", "error");
        }
      };
      img.onerror = () => {
        notify("Impossible de lire le fichier image sélectionné.", "error");
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      notify("Erreur de lecture du fichier.", "error");
    };
    reader.readAsDataURL(file);
  };

  // Handle Online Registration Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.firstName || !registerForm.lastName || !registerForm.parentName || !registerForm.parentPhone) {
      notify("Veuillez remplir correctement les informations obligatoires.", "error");
      return;
    }

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registerForm,
          totalTuition: registerForm.className.includes("Maternelle") ? 300000 : 350000,
          tuitionPaid: 0,
          paymentStatus: "non_payé"
        })
      });

      const data = await response.json();
      if (data.success) {
        notify(`Demande d'${registerForm.registrationType === 'inscription' ? 'inscription' : 'réinscription'} soumise avec succès !`);
        setStudents(data.students);
        // Reset form
        setRegisterForm({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          className: "CP",
          gender: "M",
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          registrationType: "inscription",
          medicalInfo: "",
          previousSchool: "",
          photoUrl: ""
        });
        
        alert("Votre dossier d'inscription a été soumis avec succès sous statut 'En attente'. L'administration scolaire et heritierulrich9@gmail.com ont été notifiés par e-mail. Veuillez contacter l'école pour effectuer le versement des frais scolaires correspondants.");
        setView("home");
      } else {
        notify("Impossible d'enregistrer votre inscription.", "error");
      }
    } catch (err) {
      notify("Erreur lors de la communication serveur.", "error");
    }
  };

  // Secure Online Tuition simulation
  const triggerPaymentProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.studentName || !paymentForm.amount) {
      notify("Veuillez renseigner le nom de l'élève et la somme à payer.", "error");
      return;
    }
    setPaymentStep("confirm");
  };

  const confirmSecurePayment = async () => {
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm)
      });
      const data = await response.json();
      if (data.success) {
        setCurrentReceipt(data.payment);
        setPaymentStep("success");
        notify("Paiement sécurisé validé avec succès ! Reçu d'acompte généré.");
        // Reload students list or payments
        fetchData();
      } else {
        notify("Échec de la validation de la transaction bancaire.", "error");
      }
    } catch (err) {
      notify("Erreur serveur lors de la transaction.", "error");
    }
  };

  // Send Direct Message to heritierulrich9@gmail.com
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      notify("Veuillez remplir l'intégralité du formulaire de contact.", "error");
      return;
    }

    setContactSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });
      const data = await response.json();
      if (data.success) {
        notify("Votre message a bien été envoyé ! heritierulrich9@gmail.com a reçu une notification.");
        setContactForm({
          name: "",
          email: "",
          subject: "",
          message: ""
        });
      } else {
        notify("Impossible de transmettre le message.", "error");
      }
    } catch (err) {
      notify("Erreur technique survenue.", "error");
    } finally {
      setContactSending(false);
    }
  };

  // PDF Export functions for Students, Receipts, Monthly and Annual balances
  const confirmExport = (title: string, description: string, onConfirm: () => void) => {
    setExportConfirm({
      isOpen: true,
      title,
      description,
      onConfirm: () => {
        setExportConfirm(null);
        onConfirm();
      }
    });
  };

  const exportStudentsToPDF = () => {
    confirmExport(
      "Exporter la Base des Élèves ?",
      `Vous êtes sur le point de générer et télécharger le registre complet contenant l'ensemble des élèves inscrits (${students.length} élèves). Cette opération d'exportation PDF volumineuse nécessite votre confirmation pour éviter toute erreur de clic.`,
      () => {
        try {
          const doc = new jsPDF() as any;
      
      // School Header Branding
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(6, 95, 70); // Emerald 800
      doc.text(dbConfig?.schoolName?.toUpperCase() || "INSTITUTION HÉRITAGE DIVIN", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Établissement Scolaire Maternelle & Primaire d'Excellence", 14, 25);
      doc.text(`Courriel : heritierulrich9@gmail.com | Tél : ${dbConfig?.phone || "+225 0102030405"}`, 14, 30);
      doc.text(`Date d'export : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 35);
      
      // Horizontal Line Divider
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 38, 196, 38);
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("REGISTRE & BASE DE DONNÉES DES ÉLÈVES", 14, 46);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre d'élèves listés : ${students.length}`, 14, 51);

      const headers = [
        ["ID", "Nom & Prénom(s)", "Classe", "Sexe", "Parent Tuteur", "Téléphone", "Statut", "Scolarité Payée"]
      ];

      const rows = students.map(s => [
        s.id,
        `${s.lastName} ${s.firstName}`,
        s.className,
        s.gender === "Male" || s.gender === "M" ? "M" : s.gender === "Female" || s.gender === "F" ? "F" : s.gender,
        s.parentName,
        s.parentPhone,
        s.status === "Approved" ? "Approuvé" : s.status === "Pending" ? "En attente" : s.status,
        `${s.tuitionPaid.toLocaleString()} FCFA`
      ]);

      autoTable(doc, {
        startY: 56,
        head: headers,
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 35 },
          2: { cellWidth: 15 },
          3: { cellWidth: 10 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 },
          7: { cellWidth: 30 }
        }
      });

          doc.save(`base_donnees_eleves_${new Date().toISOString().split('T')[0]}.pdf`);
          notify("La base de données des élèves a été exportée au format PDF.");
        } catch (err) {
          console.error(err);
          notify("Erreur lors de la génération du fichier PDF.", "error");
        }
      }
    );
  };

  const exportReceiptsToPDF = () => {
    confirmExport(
      "Exporter le Registre des Reçus ?",
      `Vous êtes sur le point de générer le journal de caisse complet contenant l'ensemble des reçus de paiements enregistrés (${payments.length} règlements). Souhaitez-vous continuer l'export de ce fichier volumineux ?`,
      () => {
        try {
          const doc = new jsPDF() as any;
      
      // School Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(6, 95, 70);
      doc.text(dbConfig?.schoolName?.toUpperCase() || "INSTITUTION HÉRITAGE DIVIN", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Journal général des règlements & Trésorerie d'établissement", 14, 25);
      doc.text(`Courriel : heritierulrich9@gmail.com | Tél : ${dbConfig?.phone || "+225 0102030405"}`, 14, 30);
      doc.text(`Document généré le : ${new Date().toLocaleString("fr-FR")}`, 14, 35);
      
      // Horizontal Line Divider
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 38, 196, 38);
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("REGISTRE GÉNÉRAL DE CAISSE (REÇUS DE PAIEMENTS)", 14, 46);
      
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de transactions : ${payments.length} payements | Recettes cumulées : ${totalRevenue.toLocaleString()} FCFA`, 14, 51);

      const headers = [
        ["Identifiant", "Bénéficiaire", "Classe", "Allocation de frais", "Mode", "Transaction ID", "Date", "Somme"]
      ];

      const rows = payments.map(p => [
        p.id,
        p.studentName,
        p.studentClass,
        p.purpose,
        p.paymentMethod,
        p.transactionId,
        new Date(p.date).toLocaleDateString("fr-FR"),
        `${p.amount.toLocaleString()} FCFA`
      ]);

      autoTable(doc, {
        startY: 56,
        head: headers,
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 32 },
          2: { cellWidth: 12 },
          3: { cellWidth: 42 },
          4: { cellWidth: 23 },
          5: { cellWidth: 23 },
          6: { cellWidth: 18 },
          7: { cellWidth: 21 }
        }
      });

      const finalY = doc.lastAutoTable?.finalY || 100;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(6, 95, 70);
      doc.text(`TOTAL BRUT HISTORIQUE DES RECETTES : ${totalRevenue.toLocaleString()} FCFA`, 14, finalY + 12);

          doc.save(`journal_recus_paiements_${new Date().toISOString().split('T')[0]}.pdf`);
          notify("Le registre général des reçus de caisse a été exporté en PDF.");
        } catch (err) {
          console.error(err);
          notify("Erreur lors de la génération du PDF.", "error");
        }
      }
    );
  };

  const exportMonthlyBalanceToPDF = () => {
    const currentYear = new Date().getFullYear();
    confirmExport(
      "Exporter le Bilan Mensuel ?",
      `Vous êtes sur le point d'exporter le bilan analytique financier mensuel de l'exercice comptable en cours (${currentYear}). Souhaitez-vous continuer ?`,
      () => {
        try {
          const doc = new jsPDF() as any;
      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
      ];
      
      const monthlyTotals: { [monthIdx: number]: { count: number, total: number } } = {};
      for (let i = 0; i < 12; i++) {
        monthlyTotals[i] = { count: 0, total: 0 };
      }

      payments.forEach(p => {
        const pDate = new Date(p.date);
        if (pDate.getFullYear() === currentYear) {
          const monthIdx = pDate.getMonth();
          monthlyTotals[monthIdx].count += 1;
          monthlyTotals[monthIdx].total += p.amount;
        }
      });

      // School branding
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(6, 95, 70);
      doc.text(dbConfig?.schoolName?.toUpperCase() || "INSTITUTION HÉRITAGE DIVIN", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Rapport financier analytique - Exercice comptable ${currentYear}`, 14, 25);
      doc.text(`Courriel : heritierulrich9@gmail.com | Date Edition : ${new Date().toLocaleString("fr-FR")}`, 14, 30);
      
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 34, 196, 34);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(`BILAN FINANCIER MENSUEL - SERVICE COMPTABILITÉ (${currentYear})`, 14, 42);

      const headers = [
        ["Mois de l'Année", "Exercice de Caisse", "Nombre d'Encaissements", "Recettes Totales du Mois"]
      ];

      const rows = monthNames.map((name, idx) => [
        name,
        currentYear.toString(),
        monthlyTotals[idx].count.toString(),
        `${monthlyTotals[idx].total.toLocaleString()} FCFA`
      ]);

      const totalCount = Object.values(monthlyTotals).reduce((sum, m) => sum + m.count, 0);
      const totalSum = Object.values(monthlyTotals).reduce((sum, m) => sum + m.total, 0);
      
      rows.push([
        "CUMUL SUR L'EXERCICE ANNUEL",
        currentYear.toString(),
        totalCount.toString(),
        `${totalSum.toLocaleString()} FCFA`
      ]);

      autoTable(doc, {
        startY: 48,
        head: headers,
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255], fontStyle: "bold" }, // slate cyan
        styles: { fontSize: 9, cellPadding: 3.5 },
        didParseCell: (data: any) => {
          if (data.row.index === 12) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      });

          doc.save(`bilan_mensuel_paiements_${currentYear}.pdf`);
          notify(`Le rapport mensuel PDF de l'année ${currentYear} a été exporté.`);
        } catch (err) {
          console.error(err);
          notify("Erreur lors de la génération du bilan mensuel PDF.", "error");
        }
      }
    );
  };

  const exportAnnualBalanceToPDF = () => {
    confirmExport(
      "Exporter le Bilan Annuel ?",
      "Vous êtes sur le point de générer le rapport comptable consolidé annuel de tous les exercices financiers enregistrés de l'établissement. Souhaitez-vous continuer l'export ?",
      () => {
        try {
          const doc = new jsPDF() as any;
      const yearlyTotals: { [year: number]: { count: number, total: number } } = {};

      payments.forEach(p => {
        const year = new Date(p.date).getFullYear();
        if (!yearlyTotals[year]) {
          yearlyTotals[year] = { count: 0, total: 0 };
        }
        yearlyTotals[year].count += 1;
        yearlyTotals[year].total += p.amount;
      });

      // Header branding
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(6, 95, 70);
      doc.text(dbConfig?.schoolName?.toUpperCase() || "INSTITUTION HÉRITAGE DIVIN", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Rapport financier pluri-annuel des caisses scolaires`, 14, 25);
      doc.text(`Administrateur : heritierulrich9@gmail.com | Date : ${new Date().toLocaleString("fr-FR")}`, 14, 30);
      
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 34, 196, 34);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("BILAN CONSOLIDÉ ANNUEL GLOBAL DES EXERCICES", 14, 42);

      const headers = [
        ["Exercice Annuel de Facturation", "Nombre Total de Transactions", "Recettes Globales Encaissées"]
      ];

      const sortedYears = Object.keys(yearlyTotals).map(Number).sort((a, b) => a - b);
      const rows = sortedYears.map(year => [
        `Année Comptable ${year}`,
        yearlyTotals[year].count.toString(),
        `${yearlyTotals[year].total.toLocaleString()} FCFA`
      ]);

      const totalTransactions = sortedYears.reduce((sum, yr) => sum + yearlyTotals[yr].count, 0);
      const totalVolume = sortedYears.reduce((sum, yr) => sum + yearlyTotals[yr].total, 0);

      rows.push([
        "CUMUL DE TOUTES LES COMPAGNIES",
        totalTransactions.toString(),
        `${totalVolume.toLocaleString()} FCFA`
      ]);

      autoTable(doc, {
        startY: 48,
        head: headers,
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 4.5 },
        didParseCell: (data: any) => {
          if (data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      });

          doc.save("bilan_annuel_global_paiements.pdf");
          notify("Le bilan annuel certifié a été exporté sous format PDF.");
        } catch (err) {
          console.error(err);
          notify("Erreur lors de la génération du bilan annuel PDF.", "error");
        }
      }
    );
  };

  // ADMIN OPERATIONS
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername || undefined,
          password: adminPassword
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("heritage_current_user", JSON.stringify(data.user));
        notify(`Bienvenue, ${data.user.fullName} !`);
        setAdminUsername("");
        setAdminPassword("");
      } else {
        notify(data.error || "Identifiant ou mot de passe incorrect.", "error");
      }
    } catch (err) {
      notify("Une erreur est survenue lors de la connexion.", "error");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUserList(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const allTabs = [
        { id: "students", role: "secretaire" },
        { id: "news", role: "educateur" },
        { id: "notes", role: "educateur" },
        { id: "events", role: "educateur" },
        { id: "messages", role: "secretaire" },
        { id: "payments", role: "secretaire" },
        { id: "config", role: "admin" },
        { id: "users", role: "admin" }
      ];
      const allowed = allTabs.filter(t => t.role === currentUser.role || currentUser.role === "admin");
      if (allowed.length > 0 && !allowed.some(t => t.id === adminTab)) {
        setAdminTab(allowed[0].id as any);
      }
    }
  }, [currentUser]);

  // Manage administrative users
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.username || !editingUser.password || !editingUser.fullName || !editingUser.role) {
      notify("Tous les champs sont obligatoires.", "error");
      return;
    }
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        notify(editingUser.id ? "Compte de l’utilisateur mis à jour !" : "Nouveau compte créé avec succès !");
        setUserList(data.users);
        setEditingUser({ username: "", password: "", fullName: "", role: "secretaire" });
      } else {
        notify(data.error || "Erreur de sauvegarde de l'utilisateur.", "error");
      }
    } catch (err) {
      notify("Erreur lors de la communication serveur.", "error");
    }
  };

  const handleUserDelete = async (id: string) => {
    if (id === currentUser?.id) {
      notify("Vous ne pouvez pas supprimer votre propre compte en cours d'utilisation.", "error");
      return;
    }
    if (!confirm("Voulez-vous supprimer ce compte ? Il perdra immédiatement ses accès.")) return;
    try {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (response.ok && data.success) {
        setUserList(data.users);
        notify("Compte supprimé définitivement.");
      } else {
        notify(data.error || "Erreur de suppression.", "error");
      }
    } catch (err) {
      notify("Erreur serveur lors de la suppression.", "error");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.period || newReport.totalIncome === undefined) {
      notify("Veuillez remplir correctement les informations.", "error");
      return;
    }
    const payload = {
      ...newReport,
      netBalance: Number(newReport.totalIncome) - Number(newReport.totalExpense),
      recordedBy: currentUser ? currentUser.fullName : "Agent de Caisse",
    };
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        notify("Bilan de clôture de caisse enregistré avec succès !");
        setReports(data.reports);
        setNewReport({
          year: "2025/2026",
          type: "mensuel",
          period: "Juin 2026",
          totalIncome: 0,
          totalExpense: 0,
          comments: ""
        });
      } else {
        notify(data.error || "Erreur lors de la sauvegarde du bilan.", "error");
      }
    } catch {
      notify("Une erreur est survenue lors de l'enregistrement.", "error");
    }
  };

  const handleReportDelete = async (id: string) => {
    if (!confirm("Voulez-vous supprimer définitivement ce rapport de caisse officiel ?")) return;
    try {
      const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (response.ok && data.success) {
        setReports(data.reports);
        notify("Rapport de caisse supprimé.");
      } else {
        notify(data.error || "Erreur de suppression.", "error");
      }
    } catch {
      notify("Une erreur est de communication serveur.", "error");
    }
  };


  // Admin Update Home Config
  const handleConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbConfig) return;
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig)
      });
      const data = await response.json();
      if (data.success) {
        notify("La page d'accueil et les configurations globales ont été mises à jour !");
        setDbConfig(data.config);
      }
    } catch (err) {
      notify("Erreur lors de la sauvegarde.", "error");
    }
  };

  // Admin Add / Update News
  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews.title || !editingNews.content) {
      notify("Le titre et le contenu de l'actualité sont requis.", "error");
      return;
    }
    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingNews)
      });
      const data = await response.json();
      if (data.success) {
        notify("Actualité enregistrée avec succès !");
        setNews(data.news);
        setEditingNews({ title: "", content: "", category: "annonce", imageUrl: "" });
      }
    } catch (err) {
      notify("Erreur lors de la publication de l'actualité.", "error");
    }
  };

  // Delete News
  const handleNewsDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet article d'actualité ?")) return;
    try {
      const response = await fetch(`/api/news/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        notify("L'article d'actualité a été retiré.");
        setNews(data.news);
      }
    } catch (err) {
      notify("Erreur lors du retrait de l'article.", "error");
    }
  };

  // Admin Add / Update note d'information
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote.title || !editingNote.content) {
      notify("Titre et contenu obligatoires.", "error");
      return;
    }
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingNote)
      });
      const data = await response.json();
      if (data.success) {
        notify("Note d'information publiée avec succès pour les parents !");
        setNotes(data.notes);
        setEditingNote({ title: "", content: "", targetAudience: "Tous les parents", critical: false });
      }
    } catch (err) {
      notify("Erreur lors du traitement de la note.", "error");
    }
  };

  // Delete note
  const handleNoteDelete = async (id: string) => {
    if (!confirm("Désirez-vous retirer cette note d'information parentale ?")) return;
    try {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setNotes(data.notes);
        notify("Note d'information supprimée de la liste.");
      }
    } catch (err) {
      notify("Erreur lors de la suppression.", "error");
    }
  };

  // Admin Add / Update school event
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent.title || !editingEvent.date || !editingEvent.category || !editingEvent.description) {
      notify("Veuillez remplir tous les champs obligatoires (titre, date, categorie, description).", "error");
      return;
    }
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEvent)
      });
      const data = await response.json();
      if (data.success) {
        notify(editingEvent.id ? "Événement scolaire mis à jour avec succès !" : "Nouvel événement ajouté avec succès au calendrier !");
        setEvents(data.events);
        setEditingEvent({ title: "", date: "", time: "", category: "examens", description: "", location: "" });
      } else {
        notify(data.error || "Une erreur est survenue lors de l'enregistrement.", "error");
      }
    } catch (err) {
      notify("Erreur serveur lors de la sauvegarde de l'événement.", "error");
    }
  };

  // Delete school event
  const handleEventDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement du calendrier pédagogique ?")) return;
    try {
      const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
        notify("Événement scolaire retiré avec succès.");
      } else {
        notify(data.error || "Erreur de suppression.", "error");
      }
    } catch (err) {
      notify("Erreur de communication lors de la suppression.", "error");
    }
  };

  // Toggle student list sorting fields
  const handleStudentSort = (field: "name" | "class" | "status" | "tuition") => {
    if (studentSortField === field) {
      setStudentSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setStudentSortField(field);
      setStudentSortDirection("asc");
    }
  };

  // Admin Student Decision Update (Approuvé, Rejeté, Edit tuition)
  const handleStudentStatusUpdate = async (studentId: string, status: "approuvé" | "rejeté", paymentStatus?: "payé" | "partiel" | "non_payé", extraTuition?: number) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const reqData = {
      ...student,
      status,
      ...(paymentStatus && { paymentStatus }),
      ...(extraTuition !== undefined && { tuitionPaid: Number(extraTuition) })
    };

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqData)
      });
      const data = await response.json();
      if (data.success) {
        notify(`Statut de l'élève ${student.firstName} mis à jour.`);
        setStudents(data.students);
      }
    } catch (err) {
      notify("Erreur de modification de la fiche élève.", "error");
    }
  };

  // Submit new photo to gallery
  const [newPhotoForm, setNewPhotoForm] = useState({
    title: "",
    category: "fetes",
    year: "2025-2026",
    url: ""
  });

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoForm.title || !newPhotoForm.url || !newPhotoForm.year || !newPhotoForm.category) {
      notify("Veuillez remplir tous les champs de l'image.", "error");
      return;
    }

    try {
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPhotoForm)
      });
      const data = await response.json();
      if (data.success) {
        setGalleryPhotos(data.gallery);
        notify("L'image a été ajoutée à la galerie avec succès !");
        setNewPhotoForm({
          title: "",
          category: "fetes",
          year: "2025-2026",
          url: ""
        });
      } else {
        notify(data.error || "Une erreur est survenue.", "error");
      }
    } catch (err) {
      notify("Échec de l'ajout de l'image.", "error");
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette image de la galerie ?")) return;
    try {
      const response = await fetch(`/api/gallery/${id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        setGalleryPhotos(data.gallery);
        notify("L'image a été retirée de la galerie.");
      } else {
        notify(data.error || "Une erreur est survenue.", "error");
      }
    } catch (err) {
      notify("Échec de la suppression de l'image.", "error");
    }
  };

  const filteredGallery = galleryPhotos.filter(img => {
    const matchesCategory = galleryCategory === "all" || img.category === galleryCategory;
    const matchesYear = galleryYear === "all" || img.year === galleryYear;
    return matchesCategory && matchesYear;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-all selection:bg-emerald-200">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div 
          onClick={() => setNotification(null)}
          className={`fixed border bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md animate-bounce cursor-pointer ${
            notification.type === "success" 
              ? "bg-emerald-900 border-emerald-700 text-emerald-100" 
              : "bg-rose-950 border-rose-800 text-rose-100"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <div className="text-sm font-semibold">{notification.text}</div>
        </div>
      )}

      {/* PDF Export Confirmation Modal */}
      {exportConfirm?.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-lg w-full scale-100 transform transition-all duration-300 relative overflow-hidden flex flex-col gap-6">
            
            {/* Top accent visual bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-600" />
            
            <div className="flex items-start gap-4">
              <div className="bg-amber-50 border border-amber-200/60 p-3.5 rounded-2xl shrink-0 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {exportConfirm.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  {exportConfirm.description}
                </p>
              </div>
            </div>

            {/* Custom info container showing safety recommendations */}
            <div className="bg-blue-50/50 border border-blue-100/60 rounded-2xl p-4 flex gap-3 items-start">
              <Download className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-950/80 leading-relaxed font-bold">
                Le document généré sera au format <span className="font-extrabold text-blue-800">PDF standard d'impression certifié</span>. 
                Veuillez ne pas fermer votre navigateur ou actualiser la page pendant le traitement de vos fichiers comptables.
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setExportConfirm(null)}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded-xl font-bold text-xs cursor-pointer text-center"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  exportConfirm.onConfirm();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-800 to-emerald-700 text-white rounded-xl font-bold text-xs hover:from-blue-900 hover:to-emerald-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 hover:scale-[1.01]"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Confirmer & exporter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global broadcast banner */}
      {dbConfig?.showBanner && dbConfig?.bannerMessage && (
        <div id="school_broadcast_banner" className="bg-gradient-to-r from-amber-500 to-rose-600 text-white text-xs sm:text-sm font-semibold py-3 px-4 text-center shadow-inner relative flex justify-center items-center gap-2">
          <span>{dbConfig.bannerMessage}</span>
          <button 
            onClick={() => setDbConfig({ ...dbConfig, showBanner: false })}
            className="text-white hover:text-amber-100 font-bold ml-2 text-base leading-none p-1 shrink-0"
            title="Masquer l'alerte"
          >
            ×
          </button>
        </div>
      )}

      {/* Navbar Integration */}
      <Navbar 
        currentView={currentView} 
        setView={setView} 
        schoolName={dbConfig?.schoolName || "Héritage Divin"} 
        phone={dbConfig?.phone || "Non configuré"} 
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Primary views orchestrator */}
      <main className="flex-grow">
        
        {/* HOMEPAGE VIEW */}
        {currentView === "home" && (
          <div className="space-y-16 pb-20">
            
            {/* Elegant Hero / Showcase Banner */}
            <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/20 via-amber-50/15 to-emerald-50/15 w-full py-12 md:py-24 border-b border-blue-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-950">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    Établissement Privé d'Excellence Académique
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {dbConfig?.homeTitle}
                  </h2>
                  
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">
                    {dbConfig?.homeSubtitle}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <button 
                      onClick={() => setView("register")}
                      className="px-6 py-3.5 bg-blue-800 text-white text-sm font-bold rounded-2xl hover:bg-blue-900 hover:scale-[1.02] transition-all shadow-lg shadow-blue-900/15 flex items-center gap-2"
                    >
                      <ClipboardCheck className="w-5 h-5 text-amber-300" /> Enregistrer un élève
                    </button>
                    <button 
                      onClick={() => {
                        const notesSection = document.getElementById("notes");
                        notesSection?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-6 py-3.5 bg-white border border-gray-200 text-slate-800 text-sm font-semibold rounded-2xl hover:bg-amber-50/50 hover:border-amber-200 transition-all"
                    >
                      Voir les notes de service ↓
                    </button>
                  </div>

                  {/* Trust markers (Tricolor Integration) */}
                  <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-150 max-w-lg">
                    <div>
                      <div className="text-2xl font-black text-emerald-800">Maternelle</div>
                      <div className="text-xs text-slate-500 font-semibold">TPS à Grande Section</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-amber-600">Primaire</div>
                      <div className="text-xs text-slate-500 font-semibold">du CP au CM2</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-blue-800">Collège</div>
                      <div className="text-xs text-slate-500 font-semibold">6<sup>ème</sup> et 5<sup>ème</sup></div>
                    </div>
                  </div>
                </div>

                {/* Right Visual Image */}
                <div className="lg:col-span-5 relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-amber-400 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-all duration-1000"></div>
                  <div className="relative bg-white p-4 rounded-3xl border border-gray-100 shadow-xl">
                    <img 
                      src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800" 
                      alt="École Héritage Divin" 
                      className="rounded-2xl w-full object-cover aspect-[4/3]"
                    />
                    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-900 to-blue-900 text-white rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">Inscriptions en ligne</div>
                        <div className="text-sm font-bold">Session Académique 2026-2027</div>
                      </div>
                      <span className="text-xs bg-blue-800/80 text-amber-100 font-extrabold py-1 px-2.5 rounded-full border border-amber-300/30 animate-pulse">
                        Ouverte
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* Welcome & Presentation Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-750 font-mono">Qui sommes nous</span>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2 mb-6">
                  Mot de Bienvenue de la Direction Générale
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {dbConfig?.welcomeMessage}
                </p>
                <div className="bg-amber-50/50 border-l-4 border-amber-500 p-4 rounded-r-2xl">
                  <p className="text-xs font-bold text-amber-950 uppercase font-mono">Proverbe & Règle d'or</p>
                  <p className="text-sm italic text-amber-805 mt-1">
                    "Instruis l'enfant selon la voie qu'il doit suivre; et quand il sera vieux, il ne s'en détournera pas."
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
                <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="text-blue-700 w-6 h-6" /> Notre Engagement Historique
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {dbConfig?.historyText}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/60">
                    <span className="block text-2xl font-black text-emerald-800">50K FCFA</span>
                    <span className="text-xs text-slate-500 font-bold">Frais d'inscription annuel</span>
                  </div>
                  <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-105/60">
                    <span className="block text-2xl font-black text-blue-800">35K FCFA</span>
                    <span className="text-xs text-slate-500 font-bold font-mono">Scolarité mensuelle standard</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tabbed content list: ACTUALITÉS (News) */}
            <section id="news" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 mb-2">
                    <Bell className="w-3.5 h-3.5" /> Vie de l'École
                  </span>
                  <h3 className="text-3xl font-bold text-slate-950">Les Actualités & Événements</h3>
                  <p className="text-sm text-slate-500 mt-1">Suivez les réalisations artistiques, cérémonies d'excellence et annonces phares de notre académie.</p>
                </div>
                <button 
                  onClick={() => setView("register")}
                  className="mt-4 md:mt-0 text-semibold text-blue-850 hover:text-blue-950 font-bold flex items-center gap-1 text-sm group"
                >
                  Inscrire mon enfant en ligne <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {news.length === 0 ? (
                  <div className="col-span-full text-center py-10 bg-white border rounded-2xl">
                    <p className="text-gray-500">Aucune actualité n'a encore été publiée sur le tableau d'affichage.</p>
                  </div>
                ) : (
                  news.map((item) => (
                    <article key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        <img 
                          src={item.imageUrl || "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800"} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 bg-white text-emerald-900 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                          {item.category}
                        </span>
                      </div>
                      <div className="p-5 space-y-3">
                        <span className="text-xs text-gray-400 font-mono block">{item.date}</span>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            {/* NOTES D'INFORMATION (Alerts & Regulations) */}
            <section id="notes" className="bg-gradient-to-br from-blue-950 via-slate-900 to-emerald-950 text-white py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-10 text-center md:text-left">
                  <span className="text-xs font-bold tracking-widest uppercase text-amber-305 font-mono">Consignes administratives</span>
                  <h3 className="text-3xl font-bold mt-1">Notes d'Information Parentale</h3>
                  <p className="text-sm text-blue-100 mt-2">Retrouvez ici toutes les directives indispensables, consignes de sécurité et notes administratives officielles de l'établissement.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {notes.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-blue-950/40 rounded-3xl border border-blue-900/50">
                      <p className="text-blue-200">Aucune note de service active pour le moment.</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div 
                        key={note.id}
                        className={`p-6 rounded-3xl border transition-all ${
                          note.critical 
                            ? "bg-gradient-to-br from-rose-950 to-blue-950 border-rose-800/40 shadow-rose-950/10" 
                            : "bg-blue-900/30 border-blue-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase font-mono ${
                            note.critical ? "bg-rose-500 text-white" : "bg-emerald-850 text-emerald-100"
                          }`}>
                            {note.critical ? "🔴 Urgent / Obligatoire" : "Note Standard"}
                          </span>
                          <span className="text-xs text-amber-300 font-bold font-mono">{note.date}</span>
                        </div>

                        <h4 className="text-lg font-bold mb-2 flex items-center gap-2 text-amber-100">
                          {note.title}
                        </h4>
                        
                        <p className="text-sm text-blue-100/90 leading-relaxed mb-4">
                          {note.content}
                        </p>

                        <div className="pt-3 border-t border-blue-800/30 flex items-center justify-between text-xs font-medium text-blue-300">
                          <span>Public ciblé : <strong className="text-amber-100">{note.targetAudience}</strong></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* DYNAMIC PHOTO GALLERY */}
            <section id="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-950 mb-2 font-mono">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" /> Galerie Photo Dynamique
                </span>
                <h3 className="text-3xl font-bold text-slate-900">La Vie à l'École en Images</h3>
                <p className="text-sm text-slate-500 mt-2">Plongez dans les souvenirs d'apprentissage et les célébrations uniques de nos écoliers.</p>
                
                {/* Category Filters */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {[
                    { val: "all", label: "Tous Types" },
                    { val: "activites", label: "Activités Académiques" },
                    { val: "fetes", label: "Fêtes & Célébrations" },
                    { val: "infrastructure", label: "Nos Locaux & Salles" }
                  ].map((filter) => (
                    <button
                      key={filter.val}
                      onClick={() => setGalleryCategory(filter.val)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        galleryCategory === filter.val
                          ? "bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]"
                          : "bg-white border border-slate-100 text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-850 hover:border-emerald-200"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Album Years Selection with Folder/Calendar Icons */}
              <div className="mb-10 text-center">
                <span className="inline-block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 bg-slate-100 px-3 py-1 rounded-full font-mono">
                  📁 Sélectionner un Album par Année Scolaire
                </span>
                
                <div className="flex flex-wrap justify-center gap-2 max-w-5xl mx-auto p-1.5 bg-slate-55 rounded-3xl border border-slate-100">
                  <button
                    onClick={() => setGalleryYear("all")}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      galleryYear === "all"
                        ? "bg-blue-800 border-blue-850 text-white shadow-md shadow-blue-500/20"
                        : "bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>🌍 Tous les Albums</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-mono">
                      {galleryPhotos.length}
                    </span>
                  </button>
                  
                  {[
                    "2024-2025",
                    "2025-2026",
                    "2026-2027"
                  ].map((yr) => {
                    const count = galleryPhotos.filter(p => p.year === yr).length;
                    const isCurrent = yr === "2025-2026";
                    return (
                      <button
                        key={yr}
                        onClick={() => setGalleryYear(yr)}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          galleryYear === yr
                            ? "bg-blue-850 border-blue-900 text-white shadow-md shadow-blue-500/20 scale-[1.02]"
                            : "bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>📂 Album {yr}</span>
                        {isCurrent && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-amber-400 text-amber-950 px-1 rounded font-mono">Actuel</span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-mono">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGallery.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-300 animate-pulse mb-2" />
                    <p className="font-bold text-xs text-slate-600">Aucun souvenir photo dans cette sélection</p>
                    <p className="text-[10px] text-slate-400 font-normal">Modifiez les filtres ci-dessus pour afficher d'autres photos de l'école.</p>
                  </div>
                ) : (
                  filteredGallery.map((img, index) => (
                    <div 
                      key={img.id || index} 
                      onClick={() => setSelectedPhoto(img)}
                      className="group relative rounded-3xl overflow-hidden aspect-video bg-slate-100 border border-slate-100 shadow-sm cursor-zoom-in"
                    >
                      <img 
                        src={img.url} 
                        alt={img.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          <span className="text-emerald-400 text-[9px] font-black uppercase tracking-wider font-mono bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-lg">
                            {img.category === "activites" ? "📝 Activité" : img.category === "fetes" ? "🎉 Fête" : "🏫 Locaux"}
                          </span>
                          <span className="text-amber-400 text-[9px] font-black uppercase tracking-wider font-mono bg-amber-950/80 border border-amber-800/40 px-2 py-0.5 rounded-lg">
                            🎓 Année {img.year}
                          </span>
                        </div>
                        <h4 className="text-white text-xs sm:text-sm font-black leading-snug">
                          {img.title}
                        </h4>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* PEDAGOGICAL CALENDAR (Imported component) */}
            <section id="calendar" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CalendarSection events={events} />
            </section>

            {/* DIRECT MAILING & CONTACT FORM */}
            <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-3xl p-8 md:p-12 text-white grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                <div className="lg:col-span-5 space-y-6">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">Boîte de dialogue direct</span>
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    Contactez le Secrétariat
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Vous souhaitez obtenir un rendez-vous d'orientation, demander les modalites financières, ou transmettre un justificatif d'absence ? Envoyez votre message directement via ce formulaire. 
                  </p>
                  
                  <div className="space-y-4 pt-4 text-xs font-medium text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-900 p-2 rounded-lg text-emerald-300">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Téléphone Secrétariat</div>
                        <div className="text-sm font-bold text-white">{dbConfig?.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-900 p-2 rounded-lg text-emerald-300">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Adresse Courriel Administrative</div>
                        <div className="text-sm font-bold text-white">heritierulrich9@gmail.com</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-950/60 rounded-2xl border border-emerald-800/40 text-xs leading-relaxed text-emerald-300">
                    ℹ️ Les messages de ce formulaire sont transmis informatiquement et directement enregistrés avec suivi d'accusé de réception sur l'espace d'administration.
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl text-slate-800 shadow-xl border border-white/10">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Mail className="text-emerald-800 w-5 h-5" /> Formulaire de Correspondance Parentale
                  </h4>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Votre nom complet *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="M. ou Mme Koffi"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Adresse Email *</label>
                        <input 
                          type="email" 
                          required
                          placeholder="adresse@parent.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Sujet du Message *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex : Demande d'inscription / Absence de mon enfant"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Votre Message *</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Rédigez l'ensemble de votre demande ici de façon explicite..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 placeholder:text-gray-300"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSending}
                      className="w-full py-3 bg-emerald-800 hover:bg-emerald-950 active:scale-95 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/10"
                    >
                      {contactSending ? (
                        <>Envoi en cours...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Envoyer directement à heritierulrich9@gmail.com
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>
            </section>

          </div>
        )}


        {/* PORTAL INSCRIPTIONS / REINSCRIPTIONS EN LIGNE */}
        {currentView === "register" && (
          <section className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-10 shadow-sm space-y-8">
              
              <div className="text-center space-y-2 border-b border-gray-100 pb-6">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-widest bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full">
                  Fiches Numériques d'Apprentissage
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900">
                  Inscription & Réinscription Directe En Ligne
                </h2>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                  Enregistrez officiellement le profil académique de votre enfant pour la session scolaire 2026-2027. Notre secrétariat étudiera le dossier sous 48h.
                </p>
              </div>

              {/* Form container */}
              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                
                {/* Academic nature choices */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-xl border border-slate-200/60 font-semibold select-none">
                    <input 
                      type="radio" 
                      name="registrationType" 
                      value="inscription"
                      checked={registerForm.registrationType === "inscription"}
                      onChange={() => setRegisterForm({ ...registerForm, registrationType: "inscription" })}
                      className="text-blue-800 focus:ring-blue-800"
                    />
                    <div>
                      <span className="block text-sm">Première Inscription</span>
                      <span className="text-[10px] text-slate-400 font-normal">Nouvel écolier de l'école</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-xl border border-slate-200/60 font-semibold select-none">
                    <input 
                      type="radio" 
                      name="registrationType" 
                      value="reinscription"
                      checked={registerForm.registrationType === "reinscription"}
                      onChange={() => setRegisterForm({ ...registerForm, registrationType: "reinscription" })}
                      className="text-blue-800 focus:ring-blue-805"
                    />
                    <div>
                      <span className="block text-sm">Réinscription Annuelle</span>
                      <span className="text-[10px] text-slate-400 font-normal">Déjà scolarisé l'année précédente</span>
                    </div>
                  </label>
                </div>

                {/* Patient Student Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-300"></span> Identité de l'Écolier / l'Élève
                  </h3>

                  {/* Photo de profil numérique de l'élève */}
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Photo d'identité numérique
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center overflow-hidden">
                      {/* Photo preview */}
                      <div className="relative w-28 h-28 bg-slate-200 hover:bg-slate-300 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center overflow-hidden group/photo shrink-0">
                        {registerForm.photoUrl ? (
                          <>
                            <img 
                              src={registerForm.photoUrl} 
                              alt="Aperçu élève" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setRegisterForm(prev => ({ ...prev, photoUrl: "" }))}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                            >
                              Supprimer
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-2 text-slate-500">
                            <span className="text-[10px] block font-semibold leading-tight text-slate-500">Aucune photo</span>
                            <span className="text-[9px] block text-slate-400">optionnelle</span>
                          </div>
                        )}
                      </div>

                      {/* Drag & drop dropzone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(true);
                        }}
                        onDragLeave={() => setIsDraggingPhoto(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handlePhotoFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => {
                          const fileInput = document.getElementById("student-photo-input");
                          if (fileInput) fileInput.click();
                        }}
                        className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col justify-center items-center ${
                          isDraggingPhoto 
                            ? "border-emerald-500 bg-emerald-50/40" 
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 bg-white"
                        }`}
                      >
                        <input
                          id="student-photo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handlePhotoFile(e.target.files[0]);
                            }
                          }}
                        />
                        <div className="text-emerald-800 text-xs font-bold mb-1">
                          {registerForm.photoUrl ? "Changer de photo" : "Choisir ou déposer une photo"}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Glissez-déposez la photo ici, ou cliquez pour parcourir.
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1">
                          PNG, JPG, WEBP • Optimisation automatique (&lt; 30KB)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nom de l'enfant *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex : KOUASSI"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Prénom(s) de l'enfant *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex : Jean-Marie"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date de naissance *</label>
                      <input 
                        type="date" 
                        required
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Genre *</label>
                      <select 
                        required
                        value={registerForm.gender}
                        onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value as "M" | "F" })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      >
                        <option value="M">Garçon (M)</option>
                        <option value="F">Fille (F)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-850 uppercase mb-1.5 font-semibold">Classe Demandée *</label>
                      <select 
                        required
                        value={registerForm.className}
                        onChange={(e) => setRegisterForm({ ...registerForm, className: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/20 text-emerald-950 font-semibold text-sm"
                      >
                        {SCHOOL_CLASSES.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional tracking info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Établissement ou crèche de provenance</label>
                    <input 
                      type="text" 
                      placeholder="Ex : Collège Notre Dame (laisser vide si néant)"
                      value={registerForm.previousSchool}
                      onChange={(e) => setRegisterForm({ ...registerForm, previousSchool: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Informations médicales et allergies</label>
                    <input 
                      type="text" 
                      placeholder="Ex : Asthme, allergie lactose / néant"
                      value={registerForm.medicalInfo}
                      onChange={(e) => setRegisterForm({ ...registerForm, medicalInfo: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                {/* Legal Guardian Particulars */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-300"></span> Coordonnées du Parent tuteur légal
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nom & Prénom du parent *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex : Jean-Claude KOUASSI"
                        value={registerForm.parentName}
                        onChange={(e) => setRegisterForm({ ...registerForm, parentName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Numéro de téléphone portable *</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Ex : +225 07 45 88 11 00"
                        value={registerForm.parentPhone}
                        onChange={(e) => setRegisterForm({ ...registerForm, parentPhone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Courriel parent (pour le suivi)</label>
                      <input 
                        type="email" 
                        placeholder="parent@exemple.com"
                        value={registerForm.parentEmail}
                        onChange={(e) => setRegisterForm({ ...registerForm, parentEmail: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Submitting buttons */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-gradient-to-r from-blue-800 to-emerald-700 hover:from-blue-900 hover:to-emerald-800 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15 text-white scale-[1.01] hover:scale-[1.02]"
                  >
                    <UserPlus className="w-5 h-5 text-amber-300 animate-pulse" /> Confirmer l'inscription & passer à l'étape suivante
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Voulez-vous abandonner la saisie ?")) {
                        setView("home");
                      }
                    }}
                    className="px-6 py-3.5 bg-gray-50 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-gray-100 transition-all border border-gray-200"
                  >
                    Retour à l'accueil
                  </button>
                </div>

              </form>

            </div>
          </section>
        )}


        {/* PORTAL ADMINISTRATION (Portail d'administration de l'école) */}
        {currentView === "admin" && (
          <section className="max-w-7xl mx-auto px-4 py-8">
            
            {/* 1. Login required gate */}
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Portail des Collaborateurs</h3>
                  <p className="text-xs text-slate-500">
                    Saisissez vos identifiants d'établissement pour accéder à votre console de travail personnalisée.
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Identifiant (Nom d'utilisateur)</label>
                    <input
                      type="text"
                      placeholder="Ex : admin, secretaire, educateur"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mot de passe de sécurité</label>
                    <input
                      type="password"
                      required
                      placeholder="Saisissez votre mot de passe"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm tracking-widest text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <div className="text-[10px] text-gray-500 mt-3 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                      <p className="font-bold text-slate-700">Comptes d'accès d'origine :</p>
                      <p>🔑 <strong className="font-bold">Admin</strong> : <code className="bg-white px-1 py-0.5 rounded border">admin</code> / <code className="bg-white px-1 py-0.5 rounded border font-mono">heritage2026_password</code></p>
                      <p>💼 <strong className="font-bold">Secrétariat</strong> : <code className="bg-white px-1 py-0.5 rounded border">secretaire</code> / <code className="bg-white px-1 py-0.5 rounded border">secretaire123</code></p>
                      <p>🎓 <strong className="font-bold">Éducateur</strong> : <code className="bg-white px-1 py-0.5 rounded border">educateur</code> / <code className="bg-white px-1 py-0.5 rounded border">educateur123</code></p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Valider l'authentification
                  </button>
                </form>
              </div>
            ) : (
              
              // 2. Main Admin Dashboard Panel
              <div className="space-y-8">
                
                {/* Admin Header with status */}
                <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                  <div>
                    <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest font-mono">Console de Supervision</span>
                    <h2 className="text-2xl font-black">{dbConfig?.schoolName || "Héritage Divin"}</h2>
                    <p className="text-xs text-emerald-200 mt-1">Connecté en tant que : <strong className="font-extrabold text-[#ffd700]">{currentUser?.fullName}</strong> — Rôle : <span className="underline decoration-dotted">{currentUser?.role === "admin" ? "Super Administrateur" : currentUser?.role === "secretaire" ? "Comptable / Secrétaire" : "Personnel Éducatif"}</span>. Session active.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentUser(null);
                        localStorage.removeItem("heritage_current_user");
                        setView("home");
                        notify("Vous avez été déconnecté de l'administration scolaire.");
                      }}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-xs font-bold rounded-xl text-white transition-all cursor-pointer"
                    >
                      Déconnexion
                    </button>
                    <button
                      onClick={() => setView("home")}
                      className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-xs font-bold rounded-xl text-emerald-100 transition-all border border-emerald-700"
                    >
                      Aller sur le Site public
                    </button>
                  </div>
                </div>

                {/* Sub tabs selectors */}
                <div className="flex flex-wrap border-b border-gray-200 gap-2 pb-2">
                  {[
                    { id: "students", label: "Base Élèves & Inscriptions", count: students.length, icon: Users, roles: ["admin", "secretaire"] },
                    { id: "news", label: "Gestion Actualités", count: news.length, icon: FileText, roles: ["admin", "educateur"] },
                    { id: "notes", label: "Consignes & Notes parentales", count: notes.length, icon: Bell, roles: ["admin", "educateur"] },
                    { id: "events", label: "Calendrier Scolaire", count: events.length, icon: Calendar, roles: ["admin", "educateur"] },
                    { id: "messages", label: "Messages contact", count: messages.length, icon: MessageSquare, roles: ["admin", "secretaire"] },
                    { id: "payments", label: "Registre Journal des Reçus", count: payments.length, icon: DollarSign, roles: ["admin", "secretaire"] },
                    { id: "config", label: "Éditer Accueil (Texte d'accueil)", icon: Settings, roles: ["admin"] },
                    { id: "users", label: "Gestion des Comptes", count: userList.length, icon: UserPlus, roles: ["admin"] },
                    { id: "gallery", label: "Gestion Galerie d'images", count: galleryPhotos.length, icon: ImageIcon, roles: ["admin"] }
                  ].filter(tab => tab.roles.includes(currentUser?.role || "")).map((subT) => {
                    const Icon = subT.icon;
                    return (
                      <button
                        key={subT.id}
                        onClick={() => setAdminTab(subT.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border ${
                          adminTab === subT.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{subT.label}</span>
                        {subT.count !== undefined && (
                          <span className="p-1 min-w-5 h-5 bg-sky-100 text-sky-900 text-[9px] font-mono leading-none rounded-full flex items-center justify-center">
                            {subT.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>


                {/* TAB 1: BASE DE DONNÉES DES ÉLÈVES (STUDENTS DB) */}
                {adminTab === "students" && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                    
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Registre et base de données des élèves</h3>
                        <p className="text-xs text-slate-500">Visualisez, approuvez, ou filtrez les dossiers d'inscription des élèves par classe et par nom.</p>
                      </div>

                      {/* Search box, Class filters & DB export */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Real-time search input */}
                        <div className="relative w-full sm:w-60">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-3.5 w-3.5 text-slate-400" />
                          </span>
                          <input
                            type="text"
                            placeholder="Rechercher un élève (nom, prénom...)"
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="pl-9 pr-6 py-1.5 w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                          />
                          {studentSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setStudentSearchQuery("")}
                              className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-700 font-bold text-xs"
                              title="Effacer la recherche"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <button
                          onClick={exportStudentsToPDF}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4.5 h-4.5 text-emerald-700" />
                          <span>Exporter PDF</span>
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">📅 ANNEE :</span>
                            <select
                              value={academicYearFilter}
                              onChange={(e) => setAcademicYearFilter(e.target.value)}
                              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="all">Scolarité (Toutes)</option>
                              {ACADEMIC_YEARS.map(yr => (
                                <option key={yr} value={yr}>Année Scolaire {yr}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">📚 CLASSE :</span>
                            <select
                              value={classFilter}
                              onChange={(e) => setClassFilter(e.target.value)}
                              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="all">Tous les niveaux</option>
                              {SCHOOL_CLASSES.map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick creation inside base */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 text-xs space-y-3">
                      <p className="font-bold text-slate-700 uppercase tracking-widest">Ajouter manuellement un élève dans la base de données</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <input
                          type="text"
                          id="new_manual_firstname"
                          placeholder="Prénom(s) de l'élève"
                          className="p-2 border rounded-xl bg-white focus:outline-none focus:border-slate-400 font-bold"
                        />
                        <input
                          type="text"
                          id="new_manual_lastname"
                          placeholder="NOM DE FAMILLE"
                          className="p-2 border rounded-xl bg-white focus:outline-none focus:border-slate-400 font-bold"
                        />
                        <select
                          id="new_manual_class"
                          className="p-2 border rounded-xl bg-white font-bold cursor-pointer"
                        >
                          {SCHOOL_CLASSES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <select
                          id="new_manual_year"
                          className="p-2 border rounded-xl bg-white font-bold text-blue-900 cursor-pointer"
                        >
                          {ACADEMIC_YEARS.map(yr => (
                            <option key={yr} value={yr}>Année {yr}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            const fnEl = document.getElementById("new_manual_firstname") as HTMLInputElement;
                            const lnEl = document.getElementById("new_manual_lastname") as HTMLInputElement;
                            const clsEl = document.getElementById("new_manual_class") as HTMLSelectElement;
                            const yrEl = document.getElementById("new_manual_year") as HTMLSelectElement;

                            if (!fnEl || !lnEl || !fnEl.value || !lnEl.value) {
                              notify("Renseignez d'abord les prénoms et noms de l'écolier.", "error");
                              return;
                            }

                            const payload = {
                              firstName: fnEl.value,
                              lastName: lnEl.value,
                              className: clsEl.value,
                              academicYear: yrEl.value,
                              dateOfBirth: "2018-01-01",
                              gender: "M" as const,
                              parentName: "Admin Manuel",
                              parentPhone: "+225 xxxxxxxx",
                              parentEmail: "heritierulrich9@gmail.com",
                              registrationType: "inscription" as const,
                              status: "approuvé" as const,
                              paymentStatus: "non_payé" as const,
                              tuitionPaid: 0,
                              totalTuition: clsEl.value.includes("Maternelle") ? 300000 : 350000
                            };

                            const res = await fetch("/api/students", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload)
                            });
                            const data = await res.json();
                            if (data.success) {
                              setStudents(data.students);
                              fnEl.value = "";
                              lnEl.value = "";
                              notify(`L'élève ${payload.firstName} ${payload.lastName} a été inséré dans le suivi de classe !`);
                            }
                          }}
                          className="bg-emerald-800 text-white font-bold p-2 rounded-xl hover:bg-emerald-950 transition-all cursor-pointer"
                        >
                          + Insérer
                        </button>
                      </div>
                    </div>

                    {/* Table listing */}
                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-semibold border-b border-gray-100 font-mono">
                            <th 
                              onClick={() => handleStudentSort("name")}
                              className="p-4 cursor-pointer hover:bg-slate-100/90 hover:text-slate-700 transition-all select-none group"
                              title="Trier par nom d'élève"
                            >
                              <div className="flex items-center gap-1">
                                <span>Écolier / ID</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition-all">
                                  {studentSortField === "name" ? (studentSortDirection === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleStudentSort("class")}
                              className="p-4 cursor-pointer hover:bg-slate-100/90 hover:text-slate-700 transition-all select-none group"
                              title="Trier par classe"
                            >
                              <div className="flex items-center gap-1">
                                <span>Niveau / Mode</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition-all">
                                  {studentSortField === "class" ? (studentSortDirection === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                              </div>
                            </th>
                            <th className="p-4">Tuteur / Tél</th>
                            <th 
                              onClick={() => handleStudentSort("status")}
                              className="p-4 cursor-pointer hover:bg-slate-100/90 hover:text-slate-700 transition-all select-none group"
                              title="Trier par statut d'inscription"
                            >
                              <div className="flex items-center gap-1">
                                <span>État d'Admissibilité</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition-all">
                                  {studentSortField === "status" ? (studentSortDirection === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleStudentSort("tuition")}
                              className="p-4 cursor-pointer hover:bg-slate-100/90 hover:text-slate-700 transition-all select-none group"
                              title="Trier par montant de scolarité payée"
                            >
                              <div className="flex items-center gap-1">
                                <span>Scolarité Réglée</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition-all">
                                  {studentSortField === "tuition" ? (studentSortDirection === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                              </div>
                            </th>
                            <th className="p-4 text-right">Actions de validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {(() => {
                            const filtered = students
                              .filter((s) => classFilter === "all" || s.className === classFilter)
                              .filter((s) => academicYearFilter === "all" || (s.academicYear || "2025/2026") === academicYearFilter)
                              .filter((s) => {
                                if (!studentSearchQuery) return true;
                                const query = studentSearchQuery.toLowerCase().trim();
                                const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
                                const reverseFullName = `${s.lastName || ""} ${s.firstName || ""}`.toLowerCase();
                                return (
                                  fullName.includes(query) ||
                                  reverseFullName.includes(query) ||
                                  s.id.toLowerCase().includes(query) ||
                                  (s.parentName || "").toLowerCase().includes(query)
                                );
                              });

                            const sorted = [...filtered].sort((a, b) => {
                              let valA: any = "";
                              let valB: any = "";

                              if (studentSortField === "name") {
                                valA = `${a.lastName || ""} ${a.firstName || ""}`.toLowerCase();
                                valB = `${b.lastName || ""} ${b.firstName || ""}`.toLowerCase();
                              } else if (studentSortField === "class") {
                                valA = a.className || "";
                                valB = b.className || "";
                              } else if (studentSortField === "status") {
                                valA = a.status || "";
                                valB = b.status || "";
                              } else if (studentSortField === "tuition") {
                                valA = a.tuitionPaid || 0;
                                valB = b.tuitionPaid || 0;
                              }

                              if (valA < valB) return studentSortDirection === "asc" ? -1 : 1;
                              if (valA > valB) return studentSortDirection === "asc" ? 1 : -1;
                              return 0;
                            });

                            if (sorted.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                                      <Search className="w-8 h-8 text-slate-300 animate-pulse mb-1" />
                                      <p className="font-bold text-slate-600 text-xs text-sans">Aucun élève trouvé</p>
                                      {studentSearchQuery ? (
                                        <p className="text-[11px] text-slate-400">Aucun résultat ne correspond à la recherche <span className="font-bold text-slate-500">"{studentSearchQuery}"</span>.</p>
                                      ) : (
                                        <p className="text-[11px] text-slate-400">Aucun élève enregistré pour cette classe ou année scolaire.</p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return sorted.map((s) => {
                              return (
                                <tr key={s.id} className="hover:bg-slate-50/55 border-b border-slate-100">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      {s.photoUrl ? (
                                        <img 
                                          src={s.photoUrl} 
                                          alt={`${s.firstName} ${s.lastName}`} 
                                          referrerPolicy="no-referrer"
                                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold font-mono text-slate-400 uppercase shrink-0">
                                          {(s.firstName?.[0] || "") + (s.lastName?.[0] || "")}
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-bold text-slate-900">{s.lastName} {s.firstName}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{s.id} • {s.gender === "M" ? "Garçon" : "Fille"}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-slate-600 font-medium">
                                    <span className="block font-extrabold text-slate-900">{s.className}</span>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                      <span className={`text-[9px] font-bold uppercase ${s.registrationType === 'inscription' ? 'text-amber-600' : 'text-blue-600'}`}>
                                        {s.registrationType === 'inscription' ? 'Nouveau dossier' : 'Réinscription'}
                                      </span>
                                      <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 font-mono px-1 rounded max-w-max">
                                        📅 {s.academicYear || "2025/2026"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-slate-600 text-[11px]">
                                    <div className="font-semibold text-slate-800">{s.parentName}</div>
                                    <div className="font-mono">{s.parentPhone}</div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      s.status === "approuvé" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
                                      s.status === "rejeté" ? "bg-rose-50 text-rose-800 border-rose-100" :
                                      "bg-amber-50 text-amber-800 border-amber-100"
                                    }`}>
                                      {s.status === "approuvé" ? "Admis • Approuvé" :
                                       s.status === "rejeté" ? "Rejeté • Refusé" :
                                       "Dossier en attente"}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold font-mono text-slate-900">
                                      {s.tuitionPaid.toLocaleString()} / {s.totalTuition.toLocaleString()} FCFA
                                    </div>
                                    <span className={`text-[10px] font-bold ${
                                      s.paymentStatus === "payé" ? "text-emerald-700" :
                                      s.paymentStatus === "partiel" ? "text-amber-600" :
                                      "text-rose-600"
                                    }`}>
                                      {s.paymentStatus === "payé" ? "Règlement complet" :
                                       s.paymentStatus === "partiel" ? "Acompte partiel" :
                                       "Non payé"}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                                    {s.status === "en_attente" && (
                                      <>
                                        <button
                                          onClick={() => handleStudentStatusUpdate(s.id, "approuvé")}
                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded"
                                        >
                                          Accepter
                                        </button>
                                        <button
                                          onClick={() => handleStudentStatusUpdate(s.id, "rejeté")}
                                          className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded"
                                        >
                                          Refuser
                                        </button>
                                      </>
                                    )}

                                    {s.status === "approuvé" && (
                                      <div className="inline-flex items-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            const amt = prompt("Saisissez la nouvelle somme versée totale par l'élève (FCFA) :", String(s.tuitionPaid));
                                            if (amt !== null) {
                                              const feePaid = Number(amt);
                                              const paymentStatus = feePaid >= s.totalTuition ? "payé" : feePaid > 0 ? "partiel" : "non_payé";
                                              handleStudentStatusUpdate(s.id, "approuvé", paymentStatus as any, feePaid);
                                            }
                                          }}
                                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded"
                                          title="Mettre à jour ses règlements scolarité"
                                        >
                                          Mettre à jour le solde
                                        </button>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => setEditingStudent(s)}
                                      className="px-2 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold rounded"
                                      title="Modifier les détails de l'élève (Année scolaire, classe, photo...)"
                                    >
                                      Éditer
                                    </button>

                                    <button
                                      onClick={async () => {
                                        if (confirm(`Enlever définitivement le dossier de ${s.firstName} ${s.lastName} du registre ?`)) {
                                          const response = await fetch(`/api/students/${s.id}`, { method: "DELETE" });
                                          const data = await response.json();
                                          if (data.success) {
                                            setStudents(data.students);
                                            notify("Élève supprimé du registre.");
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded inline-flex items-center justify-center align-middle"
                                      title="Supprimer la fiche"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* MODAL POUR EDITER LES DETAILS ET LA PHOTO D'UN ELEVE */}
                    {editingStudent && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 relative animate-fade-in">
                          <button 
                            type="button"
                            onClick={() => setEditingStudent(null)} 
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg p-2 bg-slate-100 hover:bg-slate-200 rounded-full"
                          >
                            ✕
                          </button>
                          
                          <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                              <span>📝 Édition complète de la fiche Élève</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Vous modifiez le profil historique ou actuel de <strong className="text-slate-950">{editingStudent.firstName} {editingStudent.lastName}</strong>.
                            </p>
                          </div>

                          <form 
                            onSubmit={async (e) => {
                              e.preventDefault();
                              try {
                                const res = await fetch("/api/students", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(editingStudent)
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setStudents(data.students);
                                  setEditingStudent(null);
                                  notify(`Fiche de ${editingStudent.firstName} mise à jour avec succès !`);
                                } else {
                                  notify("Erreur lors de la mise à jour.", "error");
                                }
                              } catch {
                                notify("Erreur réseau.", "error");
                              }
                            }}
                            className="space-y-4 text-xs font-semibold text-slate-705"
                          >
                            {/* photo setup */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                              <div className="shrink-0">
                                {editingStudent.photoUrl ? (
                                  <img 
                                    src={editingStudent.photoUrl} 
                                    alt="Profil" 
                                    referrerPolicy="no-referrer"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-300 shadow"
                                  />
                                ) : (
                                  <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                                    Sans photo
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                  Importer ou modifier la photo de l'élève
                                </label>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const img = new Image();
                                        img.onload = () => {
                                          const canvas = document.createElement("canvas");
                                          let width = img.width;
                                          let height = img.height;
                                          const MAX_WIDTH = 300;
                                          const MAX_HEIGHT = 300;
                                          if (width > height) {
                                            if (width > MAX_WIDTH) {
                                              height *= MAX_WIDTH / width;
                                              width = MAX_WIDTH;
                                            }
                                          } else {
                                            if (height > MAX_HEIGHT) {
                                              width *= MAX_HEIGHT / height;
                                              height = MAX_HEIGHT;
                                            }
                                          }
                                          canvas.width = width;
                                          canvas.height = height;
                                          const ctx = canvas.getContext("2d");
                                          if (ctx) {
                                            ctx.drawImage(img, 0, 0, width, height);
                                            const base64 = canvas.toDataURL("image/jpeg", 0.75);
                                            setEditingStudent(prev => prev ? ({ ...prev, photoUrl: base64 }) : null);
                                            notify("Photo optimisée.");
                                          }
                                        };
                                        img.src = ev.target?.result as string;
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 font-mono animate-pulse"
                                />
                                <div className="text-[10px] text-slate-400 font-medium">Format JPEG/PNG compressé à la volée.</div>
                              </div>
                            </div>

                            {/* names */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prénom de l'élève</label>
                                <input 
                                  type="text" 
                                  required
                                  value={editingStudent.firstName || ""}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom de famille de l'élève</label>
                                <input 
                                  type="text" 
                                  required
                                  value={editingStudent.lastName || ""}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, lastName: e.target.value.toUpperCase() })}
                                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-800"
                                />
                              </div>
                            </div>

                            {/* level and year */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Classe scolaire</label>
                                <select 
                                  value={editingStudent.className || "CP"}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, className: e.target.value })}
                                  className="w-full p-2.5 border rounded-xl bg-white text-slate-850 font-bold"
                                >
                                  {SCHOOL_CLASSES.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Année Scolaire d'inscription</label>
                                <select 
                                  value={editingStudent.academicYear || "2025/2026"}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, academicYear: e.target.value })}
                                  className="w-full p-2.5 border rounded-xl bg-white text-slate-850 font-bold"
                                >
                                  {ACADEMIC_YEARS.map(yr => (
                                    <option key={yr} value={yr}>{yr}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Genre</label>
                                <select 
                                  value={editingStudent.gender || "M"}
                                  onChange={(e: any) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                                  className="w-full p-2.5 border rounded-xl bg-white text-slate-850 font-bold"
                                >
                                  <option value="M">Garçon</option>
                                  <option value="F">Fille</option>
                                </select>
                              </div>
                            </div>

                            {/* tuition settings */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/50">
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">Scolarité totale exigée (FCFA)</label>
                                <input 
                                  type="number" 
                                  value={editingStudent.totalTuition || 0}
                                  onChange={(e) => {
                                    const total = Number(e.target.value);
                                    let status: "payé" | "partiel" | "non_payé" = "non_payé";
                                    if (editingStudent.tuitionPaid >= total) status = "payé";
                                    else if (editingStudent.tuitionPaid > 0) status = "partiel";
                                    setEditingStudent({ ...editingStudent, totalTuition: total, paymentStatus: status });
                                  }}
                                  className="w-full p-2.5 border rounded-xl bg-white font-mono text-slate-800 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1 font-mono">Montant déjà payé (FCFA)</label>
                                <input 
                                  type="number" 
                                  value={editingStudent.tuitionPaid || 0}
                                  onChange={(e) => {
                                    const paid = Number(e.target.value);
                                    let status: "payé" | "partiel" | "non_payé" = "non_payé";
                                    if (paid >= editingStudent.totalTuition) status = "payé";
                                    else if (paid > 0) status = "partiel";
                                    setEditingStudent({ ...editingStudent, tuitionPaid: paid, paymentStatus: status });
                                  }}
                                  className="w-full p-2.5 border rounded-xl bg-white focus:border-amber-600 font-mono text-slate-800 font-bold"
                                />
                              </div>
                            </div>

                            {/* parent notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom du parent tuteur</label>
                                <input 
                                  type="text" 
                                  value={editingStudent.parentName || ""}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                                  className="w-full p-2.5 border rounded-xl bg-white text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Téléphone parent</label>
                                <input 
                                  type="text" 
                                  value={editingStudent.parentPhone || ""}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                                  className="w-full p-2.5 border rounded-xl bg-white text-slate-850 font-mono"
                                />
                              </div>
                            </div>

                            {/* buttons */}
                            <div className="flex gap-2 pt-4">
                              <button 
                                type="button"
                                onClick={() => setEditingStudent(null)}
                                className="flex-1 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition-all"
                              >
                                Annuler
                              </button>
                              <button 
                                type="submit"
                                className="flex-1 py-3 text-white bg-slate-900 hover:bg-slate-800 font-bold rounded-xl transition-all"
                              >
                                Sauvegarder les modifications
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                  </div>
                )}


                {/* TAB 2: NEWS & ANNOUNCEMENT MANAGEMENT (Gestion Actualités) */}
                {adminTab === "news" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Add / Edit Section */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Publier/Éditer une Actualité</h3>
                      
                      <form onSubmit={handleNewsSubmit} className="space-y-4 text-xs font-medium">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Titre de l'Actualité *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex : Réunion Trimestrielle extraordinaire"
                            value={editingNews.title}
                            onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Détails / Contenu informatif *</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Saisissez les aspects informatifs destinés aux parents..."
                            value={editingNews.content}
                            onChange={(e) => setEditingNews({ ...editingNews, content: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catégorie</label>
                            <select
                              value={editingNews.category}
                              onChange={(e) => setEditingNews({ ...editingNews, category: e.target.value as any })}
                              className="w-full p-2.5 border rounded-xl"
                            >
                              <option value="événement">Événement</option>
                              <option value="académique">Académique</option>
                              <option value="annonce">Annonce générale</option>
                              <option value="sport">Activités Sportives</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Illustration Photo (URL)</label>
                            <input
                              type="text"
                              placeholder="URL d'image Unsplash"
                              value={editingNews.imageUrl}
                              onChange={(e) => setEditingNews({ ...editingNews, imageUrl: e.target.value })}
                              className="w-full p-2.5 border rounded-xl"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl"
                        >
                          Enregistrer et Afficher sur l'accueil
                        </button>
                      </form>
                    </div>

                    {/* Listing and control */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900">Filtre des articles d'affichage</h3>
                      <p className="text-xs text-slate-500">Ces nouvelles s'affichent dynamiquement sur la page d'accueil de l'école.</p>

                      <div className="divide-y divide-gray-100">
                        {news.map((n) => (
                          <div key={n.id} className="py-4 flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded uppercase">
                                  {n.category}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">{n.date}</span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 mt-1">{n.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">{n.content}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setEditingNews(n)}
                                className="p-1 px-2.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg"
                              >
                                Éditer
                              </button>
                              <button
                                onClick={() => handleNewsDelete(n.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}


                {/* TAB 3: NOTES D'INFORMATION DIRECTE */}
                {adminTab === "notes" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Add or update form */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 font-mono">Nouvelle Consigne / Alerte Parentale</h3>

                      <form onSubmit={handleNoteSubmit} className="space-y-4 text-xs font-medium">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Titre de la Note administrative *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex : Port des tenues ou hygiène"
                            value={editingNote.title}
                            onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contenu textuel explicite *</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Énoncez les règles ou consignes précises aux parents..."
                            value={editingNote.content}
                            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Public ciblé (Ex: Maternelle, Primaire, Tous...)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex : Toutes les classes, Collège..."
                            value={editingNote.targetAudience}
                            onChange={(e) => setEditingNote({ ...editingNote, targetAudience: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl select-none">
                          <input
                            type="checkbox"
                            checked={editingNote.critical || false}
                            onChange={(e) => setEditingNote({ ...editingNote, critical: e.target.checked })}
                            className="text-rose-600 focus:ring-rose-500 rounded"
                          />
                          <div>
                            <span className="block text-xs font-bold text-rose-800">🔴 Note Critique Importante / Urgente</span>
                            <span className="text-[10px] text-slate-400 font-normal">S'affichera sur fond d'alerte rouge</span>
                          </div>
                        </label>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white font-bold rounded-xl cursor-pointer"
                        >
                          Enregistrer la directive
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 font-mono">Consignes enregistrées</h3>
                      
                      <div className="divide-y divide-gray-100">
                        {notes.map((not) => (
                          <div key={not.id} className="py-4 flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                                  not.critical ? "bg-rose-100 text-rose-900" : "bg-emerald-50 text-emerald-800"
                                }`}>
                                  {not.critical ? "CRITIQUE" : "STANDARD"} • {not.targetAudience}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">{not.date}</span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 mt-1">{not.title}</h4>
                              <p className="text-xs text-slate-500 mt-1">{not.content}</p>
                            </div>

                            <button
                              onClick={() => handleNoteDelete(not.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}


                {/* TAB: CALENDAR EVENTS MANAGEMENT (Gestion du Calendrier) */}
                {adminTab === "events" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Add or Update Calendar Event Form */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          {editingEvent.id ? "Modifier l'Événement" : "Programmer un Nouvel Événement"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {editingEvent.id 
                            ? "Modifiez ci-dessous les détails de l'activité du calendrier de l'établissement."
                            : "Enregistrez une nouvelle date clé ou activité pédagogique pour l'école."
                          }
                        </p>
                      </div>

                      <form onSubmit={handleEventSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Intitulé de l'événement *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex : Grande Rentrée, Congés de Toussaint, Réunion..."
                            value={editingEvent.title || ""}
                            onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                            className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Date inscrite *</label>
                            <input
                              type="date"
                              required
                              value={editingEvent.date || ""}
                              onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                              className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Tranche horaire / Durée</label>
                            <input
                              type="text"
                              placeholder="Ex: 08:30 - 12:00, Toute la semaine"
                              value={editingEvent.time || ""}
                              onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                              className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Catégorie *</label>
                            <select
                              value={editingEvent.category || "examens"}
                              onChange={(e: any) => setEditingEvent({ ...editingEvent, category: e.target.value })}
                              className="w-full p-2.5 border rounded-xl bg-white focus:border-blue-500 focus:outline-none"
                            >
                              <option value="vacances">Congés & Vacances</option>
                              <option value="examens">Évaluations & Examens</option>
                              <option value="fete">Fêtes & Célébrations</option>
                              <option value="reunion">Réunion de Parents</option>
                              <option value="autre">Événement Interne / Autre</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Lieu / Localisation</label>
                            <input
                              type="text"
                              placeholder="Ex: Cour principale de l'école"
                              value={editingEvent.location || ""}
                              onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                              className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Description détaillée de l'activité *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Entrez une brève description de ce qui se passera, destiné aux parents et élèves..."
                            value={editingEvent.description || ""}
                            onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                            className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          {editingEvent.id && (
                            <button
                              type="button"
                              onClick={() => setEditingEvent({ title: "", date: "", time: "", category: "examens", description: "", location: "" })}
                              className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Annuler
                            </button>
                          )}
                          <button
                            type="submit"
                            className="flex-[2] py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                          >
                            <Plus className="w-4 h-4 text-amber-300" />
                            <span>{editingEvent.id ? "Confirmer la modification" : "Ajouter au Calendrier"}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Events list panel */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Activités Enregistrées dans le Calendrier</h3>
                        <p className="text-xs text-slate-500 mt-1">Vous avez actuellement {events.length} événements répertoriés.</p>
                      </div>

                      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] pr-2">
                        {events.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center p-6 border border-dashed border-slate-200">
                            <Calendar className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-slate-500 text-xs font-bold leading-relaxed">Aucun événement n'est programmé actuellement.</p>
                          </div>
                        ) : (
                          events.map((ev) => {
                            let catLabel = "Événement";
                            let catStyle = "bg-emerald-50 text-emerald-800 border-emerald-100";
                            if (ev.category === "vacances") {
                              catLabel = "Congés";
                              catStyle = "bg-rose-50 text-rose-700 border-rose-100";
                            } else if (ev.category === "examens") {
                              catLabel = "Évaluation";
                              catStyle = "bg-amber-50 text-amber-800 border-amber-100";
                            } else if (ev.category === "fete") {
                              catLabel = "Célébration";
                              catStyle = "bg-purple-50 text-purple-700 border-purple-100";
                            } else if (ev.category === "reunion") {
                              catLabel = "Réunion";
                              catStyle = "bg-blue-50 text-blue-700 border-blue-100";
                            }

                            return (
                              <div key={ev.id} className="py-4 flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-blue-800 font-mono">
                                      {new Date(ev.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${catStyle}`}>
                                      {catLabel}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-extrabold text-slate-900">{ev.title}</h4>
                                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">{ev.description}</p>
                                  {(ev.time || ev.location) && (
                                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 font-medium">
                                      {ev.time && <span>🕒 {ev.time}</span>}
                                      {ev.location && <span>📍 {ev.location}</span>}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingEvent(ev);
                                      // Scroll smoothly to left form on click
                                      window.scrollTo({ top: 400, behavior: "smooth" });
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-xs"
                                    title="Modifier cet événement"
                                  >
                                    Éditer
                                  </button>
                                  <button
                                    onClick={() => handleEventDelete(ev.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                                    title="Supprimer cet événement"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                )}


                {/* TAB 4: PRIVATE CONTACT MESSAGES BOX */}
                {adminTab === "messages" && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Boîte de Réception Administrative</h3>
                      <p className="text-xs text-slate-500">Correspondances envoyées par les parents. Une copie est simulée vers heritierulrich9@gmail.com.</p>
                    </div>

                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl">
                          <p className="text-gray-500">Aucun message de contact reçu actuellement.</p>
                        </div>
                      ) : (
                        messages.map((m) => (
                          <div key={m.id} className="p-5 rounded-2xl bg-slate-50 border border-gray-100 space-y-3 relative group">
                            
                            <button
                              onClick={async () => {
                                if (confirm("Archiver/supprimer ce message de votre boîte ?")) {
                                  const res = await fetch(`/api/messages/${m.id}`, { method: "DELETE" });
                                  const data = await res.json();
                                  if (data.success) {
                                    setMessages(data.messages);
                                    notify("Message retiré des archives.");
                                  }
                                }
                              }}
                              className="absolute top-4 right-4 p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Archiver le message"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="font-extrabold text-emerald-900">{m.name}</span>
                              <span className="text-gray-400 font-mono">&lt;{m.email}&gt;</span>
                              <span className="text-[10px] text-gray-400 font-mono ml-auto mr-12">{new Date(m.dateReceived).toLocaleString()}</span>
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-900">Sujet : "{m.subject}"</div>
                              <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-150">
                                {m.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}


                {/* TAB 5: LE JOURNAL DE TOUTES LES TRANSACTIONS FINANCIÈRES (Payments logs & Form) */}
                {adminTab === "payments" && (
                  <div className="space-y-6">
                    {/* Header bar and switcher */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <DollarSign className="text-emerald-800" /> Trésorerie & Comptabilité Scolaire
                        </h3>
                        <p className="text-xs text-slate-500">
                          Gerez les encaissements, enregistrez de nouveaux règlements et exportez les rapports de bilans financiers.
                        </p>
                      </div>

                      <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto gap-1">
                        <button
                          type="button"
                          onClick={() => setAdminPaymentSubTab("list")}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            adminPaymentSubTab === "list"
                              ? "bg-white text-slate-950 shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          📜 Registre & Exports
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminPaymentSubTab("new");
                            setPaymentStep("form");
                          }}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            adminPaymentSubTab === "new"
                              ? "bg-white text-slate-950 shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          💸 Enregistrer Versement
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminPaymentSubTab("bilans")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            adminPaymentSubTab === "bilans"
                              ? "bg-white text-slate-950 shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          📊 Clôtures & Bilans Pluriannuels
                        </button>
                      </div>
                    </div>

                    {/* View 1: List and CSV reporting */}
                    {adminPaymentSubTab === "list" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Financial balance widgets */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-emerald-800 text-white rounded-2xl p-5 shadow-sm space-y-2">
                            <span className="block text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Recettes Totales Cumulées</span>
                            <div className="text-2xl font-black font-mono">
                              {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} <span className="text-xs text-emerald-200">FCFA</span>
                            </div>
                            <span className="block text-[9px] text-emerald-250 font-medium font-semibold">Bilan mis à jour en direct</span>
                          </div>

                          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-2">
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bilan Mensuel ({new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})</span>
                            <div className="text-2xl font-black font-mono">
                              {payments
                                .filter(p => {
                                  const d = new Date(p.date);
                                  return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                                })
                                .reduce((sum, p) => sum + p.amount, 0).toLocaleString()} <span className="text-xs text-slate-300">FCFA</span>
                            </div>
                            <span className="block text-[9px] text-slate-400 font-medium font-semibold">Flux encaissé au cours du mois actif</span>
                          </div>

                          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bilan Annuel ({new Date().getFullYear()})</span>
                            <div className="text-2xl font-black font-mono text-slate-900">
                              {payments
                                .filter(p => new Date(p.date).getFullYear() === new Date().getFullYear())
                                .reduce((sum, p) => sum + p.amount, 0).toLocaleString()} <span className="text-xs text-slate-500 font-bold">FCFA</span>
                            </div>
                            <span className="block text-[9px] text-slate-400 font-medium font-semibold">Contributions perçues pour l'exercice</span>
                          </div>
                        </div>

                        {/* Export reports panel */}
                        <div className="bg-slate-50 rounded-2xl border border-gray-100 p-5 space-y-3">
                          <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Génération de Rapports au format PDF</h4>
                          <p className="text-[11px] text-slate-500">Générez et téléchargez instantanément vos rapports comptables complets et bilans financiers certifiés au format PDF d'impression.</p>
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            <button
                              onClick={exportReceiptsToPDF}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Download className="w-4 h-4 text-slate-600" />
                              <span>Exporter tous les Reçus (PDF)</span>
                            </button>
                            <button
                              onClick={exportMonthlyBalanceToPDF}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-850 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FileText className="w-4 h-4 text-sky-700" />
                              <span>Bilan Mensuel (PDF)</span>
                            </button>
                            <button
                              onClick={exportAnnualBalanceToPDF}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-850 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FileText className="w-4 h-4 text-emerald-700" />
                              <span>Bilan Annuel (PDF)</span>
                            </button>
                          </div>
                        </div>

                        {/* Receipts Ledger Table */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                          <h4 className="text-sm font-bold text-slate-900">Grand Livre des Paiements</h4>
                          <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b font-mono font-semibold text-slate-400">
                                  <th className="p-4">Identifiant Reçu</th>
                                  <th className="p-4">Élève & Classe</th>
                                  <th className="p-4">Libellé Frais</th>
                                  <th className="p-4">Mode / Transaction ID</th>
                                  <th className="p-4">Date de Règlement</th>
                                  <th className="p-4 text-right">Somme perçue</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-150">
                                {payments.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Aucun reçu de paiement enregistré pour le moment.</td>
                                  </tr>
                                ) : (
                                  payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50">
                                      <td className="p-4 font-mono font-bold text-emerald-850">{p.id}</td>
                                      <td className="p-4">
                                        <div className="font-bold text-slate-900">{p.studentName}</div>
                                        <div className="text-[10px] text-gray-400">{p.studentClass}</div>
                                      </td>
                                      <td className="p-4 font-semibold text-slate-700">{p.purpose}</td>
                                      <td className="p-4 text-slate-600 font-mono">
                                        <div>{p.paymentMethod}</div>
                                        <div className="text-[10px] text-gray-400">{p.transactionId}</div>
                                      </td>
                                      <td className="p-4 text-gray-400">{new Date(p.date).toLocaleDateString()}</td>
                                      <td className="p-4 text-right font-black font-mono text-emerald-800 text-[13px]">{p.amount.toLocaleString()} FCFA</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* View 2: Enregistrer un Versement (Tuition Payment integration) */}
                    {adminPaymentSubTab === "new" && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-10 space-y-8 max-w-2xl mx-auto animate-fade-in">
                        
                        <div className="text-center space-y-2 border-b border-gray-100 pb-6">
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Guichet de Caisse Chiffré SSL
                          </div>
                          <h4 className="text-2xl font-black text-slate-900">Enregistrer un Nouveau Paiement</h4>
                          <p className="text-xs text-slate-500">
                            Saisissez les fonds reçus en espèces, par Mobile Money ou par carte bancaire au nom de l'élève.
                          </p>
                        </div>

                        {paymentStep === "form" && (
                          <form onSubmit={triggerPaymentProcessing} className="space-y-6">
                            
                            {/* Student Association Choice with Class Filtering */}
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 mb-4 space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-semibold">📚 Filtrer les Élèves par Classe</label>
                                <select
                                  value={paymentClassFilter}
                                  onChange={(e) => setPaymentClassFilter(e.target.value)}
                                  className="w-full px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                                >
                                  <option value="all">Toutes les classes (Afficher tout le monde)</option>
                                  {SCHOOL_CLASSES.map((cls) => (
                                    <option key={cls} value={cls}>{cls}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-705 uppercase">👧👦 Sélectionner l'Élève Bénéficiaire *</label>
                              <select
                                value={paymentForm.studentId}
                                onChange={(e) => {
                                  const sId = e.target.value;
                                  if (sId === "stud_extern") {
                                    setPaymentForm({ ...paymentForm, studentId: sId, studentName: "", studentClass: "CP" });
                                  } else {
                                    const found = students.find((s) => s.id === sId);
                                    if (found) {
                                      setPaymentForm({
                                        ...paymentForm,
                                        studentId: sId,
                                        studentName: `${found.firstName} ${found.lastName}`,
                                        studentClass: found.className
                                      });
                                    }
                                  }
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-205 text-sm font-semibold bg-white cursor-pointer"
                              >
                                <option value="stud_extern">-- Saisie Manuelle (Élève non listé) --</option>
                                {students
                                  .filter((stud) => paymentClassFilter === "all" || stud.className === paymentClassFilter)
                                  .map((stud) => (
                                    <option key={stud.id} value={stud.id}>
                                      [Classe: {stud.className}] {stud.firstName} {stud.lastName} (Reste : {stud.totalTuition - stud.tuitionPaid} FCFA)
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                            {/* Manual identification if not listed */}
                            {paymentForm.studentId === "stud_extern" && (
                              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100 animate-fade-in">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nom de famille de l'élève *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Saisissez le nom"
                                    value={paymentForm.studentName}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, studentName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 font-semibold">Sa classe correspondante *</label>
                                  <select
                                    required
                                    value={paymentForm.studentClass}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, studentClass: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                                  >
                                    {SCHOOL_CLASSES.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* Purpose & Amount */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 font-semibold">Intitulé de la provision *</label>
                                <select
                                  required
                                  value={paymentForm.purpose}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    let calculatedAmount = paymentForm.amount;
                                    if (val.includes("inscription")) {
                                      calculatedAmount = String(dbConfig?.registrationFee || 50000);
                                    } else if (val.includes("mensuel")) {
                                      calculatedAmount = String(dbConfig?.monthlyFee || 35000);
                                    }
                                    setPaymentForm({ ...paymentForm, purpose: val, amount: calculatedAmount });
                                  }}
                                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                                >
                                  <option value="Frais d'inscription obligatoire">Frais d'inscription annuel (50 000 FCFA)</option>
                                  <option value="Scolarité mensuelle standard">Scolarité standard 1 mois (35 000 FCFA)</option>
                                  <option value="Frais de scolarité - Tranche 1">Scolarité tranche 1 (Acompte)</option>
                                  <option value="Frais de scolarité - Solde Total">Frais de scolarité - Solde global</option>
                                  <option value="Cantine scolaire & transport">Abonnement Cantine et bus scolaire</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-emerald-850 uppercase mb-1.5 font-semibold">Somme à verser (FCFA) *</label>
                                <input
                                  type="number"
                                  required
                                  placeholder="Ex : 50000"
                                  value={paymentForm.amount}
                                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/10 text-sm font-bold text-emerald-950"
                                />
                              </div>
                            </div>

                            {/* Payment option Choice */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Sélectionnez le moyen de perception</label>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { id: "Orange Money", label: "Orange Money", desc: "Perçu par Mobile", color: "border-orange-500 hover:bg-orange-50/20 text-orange-900" },
                                  { id: "MTN MoMo", label: "MTN MoMo", desc: "Validation Mobile", color: "border-yellow-400 hover:bg-yellow-50/20 text-amber-950" },
                                  { id: "Wave", label: "Wave", desc: "Paiement Direct QR", color: "border-sky-400 hover:bg-sky-50/20 text-sky-950" },
                                  { id: "Espèces (Caisse)", label: "Espèces (Caisse)", desc: "Trésorier de l'école", color: "border-slate-800 hover:bg-slate-50 text-slate-900" },
                                ].map((item) => (
                                  <label 
                                    key={item.id} 
                                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 cursor-pointer transition-all text-center select-none ${
                                      paymentForm.paymentMethod === item.id 
                                        ? "bg-slate-50 ring-2 ring-emerald-800 " + item.color
                                        : "border-gray-100 hover:border-gray-200"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="paymentMethod"
                                      value={item.id}
                                      checked={paymentForm.paymentMethod === item.id}
                                      onChange={() => setPaymentForm({ ...paymentForm, paymentMethod: item.id })}
                                      className="sr-only"
                                    />
                                    <span className="text-xs font-bold">{item.label}</span>
                                    <span className="text-[9px] text-gray-400 mt-1 font-normal leading-tight">{item.desc}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Action button */}
                            <div className="pt-4 flex gap-4">
                              <button
                                type="submit"
                                className="flex-1 py-3.5 bg-emerald-800 hover:bg-emerald-950 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/10 font-semibold"
                              >
                                <CreditCard className="w-5 h-5" /> Confirmer la Saisie & Facturer
                              </button>
                            </div>

                          </form>
                        )}

                        {paymentStep === "confirm" && (
                          <div className="space-y-6 animate-fade-in text-xs font-medium">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-gray-100 space-y-4 text-slate-700">
                              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Récapitulatif de règlement</h4>
                              
                              <div className="grid grid-cols-2 gap-y-4 text-[13px]">
                                <div>
                                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Écolier / Étudiant</span>
                                  <strong className="text-slate-900">{paymentForm.studentName}</strong>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Classe assignée</span>
                                  <strong className="text-slate-900">{paymentForm.studentClass}</strong>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Type de règlement requis</span>
                                  <strong className="text-slate-900">{paymentForm.purpose}</strong>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Passerelle de validation</span>
                                  <strong className="text-slate-900">{paymentForm.paymentMethod}</strong>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-200">
                                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Montant net encaissé</span>
                                  <span className="text-xl font-black text-emerald-800 font-mono">{Number(paymentForm.amount).toLocaleString()} FCFA</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-amber-50 text-amber-900 p-4 rounded-xl space-y-1 border border-amber-200/50">
                              <p className="font-bold flex items-center gap-1 text-[11px]">
                                <ShieldAlert className="w-4 h-4 text-amber-600" /> Validation d'autorité d'administration :
                              </p>
                              <p className="text-[10px]">
                                Vous êtes sur le point d'inscrire des recettes réelles dans le journal comptable de l'Héritage Divin. Un e-mail sera envoyé ainsi qu'un reçu d'acompte scolaire officiel pour le tuteur légal.
                              </p>
                            </div>

                            <div className="flex gap-4">
                              <button
                                onClick={confirmSecurePayment}
                                className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                              >
                                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300" /> Confirmer l'encaissement de caisse
                              </button>
                              <button
                                onClick={() => setPaymentStep("form")}
                                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                              >
                                Modifier
                              </button>
                            </div>
                          </div>
                        )}

                        {paymentStep === "success" && currentReceipt && (
                          <div className="space-y-6 text-center py-6 animate-fade-in font-semibold">
                            <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center ring-4 ring-emerald-100">
                              <CheckCircle2 className="w-10 h-10 animate-pulse" />
                            </div>

                            <div className="space-y-1">
                              <h3 className="text-xl font-black text-slate-900">Encaissement Validé !</h3>
                              <p className="text-xs text-slate-500">Le reçu {currentReceipt.id} a été enregistré dans le registre comptable de l'école.</p>
                            </div>

                            {/* Printable invoice receipt */}
                            <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 text-left text-xs font-mono text-slate-700 relative shadow-inner">
                              <div className="text-center font-bold border-b border-gray-200 pb-2 mb-3">
                                <p className="text-xs uppercase font-black text-emerald-900">REÇU DE CAISSE HÉRITAGE DIVIN</p>
                                <p className="text-[9px] text-slate-400 font-bold">ÉTABLISSEMENT PRÉ-PRIMAIRE & PRIMAIRE</p>
                              </div>

                              <div className="space-y-1.5 text-[11px]">
                                <div className="flex justify-between">
                                  <span>No. Reçu:</span>
                                  <strong className="text-slate-900">{currentReceipt.id}</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Élève:</span>
                                  <strong className="text-slate-950 font-bold">{currentReceipt.studentName}</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Classe:</span>
                                  <span>{currentReceipt.studentClass}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Allocation:</span>
                                  <span>{currentReceipt.purpose}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Méthode:</span>
                                  <span>{currentReceipt.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ID transaction:</span>
                                  <span>{currentReceipt.transactionId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Date Règlement:</span>
                                  <span>{new Date(currentReceipt.date).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-dashed border-gray-300 font-bold text-emerald-900 text-xs">
                                  <span>Montant Perçu:</span>
                                  <span>{currentReceipt.amount.toLocaleString()} FCFA</span>
                                </div>
                              </div>

                              <div className="text-center text-[9px] text-gray-400 mt-4 pt-2 border-t border-dashed border-gray-200">
                                Facture certifiée d'administration.<br />
                                Déclarée à heritierulrich9@gmail.com.
                              </div>
                            </div>

                            <div className="pt-4 flex justify-center gap-3">
                              <button
                                onClick={() => {
                                  window.print();
                                }}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Download className="w-3.5 h-3.5" /> imprimer le reçu
                              </button>
                              <button
                                onClick={() => {
                                  setPaymentStep("form");
                                  setAdminPaymentSubTab("list");
                                }}
                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
                              >
                                Voir le Registre
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {adminPaymentSubTab === "bilans" && (
                      <div className="space-y-6 animate-fade-in text-xs font-semibold">
                        
                        {/* Two visual stats cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="block text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Bilans de Caisse Enregistrés</span>
                            <div className="text-3xl font-black font-mono">
                              {reports.length} <span className="text-xs font-normal text-indigo-200">clôtures</span>
                            </div>
                            <span className="block text-[10px] text-indigo-200 font-normal">Évolutif pluriannuel</span>
                          </div>

                          <div className="bg-gradient-to-br from-purple-800 to-purple-950 text-white rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="block text-[10px] uppercase font-bold text-purple-300 tracking-wider font-mono">Excédent Net Total Archivé</span>
                            <div className="text-3xl font-black font-mono text-emerald-400">
                              {reports.reduce((sum, r) => sum + (r.netBalance || 0), 0).toLocaleString()} <span className="text-xs font-normal text-purple-200">FCFA</span>
                            </div>
                            <span className="block text-[10px] text-purple-200 font-normal">Cumul net de caisse</span>
                          </div>

                          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">Moyenne des Recettes</span>
                            <div className="text-2xl font-bold font-mono text-blue-300">
                              {reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + r.totalIncome, 0) / reports.length).toLocaleString() : 0} <span className="text-xs font-normal">FCFA</span>
                            </div>
                            <span className="block text-[10px] text-slate-400 font-normal">Par exercice de caisse</span>
                          </div>
                        </div>

                        {/* Graphic and Recording form side-by-side */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          
                          {/* Left Panel: Record form */}
                          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                            <div>
                              <h4 className="text-sm font-black text-slate-800 tracking-tight">💾 Enregistrer une nouvelle clôture</h4>
                              <p className="text-[11px] text-slate-400 font-medium font-normal mt-0.5">Archiver officiellement l'état de la caisse pour l'historique de l'école.</p>
                            </div>

                            <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs text-slate-705">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type de bilan de clôture</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setNewReport({ ...newReport, type: "mensuel" })}
                                    className={`py-2 text-center rounded-xl font-bold border ${
                                      newReport.type === "mensuel"
                                        ? "bg-purple-50 text-purple-800 border-purple-300 shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    Mensuel (Mois)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNewReport({ ...newReport, type: "annuel" })}
                                    className={`py-2 text-center rounded-xl font-bold border ${
                                      newReport.type === "annuel"
                                        ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    Annuel (Année)
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Année Scolaire</label>
                                  <select
                                    value={newReport.year}
                                    onChange={(e) => setNewReport({ ...newReport, year: e.target.value })}
                                    className="p-2 border rounded-xl w-full bg-white text-slate-800 font-semibold cursor-pointer"
                                  >
                                    {ACADEMIC_YEARS.map(yr => (
                                      <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Période ou Nom</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder={newReport.type === "mensuel" ? "Ex: Octobre 2025" : "Ex: Année 2025/2026"}
                                    value={newReport.period}
                                    onChange={(e) => setNewReport({ ...newReport, period: e.target.value })}
                                    className="p-2 border rounded-xl w-full bg-white text-slate-800 focus:outline-none focus:border-slate-500 font-bold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Recettes (FCFA)</label>
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    value={newReport.totalIncome || 0}
                                    onChange={(e) => setNewReport({ ...newReport, totalIncome: Number(e.target.value) })}
                                    className="p-2 border rounded-xl w-full bg-white text-slate-850 font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-rose-800 uppercase mb-1">Dépenses (FCFA)</label>
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    value={newReport.totalExpense || 0}
                                    onChange={(e) => setNewReport({ ...newReport, totalExpense: Number(e.target.value) })}
                                    className="p-2 border rounded-xl w-full bg-white text-slate-850 font-mono font-bold"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rapport de solde calculé :</label>
                                <div className={`p-2.5 rounded-xl border text-center text-xs font-black font-mono ${
                                  (newReport.totalIncome - newReport.totalExpense) >= 0
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-rose-50 text-rose-800 border-rose-200"
                                }`}>
                                  Solde : {(newReport.totalIncome - newReport.totalExpense).toLocaleString()} FCFA
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Commentaires de Clôture</label>
                                <textarea
                                  placeholder="Observations, écarts éventuels..."
                                  value={newReport.comments}
                                  onChange={(e) => setNewReport({ ...newReport, comments: e.target.value })}
                                  className="p-2 border rounded-xl w-full h-14 bg-white text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all font-semibold cursor-pointer"
                              >
                                Enregistrer officiellement
                              </button>
                            </form>
                          </div>

                          {/* Right Panel: Pluriannual tables */}
                          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight">📈 Historique des exercices de caisse</h4>
                                <p className="text-[11px] text-slate-400 font-medium font-normal mt-0.5">Listing consolidé des rentrées et sorties d'argent archivées par année scolaire.</p>
                              </div>

                              {/* Simple interactive filter */}
                              <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                                <span className="text-[9px] text-slate-400 font-black">FILTRER PAR :</span>
                                <select 
                                  id="report_year_filter" 
                                  className="bg-transparent text-[11px] cursor-pointer focus:outline-none font-bold text-slate-700 font-sans"
                                  defaultValue="all"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const rows = document.querySelectorAll(".report-table-row");
                                    rows.forEach((row: any) => {
                                      if (val === "all" || row.dataset.year === val) {
                                        row.classList.remove("hidden");
                                      } else {
                                        row.classList.add("hidden");
                                      }
                                    });
                                  }}
                                >
                                  <option value="all">Toutes les années</option>
                                  {ACADEMIC_YEARS.map(yr => (
                                    <option key={yr} value={yr}>Année {yr}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {reports.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-1 bg-slate-50/55">
                                <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 animate-bounce" />
                                <p className="font-bold text-xs text-slate-600">Aucun bilan archivé pour le moment</p>
                                <p className="text-[10px] text-slate-400 font-normal mb-1">Enregistrez votre premier bilan comptable pluriannuel via le formulaire de gauche.</p>
                              </div>
                            ) : (
                              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[9px]">
                                      <th className="p-2.5">Période & Type</th>
                                      <th className="p-2.5 text-center">Année Scolaire</th>
                                      <th className="p-2.5 text-right">Recettes</th>
                                      <th className="p-2.5 text-right">Dépenses</th>
                                      <th className="p-2.5 text-right">Solde Caisse</th>
                                      <th className="p-2.5">Archivé par</th>
                                      <th className="p-2.5 text-center">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {reports.map((rep) => {
                                      const hasPositiveBalance = rep.netBalance >= 0;
                                      return (
                                        <tr 
                                          key={rep.id} 
                                          className="hover:bg-slate-50 report-table-row transition-all border-b border-slate-100 last:border-0" 
                                          data-year={rep.year}
                                        >
                                          <td className="p-2.5 whitespace-nowrap">
                                            <div className="font-black text-slate-800">{rep.period}</div>
                                            <span className={`inline-block text-[9px] font-bold uppercase rounded px-1.5 py-0.5 mt-0.5 ${
                                              rep.type === "annuel" 
                                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                                : "bg-purple-100 text-purple-800 border border-purple-200"
                                            }`}>
                                              {rep.type === "annuel" ? "👑 Annuel" : "🗓️ Mensuel"}
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                                            {rep.year}
                                          </td>
                                          <td className="p-2.5 text-right text-emerald-700 font-mono font-bold">
                                            +{rep.totalIncome.toLocaleString()}
                                          </td>
                                          <td className="p-2.5 text-right text-rose-700 font-mono font-bold">
                                            -{rep.totalExpense.toLocaleString()}
                                          </td>
                                          <td className="p-2.5 text-right font-mono font-black">
                                            <span className={`px-2 py-0.5 rounded-lg font-bold ${
                                              hasPositiveBalance 
                                                ? "bg-emerald-50 text-emerald-800" 
                                                : "bg-rose-50 text-rose-800"
                                            }`}>
                                              {(rep.netBalance || 0).toLocaleString()} FCFA
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                                            <div className="font-bold text-slate-755">{rep.recordedBy || "Caisse"}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              {new Date(rep.dateCreated || new Date()).toLocaleDateString("fr-FR")}
                                            </div>
                                            {rep.comments && (
                                              <p className="text-[10px] italic text-slate-400 mt-0.5 block max-w-[130px] truncate" title={rep.comments}>
                                                💬 {rep.comments}
                                              </p>
                                            )}
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <button
                                              type="button"
                                              onClick={() => handleReportDelete(rep.id)}
                                              className="p-1 px-1.5 text-rose-600 hover:bg-rose-50 rounded"
                                              title="Supprimer ce bilan"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}


                {/* TAB 6: GLOBAL TEXT & LANDING TEXT CONFIG (Site Configuration) */}
                {adminTab === "config" && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Configurations de la Page d'Accueil</h3>

                    <form onSubmit={handleConfigUpdate} className="space-y-6 text-xs font-semibold">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Nom Officiel de l'École *</label>
                          <input
                            type="text"
                            required
                            value={dbConfig?.schoolName || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, schoolName: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Numéro de téléphone Secrétariat *</label>
                          <input
                            type="text"
                            required
                            value={dbConfig?.phone || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, phone: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Grand Titre de la page d'accueil (Hero Title) *</label>
                          <input
                            type="text"
                            required
                            value={dbConfig?.homeTitle || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, homeTitle: e.target.value })}
                            className="w-full p-2.5 border rounded-xl text-sm font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Sous-titre explicatif *</label>
                          <textarea
                            required
                            rows={2}
                            value={dbConfig?.homeSubtitle || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, homeSubtitle: e.target.value })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Mot De Bienvenue de l'école *</label>
                          <textarea
                            required
                            rows={3}
                            value={dbConfig?.welcomeMessage || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, welcomeMessage: e.target.value })}
                            className="w-full p-2.5 border rounded-xl leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Présentation Historique *</label>
                          <textarea
                            required
                            rows={3}
                            value={dbConfig?.historyText || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, historyText: e.target.value })}
                            className="w-full p-2.5 border rounded-xl leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Financial configuration items */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Frais d'Inscription Annuel Standard (FCFA)</label>
                          <input
                            type="number"
                            value={dbConfig?.registrationFee || 50000}
                            onChange={(e) => setDbConfig({ ...dbConfig!, registrationFee: Number(e.target.value) })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 uppercase mb-1">Mensualité Scolaire Moyenne (FCFA)</label>
                          <input
                            type="number"
                            value={dbConfig?.monthlyFee || 35000}
                            onChange={(e) => setDbConfig({ ...dbConfig!, monthlyFee: Number(e.target.value) })}
                            className="w-full p-2.5 border rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Broadcast Banner controls */}
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={dbConfig?.showBanner || false}
                            onChange={(e) => setDbConfig({ ...dbConfig!, showBanner: e.target.checked })}
                            className="text-amber-600 focus:ring-transparent rounded"
                          />
                          <span className="text-xs font-bold text-amber-950">Afficher la bannière d'alerte générale en haut du site</span>
                        </label>

                        <div>
                          <label className="block text-[10px] text-amber-800 uppercase mb-1">Message d'alerte / Annonce urgente à diffuser</label>
                          <input
                            type="text"
                            value={dbConfig?.bannerMessage || ""}
                            onChange={(e) => setDbConfig({ ...dbConfig!, bannerMessage: e.target.value })}
                            className="w-full p-2 border rounded-xl bg-white text-xs font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-850 hover:bg-emerald-950 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Enregistrer l'ensemble de la Configuration Accueil
                      </button>
                    </form>
                  </div>
                )}


                {/* TAB 8: GESTION DES COMPTES UTILISATEURS MULTI-NIVEAUX (Uniquement Super Admin) */}
                {adminTab === "users" && currentUser?.role === "admin" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Form to create/edit user */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          {editingUser.id ? "Modifier le Collaborateur" : "Créer un Nouveau Collaborateur"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Enregistrez un nouveau membre de l'équipe scolaire avec un niveau d'accès sécurisé et spécifique.
                        </p>
                      </div>

                      <form onSubmit={handleUserSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Nom Complet du Collaborateur *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex : Mme. Diop Chantal"
                            value={editingUser.fullName || ""}
                            onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                            className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Identifiant unique *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: chantal_sec"
                              value={editingUser.username || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                              className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Mot de passe de sécurité *</label>
                            <input
                              type="text"
                              required
                              placeholder="Saisissez un code d’accès"
                              value={editingUser.password || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                              className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none font-mono text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Niveau d'Accès / Rôle attribué *</label>
                          <select
                            value={editingUser.role || "secretaire"}
                            onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })}
                            className="w-full p-2.5 border rounded-xl bg-white focus:border-blue-500 focus:outline-none text-xs font-bold"
                          >
                            <option value="secretaire">📁 Secrétaire / Comptable (Élèves, Paiements, Messages)</option>
                            <option value="educateur">🎓 Éducateur / Administration Pédagogique (Actualités, Notes, Calendrier)</option>
                            <option value="admin">⭐ Super Administrateur (Accès complet à toutes les fonctionnalités)</option>
                          </select>
                          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/55 mt-2 text-[10px] font-medium text-slate-600 space-y-1">
                            <p className="font-bold text-slate-800">Permissions du rôle sélectionné :</p>
                            {editingUser.role === "secretaire" && (
                              <p>• Consultation & inscriptions de la Base élèves, encaissement des frais scolaires, réception de l'aide et messages formulaire de contact.</p>
                            )}
                            {editingUser.role === "educateur" && (
                              <p>• Rédaction d'actualités d'établissement scolaires, publication de consignes/notes scolaires pour les parents, mise à jour du calendrier officiel.</p>
                            )}
                            {editingUser.role === "admin" && (
                              <p>• Droits d'administration universels et de configuration générale du site. Gestion des comptes utilisateurs d'autres collaborateurs.</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          {editingUser.id && (
                            <button
                              type="button"
                              onClick={() => setEditingUser({ username: "", password: "", fullName: "", role: "secretaire" })}
                              className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Annuler
                            </button>
                          )}
                          <button
                            type="submit"
                            className="flex-[2] py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                          >
                            <Plus className="w-4 h-4 text-emerald-300" />
                            <span>{editingUser.id ? "Confirmer la modification" : "Ajouter le collaborateur"}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Users Grid / List Column */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Collaborateurs Enregistrés</h3>
                        <p className="text-xs text-slate-500 mt-1">Vous avez actuellement {userList.length} collaborateurs disposant d'un compte.</p>
                      </div>

                      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] pr-2">
                        {userList.map((usr) => {
                          let badgeStyle = "bg-amber-50 text-amber-800 border-amber-100";
                          let badgeName = "Super Admin";
                          if (usr.role === "secretaire") {
                            badgeStyle = "bg-sky-50 text-sky-800 border-sky-100";
                            badgeName = "Secrétariat / Comptabilité";
                          } else if (usr.role === "educateur") {
                            badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-100";
                            badgeName = "Enseignant / Éducateur";
                          }

                          return (
                            <div key={usr.id} className="py-4 flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-extrabold text-slate-900">{usr.fullName}</h4>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${badgeStyle}`}>
                                    {badgeName}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed">
                                  <p>Identifiant : <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-blue-900">{usr.username}</code></p>
                                  <p>Mot de passe : <span className="font-mono text-slate-500 select-all font-bold">{usr.password}</span></p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingUser(usr);
                                    window.scrollTo({ top: 400, behavior: "smooth" });
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-xs"
                                  title="Modifier cet utilisateur"
                                >
                                  Éditer
                                </button>
                                {usr.id !== "usr_admin" && (
                                  <button
                                    onClick={() => handleUserDelete(usr.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                                    title="Supprimer définitivement"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}


                {/* TAB 9: GESTION DE LA GALERIE D'IMAGES (Uniquement Super Admin) */}
                {adminTab === "gallery" && currentUser?.role === "admin" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Form to add image */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          Ajouter une Photo à la Galerie
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Enregistrez une nouvelle image dans l'album photos officiel de l'établissement. Celle-ci sera automatiquement affichée sur la page publique.
                        </p>
                      </div>

                      <form onSubmit={handleAddPhoto} className="space-y-4 text-xs font-semibold text-slate-700">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Titre de la Photo *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex : Remise des prix et médailles d'excellence"
                            value={newPhotoForm.title}
                            onChange={(e) => setNewPhotoForm({ ...newPhotoForm, title: e.target.value })}
                            className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">URL absolue de l'image *</label>
                          <input
                            type="url"
                            required
                            placeholder="Ex: https://images.unsplash.com/photo-..."
                            value={newPhotoForm.url}
                            onChange={(e) => setNewPhotoForm({ ...newPhotoForm, url: e.target.value })}
                            className="w-full p-2.5 border rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                          />
                          <p className="text-[10px] text-slate-400 font-normal mt-1">
                            Veuillez fournir un lien d'image hébergé valide (ex: Unsplash).
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Catégorie *</label>
                            <select
                              value={newPhotoForm.category}
                              onChange={(e) => setNewPhotoForm({ ...newPhotoForm, category: e.target.value })}
                              className="w-full p-2.5 border rounded-xl bg-white focus:border-blue-500 focus:outline-none text-xs font-bold"
                            >
                              <option value="fetes">Fêtes & Célébrations</option>
                              <option value="activites">Activités Pédagogiques</option>
                              <option value="infrastructure">Infrastructure & Salles</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Année Scolaire *</label>
                            <select
                              value={newPhotoForm.year}
                              onChange={(e) => setNewPhotoForm({ ...newPhotoForm, year: e.target.value })}
                              className="w-full p-2.5 border rounded-xl bg-white focus:border-blue-500 focus:outline-none text-xs font-bold"
                            >
                              {ACADEMIC_YEARS.map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                        >
                          <Plus className="w-4 h-4 text-emerald-300" />
                          <span>Ajouter la photo à la galerie</span>
                        </button>
                      </form>
                    </div>

                    {/* Images List Column */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Photos de la Galerie</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Il y a actuellement {galleryPhotos.length} photos enregistrées dans l'album de l'école.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[500px] pr-2">
                        {galleryPhotos.map((photo) => (
                          <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex flex-col">
                            <div className="aspect-video w-full overflow-hidden bg-slate-200 relative">
                              <img 
                                src={photo.url} 
                                alt={photo.title} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="p-1.5 bg-white/95 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg shadow-sm transition-all cursor-pointer"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between gap-1">
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">{photo.title}</h4>
                                <p className="text-[10px] text-slate-500 font-medium font-bold">Année : <span className="font-semibold text-slate-700">{photo.year}</span></p>
                              </div>
                              <span className="text-[9px] self-start px-2 py-0.5 font-bold uppercase rounded bg-blue-50 text-blue-800 border border-blue-100">
                                {photo.category === "fetes" ? "Fêtes scolaire" : photo.category === "activites" ? "Activités" : "Infrastructures"}
                              </span>
                            </div>
                          </div>
                        ))}
                        {galleryPhotos.length === 0 && (
                          <div className="col-span-2 text-center py-10 text-slate-400 text-xs">
                            <p>Aucune image enregistrée pour le moment.</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

          </section>
        )}

      </main>

      {/* FOOTER */}
      <footer id="app_footer" className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-850 mt-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-white font-bold mb-3">
                <GraduationCap className="text-blue-500 w-6 h-6" />
                <span>{dbConfig?.schoolName || "Héritage Divin"}</span>
              </div>
              <p className="leading-relaxed">
                Apprendre avec foi, rigueur et excellence pour devenir les bâtisseurs vertueux du monde de demain. Du pré-primaire jusqu'à la 5<sup>ème</sup>.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Accès Rapides</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => { setView("home"); setTimeout(() => document.getElementById("news")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="hover:text-white transition-colors">
                    Actualités & Événements
                  </button>
                </li>
                <li>
                  <button onClick={() => { setView("home"); setTimeout(() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="hover:text-white transition-colors">
                    Calendrier Scolaire Annuel
                  </button>
                </li>
                <li>
                  <button onClick={() => { setView("home"); setTimeout(() => document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="hover:text-white transition-colors">
                    Galerie Photo en Images
                  </button>
                </li>
                <li>
                  <button onClick={() => setView("register")} className="hover:text-white text-amber-500 font-bold transition-colors">
                    Fiche d'Inscription en ligne
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Notre Implantation</h4>
              <p className="leading-relaxed mb-3">
                {dbConfig?.address || "Quartier Montalier, Libreville, Gabon"}
              </p>
              <p className="text-white font-mono font-bold">
                Tél : {dbConfig?.phone}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} Institution Scolaire {dbConfig?.schoolName || "Héritage Divin"}. Tous droits réservés.</p>
            <div className="flex items-center gap-3">
              <p>
                Supervisé par <a href="mailto:heritierulrich9@gmail.com" className="text-blue-400 hover:text-amber-400 hover:underline font-bold font-mono">heritierulrich9@gmail.com</a>
              </p>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => {
                  setView("admin");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer font-semibold text-[11px]"
                title="Accès sécurisé pour l'administration de l'école"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAdminLoggedIn ? "Espace Admin" : "Connexion Admin"}</span>
              </button>
            </div>
          </div>

        </div>
      </footer>


      {/* Lightbox / Image Zoom Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close button top right */}
          <button 
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/10 z-50 shadow-lg"
            title="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Left Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = filteredGallery.findIndex(p => p.id === selectedPhoto.id || p.url === selectedPhoto.url);
              if (currentIndex !== -1 && filteredGallery.length > 1) {
                const prevIndex = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
                setSelectedPhoto(filteredGallery[prevIndex]);
              }
            }}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/10 z-50 shadow-lg"
            title="Précédent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Main Visual Frame */}
          <div 
            className="relative max-w-5xl w-full max-h-[75vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl border border-white/10 animate-scale-up"
            />
          </div>

          {/* Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = filteredGallery.findIndex(p => p.id === selectedPhoto.id || p.url === selectedPhoto.url);
              if (currentIndex !== -1 && filteredGallery.length > 1) {
                const nextIndex = (currentIndex + 1) % filteredGallery.length;
                setSelectedPhoto(filteredGallery[nextIndex]);
              }
            }}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/10 z-50 shadow-lg"
            title="Suivant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Bottom Descriptive Caption */}
          <div 
            className="mt-6 text-center max-w-2xl px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
              <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider font-mono bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-lg">
                {selectedPhoto.category === "activites" ? "📝 Activité" : selectedPhoto.category === "fetes" ? "🎉 Fête" : "🏫 Locaux"}
              </span>
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-wider font-mono bg-amber-950/80 border border-amber-800/40 px-2 py-0.5 rounded-lg">
                🎓 Année {selectedPhoto.year}
              </span>
            </div>
            <h4 className="text-white text-base font-extrabold tracking-tight">
              {selectedPhoto.title}
            </h4>
          </div>
        </div>
      )}


    </div>
  );
}
