import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { Bookmark, Calendar, Globe, FileText, FileDown, Layers, Landmark, X, Info } from "lucide-react";
import ExamDetailsModal from "./ExamDetailsModal";

export default function ExamCard({ exam, isSavedInitial = false, onToggleBookmark = () => {} }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [loading, setLoading] = useState(false);

  // Track page views on mount
  useEffect(() => {
    if (!exam?.id) return;
    api.analytics.recordView(exam.id).catch((err) => {
      console.warn("Analytics view logging failed:", err);
    });
  }, [exam?.id]);

  if (!exam) return null;

  const handleBookmarkToggle = async () => {
    if (!user) {
      if (window.triggerAuthFlow) {
        window.triggerAuthFlow();
      } else {
        alert("Please login or sign up to save exams!");
      }
      return;
    }
    setLoading(true);
    try {
      const res = await api.exams.toggleBookmark(exam.id);
      setIsSaved(res.status === "added");
      onToggleBookmark(exam.id, res.status === "added");
    } catch (err) {
      console.error(err);
      alert("Error saving exam, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [showModal, setShowModal] = useState(false);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
    }
  };

  const handleApplyClick = () => {
    // Record analytics click
    api.analytics.recordClick(exam.id).catch((err) => {
      console.warn("Analytics click logging failed:", err);
    });

    if (window.triggerApplyFlow) {
      window.triggerApplyFlow(exam);
    } else if (exam.official_link || exam.application_link) {
      const link = exam.official_link || exam.application_link;
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300">
        {/* Decorative top gradient glow */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-500 via-indigo-500 to-cyan-500" />
        
        <div>
          {/* Header conducting organization & bookmark */}
          <div className="flex justify-between items-start gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-400 uppercase tracking-wider truncate max-w-[80%]">
              <Landmark className="h-3 w-3 shrink-0" />
              <span className="truncate">{exam?.conducting_org}</span>
            </div>
            
            <button
              onClick={handleBookmarkToggle}
              disabled={loading}
              className={`p-1.5 rounded-lg transition-all duration-200 border shrink-0 ${
                isSaved
                  ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                  : "border-slate-800 text-slate-500 hover:text-slate-350 hover:bg-slate-800"
              }`}
              title={isSaved ? "Saved to Dashboard" : "Save Exam"}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-brand-500" : ""}`} />
            </button>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-white mb-2 leading-snug line-clamp-2 min-h-[2.5rem]" title={exam?.name}>
            {exam?.name}
          </h3>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="text-[9px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              {exam?.category}
            </span>
            <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/15">
              {exam?.level}
            </span>
          </div>
        </div>

        <div>
          {/* Dates */}
          <div className="border-t border-slate-800/80 pt-3.5 mb-4 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium uppercase tracking-wider">{t("last_date")}</span>
              <span className="text-rose-400 flex items-center gap-1 font-bold">
                <Calendar className="h-3 w-3 shrink-0" />
                {exam?.last_date || "TBD"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium uppercase tracking-wider">{t("exam_date")}</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Calendar className="h-3 w-3 shrink-0" />
                {exam?.exam_date || "TBD"}
              </span>
            </div>
          </div>

          {/* Core Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-800 h-11 px-3 rounded-lg transition-all cursor-pointer font-bold w-full"
            >
              <Info className="h-3.5 w-3.5" />
              View Details
            </button>
            
            <button
              onClick={handleApplyClick}
              disabled={!(exam?.official_link || exam?.application_link)}
              className="flex items-center justify-center gap-1.5 text-[11px] text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed h-11 px-3 rounded-lg transition-all cursor-pointer font-bold w-full"
            >
              <Globe className="h-3.5 w-3.5" />
              {t("apply_now")}
            </button>
          </div>
        </div>
      </div>

      <ExamDetailsModal
        exam={exam}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
