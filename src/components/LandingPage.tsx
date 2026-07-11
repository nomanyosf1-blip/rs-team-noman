import React from 'react';
import { motion } from 'motion/react';
import { Bot, Ticket, Shield, Zap, Layout, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#c5a059] selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(197,160,89,0.3)]">
              <Bot size={24} className="text-black" />
            </div>
            <span className="text-xl font-black tracking-widest uppercase">RS TEAM</span>
          </div>
          <Link 
            to="/dashboard" 
            className="px-6 py-2.5 bg-[#c5a059] text-black font-bold rounded-xl hover:bg-[#d6b576] transition-all hover:scale-105 shadow-[0_0_20px_rgba(197,160,89,0.2)]"
          >
            دخول لوحة التحكم
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-[#c5a059]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter">
              نظام تذاكر <span className="text-[#c5a059]">متكامل</span>
            </h1>
            <p className="text-zinc-400 text-xl md:text-2xl max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
              ارتقِ بسيرفرك إلى المستوى التالي مع RS TEAM. نظام إدارة تذاكر احترافي، سريع، وآمن صُمم خصيصاً للمجتمعات الكبيرة.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-10 py-5 bg-[#c5a059] text-black text-lg font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-[#d6b576] transition-all hover:scale-105 shadow-[0_0_40px_rgba(197,160,89,0.2)]"
              >
                ابدأ الآن مجاناً
                <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap size={32} />,
                title: "سرعة فائقة",
                description: "استجابة فورية للأوامر وإنشاء التذاكر بلمح البصر دون أي تأخير."
              },
              {
                icon: <Shield size={32} />,
                title: "حماية قصوى",
                description: "نظام أمان متقدم يحمي بياناتك ويضمن خصوصية تذاكر المستخدمين."
              },
              {
                icon: <Layout size={32} />,
                title: "لوحة تحكم كاملة",
                description: "تحكم بكل تفاصيل البوت من خلال واجهة ويب متطورة وسهلة الاستخدام."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-zinc-900/50 border border-white/5 rounded-3xl hover:border-[#c5a059]/30 transition-all group"
              >
                <div className="w-16 h-16 bg-[#c5a059]/10 rounded-2xl flex items-center justify-center text-[#c5a059] mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-lg">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto border-y border-white/5 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "سيرفر نشط", val: "+500" },
              { label: "تذكرة يومياً", val: "+10k" },
              { label: "وقت التشغيل", val: "99.9%" },
              { label: "تقييم المستخدمين", val: "5/5" }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-black text-[#c5a059] mb-2">{stat.val}</div>
                <div className="text-zinc-500 font-bold uppercase tracking-wider text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c5a059] rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-black" />
            </div>
            <span className="font-black tracking-widest">RS TEAM</span>
          </div>
          <div className="text-zinc-500 text-sm font-medium">
            © {new Date().getFullYear()} RS TEAM. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
