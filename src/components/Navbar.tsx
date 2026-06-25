import { useState } from "react";
import { GraduationCap, Menu, X, CreditCard, ClipboardCheck, Calendar, Image, Bell, Mail, Settings, Phone } from "lucide-react";

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  schoolName: string;
  phone: string;
  isAdminLoggedIn: boolean;
}

export default function Navbar({ currentView, setView, schoolName, phone, isAdminLoggedIn }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: "home", label: "Accueil", icon: GraduationCap },
    { id: "register", label: "Inscriptions Directes", icon: ClipboardCheck },
  ];

  const quickSections = [
    { id: "news", label: "Actualités" },
    { id: "calendar", label: "Calendrier" },
    { id: "gallery", label: "Galerie" },
    { id: "notes", label: "Notes" },
    { id: "contact", label: "Contact & Messagerie" },
  ];

  const handleNav = (targetView: string, sectionId?: string) => {
    setView(targetView);
    setIsOpen(false);
    if (sectionId && targetView === "home") {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header id="app_navbar" className="sticky top-0 z-50 bg-white border-b border-blue-50/80 shadow-sm backdrop-blur-md bg-opacity-95">
      {/* Top micro-bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-amber-400 to-blue-800 text-white text-xs px-4 py-2 flex justify-between items-center sm:px-6">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          <span>Secrétariat : <strong className="text-amber-200">{phone}</strong></span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span>Horaires: Lun - Ven (07h30 - 17h30)</span>
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
          <span>Inscriptions En Ligne Ouvertes 2026-2027</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & School Name */}
          <div 
            onClick={() => handleNav("home")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="bg-gradient-to-tr from-emerald-600 via-amber-400 to-blue-600 text-white p-2.5 rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-blue-950 group-hover:text-emerald-700 transition-colors">
                {schoolName}
              </h1>
              <p className="text-xs text-amber-500 tracking-wider font-semibold uppercase">
                Pré-primaire jusqu'en 5<sup>ème</sup>
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav_link_${item.id}`}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? item.id === "register"
                        ? "bg-blue-50 text-blue-800 shadow-sm shadow-blue-100"
                        : "bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-100"
                      : "text-gray-600 hover:text-blue-700 hover:bg-blue-50/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}

            {/* Quick anchors within home page */}
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            <div className="flex items-center gap-1 text-xs">
              {quickSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleNav("home", sec.id)}
                  className="px-2.5 py-1.5 text-xs text-slate-550 font-semibold hover:text-blue-700 hover:bg-slate-100/50 transition-all rounded-lg"
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {isAdminLoggedIn && (
              <>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>

                {/* Admin Desk Button */}
                <button
                  id="nav_link_admin"
                  onClick={() => handleNav("admin")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentView === "admin"
                      ? "bg-amber-100 text-amber-900 shadow-sm"
                      : "bg-gray-50 text-gray-750 hover:bg-amber-50 hover:text-amber-805 border border-gray-100"
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-600 animate-spin-slow" />
                  Espace Admin
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex lg:hidden items-center gap-2">
            {isAdminLoggedIn && (
              <button
                onClick={() => handleNav("admin")}
                className={`p-2 rounded-xl border ${
                  currentView === "admin" 
                    ? "bg-amber-100 border-amber-200 text-amber-900" 
                    : "bg-gray-50 border-gray-100 text-gray-600"
                }`}
                title="Espace Admin"
              >
                <Settings className="w-5 h-5 text-amber-600" />
              </button>
            )}
            <button
              id="mobile_menu_button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none transition-all"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div id="mobile_navbar_panel" className="lg:hidden border-t border-gray-100 bg-white shadow-xl py-4 space-y-1 px-4 absolute w-full left-0 right-0 z-50 animate-fade-in">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                    currentView === item.id
                      ? "bg-emerald-50 text-emerald-950"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5 text-emerald-600" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-100 my-2 pt-2">
            <p className="text-xs font-semibold uppercase text-gray-400 px-4 mb-2">Sections de l'Accueil</p>
            <div className="grid grid-cols-2 gap-1.5 px-2">
              {quickSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleNav("home", sec.id)}
                  className="text-left px-3 py-2 text-sm text-gray-600 hover:bg-emerald-50 rounded-lg hover:text-emerald-800"
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>
          
          {isAdminLoggedIn && (
            <div className="pt-2">
              <button
                onClick={() => handleNav("admin")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 rounded-xl text-amber-900 font-semibold border border-amber-100"
              >
                <Settings className="w-5 h-5 text-amber-600 animate-spin-slow" />
                Accéder au Portail Admin
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
