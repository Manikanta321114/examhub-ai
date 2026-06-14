import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Exams from "./pages/Exams";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import FeedbackModal from "./components/FeedbackModal";
import { api } from "./services/api";

const AdminPanel = React.lazy(() => import("./pages/AdminPanel"));
const AIAssistant = React.lazy(() => import("./components/AIAssistant"));
import { GraduationCap, Bot, AlertCircle, ExternalLink, Loader2, ArrowRight } from "lucide-react";

function AppContent() {
  const [activeTab, setActiveTab] = useState("home");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiNotificationCount, setAiNotificationCount] = useState(0);
  const { user, loading } = useAuth();

  // Shared search states between Homepage and Exams page
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect & Safety Flow States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRedirecting, setShowRedirecting] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingExam, setPendingExam] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Monitor login changes for pending redirect link
  useEffect(() => {
    if (user) {
      const pending = sessionStorage.getItem("examhub_pending_apply");
      if (pending) {
        try {
          const exam = JSON.parse(pending);
          sessionStorage.removeItem("examhub_pending_apply");
          
          // Show "Redirecting you to official exam website..." loading overlay
          setShowRedirecting(true);
          setPendingExam(exam);
          
          setTimeout(() => {
            setShowRedirecting(false);
            setShowSafetyModal(true); // Open safety warning dialog
          }, 2500);
        } catch (err) {
          console.error("Failed to parse pending apply exam data:", err);
        }
      }
    }
  }, [user]);

  // Expose global app flow controller for Apply links
  useEffect(() => {
    window.triggerApplyFlow = (exam) => {
      setPendingExam(exam);
      if (!user) {
        setShowAuthModal(true);
      } else {
        setShowSafetyModal(true);
      }
    };
    window.triggerAuthFlow = () => {
      setShowAuthModal(true);
    };
    return () => {
      delete window.triggerApplyFlow;
      delete window.triggerAuthFlow;
    };
  }, [user]);

  const handleContinueApply = async () => {
    if (!pendingExam) return;
    try {
      // Record analytics click event
      await api.analytics.recordClick(pendingExam.id);
    } catch (err) {
      console.error("Failed to record analytics click:", err);
    }
    
    // Open the official external website
    window.open(pendingExam.official_link, "_blank", "noopener,noreferrer");
    setShowSafetyModal(false);
    setPendingExam(null);
  };

  // Default landing views based on role changes
  useEffect(() => {
    if (user?.is_admin) {
      setActiveTab("admin_analytics");
    } else {
      if (activeTab.startsWith("admin_")) {
        setActiveTab("home");
      }
    }
  }, [user]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <GraduationCap className="h-10 w-10 text-brand-500 animate-pulse" />
          <span className="text-slate-455 text-sm font-semibold">Verifying your secure session...</span>
        </div>
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <Home
            setActiveTab={setActiveTab}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case "exams":
        return (
          <Exams
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case "login":
        return <Login setActiveTab={setActiveTab} />;
      case "signup":
        return <Signup setActiveTab={setActiveTab} />;
      case "dashboard":
        return user ? <Dashboard /> : <Login setActiveTab={setActiveTab} />;
      case "admin_analytics":
        return user?.is_admin ? <AdminPanel initialTab="analytics" /> : <Home setActiveTab={setActiveTab} searchInput={searchInput} setSearchInput={setSearchInput} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case "admin_exams_crud":
        return user?.is_admin ? <AdminPanel initialTab="manual" /> : <Home setActiveTab={setActiveTab} searchInput={searchInput} setSearchInput={setSearchInput} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case "admin_ai_manager":
        return user?.is_admin ? <AdminPanel initialTab="ai" /> : <Home setActiveTab={setActiveTab} searchInput={searchInput} setSearchInput={setSearchInput} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case "admin_suggestions":
        return user?.is_admin ? <AdminPanel initialTab="suggestions" /> : <Home setActiveTab={setActiveTab} searchInput={searchInput} setSearchInput={setSearchInput} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case "admin_settings":
        return user?.is_admin ? <AdminPanel initialTab="settings" /> : <Home setActiveTab={setActiveTab} searchInput={searchInput} setSearchInput={setSearchInput} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      default:
        return (
          <Home
            setActiveTab={setActiveTab}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1120] text-slate-100 relative">
      {/* Dynamic Nav bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} setIsAiOpen={setIsAiOpen} />
      
      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 pb-24 md:py-6">
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
            <span className="text-slate-400 text-sm font-semibold">Loading page content...</span>
          </div>
        }>
          {renderContent()}
        </React.Suspense>
      </main>

      {/* Persistent Floating AI Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => setIsAiOpen(true)}
          className="bg-gradient-to-tr from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white p-4 rounded-2xl shadow-xl shadow-brand-500/25 border border-brand-500/30 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center group relative"
          title="Open ExamHub AI Assistant"
        >
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-xs font-bold whitespace-nowrap pr-0 group-hover:pr-2">
            {user?.is_admin ? "Mani AI" : "Ask AI Agent"}
          </span>
          <Bot className="h-6 w-6" />
          {aiNotificationCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-[#0b1120] animate-bounce">
              {aiNotificationCount > 9 ? "9+" : aiNotificationCount}
            </span>
          )}
        </button>
      </div>

      {/* AI Assistant Sidebar Panel */}
      <React.Suspense fallback={null}>
        <AIAssistant
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          setActiveTab={setActiveTab}
          setSearchInput={setSearchInput}
          setSearchQuery={setSearchQuery}
          onSummaryLoaded={(count) => setAiNotificationCount(count || 0)}
        />
      </React.Suspense>

      {/* AUTH GUARD MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#0f172a] border-x-0 sm:border border-slate-800 sm:rounded-2xl rounded-none w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 text-center relative min-h-screen sm:min-h-0 flex flex-col justify-center">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand-500 to-cyan-500" />
            <div className="mx-auto bg-brand-500/10 p-3 rounded-full text-brand-450 w-fit border border-brand-500/20 animate-pulse">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Login to continue 🚀</h3>
              <p className="text-slate-400 text-sm leading-relaxed px-4">
                Create your free ExamHub account to access official application links, save exams and get deadlines reminders.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  // Save redirect payload in session state
                  if (pendingExam) {
                    sessionStorage.setItem("examhub_pending_apply", JSON.stringify(pendingExam));
                  }
                  setShowAuthModal(false);
                  setActiveTab("login");
                }}
                className="w-full h-12 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Login / Sign Up <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setPendingExam(null);
                }}
                className="w-full h-12 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-450 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REDIRECTING NOTIFICATION LOADER */}
      {showRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1120]/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
            <div className="space-y-1">
              <span className="text-sm font-bold text-white">Redirecting you to official exam website...</span>
              <p className="text-xs text-slate-500">Preparing links for {pendingExam?.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* EXTERNAL LINK SAFETY MODAL */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500" />
            <div className="flex gap-3 items-start">
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/20 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">External Link Safety Warning</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  You are leaving ExamHub AI and visiting the official exam website:
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-900 px-3.5 py-3 rounded-xl break-all text-[11px] font-mono text-slate-500">
              {pendingExam?.official_link}
            </div>

            <div className="flex gap-3 pt-2 text-xs font-bold">
              <button
                onClick={() => {
                  setShowSafetyModal(false);
                  setPendingExam(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-400 text-center transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueApply}
                className="flex-1 py-2.5 bg-amber-550 hover:bg-amber-500 text-white rounded-xl text-center transition-all shadow-md shadow-amber-500/5 flex items-center justify-center gap-1"
              >
                Continue <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal Popup */}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}

      {/* Modern Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/25 py-8 px-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-slate-400">
            <span>ExamHub AI</span>
            <span className="text-[10px] bg-slate-800 text-slate-500 py-0.5 px-1.5 rounded">v1.0.0</span>
          </div>
          <p>© 2026 ExamHub AI Inc. All rights reserved. Empowering students around the world.</p>
          <div className="flex items-center gap-4 font-semibold text-slate-400">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="hover:text-brand-400 transition-colors cursor-pointer"
            >
              Help us improve
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
