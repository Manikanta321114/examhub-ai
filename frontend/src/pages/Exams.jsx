import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import ExamCard from "../components/ExamCard";
import { Search, GraduationCap, Server, Layers, Award, Landmark, Check, Send, BookOpen, Shield, Flame, Sparkles, Filter, X } from "lucide-react";

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

export default function Exams({ searchInput = "", setSearchInput = () => {}, searchQuery = "", setSearchQuery = () => {}, setActiveTab = () => {} }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [allExams, setAllExams] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);

  // Advanced Filters (using localStorage for persistence)
  const [filterCategory, setFilterCategory] = useState(() => localStorage.getItem("pref_category") || "");
  const [filterEducation, setFilterEducation] = useState(() => localStorage.getItem("pref_education") || "");
  const [filterState, setFilterState] = useState(() => localStorage.getItem("pref_state") || "");
  const [filterStatus, setFilterStatus] = useState(() => localStorage.getItem("pref_status") || "");
  const [filterDifficulty, setFilterDifficulty] = useState(() => localStorage.getItem("pref_difficulty") || "");
  const [sortOption, setSortOption] = useState("popular");
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(12);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("pref_category", filterCategory);
  }, [filterCategory]);
  useEffect(() => {
    localStorage.setItem("pref_education", filterEducation);
  }, [filterEducation]);
  useEffect(() => {
    localStorage.setItem("pref_state", filterState);
  }, [filterState]);
  useEffect(() => {
    localStorage.setItem("pref_status", filterStatus);
  }, [filterStatus]);
  useEffect(() => {
    localStorage.setItem("pref_difficulty", filterDifficulty);
  }, [filterDifficulty]);

  const mapSearchQuery = (query) => {
    if (!query) return "";
    const q = query.toLowerCase().trim();
    const mappings = {
      "ಎಂಜಿನಿಯರಿಂಗ್": "Engineering",
      "ಸರ್ಕಾರಿ": "Government",
      "ಸರಕಾರಿ": "Government",
      "ವೈದ್ಯಕೀಯ": "Medical",
      "ಬ್ಯಾಂಕಿಂಗ್": "Banking",
      "ಪರೀಕ್ಷೆ": "",
      "इंजीनियरिंग": "Engineering",
      "सरकारी": "Government",
      "मेडिकल": "Medical",
      "बैंकिंग": "Banking",
      "परीक्षा": "",
      "ఇంజనీరింగ్": "Engineering",
      "ప్రభుత్వ": "Government",
      "మెడికల్": "Medical",
      "బ్యాంకింగ్": "Banking",
      "పరీక్ష": "",
      "பொறியியல்": "Engineering",
      "அரசு": "Government",
      "மருத்துவம்": "Medical",
      "வங்கி": "Banking",
      "தேர்வு": "",
      "എഞ്ചിനീയറിംഗ്": "Engineering",
      "ഗവൺമെന്റ്": "Government",
      "സർക്കാർ": "Government",
      "മെഡിക്കൽ": "Medical",
      "ബാങ്കിംഗ്": "Banking",
      "പരീക്ഷ": ""
    };
    return mappings[q] || query;
  };

  const categories = [
    { name: "Government Exams" },
    { name: "Banking Exams" },
    { name: "Medical Exams" },
    { name: "Engineering Exams" },
    { name: "Teaching Exams" },
    { name: "Defence Exams" }
  ];

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

  const clearAllFilters = () => {
    setFilterCategory("");
    setFilterEducation("");
    setFilterState("");
    setFilterStatus("");
    setFilterDifficulty("");
    setSearchQuery("");
    setSearchInput("");
  };

  const matchingCategories = categories
    .filter(c => c.name.toLowerCase().includes(searchInput.toLowerCase()))
    .map(c => ({ id: `cat-${c.name}`, name: c.name, subtitle: "Category", isCategory: true, queryVal: c.name }));

  const matchingExams = allExams
    .filter(e => e.name.toLowerCase().includes(searchInput.toLowerCase()) || e.conducting_org.toLowerCase().includes(searchInput.toLowerCase()))
    .map(e => ({ id: e.id, name: e.name, subtitle: e.conducting_org, isCategory: false, queryVal: e.name }));

  const searchSuggestions = searchInput.length >= 2
    ? [...matchingCategories, ...matchingExams].slice(0, 6)
    : [];

  const getPopularityScore = (exam) => {
    const isOpen = exam.status === "Application Open";
    const bookmarkScore = (exam.bookmark_count || 0) * 3;
    const clickScore = (exam.apply_click_count || 0) * 2;
    const viewScore = exam.view_count || 0;
    return (isOpen ? 50 : 0) + bookmarkScore + clickScore + viewScore;
  };

  // Filter exams
  const filteredExams = allExams.filter(exam => {
    if (searchQuery) {
      const q = mapSearchQuery(searchQuery).toLowerCase();
      const matchesSearch = (
        exam.name?.toLowerCase().includes(q) ||
        exam.conducting_org?.toLowerCase().includes(q) ||
        exam.description?.toLowerCase().includes(q) ||
        exam.eligibility?.toLowerCase().includes(q) ||
        exam.category?.toLowerCase().includes(q) ||
        exam.syllabus?.toLowerCase().includes(q) ||
        (Array.isArray(exam.tags) && exam.tags.some(t => t.toLowerCase().includes(q))) ||
        (Array.isArray(exam.keywords) && exam.keywords.some(k => k.toLowerCase().includes(q)))
      );
      if (!matchesSearch) return false;
    }
    
    if (filterCategory && exam.category !== filterCategory) return false;
    if (filterEducation && exam.level !== filterEducation) return false;
    if (filterState && exam.state?.toLowerCase() !== filterState.toLowerCase()) return false;
    if (filterStatus && exam.status !== filterStatus) return false;
    if (filterDifficulty && exam.difficulty_level !== filterDifficulty) return false;
    
    return true;
  });

  // Sort exams
  const sortedExams = [...filteredExams].sort((a, b) => {
    if (sortOption === "popular") {
      return getPopularityScore(b) - getPopularityScore(a);
    } else if (sortOption === "recent") {
      return b.id - a.id;
    } else if (sortOption === "deadline") {
      const dateA = a.last_date ? new Date(a.last_date) : new Date("9999-12-31");
      const dateB = b.last_date ? new Date(b.last_date) : new Date("9999-12-31");
      return dateA - dateB;
    }
    return 0;
  });

  const uniqueStates = Array.from(
    new Set(allExams.map(e => e.state).filter(Boolean))
  ).sort();

  const displayedExams = sortedExams.slice(0, visibleCount);
  const showLoadMore = sortedExams.length > visibleCount;
  const hasActiveFilters = !!(filterCategory || filterEducation || filterState || filterStatus || filterDifficulty || searchQuery);

  const FiltersPanel = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</h4>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-350 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold text-slate-450 uppercase">Category</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/80"
        >
          <option value="">All Categories</option>
          <option value="Government Exams">Government Exams</option>
          <option value="Engineering Exams">Engineering Exams</option>
          <option value="Medical Exams">Medical Exams</option>
          <option value="Banking Exams">Banking Exams</option>
          <option value="College Entrance Exams">College Entrance Exams</option>
          <option value="Teaching Exams">Teaching Exams</option>
          <option value="Defence Exams">Defence Exams</option>
          <option value="Management">Management</option>
          <option value="Law">Law</option>
          <option value="State Government Exams">State Government Exams</option>
        </select>
      </div>

      {/* Education filter */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold text-slate-450 uppercase">Education Level</label>
        <select
          value={filterEducation}
          onChange={(e) => setFilterEducation(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/80"
        >
          <option value="">All Levels</option>
          <option value="10th">10th Pass</option>
          <option value="12th">12th Pass</option>
          <option value="UG">Undergraduate (UG)</option>
          <option value="Graduate">Graduate</option>
        </select>
      </div>

      {/* State filter */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold text-slate-450 uppercase">State</label>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/80"
        >
          <option value="">All States</option>
          {uniqueStates.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </div>

      {/* Status filter */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold text-slate-450 uppercase">Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/80"
        >
          <option value="">All Statuses</option>
          <option value="Application Open">Application Open</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Application Closed">Application Closed</option>
          <option value="Exam Completed">Exam Completed</option>
          <option value="Result Released">Result Released</option>
        </select>
      </div>

      {/* Difficulty level filter */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold text-slate-450 uppercase">Difficulty</label>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/80"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Moderate">Moderate</option>
          <option value="Hard">Hard</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Top Search bar */}
      <div className="w-full max-w-2xl mx-auto space-y-4 relative pt-4 px-4 sm:px-0">
        <div className="relative shadow-none sm:shadow-2xl sm:shadow-black/40 flex flex-col sm:flex-row items-stretch sm:items-center bg-transparent sm:bg-slate-900/90 border-0 sm:border border-slate-800 focus-within:border-brand-500 rounded-2xl p-0 sm:p-1.5 transition-all duration-200 gap-3 sm:gap-0">
          <div className="relative flex-1 flex items-center bg-slate-900/90 border border-slate-800 focus-within:border-brand-500 rounded-2xl sm:bg-transparent sm:border-0 p-1.5 sm:p-0">
            <Search className="absolute left-5 h-5 w-5 text-slate-550" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery(searchInput);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search exams, organizations, or keywords..."
              className="w-full bg-transparent pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSearchQuery(searchInput)}
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
                  if (sug.isCategory) {
                    setFilterCategory(sug.queryVal);
                    setSearchInput("");
                    setSearchQuery("");
                  } else {
                    setSearchInput(sug.queryVal);
                    setSearchQuery(sug.queryVal);
                  }
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
      </div>

      <div className="border-b border-slate-855 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {filterCategory ? `${filterCategory}` : "Exam Results"} ({sortedExams.length} found)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse and filter through the complete database of examinations.
          </p>
        </div>

        {/* Sorting and Mobile Filter buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer h-10"
          >
            ⚙ Filters
          </button>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-4 py-2 focus:outline-none ml-auto md:ml-0 cursor-pointer"
          >
            <option value="popular">🔥 Sort: Popularity</option>
            <option value="recent">🆕 Sort: Latest</option>
            <option value="deadline">⏰ Sort: Deadline Soon</option>
          </select>
        </div>
      </div>

      {/* Filters Sidebar + Grid layout */}
      <div className="flex gap-8 items-start">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block w-64 shrink-0 bg-slate-955/20 border border-slate-850 p-5 rounded-2xl sticky top-24">
          <FiltersPanel />
        </div>

        {/* Exams Grid list */}
        <div className="flex-1 space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(n => <CardSkeleton key={n} />)}
            </div>
          ) : displayedExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedExams.map((exam) => (
                <div key={exam.id}>
                  <ExamCard exam={exam} />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto space-y-5">
              <span className="text-4xl block">🔍</span>
              <h3 className="text-base font-bold text-white">Couldn't find it yet 🔍</h3>
              <p className="text-slate-455 text-xs max-w-sm mx-auto leading-relaxed">
                We couldn't find any exams matching your search or filters. You can suggest a missing exam and we will add it soon!
              </p>
              <div className="flex justify-center gap-3 pt-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-350 transition-all cursor-pointer h-10 flex items-center"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveTab("home");
                    setTimeout(() => {
                      const el = document.getElementById("suggest");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer h-10 flex items-center"
                >
                  Suggest Exam
                </button>
              </div>
            </div>
          )}

          {/* Pagination Load More button */}
          {showLoadMore && !loading && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 12)}
                className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end justify-center lg:hidden">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <FiltersPanel />
            
            <div className="pt-2">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold h-11 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
              >
                Apply Filters ({sortedExams.length} matches)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
