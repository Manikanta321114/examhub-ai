import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function AdminExamModal({ exam = null, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    conducting_org: "",
    description: "",
    level: "12th",
    eligibility: "",
    application_start_date: "",
    last_date: "",
    exam_date: "",
    application_fee: "",
    mode: "Online (Computer Based Test)",
    category: "Government Exams",
    official_link: "",
    syllabus_link: "",
    papers_link: "",
    notification_pdf: "",
    // Production Upgrade Fields
    status: "Upcoming",
    state: "All India",
    difficulty_level: "Moderate",
    recommended_for: "",
    career_outcome: "",
    source_verified: false,
    data_source: "",
    last_verified_date: "",
    next_verification_due: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exam) {
      setFormData({
        name: exam.name || "",
        conducting_org: exam.conducting_org || "",
        description: exam.description || "",
        level: exam.level || "12th",
        eligibility: exam.eligibility || "",
        application_start_date: exam.application_start_date || "",
        last_date: exam.last_date || "",
        exam_date: exam.exam_date || "",
        application_fee: exam.application_fee || "",
        mode: exam.mode || "Online (Computer Based Test)",
        category: exam.category || "Government Exams",
        official_link: exam.official_link || "",
        syllabus_link: exam.syllabus_link || "",
        papers_link: exam.papers_link || "",
        notification_pdf: exam.notification_pdf || "",
        // Production Upgrade Fields
        status: exam.status || "Upcoming",
        state: exam.state || "All India",
        difficulty_level: exam.difficulty_level || "Moderate",
        recommended_for: Array.isArray(exam.recommended_for)
          ? exam.recommended_for.join(", ")
          : (exam.recommended_for || ""),
        career_outcome: exam.career_outcome || "",
        source_verified: exam.source_verified || false,
        data_source: exam.data_source || "",
        last_verified_date: exam.last_verified_date || "",
        next_verification_due: exam.next_verification_due || ""
      });
    }
  }, [exam]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formattedData = {
        ...formData,
        recommended_for: formData.recommended_for
          ? formData.recommended_for.split(",").map(x => x.trim()).filter(Boolean)
          : [],
        source_verified: !!formData.source_verified
      };
      await onSave(formattedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {exam ? "Edit Exam Details" : "Create New Exam"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exam Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Exam Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. JEE Main"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Conducting Org */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Conducting Organization *</label>
              <input
                type="text"
                name="conducting_org"
                required
                value={formData.conducting_org}
                onChange={handleChange}
                placeholder="e.g. NTA"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              >
                <option value="Government Exams">Government Exams</option>
                <option value="Engineering Exams">Engineering Exams</option>
                <option value="Medical Exams">Medical Exams</option>
                <option value="Banking Exams">Banking Exams</option>
                <option value="College Entrance Exams">College Entrance Exams</option>
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Exam Level *</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              >
                <option value="10th">10th Pass</option>
                <option value="12th">12th Pass</option>
                <option value="UG">Undergraduate (UG)</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Application Open">Application Open</option>
                <option value="Application Closed">Application Closed</option>
                <option value="Exam Completed">Exam Completed</option>
                <option value="Result Released">Result Released</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">State Availability</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. All India, Karnataka, Maharashtra"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Difficulty Level</label>
              <select
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
                <option value="Very Hard">Very Hard</option>
              </select>
            </div>

            {/* Exam Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Exam Mode</label>
              <input
                type="text"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                placeholder="e.g. Online / Offline"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Application Fee */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Application Fee</label>
              <input
                type="text"
                name="application_fee"
                value={formData.application_fee}
                onChange={handleChange}
                placeholder="e.g. Rs. 1000 / Free"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Data Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Data Source</label>
              <input
                type="text"
                name="data_source"
                value={formData.data_source}
                onChange={handleChange}
                placeholder="e.g. Official Notification"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Last Verified Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Last Verified Date</label>
              <input
                type="date"
                name="last_verified_date"
                value={formData.last_verified_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            {/* Next Verification Due */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Next Verification Due Date</label>
              <input
                type="date"
                name="next_verification_due"
                value={formData.next_verification_due}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Recommended For */}
          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Recommended For (comma-separated tags)</label>
            <input
              type="text"
              name="recommended_for"
              value={formData.recommended_for}
              onChange={handleChange}
              placeholder="e.g. Engineering students, Science students, Final year graduates"
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          {/* Career Outcome */}
          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Career Outcomes / Opportunities</label>
            <input
              type="text"
              name="career_outcome"
              value={formData.career_outcome}
              onChange={handleChange}
              placeholder="e.g. IAS Officer, Software Developer at PSUs, Researcher"
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Explain the exam structure, benefits, etc."
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none resize-none"
            />
          </div>

          {/* Eligibility */}
          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Detailed Eligibility</label>
            <input
              type="text"
              name="eligibility"
              value={formData.eligibility}
              onChange={handleChange}
              placeholder="e.g. Passed 10+2 with PCM, Age 17-25"
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Application Start Date</label>
              <input
                type="date"
                name="application_start_date"
                value={formData.application_start_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Application Last Date</label>
              <input
                type="date"
                name="last_date"
                value={formData.last_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Exam Date</label>
              <input
                type="date"
                name="exam_date"
                value={formData.exam_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Resource Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Official Website Link</label>
              <input
                type="url"
                name="official_link"
                value={formData.official_link}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Official PDF Notification Link</label>
              <input
                type="url"
                name="notification_pdf"
                value={formData.notification_pdf}
                onChange={handleChange}
                placeholder="https://...pdf"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Syllabus Link</label>
              <input
                type="url"
                name="syllabus_link"
                value={formData.syllabus_link}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase mb-2">Previous Year Papers Link</label>
              <input
                type="url"
                name="papers_link"
                value={formData.papers_link}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Verification Checkbox */}
          <div className="flex items-center space-x-3 bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              id="source_verified"
              name="source_verified"
              checked={formData.source_verified}
              onChange={handleChange}
              className="h-4 w-4 bg-slate-950 rounded border-slate-800 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <label htmlFor="source_verified" className="text-sm font-semibold text-white cursor-pointer select-none">
                Source Verified
              </label>
              <p className="text-xs text-slate-450">Tick this if the details have been cross-checked and verified from the official portal.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-800 pt-6 flex justify-end gap-3 bg-[#0f172a]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/10 transition-all"
            >
              {loading ? "Saving..." : "Save Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
