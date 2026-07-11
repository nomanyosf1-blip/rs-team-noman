import { useState } from 'react';
import { motion } from 'motion/react';
import { Bot, Zap, ExternalLink, AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';

export default function RunPage() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; dashboardUrl?: string } | null>(null);

  const handleSubmit = async () => {
    if (!token.trim() || !userId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/start-from-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), userId: userId.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      setResult({ success: true, message: data.message, dashboardUrl: data.dashboardUrl });
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'حدث خطأ غير متوقع' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans" dir="rtl">
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-[#5865f2]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[70%] bg-[#d4af37]/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] p-10 backdrop-blur-xl shadow-2xl space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-[#c5a059]/5">
              <Bot size={40} className="text-[#c5a059]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">تشغيل البوت</h1>
              <p className="text-zinc-500 font-bold text-sm mt-2 leading-relaxed">أدخل التوكن ومعرف ديسكورد الخاص بك لتشغيل البوت</p>
            </div>
          </div>

          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {result.success ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-emerald-400">تم التشغيل بنجاح!</h3>
                    <p className="text-zinc-400 font-bold text-sm">{result.message}</p>
                  </div>
                  {result.dashboardUrl && (
                    <a
                      href={result.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#c5a059] text-black px-8 py-3.5 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#c5a059]/20"
                    >
                      <ExternalLink size={16} />
                      الدخول إلى لوحة التحكم
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <AlertCircle size={32} className="text-rose-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-rose-400">حدث خطأ</h3>
                    <p className="text-zinc-400 font-bold text-sm">{result.message}</p>
                  </div>
                  <button
                    onClick={() => setResult(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all"
                  >
                    المحاولة مرة أخرى
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">توكن البوت (Bot Token)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-[#c5a059] outline-none transition-all font-mono tracking-wider text-white"
                    placeholder="NzI5..."
                  />
                  <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">معرف ديسكورد (User ID)</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-[#c5a059] outline-none transition-all font-mono text-white text-left"
                  placeholder="412345678901234567"
                  dir="ltr"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !token.trim() || !userId.trim()}
                className="w-full bg-white hover:bg-zinc-200 disabled:opacity-20 text-black h-16 rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 text-lg cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    <span>جاري التشغيل...</span>
                  </>
                ) : (
                  <>
                    <Zap size={22} fill="black" />
                    <span>بدء التشغيل</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 justify-center text-zinc-700 font-semibold text-[10px] pt-2">
            <Shield size={12} />
            <span>RS TEAM System</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
