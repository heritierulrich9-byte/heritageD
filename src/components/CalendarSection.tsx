import { useState } from "react";
import { Calendar, Clock, MapPin, Tag, Flag, GraduationCap, Sparkles } from "lucide-react";

interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: "vacances" | "examens" | "fete" | "reunion" | "autre";
  description: string;
  location?: string;
}

const DEFAULT_EVENTS: SchoolEvent[] = [
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
    description: "Arrêt des cours le mercredi soir après les classes. Reprise des cours le lundi 2 Novembre au matin pour tous les niveaux scolaires.",
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
    location: "Aurore - Pavillon Festif Héritage Divin",
  },
  {
    id: "ev6",
    title: "Vacances de Noël et du Nouvel An",
    date: "2026-12-19",
    category: "vacances",
    description: "Période de repos festif. Fermeture de l'établissement. Réouverture prévue le lundi 4 Janvier 2027.",
  },
  {
    id: "ev7",
    title: "Compositions du Deuxième Trimestre",
    date: "2027-03-08",
    time: "08:00 - 15:00",
    category: "examens",
    description: "Semaine intensive d'examens écrits et d'exercices d'application pour consolider les notes du deuxième trimestre.",
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
];

interface CalendarSectionProps {
  events?: SchoolEvent[];
}

export default function CalendarSection({ events: propEvents }: CalendarSectionProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const events = propEvents || DEFAULT_EVENTS;

  const categories = [
    { value: "all", label: "Tous les événements" },
    { value: "vacances", label: "Congés & Vacances", color: "bg-rose-100 text-rose-800 border-rose-200" },
    { value: "examens", label: "Évaluations & Examens", color: "bg-amber-100 text-amber-800 border-amber-200" },
    { value: "fete", label: "Fêtes & Célébrations", color: "bg-purple-100 text-purple-800 border-purple-200" },
    { value: "reunion", label: "Réunions de Parents", color: "bg-blue-100 text-blue-800 border-blue-200" },
  ];

  const filteredEvents = selectedCategory === "all"
    ? events
    : events.filter((e) => e.category === selectedCategory);

  // Format date readable in French
  const formatFrenchDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', options);
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "vacances": return { label: "Congés", bg: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-600" };
      case "examens": return { label: "Examen", bg: "bg-amber-50 text-amber-800 border-amber-100", dot: "bg-amber-500" };
      case "fete": return { label: "Célébration", bg: "bg-purple-50 text-purple-700 border-purple-100", dot: "bg-purple-500" };
      case "reunion": return { label: "Réunion", bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" };
      default: return { label: "Évènement", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-600" };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 mb-2">
            <Calendar className="w-3.5 h-3.5" /> Planification Académique
          </span>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
            Calendrier Pédagogique 2026-2027
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Découvrez les échéances, congés, examens et temps forts de notre académie scolaire.
          </p>
        </div>

        {/* Dynamic event counter */}
        <div className="bg-gradient-to-br from-blue-50 via-amber-50 to-emerald-50 border border-blue-100/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-blue-600 outline outline-4 outline-blue-100 text-white rounded-xl p-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-950">{events.length}</div>
            <div className="text-xs text-slate-500 font-semibold">Activités annuelles</div>
          </div>
        </div>
      </div>

      {/* Category selector chips */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-100 pb-5">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              selectedCategory === cat.value
                ? "bg-blue-800 border-blue-800 text-white shadow-md shadow-blue-500/10"
                : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Events timeline list */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl">
          <p className="text-gray-500 font-medium">Aucun événement ne correspond à cette catégorie actuellement.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-dashed border-gray-100 pl-4 sm:pl-6 ml-3 space-y-6">
          {filteredEvents.map((ev, index) => {
            const theme = getCategoryTheme(ev.category);
            return (
              <div 
                key={ev.id} 
                className="relative group transition-all"
                id={`calendar_event_${ev.id}`}
              >
                {/* Timeline node */}
                <div className={`absolute -left-8 sm:-left-10 top-1.5 w-4 h-4 rounded-full border-2 border-white ring-4 ring-gray-50 transition-transform group-hover:scale-110 ${theme.dot}`} />

                <div className="bg-white p-5 rounded-2xl border border-gray-100/85 hover:border-emerald-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-widest font-mono">
                      {formatFrenchDate(ev.date)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${theme.bg}`}>
                      <Tag className="w-3 h-3" />
                      {theme.label}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-gray-900 group-hover:text-emerald-800 transition-colors">
                    {ev.title}
                  </h4>

                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {ev.description}
                  </p>

                  {/* Metadata labels */}
                  {(ev.time || ev.location) && (
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-50 flex flex-wrap gap-4 text-xs font-medium text-gray-500">
                      {ev.time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {ev.time}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
