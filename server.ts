import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, getDocFromServer } from "firebase/firestore";

// Interfaces
interface Student {
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
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  category: "événement" | "académique" | "annonce" | "sport";
  imageUrl: string;
  active: boolean;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  targetAudience: string;
  critical: boolean;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  dateReceived: string;
}

interface PaymentRecord {
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

interface AppConfig {
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

interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: "vacances" | "examens" | "fete" | "reunion" | "autre";
  description: string;
  location?: string;
}

interface SchoolUser {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: "admin" | "secretaire" | "educateur";
  createdAt: string;
}

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Default initial data structure
const initialDb = {
  config: {
    schoolName: "Institution Scolaire Héritage Divin",
    homeTitle: "Élever des leaders guidés par l'excellence et les valeurs",
    homeSubtitle: "Du pré-primaire jusqu'à la 5ème - Une éducation de qualité et un suivi personnalisé pour le succès de vos enfants.",
    welcomeMessage: "Bienvenue à l'école Héritage Divin. Notre mission est d'offrir un cadre pédagogique d'excellence où chaque élève peut développer son plein potentiel intellectuel, moral et spirituel. De la petite section de maternelle à la classe de 5ème, nous cultivons le goût de l'effort, la curiosité d'esprit et le respect de l'autre.",
    historyText: "Fondée avec la vision d'offrir une formation solide et abordable, l'école Héritage Divin s'est imposée comme une référence d'apprentissage et de rigueur. Nous disposons d'enseignants qualifiés, de salles d'apprentissage modernes et conviviales, et d'un environnement sécurisé pour l'épanouissement de chaque enfant.",
    address: "Quartier Montalier, Libreville, Gabon",
    phone: "+225 07 48 99 11 22 / +225 27 22 45 67 89",
    email: "heritierulrich9@gmail.com",
    registrationFee: 50000, // FCFA or default currency units
    monthlyFee: 35000,
    bannerMessage: "🎉 Les inscriptions et réinscriptions pour l'année scolaire 2026-2027 sont officiellement ouvertes ! Contactez le secrétariat pour plus de détails.",
    showBanner: true,
    registrationOpen: true
  } as AppConfig,
  students: [
    {
      id: "stud_1",
      firstName: "Marlène",
      lastName: "Koffi",
      dateOfBirth: "2018-04-12",
      className: "CP",
      gender: "F",
      parentName: "Jean-Noël Koffi",
      parentPhone: "+225 07 08 09 10 11",
      parentEmail: "koffi.jn@gmail.com",
      registrationType: "reinscription",
      status: "approuvé",
      paymentStatus: "payé",
      tuitionPaid: 350000,
      totalTuition: 350000,
      dateCreated: "2026-05-10T10:00:00Z"
    },
    {
      id: "stud_2",
      firstName: "David",
      lastName: "Yao",
      dateOfBirth: "2015-09-22",
      className: "CM2",
      gender: "M",
      parentName: "Awa Yao",
      parentPhone: "+225 05 55 66 77 88",
      parentEmail: "awa.yao@outlook.com",
      registrationType: "inscription",
      status: "approuvé",
      paymentStatus: "partiel",
      tuitionPaid: 200000,
      totalTuition: 350000,
      dateCreated: "2026-05-15T14:30:00Z"
    },
    {
      id: "stud_3",
      firstName: "Samuel",
      lastName: "Bamba",
      dateOfBirth: "2021-02-18",
      className: "Maternelle (Moyenne Section)",
      gender: "M",
      parentName: "Marc Bamba",
      parentPhone: "+225 01 02 03 04 05",
      parentEmail: "sam.bamba@gmail.com",
      registrationType: "inscription",
      status: "en_attente",
      paymentStatus: "non_payé",
      tuitionPaid: 0,
      totalTuition: 300000,
      dateCreated: "2026-06-01T08:15:00Z"
    }
  ] as Student[],
  news: [
    {
      id: "news_1",
      title: "Célébration de la Fête de Fin d'Année",
      content: "Chers parents, la fête annuelle de notre établissement aura lieu le vendredi 19 juin à partir de 14h. Au programme : chorales, danses des élèves de la maternelle, remises de prix scolaires d'excellence pour chaque classe, et un cocktail de fin de cérémonie. Venez nombreux célébrer le travail de nos enfants !",
      date: "2026-06-15",
      category: "événement",
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800",
      active: true
    },
    {
      id: "news_2",
      title: "Campagne de Rentrée : Réinscriptions anticipées",
      content: "Pour éviter l'affluence de septembre, le secrétariat est ouvert tout l'été pour enregistrer les réinscriptions collectives. Des facilités de paiement échelonné sont accordées pour tout dossier validé avant le 20 juillet. Les places sont limitées !",
      date: "2026-05-28",
      category: "annonce",
      imageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800",
      active: true
    },
    {
      id: "news_3",
      title: "Résultats d'Excellence au Concours Inter-écoles",
      content: "Félicitations à l'équipe de l'école Héritage Divin qui a remporté la 2ème place du grand concours de dictée et calcul mental de Libreville ! Nos élèves de CM1 et CM2 ont fait honneur à l'établissement ainsi qu'à leurs professeurs.",
      date: "2026-05-10",
      category: "académique",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800",
      active: true
    }
  ] as NewsItem[],
  notes: [
    {
      id: "note_1",
      title: "Consignes sanitaires et port de la tenue scolaire",
      content: "Nous rappelons à l'ensemble des parents que la tenue officielle de l'école est obligatoire tous les jours, sauf le mercredi lors de l'activité sportive où le bas de survêtement est toléré. De plus, merci de garder vos enfants à domicile en cas de fièvre déclarée supérieure à 38°C.",
      date: "2026-06-02",
      targetAudience: "Tous les parents",
      critical: true
    },
    {
      id: "note_2",
      title: "Réunions parents-enseignants du 3ème Trimestre",
      content: "La réunion de remise des carnets de notes se tiendra ce samedi de 08h à 12h. Chaque parent devra s'entretenir de façon individuelle avec le titulaire de classe pour dresser le bilan d'orientation annuelle de l'écolier.",
      date: "2026-06-04",
      targetAudience: "Primaire (CP à CM2)",
      critical: false
    }
  ] as NoteItem[],
  messages: [
    {
      id: "msg_1",
      name: "Antoine Koffi",
      email: "koffi.ant@gmail.com",
      subject: "Demande de visite guidée",
      message: "Bonjour, je souhaiterais inscrire mon fils en classe de Maternelle (Moyenne section) à l'école Héritage Divin dès la rentrée prochaine. Serait-il possible de visiter les infrastructures et de rencontrer la directrice des études ? Merci beaucoup de votre retour.",
      dateReceived: "2026-06-03T11:40:00Z"
    }
  ] as ContactMessage[],
  payments: [
    {
      id: "pay_1",
      studentId: "stud_1",
      studentName: "Marlène Koffi",
      studentClass: "CP",
      amount: 150000,
      purpose: "Frais de scolarité - Tranche 1",
      paymentMethod: "Mobile Money (Orange Money)",
      transactionId: "OM_489291032XM",
      date: "2026-05-10T10:15:00Z",
      status: "validé"
    },
    {
      id: "pay_2",
      studentId: "stud_2",
      studentName: "David Yao",
      studentClass: "CM2",
      amount: 200000,
      purpose: "Frais de scolarité - Tranche 1 & 2",
      paymentMethod: "Carte Bancaire Visa",
      transactionId: "VISA_84920942001",
      date: "2026-05-15T14:40:00Z",
      status: "validé"
    }
  ] as PaymentRecord[],
  events: [
    {
      id: "ev1",
      title: "Grande Rentrée des Classes",
      date: "2026-09-14",
      time: "07:30 - 12:00",
      category: "autre",
      description: "Accueil chaleureux des nouveaux élèves du pré-primaire et du primaire par leurs éducateurs régionaux. Installation générale et début des cours.",
      location: "Cour principale de l'école"
    },
    {
      id: "ev2",
      title: "Congés de Toussaint",
      date: "2026-10-28",
      category: "vacances",
      description: "Arrêt des cours le mercredi soir après les classes. Reprise des cours le lundi 2 Novembre au matin pour tous les niveaux scolaires."
    },
    {
      id: "ev3",
      title: "Première Réunion Parents-Enseignants",
      date: "2026-11-07",
      time: "08:30 - 12:30",
      category: "reunion",
      description: "Prise de contact officielle avec le corps enseignant. Présentation du programme d'étude académique et des dispositifs de discipline.",
      location: "Salles de classes respectives"
    },
    {
      id: "ev4",
      title: "Évaluations du Premier Trimestre (Compositions)",
      date: "2026-12-07",
      time: "Toute la semaine",
      category: "examens",
      description: "Examens d'évaluation trimestrielle pour l'évaluation globale des acquis pour le CP, CE1, CE2, CM1, CM2 et les classes du Collège.",
      location: "Salles d'examens"
    },
    {
      id: "ev5",
      title: "Arbre de Noël & Spectacle Éducatif",
      date: "2026-12-18",
      time: "14:00 - 17:30",
      category: "fete",
      description: "Grand spectacle de danse théâtrale, chants chorales par les enfants de la maternelle, et distribution de cadeaux par le Père Noël.",
      location: "Aurore - Pavillon Festif Héritage Divin"
    },
    {
      id: "ev6",
      title: "Vacances de Noël et du Nouvel An",
      date: "2026-12-19",
      category: "vacances",
      description: "Période de repos festif. Fermeture de l'établissement. Réouverture prévue le lundi 4 Janvier 2027."
    },
    {
      id: "ev7",
      title: "Compositions du Deuxième Trimestre",
      date: "2027-03-08",
      time: "08:00 - 15:00",
      category: "examens",
      description: "Semaine intensive d'examens écrits et d'exercices d'application pour consolider les notes du deuxième trimestre."
    },
    {
      id: "ev8",
      title: "Fête de Fin d'Année Scolaire & Remise des Prix",
      date: "2027-06-18",
      time: "13:00 - 18:00",
      category: "fete",
      description: "Célébration solennelle récompensant les trois premiers majors de chaque promotion. Prestations artistiques et buffet partagé.",
      location: "Complexe Culturel de la Commune"
    }
  ] as SchoolEvent[],
  users: [
    {
      id: "usr_admin",
      username: "admin",
      password: "heritage2026_password",
      fullName: "Administration Générale",
      role: "admin",
      createdAt: "2026-06-06T12:00:00Z"
    },
    {
      id: "usr_sec",
      username: "secretaire",
      password: "secretaire123",
      fullName: "Services Administratifs & Caisse",
      role: "secretaire",
      createdAt: "2026-06-06T12:00:00Z"
    },
    {
      id: "usr_edu",
      username: "educateur",
      password: "educateur123",
      fullName: "Supervision Pédagogique",
      role: "educateur",
      createdAt: "2026-06-06T12:00:00Z"
    }
  ] as SchoolUser[],
  reports: [
    {
      id: "rep_1",
      year: "2025/2026",
      type: "mensuel",
      period: "Septembre 2025",
      totalIncome: 1450000,
      totalExpense: 350000,
      netBalance: 1100000,
      comments: "Frais de scolarité de rentrée. Bon démarrage de la collecte.",
      recordedBy: "Services Administratifs & Caisse",
      dateCreated: "2025-09-30T17:00:00Z"
    },
    {
      id: "rep_2",
      year: "2025/2026",
      type: "mensuel",
      period: "Octobre 2025",
      totalIncome: 2100000,
      totalExpense: 420000,
      netBalance: 1680000,
      comments: "Versement de la Tranche 1. Conforme aux prévisions du premier versement.",
      recordedBy: "Services Administratifs & Caisse",
      dateCreated: "2025-10-31T17:00:00Z"
    },
    {
      id: "rep_3",
      year: "2024/2025",
      type: "annuel",
      period: "Bilan global de l'année scolaire 2024-2025",
      totalIncome: 18450000,
      totalExpense: 6500000,
      netBalance: 11950000,
      comments: "Clôture annuelle de l'exercice précédent. Équilibre financier stable.",
      recordedBy: "Administration Générale",
      dateCreated: "2025-06-30T16:00:00Z"
    }
  ] as any[],
  gallery: [
    // 2024-2025
    { id: "g1", title: "Remise des prix des meilleurs élèves", category: "fetes", year: "2024-2025", url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800" },
    { id: "g2", title: "Projet maquette du Système Solaire", category: "activites", year: "2024-2025", url: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&q=80&w=800" },
    { id: "g3", title: "Sortie de découverte botanique en forêt", category: "activites", year: "2024-2025", url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800" },
    { id: "g4", title: "Spectacle de théâtre et chants de Noël d'enfants", category: "fetes", year: "2024-2025", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800" },
    { id: "g5", title: "Séance d'apprentissage à la nouvelle bibliothèque", category: "infrastructure", year: "2024-2025", url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=800" },
    { id: "g6", title: "Tournoi sportif de football inter-classes", category: "activites", year: "2024-2025", url: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&q=80&w=800" },

    // 2025-2026
    { id: "g7", title: "Inauguration du pôle bilingue et numérique", category: "infrastructure", year: "2025-2026", url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800" },
    { id: "g8", title: "Atelier citoyen d'apprentissage du recyclage", category: "activites", year: "2025-2026", url: "https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&q=80&w=800" },
    { id: "g9", title: "Cours de mathématiques ludiques et interactifs", category: "activites", year: "2025-2026", url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800" },
    { id: "g10", title: "Grande foire des sciences et créations technologiques", category: "activites", year: "2025-2026", url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800" },
    { id: "g11", title: "Rencontre d'athlétisme et sports d'été", category: "activites", year: "2025-2026", url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=800" },
    { id: "g12", title: "Atelier d'observation d'astronomie parents", category: "activites", year: "2025-2026", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800" },

    // 2026-2027
    { id: "g13", title: "Accueil chaleureux des nouveaux élèves écoliers", category: "fetes", year: "2026-2027", url: "https://images.unsplash.com/photo-1516534775068-ba3e84589d90?auto=format&fit=crop&q=80&w=800" },
    { id: "g14", title: "Nouvelle cour de récréation bilingue de l'école", category: "infrastructure", year: "2026-2027", url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800" },
    { id: "g15", title: "Ateliers libres d'éveil artistique et peinture", category: "activites", year: "2026-2027", url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800" },
    { id: "g16", title: "Inauguration du réfectoire scolaire moderne", category: "infrastructure", year: "2026-2027", url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800" },
    { id: "g17", title: "Grand concours de poésie et dictée générale", category: "activites", year: "2026-2027", url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800" },
    { id: "g18", title: "Initiation aux bases de la programmation informatique", category: "activites", year: "2026-2027", url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800" },
    { id: "g19", title: "Célébration des réussites de fin de cycle", category: "fetes", year: "2026-2027", url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800" },
    { id: "g20", title: "Installation des nouveaux écrans tactiles", category: "infrastructure", year: "2026-2027", url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800" },
    { id: "g21", title: "Ouverture officielle du pôle bilingue d'excellence", category: "infrastructure", year: "2026-2027", url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800" },
    { id: "g22", title: "Chorale et représentation théâtrale des CP", category: "fetes", year: "2026-2027", url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=800" }
  ] as any[]
};

// Firebase initialization and connection check
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
const firebaseApp = initializeApp(firebaseConfig);
const dbFirebase = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Memory database cache state
let dbInMemory: typeof initialDb | null = null;

async function syncAllToFirestore(data: typeof initialDb) {
  try {
    // 1. Config (single document)
    await setDoc(doc(dbFirebase, "config", "general"), data.config);

    // Helper to sync arrays of entities while deleting orphaned documents
    const syncCollection = async (collectionName: string, items: any[]) => {
      const activeIds = new Set(items.map(item => item.id));

      // Fetch existing documents from this collection in Firestore to find orphaned ones
      const snapshot = await getDocs(collection(dbFirebase, collectionName));
      for (const d of snapshot.docs) {
        if (!activeIds.has(d.id)) {
          // This document was deleted locally, delete from Firestore
          await deleteDoc(doc(dbFirebase, collectionName, d.id));
        }
      }

      // Write/update current items
      for (const item of items) {
        if (item.id) {
          await setDoc(doc(dbFirebase, collectionName, item.id), item);
        }
      }
    };

    // Parallelize collection syncs
    await Promise.all([
      syncCollection("news", data.news),
      syncCollection("notes", data.notes),
      syncCollection("students", data.students),
      syncCollection("messages", data.messages || []),
      syncCollection("payments", data.payments || []),
      syncCollection("events", data.events || []),
      syncCollection("users", data.users || []),
      syncCollection("reports", data.reports || []),
      syncCollection("gallery", data.gallery || [])
    ]);

    console.log("Synchronisation Firestore terminée avec succès !");
  } catch (err) {
    console.error("Échec de la synchronisation Firestore:", err);
  }
}

async function loadFromFirestore() {
  try {
    console.log("Démarrage du chargement initial depuis Firestore...");
    const data: any = { ...initialDb };

    // 1. Config
    const configDoc = await getDoc(doc(dbFirebase, "config", "general"));
    if (configDoc.exists()) {
      data.config = configDoc.data();
      // Auto-migrate address if it matches the old default
      if (data.config.address === "Quartier Résidentiel, Lot 450, Abidjan, Côte d'Ivoire") {
        data.config.address = "Quartier Montalier, Libreville, Gabon";
        await setDoc(doc(dbFirebase, "config", "general"), data.config);
      }
    } else {
      await setDoc(doc(dbFirebase, "config", "general"), initialDb.config);
    }

    // Helper to populate a collection list
    const populateCollection = async (colName: string, defaultItems: any[]) => {
      const snap = await getDocs(collection(dbFirebase, colName));
      if (!snap.empty) {
        return snap.docs.map(d => d.data());
      } else {
        // Populate if empty
        for (const item of defaultItems) {
          if (item.id) {
            await setDoc(doc(dbFirebase, colName, item.id), item);
          }
        }
        return defaultItems;
      }
    };

    data.news = await populateCollection("news", initialDb.news);
    data.notes = await populateCollection("notes", initialDb.notes);
    data.students = await populateCollection("students", initialDb.students);
    data.messages = await populateCollection("messages", initialDb.messages || []);
    data.payments = await populateCollection("payments", initialDb.payments || []);
    data.events = await populateCollection("events", initialDb.events || []);
    data.users = await populateCollection("users", initialDb.users || []);
    data.reports = await populateCollection("reports", initialDb.reports || []);
    data.gallery = await populateCollection("gallery", initialDb.gallery || []);

    dbInMemory = data;
    // Write back to DB_FILE as a persistent local cache/backup
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    console.log("Chargement depuis Firestore terminé et local db.json synchronisé !");
  } catch (err) {
    console.error("Impossible de récupérer les données Firestore sur le démarrage, chargement de secours local db.json...", err);
    if (fs.existsSync(DB_FILE)) {
      dbInMemory = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } else {
      dbInMemory = { ...initialDb };
    }
  }
}

// Validate connection
async function testConnection() {
  try {
    await getDocFromServer(doc(dbFirebase, "test", "connection"));
    console.log("Connexion Firebase Firestore validée avec succès !");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Veuillez vérifier votre configuration Firebase. Le client est hors ligne.");
    } else {
      console.log("Note : Première connexion ou démarrage hors ligne, poursuite de l'initialisation.");
    }
  }
}
testConnection();

// Helper inside server to load and save DB
function getDb() {
  if (dbInMemory) {
    return dbInMemory;
  }
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
      dbInMemory = { ...initialDb };
      return dbInMemory;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    dbInMemory = JSON.parse(data);
    
    let dirty = false;
    // Auto-migrate address if it matches the old default
    if (dbInMemory!.config && dbInMemory!.config.address === "Quartier Résidentiel, Lot 450, Abidjan, Côte d'Ivoire") {
      dbInMemory!.config.address = "Quartier Montalier, Libreville, Gabon";
      dirty = true;
    }
    // Inject events if missing
    if (!dbInMemory!.events) {
      dbInMemory!.events = initialDb.events;
      dirty = true;
    }
    // Inject users if missing
    if (!dbInMemory!.users) {
      dbInMemory!.users = initialDb.users;
      dirty = true;
    }
    // Inject reports if missing
    if (!dbInMemory!.reports) {
      dbInMemory!.reports = initialDb.reports;
      dirty = true;
    }
    // Inject gallery if missing
    if (!dbInMemory!.gallery) {
      dbInMemory!.gallery = initialDb.gallery;
      dirty = true;
    }
    // Migrate older students to have default academicYear if missing
    if (dbInMemory!.students && Array.isArray(dbInMemory!.students)) {
      dbInMemory!.students.forEach((s: any) => {
        if (!s.academicYear) {
          s.academicYear = "2025/2026";
          dirty = true;
        }
      });
    }

    if (dirty) {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbInMemory, null, 2), "utf8");
    }
    return dbInMemory!;
  } catch (error) {
    console.error("Erreur lors du chargement de la base de données:", error);
    dbInMemory = { ...initialDb };
    return dbInMemory;
  }
}

function saveDb(data: typeof initialDb) {
  try {
    dbInMemory = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    // Non-blocking background synchronization with cloud Firestore
    syncAllToFirestore(data).catch((err) => {
      console.error("Erreur d'arrière-plan synchro Firestore:", err);
    });
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la base de données:", error);
    return false;
  }
}

async function startServer() {
  // Load database from local cache/fallback first so server boots immediately
  getDb();

  // Run Firestore synchronization in the background without blocking the server startup
  loadFromFirestore().catch((err) => {
    console.error("Erreur de synchronisation initiale Firestore (arrière-plan) :", err);
  });

  const app = express();
  app.use(express.json());

  // Log requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // ====== API ROUTES ======

  // 1. App configuration (Home Text and settings)
  app.get("/api/config", (req, res) => {
    const db = getDb();
    res.json(db.config);
  });

  app.post("/api/config", (req, res) => {
    const db = getDb();
    db.config = { ...db.config, ...req.body };
    if (saveDb(db)) {
      res.json({ success: true, config: db.config });
    } else {
      res.status(500).json({ error: "Impossible de mettre à jour la configuration" });
    }
  });

  // 2. Announcements & News (Actualités)
  app.get("/api/news", (req, res) => {
    const db = getDb();
    res.json(db.news);
  });

  app.post("/api/news", (req, res) => {
    const db = getDb();
    const newsItem = req.body;
    
    if (!newsItem.id) {
      // Adding new news
      newsItem.id = "news_" + Date.now();
      newsItem.date = new Date().toISOString().split("T")[0];
      newsItem.active = true;
      db.news.unshift(newsItem);
    } else {
      // Updating editing news
      const index = db.news.findIndex((n: any) => n.id === newsItem.id);
      if (index !== -1) {
        db.news[index] = { ...db.news[index], ...newsItem };
      }
    }
    
    if (saveDb(db)) {
      res.json({ success: true, news: db.news });
    } else {
      res.status(500).json({ error: "Échec d'enregistrement de l'actualité" });
    }
  });

  app.delete("/api/news/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.news = db.news.filter((n: any) => n.id !== id);
    if (saveDb(db)) {
      res.json({ success: true, news: db.news });
    } else {
      res.status(500).json({ error: "Échec de suppression de l'actualité" });
    }
  });

  // 3. Information Notes
  app.get("/api/notes", (req, res) => {
    const db = getDb();
    res.json(db.notes);
  });

  app.post("/api/notes", (req, res) => {
    const db = getDb();
    const noteItem = req.body;
    
    if (!noteItem.id) {
      noteItem.id = "note_" + Date.now();
      noteItem.date = new Date().toISOString().split("T")[0];
      db.notes.unshift(noteItem);
    } else {
      const index = db.notes.findIndex((n: any) => n.id === noteItem.id);
      if (index !== -1) {
        db.notes[index] = { ...db.notes[index], ...noteItem };
      }
    }
    
    if (saveDb(db)) {
      res.json({ success: true, notes: db.notes });
    } else {
      res.status(500).json({ error: "Échec de sauvegarde de la note d'information" });
    }
  });

  app.delete("/api/notes/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.notes = db.notes.filter((n: any) => n.id !== id);
    if (saveDb(db)) {
      res.json({ success: true, notes: db.notes });
    } else {
      res.status(500).json({ error: "Échec de suppression de la note d'information" });
    }
  });

  // 4. Students Database (Base de données des élèves par classe)
  app.get("/api/students", (req, res) => {
    const db = getDb();
    res.json(db.students);
  });

  app.post("/api/students", (req, res) => {
    const db = getDb();
    const studentData = req.body;

    if (!studentData.id) {
      // Manual register or online submission
      studentData.id = "stud_" + Date.now();
      studentData.dateCreated = new Date().toISOString();
      studentData.status = studentData.status || "en_attente";
      studentData.paymentStatus = studentData.paymentStatus || "non_payé";
      studentData.tuitionPaid = Number(studentData.tuitionPaid || 0);
      studentData.totalTuition = Number(studentData.totalTuition || 350000);
      studentData.academicYear = studentData.academicYear || "2025/2026";
      db.students.unshift(studentData);
    } else {
      // Edit student info
      const index = db.students.findIndex((s: any) => s.id === studentData.id);
      if (index !== -1) {
        db.students[index] = { ...db.students[index], ...studentData };
      }
    }

    if (saveDb(db)) {
      res.json({ success: true, student: studentData, students: db.students });
    } else {
      res.status(500).json({ error: "Échec de l'enregistrement de l'élève" });
    }
  });

  app.delete("/api/students/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.students = db.students.filter((s: any) => s.id !== id);
    if (saveDb(db)) {
      res.json({ success: true, students: db.students });
    } else {
      res.status(500).json({ error: "Échec de suppression de l'élève" });
    }
  });

  // 5. Contact Message Sender
  // Directs messages to parent email and logs simulated success to heritierulrich9@gmail.com
  app.post("/api/contact", (req, res) => {
    const db = getDb();
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Veuillez remplir tous les champs du formulaire." });
    }

    const newMessage: ContactMessage = {
      id: "msg_" + Date.now(),
      name,
      email,
      subject,
      message,
      dateReceived: new Date().toISOString()
    };

    db.messages.unshift(newMessage);
    saveDb(db);

    console.log(`=============================================`);
    console.log(`SIMULATION EMAIL - NOTIFICATION`);
    console.log(`DESTINATAIRE REQUIS : heritierulrich9@gmail.com`);
    console.log(`EXPÉDITEUR : ${name} <${email}>`);
    console.log(`SUJET : ${subject}`);
    console.log(`MESSAGE :`);
    console.log(message);
    console.log(`=============================================`);

    res.json({
      success: true,
      message: "Votre message a été transmis avec succès. L'établissement et l'administrateur (heritierulrich9@gmail.com) ont été notifiés.",
      smsSimulated: true
    });
  });

  // Fetch administrator messages
  app.get("/api/messages", (req, res) => {
    const db = getDb();
    res.json(db.messages);
  });

  app.delete("/api/messages/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.messages = db.messages.filter((m: any) => m.id !== id);
    if (saveDb(db)) {
      res.json({ success: true, messages: db.messages });
    } else {
      res.status(500).json({ error: "Échec de suppression du message" });
    }
  });

  // 6. Payment records
  app.get("/api/payments", (req, res) => {
    const db = getDb();
    res.json(db.payments);
  });

  app.post("/api/payments", (req, res) => {
    const db = getDb();
    const { studentId, studentName, studentClass, amount, purpose, paymentMethod } = req.body;

    if (!studentName || !amount || !purpose || !paymentMethod) {
      return res.status(400).json({ error: "Informations de paiement incomplètes." });
    }

    const transactionId = `${paymentMethod.substring(0, 3).toUpperCase()}_${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const newPayment: PaymentRecord = {
      id: "pay_" + Date.now(),
      studentId: studentId || "stud_extern",
      studentName,
      studentClass: studentClass || "Non spécifié",
      amount: Number(amount),
      purpose,
      paymentMethod,
      transactionId,
      date: new Date().toISOString(),
      status: "validé"
    };

    db.payments.unshift(newPayment);

    // If matches an existing student, update their tuition payments
    if (studentId && studentId !== "stud_extern") {
      const sIndex = db.students.findIndex((s: any) => s.id === studentId);
      if (sIndex !== -1) {
        db.students[sIndex].tuitionPaid += Number(amount);
        if (db.students[sIndex].tuitionPaid >= db.students[sIndex].totalTuition) {
          db.students[sIndex].paymentStatus = "payé";
        } else if (db.students[sIndex].tuitionPaid > 0) {
          db.students[sIndex].paymentStatus = "partiel";
        } else {
          db.students[sIndex].paymentStatus = "non_payé";
        }
      }
    }

    if (saveDb(db)) {
      res.json({ success: true, payment: newPayment });
    } else {
      res.status(500).json({ error: "Une erreur est survenue lors du traitement du reçu de paiement." });
    }
  });

  // 7. Academic Calendar Events (Calendrier Scolaire)
  app.get("/api/events", (req, res) => {
    const db = getDb();
    res.json(db.events || []);
  });

  app.post("/api/events", (req, res) => {
    const db = getDb();
    const eventItem = req.body;

    if (!eventItem.title || !eventItem.date || !eventItem.category || !eventItem.description) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }

    if (!eventItem.id) {
      // Create new event
      eventItem.id = "ev_" + Date.now();
      db.events.push(eventItem);
    } else {
      // Edit existing event
      const index = db.events.findIndex((e: any) => e.id === eventItem.id);
      if (index !== -1) {
        db.events[index] = { ...db.events[index], ...eventItem };
      } else {
        return res.status(404).json({ error: "Événement introuvable." });
      }
    }

    // Sort events by date ascending
    db.events.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (saveDb(db)) {
      res.json({ success: true, events: db.events });
    } else {
      res.status(500).json({ error: "Échec de l'enregistrement de l'événement." });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.events = (db.events || []).filter((e: any) => e.id !== id);

    if (saveDb(db)) {
      res.json({ success: true, events: db.events });
    } else {
      res.status(500).json({ error: "Échec de suppression de l'événement." });
    }
  });

    res.json({
      success: true,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
        createdAt: matchedUser.createdAt
      }
    });
  });

  app.get("/api/users", (req, res) => {
    const db = getDb();
    const safeUsers = (db.users || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      createdAt: u.createdAt,
      password: u.password // accessible to the super-administrator for easy management
    }));
    res.json(safeUsers || []);
  });

  app.post("/api/users", (req, res) => {
    const db = getDb();
    const userItem = req.body;

    if (!userItem.username || !userItem.password || !userItem.fullName || !userItem.role) {
      return res.status(400).json({ error: "Tous les champs (identifiant, mot de passe, nom, role) sont requis." });
    }

    const isEditing = !!userItem.id;
    const existingIndex = (db.users || []).findIndex(
      (u: any) => u.username.toLowerCase() === userItem.username.toLowerCase() && (!isEditing || u.id !== userItem.id)
    );

    if (existingIndex !== -1) {
      return res.status(400).json({ error: "Cet identifiant (nom d'utilisateur) est déjà utilisé." });
    }

    if (!userItem.id) {
      // Create new user
      userItem.id = "usr_" + Date.now();
      userItem.createdAt = new Date().toISOString();
      db.users.push(userItem);
    } else {
      // Edit user
      const index = db.users.findIndex((u: any) => u.id === userItem.id);
      if (index !== -1) {
        db.users[index] = {
          ...db.users[index],
          username: userItem.username,
          password: userItem.password,
          fullName: userItem.fullName,
          role: userItem.role
        };
      } else {
        return res.status(404).json({ error: "Utilisateur introuvable." });
      }
    }

    if (saveDb(db)) {
      const safeUsers = db.users.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        createdAt: u.createdAt,
        password: u.password
      }));
      res.json({ success: true, users: safeUsers });
    } else {
      res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement de l'utilisateur." });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;

    if (id === "usr_admin") {
      return res.status(400).json({ error: "Le Super Administrateur principal d'origine ne peut pas être supprimé." });
    }

    db.users = (db.users || []).filter((u: any) => u.id !== id);

    if (saveDb(db)) {
      const safeUsers = db.users.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        createdAt: u.createdAt,
        password: u.password
      }));
      res.json({ success: true, users: safeUsers });
    } else {
      res.status(500).json({ error: "Une erreur est survenue lors de la suppression." });
    }
  });

  // 9. Financial Reports / Bilans (mensuels et annuels)
  app.get("/api/reports", (req, res) => {
    const db = getDb();
    res.json(db.reports || []);
  });

  app.post("/api/reports", (req, res) => {
    const db = getDb();
    const reportItem = req.body;

    if (!reportItem.year || !reportItem.type || !reportItem.period || reportItem.totalIncome === undefined) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }

    if (!reportItem.id) {
      reportItem.id = "rep_" + Date.now();
      reportItem.dateCreated = new Date().toISOString();
      db.reports = db.reports || [];
      db.reports.unshift(reportItem);
    } else {
      const index = db.reports.findIndex((r: any) => r.id === reportItem.id);
      if (index !== -1) {
        db.reports[index] = { ...db.reports[index], ...reportItem };
      }
    }

    if (saveDb(db)) {
      res.json({ success: true, reports: db.reports });
    } else {
      res.status(500).json({ error: "Échec de sauvegarde du rapport financier." });
    }
  });

  app.delete("/api/reports/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.reports = (db.reports || []).filter((r: any) => r.id !== id);
    if (saveDb(db)) {
      res.json({ success: true, reports: db.reports });
    } else {
      res.status(500).json({ error: "Échec de suppression du rapport financier." });
    }
  });

  // 10. Gallery Management (Gestion de la galerie d'images)
  app.get("/api/gallery", (req, res) => {
    const db = getDb();
    res.json(db.gallery || []);
  });

  app.post("/api/gallery", (req, res) => {
    const db = getDb();
    const photoItem = req.body;

    if (!photoItem.title || !photoItem.category || !photoItem.year || !photoItem.url) {
      return res.status(400).json({ error: "Tous les champs (titre, catégorie, année scolaire, URL de l'image) sont requis." });
    }

    if (!photoItem.id) {
      photoItem.id = "g_" + Date.now();
      photoItem.dateCreated = new Date().toISOString();
      db.gallery = db.gallery || [];
      db.gallery.unshift(photoItem);
    } else {
      const index = (db.gallery || []).findIndex((g: any) => g.id === photoItem.id);
      if (index !== -1) {
        db.gallery[index] = { ...db.gallery[index], ...photoItem };
      }
    }

    if (saveDb(db)) {
      res.json({ success: true, gallery: db.gallery });
    } else {
      res.status(500).json({ error: "Échec d'enregistrement de l'image dans la galerie." });
    }
  });

  app.delete("/api/gallery/:id", (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.gallery = (db.gallery || []).filter((g: any) => g.id !== id);

    if (saveDb(db)) {
      res.json({ success: true, gallery: db.gallery });
    } else {
      res.status(500).json({ error: "Échec de suppression de l'image de la galerie." });
    }
  });



  // ====== MIDDLEWARE VITE / STATIC STATS IN PROD ======

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur Héritage Divin démarré avec succès sur le port ${PORT}`);
    console.log(`Base de données locale de développement initialisée sous ${DB_FILE}`);
  });
}

startServer();
