import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { 
  GraduationCap, LayoutDashboard, ShieldAlert, LogOut, LogIn, UserPlus,
  BarChart3, Layers, Bot, MessageSquare, Settings, Globe, Menu, X
} from "lucide-react";

export default function Navbar({ activeTab, setActiveTab, setIsAiOpen }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isAdmin = user?.is_admin === true;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const languages = [
    { code: "en", name: "English" },
    { code: "kn", name: "ಕನ್ನಡ" },
    { code: "hi", name: "हिन्दी" },
    { code: "te", name: "తెలుగు" },
    { code: "ta", name: "தமிழ்" },
    { code: "ml", name: "മലയാളം" },
  ];

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
      {/* Brand logo container */}
      <div 
        className="flex items-center gap-2.5 cursor-pointer shrink-0" 
        onClick={() => handleTabSelect(isAdmin ? "admin_analytics" : "home")}
      >
        <div className="bg-gradient-to-tr from-brand-600 to-cyan-400 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20 flex items-center justify-center">
          <GraduationCap className="h-5.5 w-5.5" />
        </div>
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-400 bg-clip-text text-transparent">
          {isAdmin ? (
            <>
              ExamHub <span className="text-rose-500 font-black">Admin</span>
            </>
          ) : (
            <>
              ExamHub <span className="text-brand-500 font-black">AI</span>
            </>
          )}
        </span>
      </div>

      {/* Navigation center tabs - Desktop */}
      <div className="hidden md:flex items-center gap-1.5">
        {isAdmin ? (
          <>
            <button
              onClick={() => handleTabSelect("admin_analytics")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "admin_analytics"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <BarChart3 className="h-4 w-4 text-emerald-450" />
              {t("analytics")}
            </button>

            <button
              onClick={() => handleTabSelect("admin_exams_crud")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "admin_exams_crud"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Layers className="h-4 w-4 text-indigo-400" />
              {t("exam_management")}
            </button>

            <button
              onClick={() => handleTabSelect("admin_ai_manager")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "admin_ai_manager"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Bot className="h-4 w-4 text-brand-400" />
              {t("ai_exam_manager")}
            </button>

            <button
              onClick={() => handleTabSelect("admin_suggestions")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "admin_suggestions"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <MessageSquare className="h-4 w-4 text-pink-400" />
              {t("user_suggestions")}
            </button>

            <button
              onClick={() => handleTabSelect("admin_settings")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "admin_settings"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Settings className="h-4 w-4" />
              {t("settings")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleTabSelect("home")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "home"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              Home
            </button>

            <button
              onClick={() => handleTabSelect("exams")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "exams"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              Explore Exams
            </button>

            {user && (
              <button
                onClick={() => handleTabSelect("dashboard")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "dashboard"
                    ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                {t("dashboard")}
              </button>
            )}
          </>
        )}
      </div>

      {/* Language Selector + Auth container - Desktop */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center bg-slate-950 border border-slate-850 hover:border-brand-500/30 rounded-xl px-2 py-1.5 transition-all text-slate-300">
          <Globe className="h-3.5 w-3.5 text-brand-400 mr-1.5" />
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-200">
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{user.full_name || user.email}</span>
              <span className="text-[10px] text-brand-500 font-medium">{isAdmin ? "Admin Console" : "Student Portal"}</span>
            </div>
            <button
              onClick={() => {
                logout();
                handleTabSelect("home");
              }}
              className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center h-9 w-9"
              title={t("logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabSelect("login")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:bg-slate-800/60 text-slate-350 hover:text-white text-xs font-semibold transition-all cursor-pointer h-9"
            >
              <LogIn className="h-3.5 w-3.5" />
              {t("login")}
            </button>
            <button
              onClick={() => handleTabSelect("signup")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all cursor-pointer h-9"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t("signup")}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Language Selector */}
      <div className="flex md:hidden items-center bg-slate-950 border border-slate-850 hover:border-brand-500/30 rounded-xl px-2 py-1.5 transition-all text-slate-355 shrink-0">
        <Globe className="h-3.5 w-3.5 text-brand-400 mr-1.5" />
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-200">
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b1329]/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 flex items-center justify-around md:hidden pb-safe mb-safe">
        {/* Home Tab */}
        <button
          onClick={() => handleTabSelect(isAdmin ? "admin_analytics" : "home")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-16 ${
            activeTab === "home" || activeTab === "admin_analytics" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[9px] font-bold">Home</span>
        </button>

        {/* Exams Tab */}
        <button
          onClick={() => handleTabSelect("exams")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-16 ${
            activeTab === "exams" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-xl">🔍</span>
          <span className="text-[9px] font-bold">Exams</span>
        </button>

        {/* Mani Tab */}
        <button
          onClick={() => setIsAiOpen(true)}
          className="flex flex-col items-center gap-1 cursor-pointer text-slate-400 hover:text-slate-200 w-16"
        >
          <span className="text-xl">🤖</span>
          <span className="text-[9px] font-bold">Mani</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => handleTabSelect(user ? (isAdmin ? "admin_settings" : "dashboard") : "login")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-16 ${
            activeTab === "dashboard" || activeTab === "login" || activeTab === "signup" || activeTab === "admin_settings"
              ? "text-brand-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="text-[9px] font-bold">Profile</span>
        </button>
      </div>
    </nav>
  );
}
