import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import ExamCard from "../components/ExamCard";
import { LayoutDashboard, Calendar, Bell, Sparkles, GraduationCap, Clock, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState({
    saved_exams: [],
    recommended_exams: [],
    upcoming_deadlines: []
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const data = await api.dashboard.get();
      setDashboardData(data);
      
      try {
        const suggestionsData = await api.suggestions.getMy();
        setSuggestions(suggestionsData);
      } catch (sugErr) {
        console.error("Failed to fetch student suggestions:", sugErr);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleBookmark = (examId, isBookmarked) => {
    // Refresh dashboard content when user deletes a bookmark from cards
    fetchDashboardData();
  };

  const getDaysRemaining = (lastDateStr) => {
    if (!lastDateStr) return null;
    const today = new Date();
    const lastDate = new Date(lastDateStr);
    const diffTime = lastDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-center text-slate-455 animate-pulse">
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      {/* Banner */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-2">
          <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">Student Dashboard</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Welcome back, {user?.full_name || "Scholar"}!</h2>
          <p className="text-slate-400 text-sm">Monitor saved examinations, deadline warnings, and recommendations matched to your eligibility profile.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl text-center">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">Saved Exams</span>
            <span className="text-2xl font-black text-brand-400">{dashboardData.saved_exams.length}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl text-center">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">Upcoming</span>
            <span className="text-2xl font-black text-rose-400">{dashboardData.upcoming_deadlines.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: saved exams & recommendations */}
        <div className="lg:col-span-2 space-y-10">
          {/* Saved Exams list */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <Calendar className="h-5 w-5 text-brand-400" />
              Bookmarked Exams
            </h3>
            {dashboardData.saved_exams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {dashboardData.saved_exams.map((exam) => (
                  <div key={exam.id}>
                    <ExamCard exam={exam} isSavedInitial={true} onToggleBookmark={handleToggleBookmark} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 border border-dashed border-slate-800/80">
                <GraduationCap className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">Save exams to track deadlines 🚀</p>
              </div>
            )}
          </div>

          {/* Recommended Exams list */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <Sparkles className="h-5 w-5 text-brand-400" />
              Recommended for You
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {dashboardData.recommended_exams.map((exam) => (
                <div key={exam.id}>
                  <ExamCard exam={exam} isSavedInitial={false} onToggleBookmark={handleToggleBookmark} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: deadline alerts & suggestions */}
        <div className="space-y-6">
          {/* Deadline Alerts - Timeline format */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-left">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-rose-400" />
              Deadline Alerts
            </h3>
            
            <div className={`relative ${dashboardData.upcoming_deadlines.length > 0 ? "border-l-2 border-slate-800/80 ml-3 pl-5 space-y-6" : ""}`}>
              {dashboardData.upcoming_deadlines.length > 0 ? (
                dashboardData.upcoming_deadlines.map((exam) => {
                  const daysLeft = getDaysRemaining(exam.last_date);
                  let badgeColor = "bg-slate-900 border-slate-800 text-slate-400";
                  let dotColor = "bg-slate-700";
                  let daysLabel = "TBD";
                  
                  if (daysLeft !== null) {
                    if (daysLeft < 0) {
                      badgeColor = "bg-rose-955/20 border-rose-900/30 text-rose-455";
                      dotColor = "bg-rose-500";
                      daysLabel = "Closed";
                    } else if (daysLeft <= 15) {
                      badgeColor = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                      dotColor = "bg-rose-500 animate-ping";
                      daysLabel = `${daysLeft}d left`;
                    } else if (daysLeft <= 30) {
                      badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                      dotColor = "bg-amber-500";
                      daysLabel = `${daysLeft}d left`;
                    } else {
                      badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                      dotColor = "bg-emerald-500";
                      daysLabel = `${daysLeft}d left`;
                    }
                  }

                  return (
                    <div key={exam.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[29px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0b1120] z-10">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      </span>
                      
                      {/* Alert Card */}
                      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-xs font-bold text-white block truncate" title={exam.name}>{exam.name}</span>
                          <span className="text-[10px] text-slate-550 block">Deadline: {exam.last_date || "TBD"}</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                          {daysLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No upcoming deadlines found. Save exams to track their deadlines here!
                </div>
              )}
            </div>
          </div>

          {/* Notifications Center */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-brand-400" />
              Notifications Center
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 text-left">
              {dashboardData.notifications && dashboardData.notifications.length > 0 ? (
                dashboardData.notifications.map((notif) => (
                  <div key={notif.id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-350">
                    <p className="leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-slate-500 block mt-1 font-semibold">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-505 italic">
                  No notifications yet.
                </div>
              )}
            </div>
          </div>

          {/* My Suggestions */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-brand-400" />
              {t("my_suggestions")}
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {suggestions.length > 0 ? (
                suggestions.map((sug) => {
                  let statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  let statusLabel = t("pending");
                  if (sug.status === "approved") {
                    statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    statusLabel = t("approved");
                  } else if (sug.status === "rejected") {
                    statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    statusLabel = t("rejected");
                  }

                  return (
                    <div key={sug.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-white">{sug.exam_name}</h4>
                          <p className="text-[10px] text-slate-500">{sug.organization}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </div>
                      {sug.message && (
                        <p className="text-[10px] text-slate-400 italic line-clamp-2">
                          "{sug.message}"
                        </p>
                      )}
                      {sug.request_count > 1 && (
                        <p className="text-[9px] text-brand-400">
                          Requested by {sug.request_count} students
                        </p>
                      )}
                      {sug.admin_reason && (
                        <div className="text-[10px] bg-rose-500/5 border border-rose-500/15 p-2 rounded text-rose-350">
                          <span className="font-bold">Reason:</span> {sug.admin_reason}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 italic">
                  No suggestions yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
