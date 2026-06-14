import React, { useState } from "react";
import { X, Send, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function FeedbackModal({ onClose }) {
  const { user } = useAuth();
  const [type, setType] = useState("general");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.feedback.submit({
        type,
        message,
        email: user ? null : email || null // only send email if guest
      });
      setSuccess(true);
      setMessage("");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Help Us Improve</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h4 className="text-lg font-bold text-white">Thank you!</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your feedback has been submitted successfully. We appreciate your suggestions as we build a better ExamHub AI. 🚀
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Feedback Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="general">General Feedback</option>
                <option value="bug">Report a Bug</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>

            {!user && (
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Your Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-455 uppercase mb-2">Message *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue, suggestion or idea in detail..."
                className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-900 border border-brand-500/20 disabled:border-slate-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Submitting..." : "Send Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
