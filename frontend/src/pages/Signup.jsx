import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, Mail, Lock, User, ArrowRight, ShieldAlert, Smartphone } from "lucide-react";

export default function Signup({ setActiveTab }) {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    
    if (!cleanEmail && !cleanPhone) {
      setError("Provide email or mobile number to continue");
      return;
    }
    
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, "");
      if (digits.length !== 10) {
        setError("Mobile number must be exactly 10 digits (e.g. 9876543210)");
        return;
      }
    }
    
    setLoading(true);
    try {
      await signup({ 
        full_name: fullName, 
        email: cleanEmail || null, 
        phone_number: cleanPhone || null, 
        country_code: countryCode, 
        password 
      });
      setActiveTab("dashboard");
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-0 sm:px-6 py-0 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-3xl -z-10" />
      
      <div className="glass-panel w-full max-w-md sm:rounded-3xl rounded-none p-6 sm:p-8 md:p-10 border-x-0 sm:border border-slate-800 shadow-2xl relative min-h-[calc(100vh-140px)] sm:min-h-0 flex flex-col justify-center">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand-600 via-brand-400 to-indigo-500" />
        
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-brand-500/10 p-3 rounded-2xl text-brand-400 mb-4 border border-brand-500/15 animate-pulse">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1.5">Create Account</h2>
          <p className="text-slate-400 text-sm">Join ExamHub to unlock personalized bookmarks</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 tracking-wide">Full Name *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-12 bg-slate-950/80 border border-slate-850 focus:border-brand-500 rounded-xl pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 tracking-wide">Email Address (optional)</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 bg-slate-950/80 border border-slate-850 focus:border-brand-500 rounded-xl pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 tracking-wide">Mobile Number (optional)</label>
            <div className="grid grid-cols-[80px_1fr] gap-2 w-full">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full h-12 bg-slate-950/80 border border-slate-850 rounded-xl px-3 text-sm text-slate-200 focus:outline-none transition-all cursor-pointer font-semibold"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <div className="relative w-full">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full h-12 bg-slate-950/80 border border-slate-850 focus:border-brand-500 rounded-xl pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              </div>
            </div>
            <p className="text-[10px] text-slate-505 font-medium mt-2">
              Provide email or mobile number to continue
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 tracking-wide">Password *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 bg-slate-950/80 border border-slate-850 focus:border-brand-500 rounded-xl pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
          >
            {loading ? "Creating account..." : "Sign Up"}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
          Already have an account?{" "}
          <button
            onClick={() => setActiveTab("login")}
            className="text-brand-400 font-bold hover:underline cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
