
import React, { useState, useRef, useEffect } from "react";

// Simple Error Boundary to prevent UI crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-sm text-red-300">
          Mani AI temporarily unavailable. Please try again later.
        </div>
      );
    }
    return this.props.children;
  }
}

import { api } from "../services/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Send, Bot, User, Sparkles, X, ChevronRight, CornerDownLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import AIExamSuggestion from "./AIExamSuggestion";

const welcomeQuickButtons = [
  { label: "🎓 After 12th", query: "After 12th" },
  { label: "🎯 Government Jobs", query: "Government Jobs" },
  { label: "💻 Engineering", query: "Engineering" },
  { label: "🏥 Medical", query: "Medical" }
];

function AIAssistantContent({ isOpen, onClose, setActiveTab, setSearchInput, setSearchQuery, onSummaryLoaded }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const isGuest = !user;
  const isAdmin = user?.is_admin;

  const [guestMessageCount, setGuestMessageCount] = useState(() => {
    try {
      return parseInt(sessionStorage.getItem("examhub_guest_msg_count") || "0", 10);
    } catch (e) {
      return 0;
    }
  });

  const roleQuickActions = isAdmin
    ? [
        { label: "Scan", query: "Run AI Scan" },
        { label: "Reports", query: "Show today's exam report" },
        { label: "Reviews", query: "Show pending approvals" }
      ]
    : user
    ? [
        { label: "My Matches", query: "Show exams matching my profile" },
        { label: "Deadlines", query: "Show upcoming exam deadlines" },
        { label: "Saved Exams", query: "Show my saved exams" }
      ]
    : [
        { label: "After 12th", query: "After 12th" },
        { label: "Engineering", query: "Engineering exams" },
        { label: "Government", query: "Government job exams" }
      ];
  
  // Student context memory (Point 6)
  const [studentContext, setStudentContext] = useState({ education: "", stream: "", state: "", category: "" });

  // Saved Exams cache (Point 3)
  const [savedExamIds, setSavedExamIds] = useState(new Set());

  // Empty suggestion handling (Point 7)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [sugName, setSugName] = useState("");
  const [sugOrg, setSugOrg] = useState("");
  const [sugLink, setSugLink] = useState("");
  const [sugNotes, setSugNotes] = useState("");
  const [submittingSug, setSubmittingSug] = useState(false);
  const [sugSuccessIndex, setSugSuccessIndex] = useState(null);

  // Chat messages
  const [messages, setMessages] = useState([]);
  // Daily summary fetched from backend
  const [dailySummary, setDailySummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  // Track if welcome has been shown for this session
  const hasShownWelcomeRef = useRef(false);

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Existing scroll effect
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Fetch daily summary when the chat opens for the first time
  useEffect(() => {
    if (isOpen && !hasShownWelcomeRef.current && !loadingSummary) {
      setLoadingSummary(true);
      api.ai.dailySummary()
        .then((data) => {
          // Ensure admin greeting includes boss persona
          if (data.role === "admin" && !data.greeting.includes("Boss")) {
            data.greeting = `Hello Boss 👋\n${data.greeting}`;
          }
          // Provide default quick actions based on role if none supplied
          if (!data.quick_actions || data.quick_actions.length === 0) {
            if (data.role === "admin") {
              data.quick_actions = [
                { label: "Review AI Updates", query: "Review updates" },
                { label: "Run Scan", query: "Run AI Scan" },
                { label: "View Report", query: "View Report" },
              ];
            } else if (data.role === "student") {
              data.quick_actions = [
                { label: "Exam recommendations", query: "Show me exam recommendations" },
                { label: "Career guidance", query: "Career guidance" },
                { label: "Deadlines", query: "Upcoming deadlines" },
              ];
            } else {
              data.quick_actions = [];
            }
          }
          setDailySummary(data);
          const welcomeMessage = { role: "assistant", content: data.greeting };
          setMessages([welcomeMessage]);
          hasShownWelcomeRef.current = true;
          // Bubble notification count to parent for floating button badge
          if (onSummaryLoaded) onSummaryLoaded(data.notification_count || 0);
        })
        .catch((err) => {
          console.warn("Failed to fetch daily summary:", err);
          setSummaryError(true);
          // Fallback handling
          if (!user) {
            const fallback = { greeting: "Hi 👋 I'm Mani.\nReady to help you find opportunities 🚀", quick_actions: [] };
            setDailySummary({ ...fallback, role: "guest" });
            setMessages([{ role: "assistant", content: fallback.greeting }]);
          } else {
            // When user is logged in but API failed, show a minimal placeholder
            setDailySummary({ greeting: "", quick_actions: [] });
            setMessages([]);
          }
          hasShownWelcomeRef.current = true;
        })
        .finally(() => setLoadingSummary(false));
    }
  }, [isOpen, loadingSummary, user]);

  // Reset session when user logs in/out so a fresh greeting is shown
  const prevUserIdRef = useRef(user?.id ?? null);
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (currentId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentId;
      hasShownWelcomeRef.current = false;
      setDailySummary(null);
      setSummaryError(false);
      setMessages([]);
      setGuestMessageCount(0);
      try {
        sessionStorage.removeItem("examhub_guest_msg_count");
      } catch (e) {}
    }
  }, [user]);

  const fetchSavedExams = async () => {
    if (!user) {
      setSavedExamIds(new Set());
      return;
    }
    try {
      const data = await api.dashboard.get();
      if (data && data.saved_exams) {
        setSavedExamIds(new Set(data.saved_exams.map(e => e.id)));
      }
    } catch (err) {
      console.warn("Failed to fetch saved exams in AI chat:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSavedExams();
    }
  }, [isOpen, user]);

  const updateStudentContext = (query) => {
    const q = query.toLowerCase();
    let education = studentContext.education;
    let stream = studentContext.stream;
    let state = studentContext.state;
    let category = studentContext.category;

    // Education Level
    if (/\b10th\b|\bmatric\b|\bsecondary\b/.test(q)) education = "10th";
    if (/\b12th\b|\binter\b|\bintermediate\b|\b10\+2\b|\bhsc\b/.test(q)) education = "12th";
    if (/\bug\b|\bundergrad\b|\bundergraduate\b/.test(q)) education = "UG";
    if (/\bgraduate\b|\bdegree\b|\bpg\b|\bpostgrad\b|\bgraduation\b/.test(q)) education = "Graduate";

    // Stream
    if (/\bscience\b/.test(q)) stream = "science";
    if (/\bcommerce\b/.test(q)) stream = "commerce";
    if (/\barts\b/.test(q)) stream = "arts";
    if (/\bengineering\b|\btech\b|\bb\.tech\b/.test(q)) {
      education = "Graduate";
      stream = "engineering";
    }
    if (/\bmedical\b|\bneet\b|\bmbbs\b/.test(q)) {
      stream = "medical";
    }

    // State context
    if (/\bkarnataka\b|\bkar\b/.test(q)) state = "Karnataka";
    if (/\bmaharashtra\b|\bmh\b/.test(q)) state = "Maharashtra";
    if (/\bdelhi\b/.test(q)) state = "Delhi";
    if (/\btamil\s*nadu\b|\btn\b/.test(q)) state = "Tamil Nadu";

    // Category
    if (/\bgovernment\b|\bgov\b/.test(q)) category = "Government Exams";
    if (/\bbank\b|\bbanking\b/.test(q)) category = "Banking Exams";
    if (/\bdefence\b|\bnda\b/.test(q)) category = "Defence Exams";

    if (
      education !== studentContext.education ||
      stream !== studentContext.stream ||
      state !== studentContext.state ||
      category !== studentContext.category
    ) {
      setStudentContext({ education, stream, state, category });
    }
  };

  const handleToggleBookmark = (examId, isBookmarked) => {
    setSavedExamIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.add(examId);
      else next.delete(examId);
      return next;
    });
  };

  const handleSuggestSubmit = async (e, index) => {
    e.preventDefault();
    if (!user) {
      if (window.triggerAuthFlow) {
        window.triggerAuthFlow();
      } else {
        alert("Please login to suggest an exam!");
      }
      return;
    }

    if (!sugName.trim() || !sugOrg.trim()) {
      alert("Exam name and Conducting Organization are required!");
      return;
    }

    setSubmittingSug(true);
    try {
      await api.suggestions.submit({
        exam_name: sugName,
        organization: sugOrg,
        official_link: sugLink,
        message: sugNotes
      });
      setSugSuccessIndex(index);
      setSugName("");
      setSugOrg("");
      setSugLink("");
      setSugNotes("");
      setActiveSuggestionIndex(null);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to submit exam suggestion.");
    } finally {
      setSubmittingSug(false);
    }
  };

  const handleSendMessage = async (text) => {
    const query = text.trim();
    if (!query) return;

    // Guest limit check
    if (isGuest && guestMessageCount >= 5) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: query },
        {
          role: "assistant",
          content: "Create a free ExamHub account to continue chatting with Mani AI 🚀",
          isLimitReached: true,
          suggestedExams: []
        }
      ]);
      setInputValue("");
      return;
    }

    if (isGuest) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      try {
        sessionStorage.setItem("examhub_guest_msg_count", newCount.toString());
      } catch (e) {}
    }

    // Update context
    updateStudentContext(query);

    setInputValue("");
    setLoading(true);

    const updatedMessages = [...messages, { role: "user", content: query }];
    setMessages(updatedMessages);

    try {
      const apiHistory = (updatedMessages || []).slice(0, -1).map(msg => ({
        role: msg?.role,
        content: msg?.content || ""
      }));

      const response = await api.ai.chat(query, apiHistory, i18n.language);

      const assistantMessage = {
        role: "assistant",
        content:
          response?.message ||
          response?.response ||
          response?.answer ||
          "I am ready to help 🚀",
        suggestedExams:
          response?.suggestedExams ||
          response?.suggested_exams ||
          [],
        quickActions:
          response?.quick_actions ||
          []
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble processing that. Try again 😊",
          suggestedExams: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Background Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/45 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}

      {/* Sidebar Panel Drawer */}
      <div
        className={`fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-0 h-full sm:h-full z-50 w-full sm:w-[420px] bg-[#0b1329] border-l border-slate-800 flex flex-col shadow-2xl transition-transform duration-350 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="bg-gradient-to-br from-cyan-500/20 to-brand-500/20 p-2 rounded-xl text-cyan-400 border border-cyan-500/30 flex items-center justify-center h-9 w-9">
                    <span className="font-black text-sm tracking-tighter">M</span>
                  </div>
                  {dailySummary && dailySummary.notification_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {dailySummary.notification_count}
                    </span>
                  )}
                </div>
            <div className="text-left">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <span className="sm:inline hidden">Mani</span>
                <span className="inline sm:hidden">🤖 Mani AI</span>
                <Sparkles className="h-3.5 w-3.5 text-brand-400 animate-pulse hidden sm:inline" />
              </h3>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {dailySummary?.role === "admin"
                  ? "Your AI employee · ExamHub monitored"
                  : dailySummary?.role === "student"
                  ? "Find exams, deadlines & career paths"
                  : "Find exams, deadlines, eligibility & career paths instantly"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer h-9 w-9 flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat History Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loading shimmer while fetching first greeting */}
          {loadingSummary && messages.length === 0 && (
            <div className="flex gap-3 text-left animate-pulse">
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-800 border border-slate-700" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-800 rounded w-5/6" />
              </div>
            </div>
          )}
          {summaryError && (
             <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Unable to load assistant data. Please check your connection.
             </div>
          )}
          {(messages || []).map((msg, idx) => {
            const content = msg?.content || "";
            const isNeedSuggest = msg?.role === "assistant" && content && content.includes("I couldn't find this exam yet");
            const isSuccessSuggest = sugSuccessIndex === idx;

            return (
              <div key={idx} className="space-y-3 text-left">
                <div className={`flex gap-3 ${msg?.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex-shrink-0 p-2 rounded-lg h-8 w-8 flex items-center justify-center border text-xs font-semibold ${
                    msg?.role === "user"
                      ? "bg-brand-600 border-brand-550 text-white"
                      : "bg-gradient-to-br from-cyan-600/20 to-brand-500/20 border-cyan-500/30 text-cyan-400"
                  }`}>
                    {msg?.role === "user" ? <User className="h-4 w-4" /> : <span className="font-extrabold text-xs tracking-tighter text-cyan-400">M</span>}
                  </div>
                  
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed border ${
                    msg?.role === "user"
                      ? "bg-brand-950/20 border-brand-550/15 text-brand-100 rounded-tr-none"
                      : "bg-slate-900/40 border-slate-800/60 text-slate-350 rounded-tl-none flex flex-col gap-2.5"
                  }`}>
                    <p className="whitespace-pre-line">{msg?.content || ""}</p>

                    {msg?.isLimitReached && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setActiveTab("login");
                          }}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-bold transition-all shadow hover:scale-102 cursor-pointer"
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setActiveTab("signup");
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-all shadow hover:scale-102 cursor-pointer"
                        >
                          Sign Up
                        </button>
                      </div>
                    )}

                    {/* Role‑Based Quick Action Buttons */}
                    {idx === 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {((dailySummary?.quick_actions || roleQuickActions) || []).map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleSendMessage(btn.query)}
                            className="bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:scale-102 cursor-pointer shadow-sm"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Empty Result suggest button (Point 7) */}
                    {isNeedSuggest && activeSuggestionIndex !== idx && !isSuccessSuggest && (
                      <button
                        onClick={() => {
                          if (!user) {
                            if (window.triggerAuthFlow) window.triggerAuthFlow();
                            else alert("Please login to suggest an exam!");
                          } else {
                            setActiveSuggestionIndex(idx);
                          }
                        }}
                        className="mt-1 self-start bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow hover:scale-102 cursor-pointer"
                      >
                        Suggest Exam
                      </button>
                    )}

                    {/* Inline Form for suggest exam (Point 7) */}
                    {activeSuggestionIndex === idx && (
                      <form onSubmit={(e) => handleSuggestSubmit(e, idx)} className="mt-2 space-y-2 border-t border-slate-800 pt-2.5 w-full text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Suggest a New Exam</span>
                        
                        <div>
                          <input
                            type="text"
                            placeholder="Exam Name (e.g. KCET) *"
                            required
                            value={sugName}
                            onChange={(e) => setSugName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Conducting Organization (e.g. KEA) *"
                            required
                            value={sugOrg}
                            onChange={(e) => setSugOrg(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-850 hover:border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Official Website Link (optional)"
                            value={sugLink}
                            onChange={(e) => setSugLink(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-850 hover:border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <textarea
                            placeholder="Additional details / eligibility (optional)"
                            rows="2"
                            value={sugNotes}
                            onChange={(e) => setSugNotes(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-850 hover:border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveSuggestionIndex(null)}
                            className="px-2.5 py-1 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-350 rounded-lg text-[9px] font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingSug}
                            className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 shadow cursor-pointer"
                          >
                            {submittingSug && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                            Submit
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Success Message */}
                    {isSuccessSuggest && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1.5 rounded-lg w-full">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Thank you! Suggestion submitted.
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggestions items custom formatting for sidebar */}
                {msg?.suggestedExams && (msg?.suggestedExams || []).length > 0 && (
                  <div className="pl-11 space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] text-brand-400 font-bold uppercase tracking-wider">
                      <Sparkles className="h-3 w-3 text-brand-400" />
                      Suggested Matches ({(msg?.suggestedExams || []).length})
                    </div>
                    <AIExamSuggestion
                      exams={msg?.suggestedExams || []}
                      studentContext={studentContext}
                      savedExamIds={savedExamIds}
                      onToggleBookmark={handleToggleBookmark}
                      setActiveTab={setActiveTab}
                      setSearchInput={setSearchInput}
                      setSearchQuery={setSearchQuery}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 text-left">
              <div className="flex-shrink-0 p-2 rounded-lg h-8 w-8 flex items-center justify-center bg-gradient-to-br from-cyan-600/20 to-brand-500/20 border border-cyan-500/30 text-cyan-400 font-extrabold text-sm">
                <span className="animate-pulse">M</span>
              </div>
              <div className="max-w-[80%] p-3.5 rounded-2xl text-xs bg-slate-900/40 border border-slate-800/60 text-slate-350 rounded-tl-none flex items-center gap-2">
                <span>Mani AI is thinking...</span>
                <span className="flex gap-1 items-center justify-center h-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-duration:0.8s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          {/* Quick Actions Panel */}
          {(messages || []).length === 1 && !loading && (
            <div className="bg-slate-900/15 border border-slate-850/80 p-4 rounded-2xl space-y-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">
                Quick Actions
              </span>
              <div className="grid grid-cols-1 gap-2">
                {(roleQuickActions || []).map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(action.query)}
                    className="text-left text-xs bg-slate-900/40 hover:bg-brand-500/10 border border-slate-850 hover:border-brand-500/30 text-slate-350 hover:text-brand-350 px-3.5 rounded-xl transition-all flex items-center justify-between cursor-pointer h-11"
                  >
                    <span>{action?.label || ""}</span>
                    <ChevronRight className="h-3 w-3 text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="p-4 border-t border-slate-800 bg-[#0b1329] flex gap-2 pb-safe mb-safe shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            placeholder="Ask Mani AI about exams, eligibility, deadlines..."
            className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-brand-500 rounded-xl px-3.5 h-11 text-xs text-slate-200 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-900 border border-brand-500/20 disabled:border-slate-800 text-white disabled:text-slate-650 h-11 w-11 rounded-xl transition-all shadow flex items-center justify-center cursor-pointer shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}

export default function AIAssistant(props) {
  return (
    <ErrorBoundary>
      <AIAssistantContent {...props} />
    </ErrorBoundary>
  );
}
