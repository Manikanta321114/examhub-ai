import React from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { Calendar, Globe, FileText, FileDown, Layers, X } from "lucide-react";

export default function ExamDetailsModal({ exam, isOpen, onClose }) {
  const { t } = useTranslation();

  if (!isOpen || !exam) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleApplyClick = () => {
    // Record analytics click
    api.analytics.recordClick(exam.id).catch((err) => {
      console.warn("Analytics view logging failed:", err);
    });

    if (window.triggerApplyFlow) {
      window.triggerApplyFlow(exam);
    } else if (exam.official_link || exam.application_link) {
      const link = exam.official_link || exam.application_link;
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-t border-x sm:border border-slate-800 rounded-t-[2rem] rounded-b-none sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-[90vh] my-0 sm:my-8 animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-350 sm:duration-200">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand-500 via-indigo-500 to-cyan-500" />
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-850 flex justify-between items-start gap-4 text-left">
          <div>
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-1 rounded-md border border-brand-500/15 mb-2.5 inline-block">
              {exam.conducting_org}
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white leading-snug">{exam.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 sm:max-h-[60vh] text-left">
          {/* Description */}
          <div className="space-y-2 text-left">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About this Examination</h4>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-950/45 p-4 rounded-2xl border border-slate-850">
              {exam.description || "No description provided."}
            </p>
          </div>

          {/* Core Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Category</span>
                  <span className="text-slate-200 font-semibold">{exam.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Eligibility Level</span>
                  <span className="text-slate-200 font-semibold">{exam.level}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Application Mode</span>
                  <span className="text-slate-200 font-semibold">{exam.mode || exam.application_mode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Application Fee</span>
                  <span className="text-brand-400 font-bold">{exam.application_fee || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="text-emerald-450 font-bold">{exam.status || "Upcoming"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Difficulty Level</span>
                  <span className="text-amber-400 font-semibold">{exam.difficulty_level || "Moderate"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">State Availability</span>
                  <span className="text-slate-200 font-semibold">{exam.state || "All India"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/50">
                  <span className="text-slate-500 font-medium">Source Verified</span>
                  <span className="text-slate-200 font-semibold">{exam.source_verified ? "Yes ✅" : "No"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Data Quality Score</span>
                  <span className="text-cyan-400 font-bold">{exam.data_quality_score || 0}%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Important Dates</h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-brand-455 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Applications Start</span>
                    <span className="text-slate-200 font-semibold">{exam.application_start_date || exam.start_date || "TBD"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Submission Deadline</span>
                    <span className="text-rose-400 font-bold">{exam.last_date || "TBD"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-emerald-455 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Examination Date</span>
                    <span className="text-emerald-400 font-semibold">{exam.exam_date || "TBD"}</span>
                  </div>
                </div>
                {exam.last_verified_date && (
                  <div className="border-t border-slate-850 pt-2 flex justify-between">
                    <span className="text-slate-500">Last Verified Date:</span>
                    <span className="text-slate-400">{exam.last_verified_date}</span>
                  </div>
                )}
                {exam.next_verification_due && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Next Verification Due:</span>
                    <span className="text-slate-400">{exam.next_verification_due}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended For & Career Outcome */}
          {((exam.recommended_for && exam.recommended_for.length > 0) || exam.career_outcome) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exam.recommended_for && exam.recommended_for.length > 0 && (
                <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended For</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {exam.recommended_for.map((rec, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-brand-500/10 text-brand-450 border border-brand-500/20 px-2 py-0.5 rounded">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {exam.career_outcome && (
                <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Career Opportunity</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {exam.career_outcome}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Eligibility Description */}
          {exam.eligibility && (
            <div className="space-y-2 text-left">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eligibility Requirements</h4>
              <div className="text-slate-300 text-xs leading-relaxed bg-slate-950/45 p-4 rounded-2xl border border-slate-850">
                {exam.eligibility}
              </div>
            </div>
          )}

          {/* Resource & Documents Links */}
          {(exam.notification_pdf || exam.syllabus_link || exam.papers_link) && (
            <div className="space-y-3 bg-slate-950/35 border border-slate-850 p-4 rounded-2xl text-left">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resource Files & Syllabus</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {exam.notification_pdf && (
                  <a
                    href={exam.notification_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/50 py-2.5 px-3 rounded-xl transition-all"
                  >
                    <FileDown className="h-4 w-4" />
                    Notification PDF
                  </a>
                )}
                {exam.syllabus_link && (
                  <a
                    href={exam.syllabus_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/50 py-2.5 px-3 rounded-xl transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    Syllabus Details
                  </a>
                )}
                {exam.papers_link && (
                  <a
                    href={exam.papers_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/50 py-2.5 px-3 rounded-xl transition-all"
                  >
                    <Layers className="h-4 w-4" />
                    Previous Papers
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-850 bg-slate-950/30 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer h-11 flex items-center justify-center"
          >
            Close
          </button>
          <button
            onClick={handleApplyClick}
            disabled={!(exam.official_link || exam.application_link)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-500/10 h-11"
          >
            <Globe className="h-4 w-4" />
            Apply Online
          </button>
        </div>
      </div>
    </div>
  );
}
