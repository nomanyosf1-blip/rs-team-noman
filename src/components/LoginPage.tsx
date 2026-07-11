import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bot, LogIn, ShieldCheck, AlertCircle, Crown, Users, User } from 'lucide-react';

interface LoginPageProps {
  onAuthSuccess: (user: { id: string; username: string; avatar: string; role: string; memberRoles: string[] }) => void;
}

export default function LoginPage({ onAuthSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        const u = event.data.user;
        localStorage.setItem('rs_team_user', JSON.stringify(u));
        onAuthSuccess(u);
      } else if (event.data?.type === 'DISCORD_AUTH_FAILURE') {
        setError(event.data.error || 'فشلت عملية التحقق أو لا تمتلك الرتبة المطلوبة.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onAuthSuccess]);

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/auth/discord/url?origin=${encodeURIComponent(origin)}`);
      if (!response.ok) {
        throw new Error('فشل جلب رابط تسجيل الدخول من الخادم.');
      }
      const { url } = await response.json();

      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        'discord_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
      );

      if (!authWindow) {
        setError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة للموقع.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالخادم.');
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={20} className="text-yellow-400" />;
      case 'staff': return <ShieldCheck size={20} className="text-blue-400" />;
      case 'subscriber': return <User size={20} className="text-green-400" />;
      default: return <Users size={20} className="text-zinc-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير النظام';
      case 'staff': return 'طاقم العمل';
      case 'subscriber': return 'مشترك';
      default: return 'غير معروف';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex items-center justify-center relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-[#5865f2]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[70%] bg-[#d4af37]/5 blur-[120px] rounded-full" />
        {[...Array(30)].map((_, i) => (
          <div key={i} className="absolute bg-white/20 rounded-full animate-pulse" style={{ width: Math.random() * 2 + 1 + 'px', height: Math.random() * 2 + 1 + 'px', top: Math.random() * 100 + '%', left: Math.random() * 100 + '%', animationDelay: `${Math.random() * 5}s` }} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] p-10 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-[#c5a059] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(197,160,89,0.3)]"
            >
              <Bot size={40} className="text-black" />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">RS TEAM</h1>
            <p className="text-zinc-500 font-bold text-sm">نظام التذاكر والتحكم</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 space-y-3">
              <p className="text-zinc-400 font-bold text-sm text-center mb-4">اختر رتبتك للدخول:</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { role: 'admin', label: 'مدير', icon: <Crown size={24} className="text-yellow-400" />, color: 'border-yellow-400/20 hover:border-yellow-400/50 hover:bg-yellow-400/5' },
                  { role: 'staff', label: 'طاقم', icon: <ShieldCheck size={24} className="text-blue-400" />, color: 'border-blue-400/20 hover:border-blue-400/50 hover:bg-blue-400/5' },
                  { role: 'subscriber', label: 'مشترك', icon: <User size={24} className="text-green-400" />, color: 'border-green-400/20 hover:border-green-400/50 hover:bg-green-400/5' }
                ].map((item) => (
                  <div
                    key={item.role}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-default ${item.color}`}
                  >
                    {item.icon}
                    <span className="text-xs font-bold text-zinc-400">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                يتم تحديد رتبتك تلقائياً من السيرفر عبر البوت
              </p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 text-rose-400 text-sm font-bold"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#5865F2]/20 cursor-pointer"
          >
            <LogIn size={20} />
            {loading ? 'جاري الاتصال بديسكورد...' : 'تسجيل الدخول عبر ديسكورد'}
          </button>

          <div className="flex items-center gap-2 justify-center text-zinc-600 font-semibold text-xs mt-6">
            <ShieldCheck size={14} />
            <span>نظام حماية وتأكيد الهوية الرقمية</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
