import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import AdminExamModal from "../components/AdminExamModal";
import AnalyticsChart from "../components/AnalyticsChart";
import { 
  ShieldAlert, Plus, Edit3, Trash2, Calendar, 
  Bot, RefreshCw, Check, X, Undo2, ExternalLink, 
  Terminal, ShieldCheck, HelpCircle, History, BarChart3,
  Users, Layers, MousePointerClick, TrendingUp, Clock, Bookmark,
  MessageSquare, User, CornerDownLeft, Sparkles, Settings, Lock, Globe
} from "lucide-react";

export default function AdminPanel({ initialTab = "analytics" }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  // Sync state with parent route tab selector
  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);
  
  // Manual Tab State
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Suggested prefill target state
  const [prefillSuggestion, setPrefillSuggestion] = useState(null);
  const [prefillAISuggestion, setPrefillAISuggestion] = useState(null);

  // AI Tab State
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [scanMode, setScanMode] = useState("quick");
  const [aiAnalytics, setAiAnalytics] = useState(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);

  // Analytics Tab State
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsUsers, setAnalyticsUsers] = useState([]);
  const [analyticsExams, setAnalyticsExams] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // User Suggestions Inbox States
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sortBySuggestions, setSortBySuggestions] = useState("newest");
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(null); // stores sug ID
  const [rejectReasonText, setRejectReasonText] = useState("");

  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [suggestionsSubTab, setSuggestionsSubTab] = useState("exams"); // "exams" or "feedback"

  // Settings Tab Substates
  const [settingsTab, setSettingsTab] = useState("account");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminEmailPassword, setAdminEmailPassword] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState(false);
  const [submittingSettings, setSubmittingSettings] = useState(false);

  // Filter States for Exams Registry
  const [filterStatus, setFilterStatus] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterVerification, setFilterVerification] = useState("");

  // Import Modal trigger
  const [showImportModal, setShowImportModal] = useState(false);

  // Fetch standard exams (manual console)
  const fetchExams = async () => {
    setLoading(true);
    try {
      const data = await api.exams.getAll({
        status: filterStatus,
        state: filterState,
        category: filterCategory,
        difficulty: filterDifficulty,
        source_verified: filterVerification
      });
      setExams(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load exams list for admin console");
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI suggestions
  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const pendingData = await api.aiAutomation.getSuggestions("pending");
      const approvedData = await api.aiAutomation.getSuggestions("approved");
      const restoredData = await api.aiAutomation.getSuggestions("restored");
      setAiSuggestions([...pendingData, ...approvedData, ...restoredData]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  // Fetch AI Activity logs
  const fetchLogs = async () => {
    try {
      const data = await api.aiAutomation.getLogs();
      setAiLogs(data);
    } catch (err) {
      console.error("Failed to load AI logs:", err);
    }
  };

  const fetchAISettings = async () => {
    try {
      const data = await api.aiAutomation.getSettings();
      setAutoScanEnabled(data.daily_auto_scan);
    } catch (err) {
      console.error("Failed to load AI settings:", err);
    }
  };

  const fetchAIAnalytics = async () => {
    try {
      const data = await api.aiAutomation.getAnalytics();
      setAiAnalytics(data);
    } catch (err) {
      console.error("Failed to load AI analytics:", err);
    }
  };

  // Fetch Analytics data
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const overview = await api.analytics.getOverview();
      const usersList = await api.analytics.getUsers();
      const examsStats = await api.analytics.getExams();
      const examsList = await api.exams.getAll();
      
      setAnalyticsOverview(overview);
      setAnalyticsUsers(usersList);
      setAnalyticsExams(examsStats);
      setExams(examsList);
    } catch (err) {
      console.error("Failed to fetch analytics metrics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch User Suggestions
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const data = await api.suggestions.getAdmin(sortBySuggestions);
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to load user suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const data = await api.feedback.getAdmin();
      setFeedbacks(data);
    } catch (err) {
      console.error("Failed to load feedback logs:", err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchSecurityLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.settings.getActivityLogs();
      setSecurityLogs(data);
    } catch (err) {
      console.error("Failed to load security logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "manual") {
      fetchExams();
    } else if (activeSubTab === "ai") {
      fetchAISuggestions();
      fetchLogs();
      fetchAIAnalytics();
    } else if (activeSubTab === "analytics") {
      fetchAnalytics();
    } else if (activeSubTab === "suggestions") {
      if (suggestionsSubTab === "exams") {
        fetchSuggestions();
      } else {
        fetchFeedback();
      }
    } else if (activeSubTab === "settings") {
      if (user) {
        setAdminEmail(user.email);
      }
      if (settingsTab === "logs") {
        fetchSecurityLogs();
      } else if (settingsTab === "ai") {
        fetchAISettings();
      }
    }
  }, [activeSubTab, sortBySuggestions, settingsTab, user, suggestionsSubTab, filterStatus, filterState, filterCategory, filterDifficulty, filterVerification]);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!adminEmailPassword) {
      alert("Please confirm your current password to change your email.");
      return;
    }
    setSubmittingSettings(true);
    try {
      await api.settings.updateEmail(adminEmail, adminEmailPassword);
      alert("Email updated successfully! Please log in again if needed.");
      setAdminEmailPassword("");
      window.location.reload();
    } catch (err) {
      alert("Failed to update email: " + err.message);
    } finally {
      setSubmittingSettings(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }
    if (!currentPassword) {
      alert("Current password is required.");
      return;
    }
    
    setShowPasswordConfirmModal(true);
  };

  const executePasswordChange = async () => {
    setShowPasswordConfirmModal(false);
    setSubmittingSettings(true);
    try {
      await api.settings.updatePassword(newPassword, currentPassword);
      alert("Password updated successfully! Please sign in again.");
      setNewPassword("");
      setConfirmNewPassword("");
      setCurrentPassword("");
      
      api.auth.logout();
      window.location.reload();
    } catch (err) {
      alert("Failed to update password: " + err.message);
    } finally {
      setSubmittingSettings(false);
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: "None", color: "text-slate-500 bg-slate-500/10 border-slate-500/20", width: "w-0" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

    if (score <= 1) return { label: "Weak", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", width: "w-1/3 bg-rose-500" };
    if (score <= 3) return { label: "Medium", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", width: "w-2/3 bg-amber-500" };
    return { label: "Strong", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", width: "w-full bg-emerald-500" };
  };

  const handleCreate = () => {
    setSelectedExam(null);
    setPrefillSuggestion(null);
    setShowModal(true);
  };

  const handleEdit = (exam) => {
    setSelectedExam(exam);
    setPrefillSuggestion(null);
    setShowModal(true);
  };

  const handleDelete = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam? This action is irreversible.")) return;
    try {
      await api.exams.delete(examId);
      setExams(exams.filter((e) => e.id !== examId));
    } catch (err) {
      console.error(err);
      alert("Error deleting exam: " + err.message);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (prefillAISuggestion) {
        // AI Suggestion Edit-Approval flow:
        // Pass edited formData directly to the AI approve endpoint.
        await api.aiAutomation.approve(prefillAISuggestion.id, formData);
        setPrefillAISuggestion(null);
        fetchAISuggestions();
        fetchLogs();
        fetchAIAnalytics();
        fetchExams();
      } else if (prefillSuggestion) {
        // Student Suggestion Convert-to-Exam flow:
        const created = await api.exams.create(formData);
        setExams([created, ...exams]);
        await api.suggestions.approve(prefillSuggestion.id);
        setPrefillSuggestion(null);
        fetchSuggestions();
        fetchExams();
      } else {
        // Standard Manual Add / Edit flow:
        if (selectedExam && selectedExam.id) {
          const updated = await api.exams.update(selectedExam.id, formData);
          setExams(exams.map((e) => (e.id === selectedExam.id ? updated : e)));
        } else {
          const created = await api.exams.create(formData);
          setExams([created, ...exams]);
        }
        fetchExams();
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Error saving exam details: " + err.message);
    }
  };

  // AI Scanner handlers
  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await api.aiAutomation.scan(scanMode);
      alert(`AI Scan completed. Found ${res.suggestions_found} suggestions.`);
      fetchAISuggestions();
      fetchLogs();
      fetchAIAnalytics();
    } catch (err) {
      console.error(err);
      alert("AI automation scan failed: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleEditAISuggestion = (sug) => {
    setPrefillAISuggestion(sug);
    
    // Map AI Suggestion fields to the Exam form schema
    const prefillExam = {
      id: sug.exam_id || null, // specifies target ID if it's update type
      name: sug.name || "",
      conducting_org: sug.conducting_org || "",
      description: sug.description || "",
      level: sug.level || "12th",
      eligibility: sug.eligibility || "",
      application_start_date: sug.application_start_date || "",
      last_date: sug.last_date || "",
      exam_date: sug.exam_date || "",
      application_fee: sug.application_fee || "",
      mode: sug.mode || "Online (Computer Based Test)",
      category: sug.category || "Government Exams",
      official_link: sug.official_link || "",
      syllabus_link: sug.syllabus_link || "",
      papers_link: sug.papers_link || "",
      notification_pdf: sug.notification_pdf || "",
      status: "Upcoming",
      state: "All India",
      difficulty_level: "Moderate",
      recommended_for: "",
      career_outcome: "",
      source_verified: sug.source_verified || false,
      data_source: sug.source_name || "AI Agent Scan",
      last_verified_date: sug.detected_date || "",
      next_verification_due: ""
    };
    
    setSelectedExam(prefillExam);
    setShowModal(true);
  };

  const handleApproveSuggestion = async (id) => {
    try {
      await api.aiAutomation.approve(id);
      fetchAISuggestions();
      fetchLogs();
      fetchAIAnalytics();
    } catch (err) {
      alert("Failed to approve suggestion: " + err.message);
    }
  };

  const handleRejectSuggestion = async (id) => {
    try {
      await api.aiAutomation.reject(id);
      fetchAISuggestions();
      fetchLogs();
      fetchAIAnalytics();
    } catch (err) {
      alert("Failed to reject suggestion: " + err.message);
    }
  };

  const handleRollbackSuggestion = async (id) => {
    try {
      await api.aiAutomation.rollback(id);
      alert("Successfully rolled back the exam updates to the previous version!");
      fetchAISuggestions();
      fetchLogs();
      fetchAIAnalytics();
    } catch (err) {
      alert("Failed to rollback: " + err.message);
    }
  };

  // Student Suggestions Action handlers
  const handleConvertSuggestion = (sug) => {
    setPrefillSuggestion(sug);
    setSelectedExam(null); // Creates a new exam
    
    // Prefill modal form using suggestion details
    const prefillExam = {
      name: sug.exam_name,
      conducting_org: sug.organization,
      description: sug.message || "Exam suggestion submitted by candidate.",
      level: "12th",
      eligibility: "",
      application_start_date: "",
      last_date: "",
      exam_date: "",
      application_fee: "",
      mode: "Online (Computer Based Test)",
      category: "Government Exams",
      official_link: sug.official_link || "",
      syllabus_link: "",
      papers_link: "",
      notification_pdf: ""
    };
    
    setSelectedExam(prefillExam);
    setShowModal(true);
  };

  const handleOpenRejectModal = (id) => {
    setShowRejectReasonModal(id);
    setRejectReasonText("");
  };

  const handleConfirmRejectSuggestion = async () => {
    if (!rejectReasonText.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await api.suggestions.reject(showRejectReasonModal, rejectReasonText);
      setShowRejectReasonModal(null);
      setRejectReasonText("");
      fetchSuggestions();
    } catch (err) {
      alert("Failed to reject: " + err.message);
    }
  };

  const formatActivityTime = (isoString) => {
    if (!isoString || isoString === "Inactive") return "Never";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Analytics Tab content */}
      {activeSubTab === "analytics" && (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              📊 Platform Growth & Metrics Dashboard
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Overview of real-time candidates activity, conversion metrics and daily growth indicators.</p>
          </div>

          {loadingAnalytics ? (
            <div className="text-center py-12 text-slate-450 animate-pulse">Retrieving analytics logs...</div>
          ) : (
            <>
              {/* Stat Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel border-slate-800 rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span>Total Users</span>
                    <Users className="h-4 w-4 text-brand-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{analyticsOverview?.total_users || 0}</div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    +{analyticsOverview?.new_users_today || 0} registered today
                  </span>
                </div>

                <div className="glass-panel border-slate-800 rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span>Total Exams</span>
                    <Layers className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{analyticsOverview?.total_exams || 0}</div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {analyticsOverview?.pending_suggestions || 0} AI suggestions pending
                  </span>
                </div>

                <div className="glass-panel border-slate-800 rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span>Apply Clicks</span>
                    <MousePointerClick className="h-4 w-4 text-emerald-450" />
                  </div>
                  <div className="text-3xl font-black text-white">{analyticsOverview?.total_clicks || 0}</div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    +{analyticsOverview?.clicks_today || 0} clicks today
                  </span>
                </div>

                <div className="glass-panel border-slate-800 rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span>Pending Suggestions</span>
                    <MessageSquare className="h-4 w-4 text-pink-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{analyticsOverview?.pending_student_suggestions || 0}</div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    in candidates suggestion inbox
                  </span>
                </div>
              </div>

              {/* Chart & Conversion breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Growth Visualizer</h4>
                  <AnalyticsChart data={analyticsOverview?.chart_data} />
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Conversion Analytics</h4>
                  <div className="glass-panel border-slate-800 rounded-2xl p-5 space-y-4 max-h-[250px] overflow-y-auto">
                    {analyticsExams.length > 0 ? (
                      analyticsExams.map((e) => (
                        <div key={e.id} className="space-y-1 text-xs">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-slate-200 truncate max-w-[60%]">{e.name}</span>
                            <span className="text-brand-400 font-black">{e.conversion_rate}% CR</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-550">
                            <span>{e.views} Views • {e.clicks} Clicks</span>
                            <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                              <div className="bg-brand-500 h-full" style={{ width: `${Math.min(e.conversion_rate, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-650 text-center text-xs py-8">No conversion stats registered yet.</div>
                    )}
                  </div>
                </div>
              </div>
              {/* Audit and Updates Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users Auditing logs Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Registered Candidates Audit</h4>
                  <div className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-900/60 border-b border-slate-800/80 text-slate-450 uppercase tracking-wider font-semibold">
                            <th className="px-6 py-3.5">Name</th>
                            <th className="px-6 py-3.5">Email</th>
                            <th className="px-6 py-3.5">Phone Number</th>
                            <th className="px-6 py-3.5">Joined Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-350">
                          {analyticsUsers.length > 0 ? (
                            analyticsUsers.map((u, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/10">
                                <td className="px-6 py-3.5 font-bold text-white">
                                  {u.full_name || "Scholar candidate"}
                                </td>
                                <td className="px-6 py-3.5 text-slate-400 font-medium">
                                  {u.email}
                                </td>
                                <td className="px-6 py-3.5 text-slate-400 font-mono">
                                  {u.phone_number || "N/A"}
                                </td>
                                <td className="px-6 py-3.5 text-slate-500 font-medium">
                                  {u.joined_date}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="px-6 py-8 text-center text-slate-555">No users registered on platform.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="block md:hidden space-y-3">
                    {analyticsUsers.length > 0 ? (
                      analyticsUsers.map((u, idx) => (
                        <div key={idx} className="glass-panel border-slate-800 rounded-xl p-4 space-y-2 text-[11px] text-left">
                          <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                            <span className="font-bold text-white">{u.full_name || "Scholar candidate"}</span>
                            <span className="text-slate-500 font-medium">{u.joined_date}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Email:</span>
                              <span className="text-slate-400 font-medium">{u.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Phone:</span>
                              <span className="text-slate-400 font-mono">{u.phone_number || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="glass-panel border-slate-855 rounded-xl p-6 text-center text-xs text-slate-550">No users registered on platform.</div>
                    )}
                  </div>
                </div>

                {/* Latest Database Updates (Recently Added Exams) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Latest Database Updates</h4>
                  <div className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-900/60 border-b border-slate-800/80 text-slate-450 uppercase tracking-wider font-semibold">
                            <th className="px-6 py-3.5">Exam Details</th>
                            <th className="px-6 py-3.5">Category</th>
                            <th className="px-6 py-3.5">Last Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-350">
                          {exams.length > 0 ? (
                            exams.slice(-5).reverse().map((exam, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/10">
                                <td className="px-6 py-3.5">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white">{exam.name}</span>
                                    <span className="text-[10px] text-slate-550">{exam.conducting_org}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 font-medium text-slate-450">
                                  {exam.category}
                                </td>
                                <td className="px-6 py-3.5 font-mono text-[10px] text-slate-455">
                                  {exam.last_date || "TBD"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="px-6 py-8 text-center text-slate-550">No exams stored in database yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="block md:hidden space-y-3">
                    {exams.length > 0 ? (
                      exams.slice(-5).reverse().map((exam, idx) => (
                        <div key={idx} className="glass-panel border-slate-800 rounded-xl p-4 space-y-2 text-[11px] text-left">
                          <div className="flex justify-between items-start border-b border-slate-800/60 pb-1.5">
                            <div>
                              <span className="font-bold text-white block">{exam.name}</span>
                              <span className="text-[10px] text-slate-500 mt-0.5">{exam.conducting_org}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-455">{exam.last_date || "TBD"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Category:</span>
                            <span className="text-slate-400">{exam.category}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="glass-panel border-slate-855 rounded-xl p-6 text-center text-xs text-slate-555">No exams stored in database yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Tab content */}
      {activeSubTab === "manual" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white tracking-wide">Exams Registry</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Layers className="h-4 w-4" />
                Bulk Import
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/10 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                Add Exam Manually
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-900/50 p-4 border border-slate-800/80 rounded-2xl">
            <div>
              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Application Open">Application Open</option>
                <option value="Application Closed">Application Closed</option>
                <option value="Exam Completed">Exam Completed</option>
                <option value="Result Released">Result Released</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5">State</label>
              <input
                type="text"
                placeholder="All States (e.g. Karnataka)"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="Government Exams">Government Exams</option>
                <option value="Engineering Exams">Engineering Exams</option>
                <option value="Medical Exams">Medical Exams</option>
                <option value="Banking Exams">Banking Exams</option>
                <option value="College Entrance Exams">College Entrance Exams</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5">Difficulty</label>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
                <option value="Very Hard">Very Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5">Verification</label>
              <select
                value={filterVerification}
                onChange={(e) => setFilterVerification(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">All Verification</option>
                <option value="true">Verified Source</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-400 text-center py-12 animate-pulse">Loading exams registry...</div>
          ) : (
            <div className="space-y-4">
              <div className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800/80 text-slate-450 uppercase tracking-wider font-semibold">
                        <th className="px-6 py-4">Exam Name & Org</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Level</th>
                        <th className="px-6 py-4">Last Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-355">
                      {exams.length > 0 ? (
                        exams.map((exam) => (
                          <tr key={exam.id} className="hover:bg-slate-900/20 transition-all">
                            <td className="px-6 py-4.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-sm">{exam.name}</span>
                                <span className="text-[10px] text-slate-500 mt-0.5">{exam.conducting_org}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-400">{exam.category}</td>
                            <td className="px-6 py-4">
                              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-2 py-0.5 rounded font-semibold text-[10px]">
                                {exam.level}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-450 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                {exam.last_date || "TBD"}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(exam)}
                                  className="p-1.5 rounded-lg border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer h-8 w-8 flex items-center justify-center"
                                  title="Edit Exam"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(exam.id)}
                                  className="p-1.5 rounded-lg border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all cursor-pointer h-8 w-8 flex items-center justify-center"
                                  title="Delete Exam"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-505">
                            No exams found in registry. Click "Add Exam Manually" or trigger an AI Scan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View Cards */}
              <div className="block md:hidden space-y-4">
                {exams.length > 0 ? (
                  exams.map((exam) => (
                    <div key={exam.id} className="glass-panel border-slate-800 rounded-2xl p-4 space-y-3.5 text-xs text-left">
                      <div className="flex justify-between items-start border-b border-slate-800/60 pb-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{exam.name}</h4>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{exam.conducting_org}</span>
                        </div>
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-2 py-0.5 rounded font-semibold text-[10px] shrink-0">
                          {exam.level}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Category:</span>
                          <span className="text-slate-350 font-semibold">{exam.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Deadline:</span>
                          <span className="text-slate-350 font-semibold flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            {exam.last_date || "TBD"}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-900/60">
                        <button
                          onClick={() => handleEdit(exam)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer h-10"
                        >
                          <Edit3 className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-455 transition-all text-xs font-semibold cursor-pointer h-10"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-panel border-slate-855 rounded-2xl p-12 text-center text-slate-505">
                    No exams found in registry. Click "Add Exam Manually" or trigger an AI Scan.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Exam Manager Tab content */}
      {activeSubTab === "ai" && (
        <div className="space-y-6 animate-fadeIn text-left">
          {/* AI Manager Title */}
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              🤖 AI Automation Engine
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">AI scans official websites, suggests year changes, and flags outdated notifications.</p>
          </div>

          {/* AI summary (Status cards) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-panel border-slate-800/80 rounded-2xl p-4 bg-slate-900/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🤖 Mani AI Status</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-bold text-white">Online</span>
              </div>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4 bg-slate-900/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scanned Today</span>
              <span className="text-lg font-black text-white mt-2 block">
                {aiAnalytics?.scanned_today ? 250 : 0}
              </span>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4 bg-slate-900/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Added Today</span>
              <span className="text-lg font-black text-emerald-400 mt-2 block">
                {aiAnalytics?.new_exams_added || 0}
              </span>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4 bg-slate-900/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Updated Today</span>
              <span className="text-lg font-black text-cyan-400 mt-2 block">
                {aiAnalytics?.updated_exams || 0}
              </span>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4 bg-slate-900/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Need Review</span>
              <span className="text-lg font-black text-amber-400 mt-2 block">
                {aiAnalytics?.need_review || 0}
              </span>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
            <div className="flex flex-wrap gap-2.5 w-full items-center">
              <select
                value={scanMode}
                onChange={(e) => setScanMode(e.target.value)}
                className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer h-11"
              >
                <option value="quick">Quick Scan (Updates)</option>
                <option value="deep">Deep Scan (New Exams)</option>
              </select>

              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer h-11"
              >
                <Terminal className="h-4 w-4 text-brand-400" />
                {showLogs ? "Hide Logs" : "View Logs"}
              </button>

              <button
                onClick={handleTriggerScan}
                disabled={scanning}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-900 disabled:border-slate-850 border border-brand-500/20 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 cursor-pointer h-11 sm:ml-auto w-full sm:w-auto justify-center"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning..." : "Start AI Scan"}
              </button>
            </div>
          </div>

          {/* AI Logs console panel */}
          {showLogs && (
            <div className="glass-panel border-brand-500/10 rounded-2xl p-5 bg-slate-950/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider pb-2 border-b border-slate-900">
                <History className="h-4 w-4" />
                AI Agent Activity Log Stream
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-2 font-mono text-[10px] leading-relaxed">
                {aiLogs.length > 0 ? (
                  aiLogs.map((log) => {
                    let typeColor = "text-slate-400";
                    if (log.action === "scan_started") typeColor = "text-indigo-400";
                    if (log.action === "exams_found") typeColor = "text-emerald-400";
                    if (log.action === "error") typeColor = "text-rose-400";
                    if (log.action === "suggestion_approved") typeColor = "text-cyan-400";
                    if (log.action === "rollback_executed") typeColor = "text-amber-400";

                    return (
                      <div key={log.id} className="flex gap-3 text-slate-500">
                        <span className="text-slate-600">[{log.timestamp.slice(11, 19)}]</span>
                        <span className={`font-semibold shrink-0 ${typeColor}`}>{log.action.toUpperCase()}</span>
                        <span className="text-slate-350">{log.details}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-600 text-center py-4">No logged activities. Trigger scanner.</div>
                )}
              </div>
            </div>
          )}

          {/* AI Suggestions Review Deck */}
          {loadingAI ? (
            <div className="text-center py-12 text-slate-450 animate-pulse">Running AI payload retrieval...</div>
          ) : (
            <div className="space-y-8">
              {["new", "update", "expired"].map((typeGroup) => {
                const groupTitle = 
                  typeGroup === "new" ? "New Exams Detected (Feature 1)" :
                  typeGroup === "update" ? "Pending Year Changes (Feature 2)" :
                  "Archival Warnings & Expired Exams (Feature 3)";
                
                const groupSuggestions = aiSuggestions.filter(s => s.type === typeGroup);

                return (
                  <div key={typeGroup} className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-l-2 border-brand-500 pl-3.5">
                      {groupTitle} ({groupSuggestions.length})
                    </h4>
                    
                    {groupSuggestions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6">
                        {groupSuggestions.map((sug) => {
                          const isPending = sug.status === "pending";
                          const isApproved = sug.status === "approved";
                          const isRestored = sug.status === "restored";

                          let confColor = "bg-amber-500/10 text-amber-400 border-amber-500/15";
                          if (sug.confidence_score >= 85) confColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";

                          return (
                            <div 
                              key={sug.id} 
                              className={`glass-panel rounded-2xl p-5 border relative overflow-hidden transition-all duration-300 ${
                                isApproved 
                                  ? "border-emerald-500/20 bg-emerald-500/[0.01]" 
                                  : isRestored 
                                  ? "border-slate-800/60 bg-slate-900/10"
                                  : "border-slate-800/80 hover:border-slate-700/60"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-4.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${confColor}`}>
                                    Confidence: {sug.confidence_score}%
                                  </span>
                                  {sug.confidence_score < 85 && (
                                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                      <HelpCircle className="h-3 w-3" /> Needs Manual Verification
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-550 flex items-center gap-1 font-semibold">
                                  {sug.source_url ? (
                                    <a href={sug.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-400">
                                      <span>Source: {sug.source_name || "Web Portal"}</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span>Source: {sug.source_name || "Unknown"}</span>
                                  )}
                                  <span>• Detected: {sug.detected_date}</span>
                                </div>
                              </div>

                              <div className="space-y-1 mb-4">
                                <div className="flex items-baseline gap-2">
                                  <h5 className="text-base font-bold text-white">{sug.name}</h5>
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{sug.conducting_org}</span>
                                </div>
                                <p className="text-slate-455 text-xs leading-relaxed line-clamp-2">{sug.description}</p>
                                {sug.confidence_reason && (
                                  <span className="text-[10px] text-slate-550 italic block mt-1">Reason: {sug.confidence_reason}</span>
                                )}
                              </div>

                              {typeGroup === "update" && isPending && (
                                <div className="mb-5 bg-slate-950/60 border border-slate-900 rounded-xl p-4.5 space-y-3">
                                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                                    Compare Draft Diffs
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3">
                                      <span className="text-[10px] font-bold text-rose-400 block mb-1">Previous DB Fields</span>
                                      <div className="space-y-1 text-slate-400 font-mono text-[11px]">
                                        <div>Name: GATE 2026</div>
                                        <div>Last Date: 2026-10-12</div>
                                        <div>Link: https://gate.iisc.ac.in</div>
                                      </div>
                                    </div>
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                                      <span className="text-[10px] font-bold text-emerald-400 block mb-1">Proposed AI Fields</span>
                                      <div className="space-y-1 text-slate-350 font-mono text-[11px]">
                                        <div className="text-emerald-300 font-semibold">Name: {sug.name}</div>
                                        <div className="text-emerald-300 font-semibold">Last Date: {sug.last_date}</div>
                                        <div className="text-emerald-300 font-semibold">Link: {sug.official_link}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-xs">
                                <div>
                                  {isApproved && (
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                      <ShieldCheck className="h-4.5 w-4.5" /> Approved & Synced
                                    </span>
                                  )}
                                  {isRestored && (
                                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                                      <Undo2 className="h-4.5 w-4.5" /> Rolled Back
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-slate-500 font-medium italic">Pending Approval Decision</span>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  {isPending ? (
                                    <>
                                      <button
                                        onClick={() => handleRejectSuggestion(sug.id)}
                                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-450 hover:text-rose-400 transition-all font-semibold cursor-pointer"
                                      >
                                        <X className="h-4 w-4" /> Reject
                                      </button>
                                      <button
                                        onClick={() => handleEditAISuggestion(sug)}
                                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-indigo-400 transition-all font-semibold cursor-pointer"
                                      >
                                        <Edit3 className="h-4 w-4" /> Edit
                                      </button>
                                      <button
                                        onClick={() => handleApproveSuggestion(sug.id)}
                                        className="flex items-center gap-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow transition-all font-semibold cursor-pointer"
                                      >
                                        <Check className="h-4 w-4" /> Approve & Publish
                                      </button>
                                    </>
                                  ) : (
                                    typeGroup === "update" && isApproved && sug.backup_data && (
                                      <button
                                        onClick={() => handleRollbackSuggestion(sug.id)}
                                        className="flex items-center gap-1 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-brand-500/40 text-slate-350 hover:text-white rounded-xl transition-all font-semibold"
                                      >
                                        <Undo2 className="h-4 w-4 text-brand-400" /> Restore Previous Version
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="glass-panel border-slate-855 rounded-2xl p-6 text-center text-xs text-slate-550 border-dashed">
                        No pending AI findings in this category. Click 'Scan For Updates' to scan channels.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Student Suggestion Moderation Inbox content */}
      {activeSubTab === "suggestions" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub Tab selector */}
          <div className="flex border-b border-slate-900 pb-2 gap-6">
            <button
              onClick={() => setSuggestionsSubTab("exams")}
              className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${
                suggestionsSubTab === "exams" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Exam Suggestions
              {suggestionsSubTab === "exams" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-500" />
              )}
            </button>
            <button
              onClick={() => setSuggestionsSubTab("feedback")}
              className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${
                suggestionsSubTab === "feedback" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Help Us Improve Feedback
              {suggestionsSubTab === "feedback" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-500" />
              )}
            </button>
          </div>

          {suggestionsSubTab === "exams" ? (
            // Exam Suggestions
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">💬 User Suggestion Moderation Inbox</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Review exam suggestions submitted by students, verify official sources, and convert them to exam posts.</p>
                </div>

                {/* Suggestions Sorting */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 text-[11px] font-bold">
                  <button
                    onClick={() => setSortBySuggestions("newest")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      sortBySuggestions === "newest" ? "bg-slate-900 text-white" : "text-slate-450 hover:text-slate-200"
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSortBySuggestions("most_requested")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      sortBySuggestions === "most_requested" ? "bg-slate-900 text-white" : "text-slate-450 hover:text-slate-200"
                    }`}
                  >
                    Most Requested
                  </button>
                </div>
              </div>

              {loadingSuggestions ? (
                <div className="text-slate-450 text-center py-10 animate-pulse">Retrieving candidate suggestions inbox...</div>
              ) : suggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {suggestions.map((sug) => {
                    const isPending = sug.status === "pending";
                    const isApproved = sug.status === "approved";
                    const isRejected = sug.status === "rejected";

                    return (
                      <div 
                        key={sug.id}
                        className={`glass-panel rounded-2xl p-6 border flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                          isApproved 
                            ? "border-emerald-500/20 bg-emerald-500/[0.01]" 
                            : isRejected 
                            ? "border-rose-500/10 bg-rose-500/[0.01]" 
                            : "border-slate-800 hover:border-slate-750"
                        }`}
                      >
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-pink-500 to-indigo-500" />
                        
                        <div>
                          {/* Header with request count */}
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Suggested by: {sug.user_email || "Candidate student"}
                            </span>
                            
                            <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full font-bold">
                              🔥 Requested by {sug.request_count} student{sug.request_count !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-lg font-bold text-white mb-1 leading-snug">{sug.exam_name}</h4>
                          <span className="text-[10px] font-semibold text-indigo-400 block mb-3.5 uppercase tracking-wide">
                            Organization: {sug.organization}
                          </span>

                          {/* Message details */}
                          {sug.message && (
                            <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl text-xs text-slate-400 leading-relaxed mb-4">
                              <span className="font-bold text-slate-300 block mb-1">Message detail:</span>
                              "{sug.message}"
                            </div>
                          )}

                          {/* Official Link */}
                          {sug.official_link && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 break-all">
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                              <a href={sug.official_link} target="_blank" rel="noopener noreferrer" className="hover:text-brand-450 hover:underline">
                                {sug.official_link}
                              </a>
                            </div>
                          )}

                          {/* Rejection notice details */}
                          {isRejected && sug.admin_reason && (
                            <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-300 leading-relaxed mb-4">
                              <span className="font-bold block mb-0.5">Rejection Reason:</span>
                              {sug.admin_reason}
                            </div>
                          )}
                        </div>

                        {/* Footer audits */}
                        <div className="border-t border-slate-850 pt-4 mt-2 flex items-center justify-between text-xs font-bold">
                          <span className="text-[10px] text-slate-550 font-semibold flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Filed: {sug.created_date}
                          </span>

                          <div className="flex gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleOpenRejectModal(sug.id)}
                                  className="px-3.5 py-1.5 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-450 hover:text-rose-455 transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleConvertSuggestion(sug)}
                                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="h-4 w-4" /> Convert to Exam
                                </button>
                              </>
                            ) : isApproved ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="h-4 w-4" /> Published & Notified
                              </span>
                            ) : (
                              <span className="text-rose-455 flex items-center gap-1">
                                <X className="h-4 w-4" /> Suggestion Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-panel border-slate-855 rounded-2xl p-12 text-center text-slate-500 max-w-lg mx-auto space-y-3">
                  <MessageSquare className="h-10 w-10 text-slate-650 mx-auto" />
                  <h4 className="text-white font-bold">No Suggestions Received</h4>
                  <p className="text-xs text-slate-455">Student recommendations will be logged in this moderation inbox. Check back later.</p>
                </div>
              )}
            </div>
          ) : (
            // Feedback & Bug Reports
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">Help Us Improve: Feedback Inbox</h3>
                <p className="text-slate-500 text-xs mt-0.5">View feedback, bugs and feature requests submitted by candidate students and visitors.</p>
              </div>

              {loadingFeedback ? (
                <div className="text-slate-450 text-center py-10 animate-pulse">Retrieving feedback submissions...</div>
              ) : feedbacks.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {feedbacks.map((fb) => {
                    let typeBadge = "bg-slate-800 text-slate-300 border-slate-750";
                    if (fb.type === "bug") {
                      typeBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    } else if (fb.type === "feature") {
                      typeBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                    } else if (fb.type === "general") {
                      typeBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                    }

                    return (
                      <div key={fb.id} className="glass-panel rounded-2xl p-5 border border-slate-850 space-y-3 text-left">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${typeBadge}`}>
                              {fb.type}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              From: {fb.email || "Anonymous Guest"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {fb.submitted_date}
                          </span>
                        </div>
                        <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-wrap">
                          "{fb.message}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-panel border-slate-855 rounded-2xl p-12 text-center text-slate-500 max-w-lg mx-auto space-y-3">
                  <HelpCircle className="h-10 w-10 text-slate-650 mx-auto" />
                  <h4 className="text-white font-bold">No Feedback Received</h4>
                  <p className="text-xs text-slate-455">Bugs, feature requests and general feedback from the footer forms will list here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab content */}
      {activeSubTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto animate-fadeIn">
          {/* Settings Left Navigation Sidebar */}
          <div className="md:col-span-1 space-y-2">
            <div className="glass-panel border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
              <button
                onClick={() => setSettingsTab("account")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all w-full text-left ${
                  settingsTab === "account"
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <User className="h-4 w-4" /> Account
              </button>
              
              <button
                onClick={() => setSettingsTab("security")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all w-full text-left ${
                  settingsTab === "security"
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <Lock className="h-4 w-4" /> Security
              </button>
              
              <button
                onClick={() => setSettingsTab("ai")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all w-full text-left ${
                  settingsTab === "ai"
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <Bot className="h-4 w-4" /> AI Configuration
              </button>

              <button
                onClick={() => setSettingsTab("logs")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all w-full text-left ${
                  settingsTab === "logs"
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <History className="h-4 w-4" /> Activity Logs
              </button>

              <button
                onClick={() => setSettingsTab("languages")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all w-full text-left ${
                  settingsTab === "languages"
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <Globe className="h-4 w-4" /> Language Management
              </button>
            </div>
          </div>

          {/* Settings Tab Detail Content Pane */}
          <div className="md:col-span-3">
            {/* Account Sub-tab */}
            {settingsTab === "account" && (
              <div className="glass-panel border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-brand-400" />
                    Account Settings
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Manage your administrative credentials and registration details.</p>
                </div>
                
                <div className="space-y-4 pt-3 border-t border-slate-900 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Admin Name</label>
                    <input
                      type="text"
                      disabled
                      value={user?.full_name || "ExamHub Administrator"}
                      className="w-full bg-slate-950/50 border border-slate-900 text-slate-500 rounded-xl px-4 py-2.5 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <form onSubmit={handleUpdateEmail} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Current Password Confirmation</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={adminEmailPassword}
                        onChange={(e) => setAdminEmailPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">Requires current password to update email for validation safety.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingSettings}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg transition-all font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {submittingSettings ? "Updating..." : "Save Email"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Security Sub-tab */}
            {settingsTab === "security" && (
              <div className="glass-panel border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-brand-400" />
                    Security Upgrades
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Enforce password rules, lockouts, and manage password changes.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3 border-t border-slate-900">
                  {/* Left Column: Password Update Form */}
                  <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>

                    {/* Strength visualizer */}
                    {newPassword && (
                      <div className="space-y-1.5 bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-500">Strength:</span>
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] ${getPasswordStrength(newPassword).color}`}>
                            {getPasswordStrength(newPassword).label}
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${getPasswordStrength(newPassword).width}`} />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Current Password Confirmation</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingSettings}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg transition-all font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {submittingSettings ? "Changing..." : "Change Password"}
                    </button>
                  </form>

                  {/* Right Column: Information & Policies */}
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2.5">
                      <h4 className="font-bold text-indigo-400 text-xs">Complexity Rules</h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-400 text-[10px]">
                        <li>At least 8 total characters</li>
                        <li>At least one capital uppercase letter (A-Z)</li>
                        <li>At least one numeric digit (0-9)</li>
                        <li>At least one symbol / special character (!@#$%^&*)</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2.5">
                      <h4 className="font-bold text-amber-400 text-xs">Lockout Safety Policies</h4>
                      <p className="text-[10px] text-slate-450 leading-relaxed">
                        To protect the platform against brute-force login attempts, accounts will lock out temporarily for <strong>15 minutes</strong> after <strong>5 consecutive wrong password submissions</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Configuration Sub-tab */}
            {settingsTab === "ai" && (
              <div className="glass-panel border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bot className="h-5 w-5 text-brand-400" />
                    AI Engine Configurations
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Manage scheduler frequencies and AI model integrations.</p>
                </div>

                <div className="space-y-4 pt-3 text-xs border-t border-slate-900">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">AI Provider</label>
                    <select className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none">
                      <option value="mock">MockAIProvider (Simulation Mode)</option>
                      <option value="gemini">GeminiProProvider (API Integration)</option>
                      <option value="openai">OpenAI GPT-4o (API Integration)</option>
                    </select>
                  </div>

                   <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-2">Cron Automation Scan Frequency</label>
                    <select
                      value={autoScanEnabled ? "daily" : "disabled"}
                      onChange={async (e) => {
                        const enabled = e.target.value === "daily";
                        try {
                          await api.aiAutomation.updateSettings({ daily_auto_scan: enabled });
                          setAutoScanEnabled(enabled);
                          alert(`Auto scan settings updated: ${enabled ? "Enabled (Daily)" : "Disabled"}`);
                        } catch (err) {
                          alert("Failed to update settings: " + err.message);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none"
                    >
                      <option value="disabled">Disabled (Manual trigger only)</option>
                      <option value="daily">Daily Cron Scans</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-550 pt-2 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                    Environment Variables: AI_PROVIDER=mock, API_KEY=None
                  </div>
                </div>
              </div>
            )}

            {/* Activity Logs Sub-tab */}
            {settingsTab === "logs" && (
              <div className="glass-panel border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-brand-400" />
                    Admin Security & Audit Logs
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Audit log tracks logins, exam management changes, suggestion updates, and settings changes.</p>
                </div>

                <div className="pt-3 border-t border-slate-900">
                  {loadingLogs ? (
                    <div className="text-center py-10 text-xs text-slate-550 animate-pulse">Loading logs...</div>
                  ) : securityLogs.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-850">
                      <table className="w-full text-left border-collapse text-xs text-slate-300">
                        <thead className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-450 border-b border-slate-850">
                          <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3">IP Address</th>
                            <th className="px-4 py-3">User Agent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-900/20">
                          {securityLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-900/40">
                              <td className="px-4 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                {formatActivityTime(log.timestamp)}
                              </td>
                              <td className="px-4 py-3 font-bold text-brand-400 whitespace-nowrap">
                                {log.action}
                              </td>
                              <td className="px-4 py-3 text-slate-400 min-w-[200px]">
                                {log.details || "-"}
                              </td>
                              <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                {log.ip_address || "local"}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={log.user_agent}>
                                {log.user_agent || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-550">
                      No administrative activity logs logged yet.
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Language Management Sub-tab */}
            {settingsTab === "languages" && (
              <div className="glass-panel border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-brand-400" />
                    Language Management
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Enable regional language translations and review translation completion metrics.</p>
                </div>

                <div className="space-y-4 pt-3 border-t border-slate-900">
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { name: "English", status: "100% Complete ✅", enabled: true, isDefault: true },
                      { name: "Kannada (ಕನ್ನಡ)", status: "100% Complete ✅", enabled: true, isDefault: false },
                      { name: "Hindi (हिन्दी)", status: "100% Complete ✅", enabled: true, isDefault: false },
                      { name: "Telugu (తెలుగు)", status: "100% Complete ✅", enabled: true, isDefault: false },
                      { name: "Tamil (தமிழ்)", status: "80% Needs Review 🟡", enabled: true, isDefault: false },
                      { name: "Malayalam (മലയാളം)", status: "100% Complete ✅", enabled: true, isDefault: false }
                    ].map((lang, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-850 bg-slate-950/40 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">{lang.name}</h4>
                          <span className={`text-[10px] ${lang.status.includes('Needs') ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {lang.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={lang.isDefault}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              lang.isDefault
                                ? "bg-slate-900 text-slate-500 cursor-not-allowed"
                                : "bg-brand-600 hover:bg-brand-500 text-white cursor-pointer"
                            }`}
                          >
                            {lang.isDefault ? "Primary" : "Disable"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Change Safety Confirmation Modal */}
      {showPasswordConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-850 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left relative">
            <h4 className="font-bold text-white text-base">Confirm Password Update</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Changing password will update admin credentials. Continue?
            </p>
            
            <div className="flex gap-2.5 justify-end text-xs font-bold pt-2">
              <button
                onClick={() => setShowPasswordConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-855 hover:bg-slate-800 text-slate-450 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executePasswordChange}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow transition-all cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Exam CRUD modal */}
      {showModal && (
        <AdminExamModal
          exam={selectedExam}
          onClose={() => {
            setShowModal(false);
            setPrefillSuggestion(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportModal
          onClose={() => {
            setShowImportModal(false);
            fetchExams();
          }}
        />
      )}

      {/* Reject Suggestion Reason popup */}
      {showRejectReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-850 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left relative">
            <h4 className="font-bold text-white text-base">Rejection Reason Alert</h4>
            <p className="text-slate-455 text-xs leading-relaxed">
              Please state why this exam suggestion is being rejected. This notification will be logged to the student.
            </p>
            
            <textarea
              rows={3}
              value={rejectReasonText}
              onChange={(e) => setRejectReasonText(e.target.value)}
              placeholder="e.g. Duplicate suggestion or invalid official application portal URL."
              className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500/80 resize-none"
            />

            <div className="flex gap-2.5 justify-end text-xs font-bold pt-2">
              <button
                onClick={() => {
                  setShowRejectReasonModal(null);
                  setRejectReasonText("");
                }}
                className="px-4 py-2 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-400 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectSuggestion}
                className="px-4 py-2 bg-rose-650 hover:bg-rose-550 text-white rounded-xl shadow transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkImportModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState("skip");
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.exams.importPreview(file);
      setPreviewData(res);
    } catch (err) {
      alert("Failed to parse file preview: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setLoading(true);
    try {
      const examsPayload = previewData.preview_items.map(item => item.data);
      const res = await api.exams.importConfirm({
        exams: examsPayload,
        duplicate_strategy: duplicateStrategy
      });
      setImportResult(res);
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFailedReport = () => {
    const rows = importResult ? importResult.failed_rows : previewData.error_rows;
    if (!rows || rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = importResult ? "import_failed_rows.json" : "validation_error_rows.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-400" />
            Bulk Import Exams
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-slate-400 text-center py-24 animate-pulse">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-500" />
              Processing bulk data... Please wait...
            </div>
          ) : importResult ? (
            // Success/Result Screen
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-center space-y-3">
                <Check className="h-12 w-12 text-emerald-400 mx-auto bg-emerald-500/10 p-2 rounded-full" />
                <h4 className="text-lg font-bold text-white">Import Completed</h4>
                <p className="text-slate-400 text-sm">
                  Exams have been processed. Total exams successfully imported or updated: {importResult.success_count}.
                </p>
                {importResult.backup_checkpoint && (
                  <div className="text-xs text-slate-550 font-mono bg-slate-950 p-2 rounded border border-slate-850 max-w-md mx-auto truncate">
                    Backup Checkpoint: {importResult.backup_checkpoint}
                  </div>
                )}
              </div>

              {importResult.failed_count > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="text-sm font-bold text-white">Import Failures Detected ({importResult.failed_count})</h5>
                      <p className="text-xs text-slate-405 mt-0.5">Some exams failed to import due to validation or database errors.</p>
                    </div>
                    <button
                      onClick={downloadFailedReport}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-rose-400 rounded-lg border border-slate-700 transition-all cursor-pointer"
                    >
                      Download Failed Rows Report
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-800/80 rounded-xl bg-slate-950 p-3 space-y-2">
                    {importResult.failed_rows.map((row, idx) => (
                      <div key={idx} className="text-xs text-slate-400 border-b border-slate-900 pb-2 last:border-b-0 last:pb-0">
                        <span className="font-bold text-rose-455">Row {row.row_index}: </span>
                        <span className="text-white font-medium">{row.exam_name}</span> ({row.conducting_org}) - <span className="italic">{row.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : previewData ? (
            // Preview Screen
            <div className="space-y-6">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Found</span>
                  <span className="text-2xl font-black text-white mt-1 block">{previewData.total_exams_found}</span>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-center">
                  <span className="text-xs text-emerald-450 font-semibold uppercase tracking-wider block">Valid</span>
                  <span className="text-2xl font-black text-emerald-450 mt-1 block">{previewData.valid_exams_count}</span>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-center">
                  <span className="text-xs text-amber-450 font-semibold uppercase tracking-wider block">Duplicates</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">{previewData.duplicate_exams_count}</span>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl text-center">
                  <span className="text-xs text-rose-450 font-semibold uppercase tracking-wider block">Errors</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">{previewData.error_rows_count}</span>
                </div>
              </div>

              {/* Duplicate Smart Handling controls */}
              {previewData.duplicate_exams_count > 0 && (
                <div className="bg-slate-900/60 p-4 border border-slate-800/85 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">Smart Duplicate Handling</h5>
                    <p className="text-xs text-slate-400 mt-0.5">We found matching exams in the database. Choose action strategy:</p>
                  </div>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-4 py-2.5 focus:outline-none w-full md:w-56"
                  >
                    <option value="skip">Skip duplicates (Default)</option>
                    <option value="update">Update existing exams</option>
                    <option value="create_new_version">Create new versions</option>
                  </select>
                </div>
              )}

              {/* Error rows section */}
              {previewData.error_rows_count > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Validation Errors Found</span>
                    <button
                      onClick={downloadFailedReport}
                      className="text-xs font-bold text-slate-300 hover:text-white underline decoration-dotted cursor-pointer"
                    >
                      Download Error Rows Report
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-slate-800/80 rounded-xl bg-slate-950 p-3 space-y-1.5">
                    {previewData.error_rows.map((row, idx) => (
                      <div key={idx} className="text-xs text-slate-400">
                        <span className="font-bold text-rose-400">Row {row.row_index}: </span>
                        <span className="text-white font-medium">{row.exam_name}</span> - <span className="italic text-slate-500">{row.errors.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-850 rounded-xl overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-850">
                  <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">Exam Import Rows Preview</span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 border-b border-slate-800/60 text-slate-400 font-semibold">
                        <th className="px-4 py-2">Row</th>
                        <th className="px-4 py-2">Exam Name</th>
                        <th className="px-4 py-2">Conducting Org</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Duplicate?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300 bg-slate-950/20">
                      {previewData.preview_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{item.row_index}</td>
                          <td className="px-4 py-2.5 font-bold text-white">{item.data.name}</td>
                          <td className="px-4 py-2.5 text-slate-400">{item.data.conducting_org}</td>
                          <td className="px-4 py-2.5 text-slate-400">{item.data.category}</td>
                          <td className="px-4 py-2.5">
                            {item.is_duplicate ? (
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">Yes</span>
                            ) : (
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-350 text-xs font-bold transition-all cursor-pointer"
                >
                  Back / Reupload
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={previewData.valid_exams_count === 0 && duplicateStrategy === "skip"}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-brand-500/10 transition-all cursor-pointer"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          ) : (
            // Upload Screen
            <div className="space-y-6 text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/30 rounded-3xl p-8 transition-all relative flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept=".json,.csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Layers className="h-10 w-10 text-slate-500 mb-3" />
                  <span className="text-sm font-bold text-white">Choose JSON, CSV or Excel file</span>
                  <span className="text-xs text-slate-500 mt-1 block">Drag and drop file here, or click to browse</span>
                  {file && (
                    <span className="mt-4 bg-brand-500/10 text-brand-450 border border-brand-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold max-w-full truncate block">
                      Selected: {file.name}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-350 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={!file}
                    className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-brand-500/10 transition-all cursor-pointer"
                  >
                    Parse & Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
