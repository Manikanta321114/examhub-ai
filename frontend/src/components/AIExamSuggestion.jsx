import React, { useState } from "react";
import { Heart, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import ExamDetailsModal from "./ExamDetailsModal";

export default function AIExamSuggestion({
  exams = [],
  studentContext = {},
  savedExamIds = new Set(),
  onToggleBookmark = () => {},
  setActiveTab = () => {},
  setSearchInput = () => {},
  setSearchQuery = () => {},
}) {
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState(null);
  const [loadingIds, setLoadingIds] = useState(new Set());

  if (!exams || exams.length === 0) {
    return null;
  }

  // Category Icon Mapping
  const getCategoryIcon = (category) => {
    if (!category) return "🎓";
    const cat = category.toLowerCase();
    if (cat.includes("engineering")) return "🎓";
    if (cat.includes("medical")) return "🏥";
    if (cat.includes("government")) return "🏛️";
    if (cat.includes("bank")) return "🏦";
    if (cat.includes("defence") || cat.includes("military") || cat.includes("army")) return "🪖";
    if (cat.includes("teach")) return "🏫";
    if (cat.includes("college") || cat.includes("entrance")) return "🎒";
    if (cat.includes("law")) return "⚖️";
    if (cat.includes("management")) return "📊";
    return "📝";
  };

  // Match Reason Calculation
  const getMatchReason = (exam) => {
    const cat = exam?.category?.toLowerCase() || "";
    const level = exam?.level || "";
    const context = studentContext || {};

    if (context.stream === "engineering" && cat.includes("engineering")) {
      return "Matches your engineering background";
    }
    if (context.education === "12th" && context.stream === "science" && level === "12th" && cat.includes("engineering")) {
      return "Matches your 12th science background";
    }
    if (context.stream === "medical" && cat.includes("medical")) {
      return "Matches your medical field profile";
    }
    if (context.education && level === context.education) {
      return `Matches your ${context.education} eligibility level`;
    }

    if (cat.includes("engineering")) return "Matches your engineering interests";
    if (cat.includes("medical")) return "Matches your interest in medical career paths";
    if (cat.includes("banking")) return "Matches banking & finance job profiles";
    if (cat.includes("government")) return "Matches your interest in government services";
    if (cat.includes("defence")) return "Matches defence & military career opportunities";
    if (cat.includes("teaching")) return "Matches education & teaching qualifications";

    return `Suitable for ${level} pass candidates`;
  };

  // Match Percentage Calculation
  const getMatchPercentage = (exam) => {
    let score = 0;
    const context = studentContext || {};

    // Education Match (+40)
    const eduMatch = !context.education || exam?.level?.toLowerCase() === context.education?.toLowerCase();
    if (eduMatch) score += 40;

    // Category Match (+30)
    let catMatch = false;
    if (!context.stream && !context.category) {
      catMatch = true;
    } else {
      const cat = exam?.category?.toLowerCase() || "";
      const stream = context.stream?.toLowerCase() || "";
      const selectedCat = context.category?.toLowerCase() || "";
      if (selectedCat && cat.includes(selectedCat)) catMatch = true;
      else if (stream === "engineering" && cat.includes("engineering")) catMatch = true;
      else if (stream === "medical" && cat.includes("medical")) catMatch = true;
      else if (stream === "science" && (cat.includes("engineering") || cat.includes("medical"))) catMatch = true;
      else if (stream === "commerce" && cat.includes("banking")) catMatch = true;
    }
    if (catMatch) score += 30;

    // State Match (+10)
    const examState = exam?.state?.toLowerCase() || "";
    const stateMatch = !context.state || examState === "all india" || examState.includes(context.state?.toLowerCase());
    if (stateMatch) score += 10;

    // Status active (+20)
    if (exam?.status === "Application Open") {
      score += 20;
    } else if (exam?.status === "Upcoming") {
      score += 10;
    }

    return Math.max(50, score);
  };

  // Sort exams: 1. Application Open, 2. Upcoming, 3. Others
  const sortedExams = [...(exams || [])].sort((a, b) => {
    const getPriority = (status) => {
      if (status === "Application Open") return 1;
      if (status === "Upcoming") return 2;
      return 3;
    };
    return getPriority(a?.status) - getPriority(b?.status);
  });

  // Limit to top 5 for suggestion list
  const displayedExams = sortedExams.slice(0, 5);

  const handleBookmarkToggle = async (examId) => {
    if (!user) {
      if (window.triggerAuthFlow) {
        window.triggerAuthFlow();
      } else {
        alert("Please login or sign up to save exams!");
      }
      return;
    }

    setLoadingIds((prev) => new Set([...prev, examId]));
    try {
      const res = await api.exams.toggleBookmark(examId);
      const isAdded = res.status === "added";
      onToggleBookmark(examId, isAdded);
    } catch (err) {
      console.error(err);
      alert("Error saving exam, please try again.");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(examId);
        return next;
      });
    }
  };

  const handleViewAllClick = () => {
    // Clear previous filters
    localStorage.removeItem("pref_category");
    localStorage.removeItem("pref_education");
    localStorage.removeItem("pref_state");
    localStorage.removeItem("pref_status");
    localStorage.removeItem("pref_difficulty");

    if (exams.length > 0) {
      const categories = {};
      const levels = {};
      const states = {};

      (exams || []).forEach((exam) => {
        if (exam?.category) categories[exam.category] = (categories[exam.category] || 0) + 1;
        if (exam?.level) levels[exam.level] = (levels[exam.level] || 0) + 1;
        if (exam?.state) states[exam.state] = (states[exam.state] || 0) + 1;
      });

      const topCategory = Object.keys(categories).reduce((a, b) => (categories[a] > categories[b] ? a : b), "");
      const topLevel = Object.keys(levels).reduce((a, b) => (levels[a] > levels[b] ? a : b), "");
      const topState = Object.keys(states).reduce((a, b) => (states[a] > states[b] ? a : b), "");

      if (topCategory) localStorage.setItem("pref_category", topCategory);
      if (topLevel) localStorage.setItem("pref_education", topLevel);
      if (topState) localStorage.setItem("pref_state", topState);
    }

    // Reset search
    setSearchInput("");
    setSearchQuery("");

    // Switch tab
    setActiveTab("exams");
  };

  return (
    <div className="space-y-2.5 text-left w-full">
      {(displayedExams || []).map((exam) => {
        if (!exam) return null;
        const isSaved = savedExamIds.has(exam?.id);
        const matchPct = getMatchPercentage(exam);
        const matchReason = getMatchReason(exam);
        const emoji = getCategoryIcon(exam?.category);
        const isLoading = loadingIds.has(exam?.id);

        let statusColor = "bg-slate-800 text-slate-400 border-slate-700/60";
        if (exam?.status === "Application Open") {
          statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        } else if (exam?.status === "Upcoming") {
          statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        } else if (exam?.status === "Application Closed") {
          statusColor = "bg-rose-500/10 text-rose-455 border-rose-500/20";
        }

        return (
          <div
            key={exam?.id}
            className="bg-slate-900/35 border border-slate-850 hover:border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between gap-3 transition-all duration-200"
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-2.5 w-full">
              <div className="space-y-1 w-full min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0" role="img" aria-label="exam-category">
                    {emoji}
                  </span>
                  <h4 className="font-bold text-white text-xs sm:text-sm truncate leading-snug" title={exam?.name || ""}>
                    {exam?.name || ""}
                  </h4>
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex flex-wrap items-center gap-1">
                  <span>{exam?.category?.replace(" Exams", " Exam") || ""}</span>
                  <span>•</span>
                  <span>{exam?.level || ""}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Match Percentage Badge */}
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/15">
                  {matchPct}% Match
                </span>
              </div>
            </div>

            {/* Badges line */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${statusColor}`}>
                {exam?.status || "Upcoming"}
              </span>
              {exam?.last_date && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/15 flex items-center gap-1 font-semibold">
                  <Calendar className="h-2.5 w-2.5" />
                  Deadline: {exam?.last_date}
                </span>
              )}
            </div>

            {/* Why Recommended Reason */}
            <div className="text-[10px] text-slate-450 leading-relaxed bg-slate-950/20 px-2.5 py-1.5 rounded-xl border border-slate-850/60">
              <span className="font-semibold text-slate-400">Why recommended: </span>
              "{matchReason}"
            </div>

            {/* Action buttons footer */}
            <div className="flex items-center justify-between border-t border-slate-850/50 pt-2 mt-0.5">
              <button
                onClick={() => handleBookmarkToggle(exam?.id)}
                disabled={isLoading}
                className={`flex items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSaved
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-455 hover:bg-rose-500/20"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-rose-400 hover:border-rose-500/20"
                }`}
              >
                <Heart className={`h-3 w-3 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                {isSaved ? "Saved" : "Save"}
              </button>

              <button
                onClick={() => setSelectedExam(exam)}
                className="text-[10px] font-extrabold bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1 rounded-lg transition-all cursor-pointer shadow shadow-brand-500/10 border border-brand-500/20 active:scale-95"
              >
                View
              </button>
            </div>
          </div>
        );
      })}

      {/* View All Button */}
      {exams.length > 5 && (
        <button
          onClick={handleViewAllClick}
          className="w-full text-center text-xs font-bold text-brand-400 hover:text-brand-350 bg-slate-900/20 hover:bg-slate-900/40 border border-slate-850 hover:border-slate-800 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-3"
        >
          View all {exams.length} matching exams →
        </button>
      )}

      {selectedExam && (
        <ExamDetailsModal
          exam={selectedExam}
          isOpen={!!selectedExam}
          onClose={() => setSelectedExam(null)}
        />
      )}
    </div>
  );
}
