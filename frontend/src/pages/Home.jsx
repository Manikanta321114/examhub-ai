import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import ExamCard from "../components/ExamCard";
import { Search, GraduationCap, Server, Layers, Award, Landmark, Check, Send, BookOpen, Shield, Flame, Sparkles } from "lucide-react";

function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 h-[220px] animate-pulse flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className="h-3 bg-slate-800 rounded w-1/3" />
          <div className="h-6 w-6 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-5 bg-slate-800 rounded w-3/4 mb-3" />
        <div className="flex gap-1.5 mb-4">
          <div className="h-3.5 bg-slate-800 rounded w-16" />
          <div className="h-3.5 bg-slate-800 rounded w-12" />
        </div>
      </div>
      <div>
        <div className="border-t border-slate-800/80 pt-3.5 mb-4 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="h-2.5 bg-slate-800 rounded w-1/2" />
            <div className="h-3.5 bg-slate-800 rounded w-3/4" />
          </div>
          <div className="space-y-1">
            <div className="h-2.5 bg-slate-800 rounded w-1/2" />
            <div className="h-3.5 bg-slate-800 rounded w-3/4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-slate-800 rounded-lg" />
          <div className="h-8 bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function Home({ setActiveTab = () => {}, searchInput = "", setSearchInput = () => {}, searchQuery = "", setSearchQuery = () => {} }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [allExams, setAllExams] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);

  // Exam Suggestions Form States
  const [sugName, setSugName] = useState("");
  const [sugOrg, setSugOrg] = useState("");
  const [sugLink, setSugLink] = useState("");
  const [sugMsg, setSugMsg] = useState("");
  const [sugLoading, setSugLoading] = useState(false);
  const [sugSuccess, setSugSuccess] = useState("");

  const fetchAllExams = async () => {
    setLoading(true);
    try {
      const data = await api.exams.getAll();
      setAllExams(data);
    } catch (err) {
      console.error("Failed to load all exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllExams();
  }, []);

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    setSugLoading(true);
    setSugSuccess("");
    try {
      await api.suggestions.submit({
        exam_name: sugName,
        organization: sugOrg,
        official_link: sugLink,
        message: sugMsg
      });
      setSugSuccess("Thank you! Your exam suggestion has been submitted successfully.");
      setSugName("");
      setSugOrg("");
      setSugLink("");
      setSugMsg("");
    } catch (err) {
      console.error("Failed to submit suggestion:", err);
      alert(err.message || "Failed to submit suggestion. Please try again.");
    } finally {
      setSugLoading(false);
    }
  };

  const matchingExams = allExams
    .filter(e => e.name.toLowerCase().includes(searchInput.toLowerCase()) || e.conducting_org.toLowerCase().includes(searchInput.toLowerCase()))
    .map(e => ({ id: e.id, name: e.name, subtitle: e.conducting_org, queryVal: e.name }));

  const searchSuggestions = searchInput.length >= 2
    ? matchingExams.slice(0, 6)
    : [];

  const getPopularityScore = (exam) => {
    const isOpen = exam.status === "Application Open";
    const bookmarkScore = (exam.bookmark_count || 0) * 3;
    const clickScore = (exam.apply_click_count || 0) * 2;
    const viewScore = exam.view_count || 0;
    return (isOpen ? 50 : 0) + bookmarkScore + clickScore + viewScore;
  };

  // Curate popular exams specifically to represent the requested major categories: UPSC, JEE, NEET, GATE, SSC, Banking
  const getPopularExams = () => {
    if (!allExams.length) return [];
    const selected = [];
    const keys = ["upsc", "jee", "neet", "gate", "ssc", "bank"];

    // Find the best popular exam for each key
    keys.forEach(key => {
      const matches = allExams.filter(exam => {
        const name = (exam.name || "").toLowerCase();
        const cat = (exam.category || "").toLowerCase();
        const org = (exam.conducting_org || "").toLowerCase();
        
        if (key === "bank") {
          return cat.includes("banking") || name.includes("bank") || name.includes("ibps") || name.includes("sbi");
        }
        return name.includes(key) || cat.includes(key) || org.includes(key);
      });

      if (matches.length > 0) {
        matches.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
        selected.push(matches[0]);
      }
    });

    // Fill up to 6 with other popular exams if we couldn't find matches for some keys
    const selectedIds = new Set(selected.map(e => e.id));
    const remaining = allExams.filter(e => !selectedIds.has(e.id));
    remaining.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));

    while (selected.length < 6 && remaining.length > 0) {
      selected.push(remaining.shift());
    }

    return selected.slice(0, 6);
  };

  const popularExams = getPopularExams();

  const handleSearchTrigger = (val) => {
    setSearchInput(val);
    setSearchQuery(val);
    setActiveTab("exams");
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative text-center py-20 px-6 max-w-4xl mx-auto flex flex-col items-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-600/10 via-transparent to-transparent blur-3xl rounded-full" />
        <span className="bg-brand-500/10 text-brand-400 text-xs font-semibold px-4 py-2 rounded-full border border-brand-500/20 mb-6 tracking-wide uppercase flex items-center gap-1.5 animate-in slide-in-from-top duration-300">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" /> ✨ AI Powered Exam Discovery
        </span>
        <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
          Find Every Exam Opportunity <br />
          <span className="bg-gradient-to-r from-brand-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            in One Place
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-10">
          Discover government, entrance, and career exams with smart search, reminders, and official links.
        </p>

        {/* Dynamic Search bar */}
        <div className="w-full max-w-2xl space-y-4 relative">
          <div className="relative shadow-none sm:shadow-2xl sm:shadow-black/40 flex flex-col sm:flex-row items-stretch sm:items-center bg-transparent sm:bg-slate-900/90 border-0 sm:border border-slate-800 focus-within:border-brand-500 rounded-2xl p-0 sm:p-1.5 transition-all duration-200 gap-3 sm:gap-0">
            <div className="relative flex-1 flex items-center bg-slate-900/90 border border-slate-800 focus-within:border-brand-500 rounded-2xl sm:bg-transparent sm:border-0 p-1.5 sm:p-0">
              <Search className="absolute left-5 h-5 w-5 text-slate-550" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchTrigger(searchInput);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search exams, organizations, or keywords..."
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleSearchTrigger(searchInput)}
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-6 py-3.5 sm:py-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 h-11 sm:h-auto flex items-center justify-center"
            >
              Search
            </button>
          </div>

          {/* Instant Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50 text-left">
              {searchSuggestions.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    handleSearchTrigger(sug.queryVal);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-xs hover:bg-brand-500/10 text-slate-350 hover:text-white transition-all text-left flex items-center justify-between border-b border-slate-850 last:border-0 cursor-pointer"
                >
                  <span className="font-semibold">{sug.name}</span>
                  <span className="text-[10px] text-slate-550">{sug.subtitle}</span>
                </button>
              ))}
            </div>
          )}

          {/* Trending Chips */}
          <div className="flex flex-nowrap sm:flex-wrap items-center justify-start sm:justify-center gap-2 text-xs overflow-x-auto sm:overflow-x-visible pb-2.5 sm:pb-0 scrollbar-none max-w-full">
            <span className="text-slate-505 font-medium mr-1 shrink-0">Trending:</span>
            {["UPSC", "SSC", "Banking", "GATE", "NEET", "JEE"].map((term) => (
              <button
                key={term}
                onClick={() => handleSearchTrigger(term)}
                className="bg-slate-900 hover:bg-slate-855 text-slate-400 hover:text-white px-3.5 py-1.5 rounded-full border border-slate-800/80 transition-all cursor-pointer font-medium shrink-0"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Popular Exams Section */}
      <section id="popular-exams" className="max-w-6xl mx-auto px-6 space-y-6 animate-in fade-in duration-300">
        <div className="border-b border-slate-855 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500 animate-pulse" /> Popular Examinations
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Top trending exams based on bookmarks, application views, and active status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-brand-400">
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">UPSC</span>
            <span className="text-slate-700">|</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">JEE</span>
            <span className="text-slate-700">|</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">NEET</span>
            <span className="text-slate-700">|</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">GATE</span>
            <span className="text-slate-700">|</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">SSC</span>
            <span className="text-slate-700">|</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">Banking</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => <CardSkeleton key={n} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {popularExams.map(exam => (
              <div key={exam.id}>
                <ExamCard exam={exam} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Explore All Exams Button (centered below Popular Exams by default) */}
      <div className="flex justify-center py-4">
        <button
          onClick={() => setActiveTab("exams")}
          className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20 cursor-pointer hover:scale-[1.02] duration-200"
        >
          Explore All Exams →
        </button>
      </div>

      {/* Suggest Missing Exam Section */}
      <section id="suggest" className="max-w-4xl mx-auto px-6 pt-6">
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-slate-855 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl -z-10" />
          
          <div className="space-y-2 mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Can't find an exam? Suggest it 🚀
            </h3>
            <p className="text-slate-400 text-xs md:text-sm">
              Submit details of any missing examination. If standard details are verified by the admin, we will add it to the registry.
            </p>
          </div>

          {sugSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{sugSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSuggestionSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-455 mb-2">Exam Name *</label>
              <input
                type="text"
                required
                value={sugName}
                onChange={(e) => setSugName(e.target.value)}
                placeholder="e.g. Karnataka PSI Exam"
                className="w-full bg-slate-950 border border-slate-855 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-455 mb-2">Conducting Organization *</label>
              <input
                type="text"
                required
                value={sugOrg}
                onChange={(e) => setSugOrg(e.target.value)}
                placeholder="e.g. KSP"
                className="w-full bg-slate-950 border border-slate-855 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-455 mb-2">Official Website Link (optional)</label>
              <input
                type="url"
                value={sugLink}
                onChange={(e) => setSugLink(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-855 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-455 mb-2">Additional Message / Syllabus Details</label>
              <textarea
                rows={2}
                value={sugMsg}
                onChange={(e) => setSugMsg(e.target.value)}
                placeholder="Provide details such as syllabus topics, eligibility parameters or year specifications."
                className="w-full bg-slate-950 border border-slate-855 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none resize-none"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={sugLoading || !sugName || !sugOrg}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-900 border border-brand-500/20 disabled:border-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {sugLoading ? "Filing Suggestion..." : "Submit Suggestion"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Homepage Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/20 pt-12 pb-8 text-left text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              ExamHub AI
            </h4>
            <p className="text-slate-500 leading-relaxed text-xs">
              Personalized exam tracker directory and scheduling helper mapping regional language support for Indian candidates.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Quick Links</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button onClick={() => setActiveTab("exams")} className="hover:text-brand-400 transition-colors text-left">
                  Exams
                </button>
              </li>
              <li>
                <a href="#suggest" className="hover:text-brand-400 transition-colors">
                  Suggest Exam
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Support</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <span className="text-slate-500">Contact: support@examhub.ai</span>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (window.triggerFeedbackModal) {
                      window.triggerFeedbackModal();
                    } else {
                      alert("Please click 'Help us improve' at the bottom of the page.");
                    }
                  }}
                  className="hover:text-brand-400 transition-colors cursor-pointer text-left"
                >
                  Feedback
                </button>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
