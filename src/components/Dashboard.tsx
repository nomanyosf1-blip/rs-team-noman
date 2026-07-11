import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot, Power, AlertCircle, CheckCircle2, Ticket, Trash2, Send, Plus, X,
  Layout, MessageSquare, LogIn, LogOut, User, ShieldCheck,
  Settings2, Activity, Zap, LayoutDashboard, ArrowRight, Crown, Home, Lock
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import DiscordPreview from './DiscordPreview';
import LoginPage from './LoginPage';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}

interface AuthUser {
  id: string;
  username: string;
  avatar: string;
  role: string;
  memberRoles: string[];
}

interface UserProfile {
  name: string;
  avatar: string;
  tag: string;
}

interface Question {
  label: string;
  placeholder: string;
  isLong: boolean;
}

interface Sector {
  id: string;
  name: string;
  categoryId: string;
  staffRoleId: string;
  logsChannelId: string;
  emoji: string;
  questions: Question[];
  ticketLogoUrl?: string;
  ticketBannerUrl?: string;
}

interface Panel {
  id: string;
  name: string;
  channelId: string;
  message: string;
  logoUrl?: string;
  bannerUrl?: string;
  sectors: Sector[];
}

interface SystemEmbed {
  title: string;
  description: string;
  color: string;
}

interface BotInstance {
  id: string;
  name: string;
  token: string;
  status: string;
  panels: Panel[];
  allowedRoleId?: string;
  ownerId?: string;
  avatar?: string | null;
  username?: string | null;
  systemEmbeds?: {
    alreadyHasTicket: SystemEmbed;
    ticketWarning: SystemEmbed;
  };
}

interface BotConfig {
  instances: BotInstance[];
  app?: {
    name: string;
    description: string;
    version: string;
    branding: {
      primaryColor: string;
      logo: string;
      banner: string;
      footer: string;
    }
  };
  globalSystemEmbeds?: {
    alreadyHasTicket: SystemEmbed;
    ticketWarning: SystemEmbed;
  };
  globalDiscord?: {
    guildId: string;
    adminRoleId: string;
    staffRoleId: string;
    logChannelId: string;
    ticketCategoryId: string;
    transcriptChannelId: string;
  };
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordRole {
  id: string;
  name: string;
}

export default function Dashboard({ initialTab }: { initialTab?: 'bots' | 'management' | 'operation' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('rs_team_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'bots' | 'management' | 'operation'>(() => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('operation')) return 'operation';
    if (location.pathname.includes('bots')) return 'bots';
    return 'bots';
  });
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [config, setConfig] = useState<BotConfig>({ instances: [] });
  const [ownerIdFilter, setOwnerIdFilter] = useState<string>(() => localStorage.getItem('ownerIdFilter') || '');
  const [discordData, setDiscordData] = useState<{ channels: DiscordChannel[], roles: DiscordRole[] }>({ channels: [], roles: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'alert' | 'error' } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetOwnerId, setDeleteTargetOwnerId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOwnerId, setConfirmDeleteOwnerId] = useState<string | null>(null);
  const [isOperationsVerified, setIsOperationsVerified] = useState<boolean>(() => !!authUser);
  const [verifiedUser, setVerifiedUser] = useState<{ id: string; username: string; avatar: string; role?: string } | null>(() => authUser ? { id: authUser.id, username: authUser.username, avatar: authUser.avatar, role: authUser.role } : null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const changeTab = (tab: 'bots' | 'management' | 'operation') => {
    setDashboardTab(tab);
    navigate(`/dashboard/${tab === 'management' ? 'panels' : tab === 'bots' ? 'bots' : 'operation'}`);
  };

  const handleAuthSuccess = useCallback((user: AuthUser) => {
    setAuthUser(user);
    localStorage.setItem('rs_team_user', JSON.stringify(user));
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthUser(null);
    localStorage.removeItem('rs_team_user');
    localStorage.removeItem('is_operations_verified');
    localStorage.removeItem('operations_verified_user');
    await fetch('/api/auth/logout').catch(() => null);
    setMessage({ text: 'تم تسجيل الخروج بنجاح.', type: 'success' });
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAuthUser(data.user);
          localStorage.setItem('rs_team_user', JSON.stringify(data.user));
        } else if (!authUser) {
          setAuthUser(null);
        }
      } catch {
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (location.pathname.includes('operation')) setDashboardTab('operation');
    else if (location.pathname.includes('bots')) setDashboardTab('bots');
    else if (location.pathname.includes('panels')) setDashboardTab('management');
  }, [location.pathname]);

  const isAdmin = authUser?.role === 'admin';
  const isStaff = authUser?.role === 'staff';
  const isSubscriber = authUser?.role === 'subscriber';
  const canAccessBots = isAdmin || isStaff;
  const canAccessOperation = isAdmin || isStaff;
  const canAccessPanels = isAdmin || isStaff || isSubscriber;

  useEffect(() => {
    if (!authUser) return;
    if (dashboardTab === 'bots' && !canAccessBots) {
      if (canAccessOperation) changeTab('operation');
      else if (canAccessPanels) changeTab('management');
    }
    if (dashboardTab === 'operation' && !canAccessOperation) {
      if (canAccessBots) changeTab('bots');
      else if (canAccessPanels) changeTab('management');
    }
  }, [dashboardTab, authUser]);

  useEffect(() => {
    localStorage.setItem('ownerIdFilter', ownerIdFilter);
  }, [ownerIdFilter]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.includes('railway') && !origin.includes('render') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        const u = event.data.user;
        setIsOperationsVerified(true);
        setVerifiedUser(u);
        handleAuthSuccess(u);
        setMessage({ text: `أهلاً بك ${u.username}! تم تأكيد هويتك بنجاح عبر ديسكورد.`, type: 'success' });
      } else if (event.data?.type === 'DISCORD_AUTH_FAILURE') {
        setVerificationError(event.data.error || 'عذراً، فشلت عملية التحقق أو لا تمتلك الرتبة المطلوبة.');
      }
    };
    
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleAuthSuccess]);

  const safeJsonFetch = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const isJson = res.headers.get('content-type')?.includes('application/json');

      if (!res.ok) {
        if (isJson) {
          const data = await res.json();
          throw new Error(data.error || `خطأ من الخادم: ${res.status}`);
        } else {
          const text = await res.text();
          throw new Error(`خطأ من الخادم (${res.status}): ${text.substring(0, 100)}`);
        }
      }

      if (!isJson) {
        const text = await res.text();
        throw new Error(`توقعنا JSON ولكن استلمنا: ${text.substring(0, 50)}...`);
      }

      return await res.json();
    } catch (err: any) {
      if (err.message.includes('Unexpected token')) {
        throw new Error('فشل في قراءة البيانات من الخادم (تنسيق غير مدعوم)');
      }
      throw err;
    }
  };

  const fetchDiscordData = async (guildId?: string, isManual = false) => {
    if (!selectedInstanceId) return;
    try {
      const gId = guildId || config.globalDiscord?.guildId || '';
      const data = await safeJsonFetch(`/api/discord/data?instanceId=${selectedInstanceId}&guildId=${gId}`);
      setDiscordData(data);
    } catch (err: any) {
      console.error("Failed to fetch discord data", err);
      if (isManual || !err.message.includes("البوت غير متصل")) {
        setMessage({ text: `فشل جلب رتب وقنوات السيرفر: ${err.message}`, type: 'error' });
      }
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await safeJsonFetch('/api/config');
      setConfig(data);
      if (data.instances && data.instances.length > 0 && !selectedInstanceId) {
        setSelectedInstanceId(data.instances[0].id);
      }
    } catch (err: any) {
      console.error("Failed to fetch config", err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const filteredInstances = config.instances.filter(inst => !ownerIdFilter || inst.ownerId === ownerIdFilter);
  const selectedInstance = filteredInstances.find(i => i.id === selectedInstanceId) || filteredInstances[0];

  useEffect(() => {
    if (selectedInstance?.status === 'متصل' && selectedInstanceId) {
      fetchDiscordData(undefined, false);
    }
  }, [selectedInstance?.status, selectedInstanceId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 font-bold">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage onAuthSuccess={handleAuthSuccess} />;
  }

  const user: UserProfile = {
    name: authUser.username,
    tag: authUser.role === 'admin' ? '👑 مدير' : authUser.role === 'staff' ? '🛡️ طاقم' : '👤 مشترك',
    avatar: authUser.avatar
  };

  const handleDiscordLogin = async () => {
    setLoading(true);
    setVerificationError(null);
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
        setVerificationError('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة للموقع لإجراء التحقق.');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'فشل الاتصال بالخادم لبدء تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockOperations = () => {
    handleLogout();
  };

  const handleDeleteByOwnerId = async (ownerId: string) => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const data = await safeJsonFetch('/api/instances/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId })
      });
      setMessage({ text: data.message || 'تم حذف البوت بنجاح', type: 'success' });
      fetchConfig();
      if (selectedInstance && selectedInstance.ownerId === ownerId) {
        setSelectedInstanceId('');
      }
      setIsDeleteModalOpen(false);
      setDeleteTargetOwnerId('');
    } catch (err: any) {
      setMessage({ text: err.message || 'لم يتم العثور على البوت', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addPanel = () => {
    if (!selectedInstanceId) return;
    const newPanel: Panel = {
      id: "panel-" + Date.now(),
      name: "لوحة جديدة",
      channelId: "",
      message: "يرجى اختيار التذكرة المناسبة لمشكلتك\n\nيرجى عدم المنشن والالتزام بقوانين التذاكر",
      logoUrl: "https://f.top4top.io/p_3767z53v0.png",
      bannerUrl: "https://g.top4top.io/p_3767w8f71.png",
      sectors: []
    };
    const newInstances = config.instances.map(inst =>
      inst.id === selectedInstanceId ? { ...inst, panels: [...inst.panels, newPanel] } : inst
    );
    setConfig({ ...config, instances: newInstances });
  };

  const removePanel = (id: string) => {
    if (!selectedInstanceId) return;
    const newInstances = config.instances.map(inst =>
      inst.id === selectedInstanceId ? { ...inst, panels: inst.panels.filter(p => p.id !== id) } : inst
    );
    setConfig({ ...config, instances: newInstances });
  };

  const updatePanel = (id: string, field: keyof Panel, value: any) => {
    if (!selectedInstanceId) return;
    const newInstances = config.instances.map(inst =>
      inst.id === selectedInstanceId ? {
        ...inst,
        panels: inst.panels.map(p => p.id === id ? { ...p, [field]: value } : p)
      } : inst
    );
    setConfig({ ...config, instances: newInstances });
  };

  const addSector = (panelId: string) => {
    if (!selectedInstanceId) return;
    const newSector: Sector = {
      id: `sector-${Date.now()}`,
      name: 'قسم جديد',
      categoryId: '',
      staffRoleId: '',
      logsChannelId: '',
      emoji: '📩',
      questions: [],
      ticketLogoUrl: "https://f.top4top.io/p_3767z53v0.png",
      ticketBannerUrl: "https://g.top4top.io/p_3767w8f71.png"
    };
    const newInstances = config.instances.map(inst =>
      inst.id === selectedInstanceId ? {
        ...inst,
        panels: inst.panels.map(p => p.id === panelId ? { ...p, sectors: [...p.sectors, newSector] } : p)
      } : inst
    );
    setConfig({ ...config, instances: newInstances });
  };

  const removeSector = (panelId: string, sectorId: string) => {
    if (!selectedInstanceId) return;
    const newInstances = config.instances.map(inst =>
      inst.id === selectedInstanceId ? {
        ...inst,
        panels: inst.panels.map(p => p.id === panelId ? { ...p, sectors: p.sectors.filter(s => s.id !== sectorId) } : p)
      } : inst
    );
    setConfig({ ...config, instances: newInstances });
  };

  const updateSector = (panelId: string, sectorId: string, field: keyof Sector, value: any) => {
    if (!selectedInstanceId) return;
    const newInstances = config.instances.map(inst =>
      inst.id === selectedInstanceId ? {
        ...inst,
        panels: inst.panels.map(p => p.id === panelId ? {
          ...p,
          sectors: p.sectors.map(s => s.id === sectorId ? { ...s, [field]: value } : s)
        } : p)
      } : inst
    );
    setConfig({ ...config, instances: newInstances });
  };

  const addQuestion = (panelId: string, sectorId: string) => {
    if (!selectedInstance) return;
    const panel = selectedInstance.panels.find(p => p.id === panelId);
    const sector = panel?.sectors.find(s => s.id === sectorId);
    if (!sector) return;

    if (sector.questions.length >= 5) {
      setMessage({ text: 'لا يمكنك إضافة أكثر من 5 أسئلة لكل قسم.', type: 'error' });
      return;
    }

    const newQuestion: Question = { label: 'اسمك', placeholder: 'مثلاً: محمد', isLong: false };
    updateSector(panelId, sectorId, 'questions', [...sector.questions, newQuestion]);
  };

  const removeQuestion = (panelId: string, sectorId: string, index: number) => {
    if (!selectedInstance) return;
    const panel = selectedInstance.panels.find(p => p.id === panelId);
    const sector = panel?.sectors.find(s => s.id === sectorId);
    if (!sector) return;

    updateSector(panelId, sectorId, 'questions', sector.questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (panelId: string, sectorId: string, index: number, field: keyof Question, value: any) => {
    if (!selectedInstance) return;
    const panel = selectedInstance.panels.find(p => p.id === panelId);
    const sector = panel?.sectors.find(s => s.id === sectorId);
    if (!sector) return;

    const newQuestions = [...sector.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    updateSector(panelId, sectorId, 'questions', newQuestions);
  };

  const handleStart = async () => {
    if (!selectedInstanceId || !selectedInstance) return;
    setLoading(true);
    setMessage(null);
    try {
      // Save changes (like updated token) to server first
      await safeJsonFetch('/api/instances/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedInstance)
      });

      const data = await safeJsonFetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: selectedInstanceId })
      });
      setMessage({ text: data.message, type: 'success' });
      await fetchConfig();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!selectedInstanceId) return;
    setLoading(true);
    try {
      const data = await safeJsonFetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: selectedInstanceId })
      });
      setMessage({ text: data.message, type: 'success' });
      await fetchConfig();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (panelId: string) => {
    if (!selectedInstance) return;
    if (!selectedInstance.token || selectedInstance.token.trim() === "") {
       setMessage({ text: 'يرجى إدخال التوكن أولاً!', type: 'error' });
       return;
    }

    setLoading(true);
    try {
      await safeJsonFetch('/api/instances/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedInstance)
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      const data = await safeJsonFetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: selectedInstance.id, panelId })
      });
      setMessage({ text: data.message, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeployAll = async () => {
    if (!selectedInstance) return;
    if (!selectedInstance.token || selectedInstance.token.trim() === "") {
       setMessage({ text: 'يرجى إدخال التوكن أولاً!', type: 'error' });
       return;
    }

    setLoading(true);
    try {
      await safeJsonFetch('/api/instances/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedInstance)
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      let successCount = 0;
      for (const panel of selectedInstance.panels) {
        try {
          await safeJsonFetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceId: selectedInstance.id, panelId: panel.id })
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to deploy panel ${panel.id}:`, e);
        }
      }

      setMessage({
        text: `تم تحديث ${successCount} لوحة بنجاح للبوت ${selectedInstance.name}`,
        type: 'success'
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInstance = async (id: string, name: string) => {
    setLoading(true);
    try {
      await safeJsonFetch('/api/instances/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setMessage({ text: 'تم حذف البوت بنجاح', type: 'success' });
      fetchConfig();
      if (selectedInstanceId === id) {
        setSelectedInstanceId(null);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white flex flex-col relative overflow-hidden font-sans" dir="rtl">
      {/* Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Cosmic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-[#5865f2]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[70%] bg-[#d4af37]/5 blur-[120px] rounded-full" />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute bg-white/20 rounded-full animate-pulse" style={{ width: Math.random() * 2 + 1 + 'px', height: Math.random() * 2 + 1 + 'px', top: Math.random() * 100 + '%', left: Math.random() * 100 + '%' }} />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(197,160,89,0.3)]">
                <Bot size={24} fill="black" />
              </div>
              <span className="text-2xl font-black text-white tracking-widest uppercase">RS TEAM System</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-zinc-500 hover:text-[#c5a059] hover:bg-[#c5a059]/10 rounded-xl transition-all"
              title="العودة للحفحة الرئيسية"
            >
              <Home size={20} />
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full border-2 border-[#c5a059] overflow-hidden hover:scale-105 transition-transform"
              >
                <img
                  src={user?.avatar || "https://avatars.githubusercontent.com/u/1000?v=4"}
                  alt="User Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-3 w-72 bg-[#1e1f22] border border-white/5 rounded-2xl shadow-2xl z-50 p-4 font-sans"
                    >
                      <div className="flex items-center gap-3 p-2 mb-4">
                        <img
                          src={user?.avatar || "https://avatars.githubusercontent.com/u/1000?v=4"}
                          alt="User Avatar"
                          className="w-14 h-14 rounded-full border-2 border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="font-black text-white text-lg truncate">{user?.name || 'مستخدم'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                              authUser?.role === 'admin' ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" :
                              authUser?.role === 'staff' ? "bg-blue-400/10 text-blue-400 border border-blue-400/20" :
                              "bg-green-400/10 text-green-400 border border-green-400/20"
                            )}>
                              {user?.tag}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/5 mb-2" />

                      <div className="space-y-1">
                        <button className="w-full h-11 flex items-center justify-between px-3 rounded-xl hover:bg-white/5 transition-colors group">
                          <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">لوحة التحكم</span>
                          <LayoutDashboard size={18} className="text-zinc-500 group-hover:text-indigo-400" />
                        </button>
                        <button
                          onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                          className="w-full h-11 flex items-center justify-between px-3 rounded-xl hover:bg-rose-500/10 transition-colors group"
                        >
                          <span className="font-bold text-zinc-300 group-hover:text-rose-400 transition-colors">تسجيل الخروج</span>
                          <LogOut size={18} className="text-zinc-500 group-hover:text-rose-400" />
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto z-10 custom-scrollbar relative">
        {/* Starry Background Effect */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.05)_0%,transparent_70%)]" />
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-20 animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
        </div>

        <AnimatePresence mode="wait">
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto space-y-12 p-6 lg:p-12 mb-20"
            >
              {/* Dashboard Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-2 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto md:mx-0 backdrop-blur-xl mb-12 shadow-2xl">
                {canAccessBots && (
                  <button
                    onClick={() => changeTab('bots')}
                    className={cn(
                      "flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm transition-all relative overflow-hidden group",
                      dashboardTab === 'bots' ? "text-black" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {dashboardTab === 'bots' && <motion.div layoutId="tab-bg" className="absolute inset-0 bg-[#c5a059]" />}
                    <Bot size={18} className="relative z-10" />
                    <span className="relative z-10">البوتات المضافة</span>
                  </button>
                )}

                {canAccessOperation && (
                  <button
                    onClick={() => changeTab('operation')}
                    className={cn(
                      "flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm transition-all relative overflow-hidden group",
                      dashboardTab === 'operation' ? "text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {dashboardTab === 'operation' && <motion.div layoutId="tab-bg" className="absolute inset-0 bg-emerald-600" />}
                    <Zap size={18} className="relative z-10" />
                    <span className="relative z-10">غرفة العمليات</span>
                  </button>
                )}

                {canAccessPanels && !canAccessBots && (
                  <button
                    onClick={() => changeTab('management')}
                    className={cn(
                      "flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm transition-all relative overflow-hidden group",
                      dashboardTab === 'management' ? "text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {dashboardTab === 'management' && <motion.div layoutId="tab-bg" className="absolute inset-0 bg-indigo-600" />}
                    <Layout size={18} className="relative z-10" />
                    <span className="relative z-10">اللوحات</span>
                  </button>
                )}
                
              </div>

              {dashboardTab === 'bots' ? (
                <div className="space-y-12">
                   <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-2">
                      <div className="space-y-3 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-[#c5a059] font-black text-xs uppercase tracking-[0.2em]">هوية البوتات</span>
                          <div className="w-10 h-1 bg-[#c5a059] rounded-full" />
                        </div>
                        <h2 className="text-6xl font-black text-white tracking-tighter">البوتات المضافة</h2>
                        <p className="text-zinc-500 font-bold text-lg max-w-xl leading-relaxed text-right">
                          تصفح وإدارة جميع البوتات الخاصة بك في النظام. اضغط على أي بوت لتنشيطه وتعديل لوحاته أو تشغيله.
                        </p>
                      </div>
                    </header>

                   <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 text-right" dir="rtl">
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-white">البحث عن بوتك باستخدام معرف Discord</h3>
                        <p className="text-zinc-500 font-bold text-xs">أدخل معرف ديسكورد (User ID) الخاص بك لعرض وإدارة البوتات المرتبطة بحسابك فقط.</p>
                      </div>
                      <div className="relative w-full md:w-auto flex flex-wrap gap-3">
                        <input
                          type="text"
                          value={ownerIdFilter}
                          onChange={(e) => setOwnerIdFilter(e.target.value)}
                          placeholder="مثال: 412345678901234567"
                          className="w-full md:w-72 bg-black/50 border border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-white font-mono text-left"
                          dir="ltr"
                        />
                        {ownerIdFilter && (
                          <button
                            onClick={() => setOwnerIdFilter('')}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-3 rounded-xl text-xs font-bold transition-all"
                          >
                            مسح
                          </button>
                        )}
                      </div>
                    </div>

                   {!ownerIdFilter ? (
                      <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-[2.5rem] p-12 text-center space-y-6 flex flex-col items-center justify-center max-w-2xl mx-auto my-12" dir="rtl">
                        <div className="w-20 h-20 bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] rounded-[2rem] flex items-center justify-center">
                          <Bot size={40} />
                        </div>
                        <div className="space-y-2 text-center">
                          <h3 className="text-2xl font-black text-white">الرجاء إدخال معرف ديسكورد الخاص بك</h3>
                          <p className="text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">
                            لعرض وإدارة البوت الخاص بك، يرجى كتابة معرف ديسكورد (Discord User ID) الخاص بك في حقل البحث أعلاه.
                          </p>
                        </div>
                      </div>
                    ) : filteredInstances.length === 0 ? (
                      <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-[2.5rem] p-12 text-center space-y-6 flex flex-col items-center justify-center max-w-2xl mx-auto my-12" dir="rtl">
                        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-[2rem] flex items-center justify-center">
                          <AlertCircle size={40} />
                        </div>
                        <div className="space-y-2 text-center">
                          <h3 className="text-2xl font-black text-white">لا توجد بوتات مرتبطة</h3>
                          <p className="text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">
                            لم نجد أي بوت مرتبط بالمعرف المدخل. يمكنك إضافة بوت جديد لربطه بحسابك من قسم "غرفة العمليات".
                          </p>
                        </div>
                      </div>
                    ) : (
                      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredInstances.map(inst => {
                          const isActive = selectedInstanceId === inst.id;
                          return (
                            <div
                              key={inst.id}
                              onClick={() => setSelectedInstanceId(inst.id)}
                              className={cn(
                                "bg-zinc-900/30 border rounded-[2.5rem] p-8 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group cursor-pointer text-right",
                                isActive
                                  ? "border-[#c5a059]/40 bg-zinc-900/60 shadow-[0_0_40px_rgba(197,160,89,0.1)] scale-[1.02]"
                                  : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40"
                              )}
                            >
                              {isActive && (
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c5a059]/10 blur-[50px] rounded-full" />
                              )}

                              <div className="space-y-6 text-right">
                                <div className="flex items-start justify-between">
                                  <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center border overflow-hidden",
                                    isActive
                                      ? "bg-[#c5a059]/20 border-[#c5a059]/30 text-[#c5a059]"
                                      : "bg-zinc-950 border-zinc-800 text-zinc-400"
                                  )}>
                                    {inst.avatar ? (
                                      <img src={inst.avatar} alt={inst.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <Bot size={32} />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isActive && (
                                      <span className="bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                        نشط حالياً
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-xs font-black px-3 py-1 rounded-full uppercase border",
                                      inst.status === 'متصل' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                      inst.status === 'خطأ في التوكن' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                      "bg-zinc-800/50 text-zinc-400 border-zinc-800"
                                    )}>
                                      {inst.status}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2 text-right">
                                  <h3 className="text-2xl font-black text-white group-hover:text-[#c5a059] transition-colors">{inst.name}</h3>
                                  <p className="text-zinc-500 font-bold text-xs font-mono truncate">
                                    ID: {inst.id}
                                  </p>
                                </div>

                                <div className="h-px bg-white/5" />

                                <div className="grid grid-cols-2 gap-4 text-right">
                                  <div>
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">لوحات التحكم</p>
                                    <p className="text-lg font-black text-white">{inst.panels?.length || 0} لوحات</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">مفتاح التوكن</p>
                                    <p className="text-xs font-mono font-bold text-zinc-500 mt-1">
                                      {inst.token ? `${inst.token.substring(0, 10)}...` : 'غير مدخل'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInstanceId(inst.id);
                                    changeTab('management');
                                  }}
                                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
                                >
                                  <Layout size={14} />
                                  تعديل اللوحات
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </main>
                    )}
                </div>
              ) : dashboardTab === 'management' ? (
                selectedInstance ? (
                  <div className="space-y-12">
                  {/* Management Header */}
                  <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-1 bg-[#c5a059] rounded-full" />
                        <span className="text-[#c5a059] font-black text-xs uppercase tracking-[0.2em]">التحكم في المحتوى</span>
                      </div>
                      <h2 className="text-6xl font-black text-white tracking-tighter">نظام التذاكر</h2>
                      <p className="text-zinc-500 font-bold text-lg max-w-xl leading-relaxed">قم بتصميم القوائم وصياغة الأسئلة التي تظهر لأعضاء مجتمعك بكل سهولة.</p>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                      <button
                        onClick={() => fetchDiscordData(undefined, true)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white h-16 w-16 rounded-[1.8rem] flex items-center justify-center transition-all active:scale-90 border border-white/5"
                        title="تحديث البيانات"
                      >
                        <Activity size={24} />
                      </button>
                      <button
                        onClick={addPanel}
                        className="bg-white hover:bg-zinc-200 text-black h-16 px-10 rounded-[1.8rem] font-black flex items-center gap-3 transition-all shadow-xl active:scale-95 text-lg"
                      >
                        <Plus size={24} strokeWidth={4} /> إنشاء لوحة
                      </button>
                    </div>
                  </header>

                  <main className="space-y-10">
                    {!discordData.channels.length && (
                       <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 mb-8 text-right space-y-4">
                          <div className="flex items-center gap-3 text-amber-500 mb-2 justify-start">
                             <AlertCircle size={28} />
                             <h4 className="font-black text-xl">لماذا لا تظهر قنوات ورتب Discord؟</h4>
                          </div>
                          <p className="text-sm font-bold text-zinc-400 leading-relaxed">
                             لجلب قنوات ورتب سيرفر Discord وعرضها في الخيارات، يرجى التحقق من تطبيق الخطوات التالية بدقة:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                             <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
                                <div className="text-[#c5a059] font-black text-lg">1. تشغيل البوت</div>
                                <p className="text-xs text-zinc-500 font-bold leading-relaxed">
                                   انتقل إلى <strong>"غرفة العمليات"</strong> وتأكد من أن حالة البوت <strong>"متصل"</strong>. إذا كانت الحالة "خطأ في التوكن"، قم بتعديل التوكن ثم اضغط "بدء التشغيل".
                                </p>
                             </div>
                             <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
                                <div className="text-[#c5a059] font-black text-lg">2. إضافة البوت</div>
                                <p className="text-xs text-zinc-500 font-bold leading-relaxed">
                                   تأكد من دعوة البوت وإضافته إلى سيرفر Discord الخاص بك وتثبيت الرتب والصلاحيات اللازمة له لكي يتمكن من قراءة القنوات.
                                </p>
                             </div>
                             <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
                                <div className="text-[#c5a059] font-black text-lg">3. معرّف السيرفر</div>
                                <p className="text-xs text-zinc-500 font-bold leading-relaxed">
                                   تأكد من كتابة معرّف السيرفر الصحيح في قسم <strong>"الإعدادات التقنية"</strong> بالأسفل والضغط على <strong>"حفظ الإعدادات التقنية"</strong>.
                                </p>
                             </div>
                             <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
                                <div className="text-[#c5a059] font-black text-lg">4. تحديث البيانات</div>
                                <p className="text-xs text-zinc-500 font-bold leading-relaxed">
                                   بعد إتمام الخطوات أعلاه، اضغط على زر التحديث الدائري (نبض النشاط) في الأعلى بجانب زر "إنشاء لوحة" لجلب القنوات فوراً.
                                </p>
                             </div>
                          </div>
                       </div>
                    )}

                    <AnimatePresence mode="popLayout">
                      {selectedInstance?.panels.map((panel, pIdx) => (
                        <motion.div
                          key={panel.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden group"
                        >
                          <div className="p-10 border-b border-zinc-800/50 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="flex-1 space-y-6">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center border border-zinc-800">
                                   <Layout className="text-[#c5a059]" size={28} />
                                </div>
                                <input
                                  type="text"
                                  value={panel.name}
                                  onChange={(e) => updatePanel(panel.id, 'name', e.target.value)}
                                  className="bg-transparent border-none focus:ring-0 text-3xl font-black text-white p-0 w-full tracking-tight"
                                  placeholder="اسم اللوحة..."
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">قناة الإرسال (Channel)</label>
                                  <select
                                    value={panel.channelId}
                                    onChange={(e) => updatePanel(panel.id, 'channelId', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                  >
                                    <option value="">اختر القناة...</option>
                                    {discordData.channels.filter(c => c.type === 0).map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    {!discordData.channels.length && panel.channelId && (
                                       <option value={panel.channelId}>{panel.channelId}</option>
                                    )}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">رسالة الترحيب</label>
                                  <input
                                    type="text"
                                    value={panel.message}
                                    onChange={(e) => updatePanel(panel.id, 'message', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="اختر قسماً لفتح تذكرة..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">رابط اللوجو (Logo URL)</label>
                                  <input
                                    type="text"
                                    value={panel.logoUrl || ''}
                                    onChange={(e) => updatePanel(panel.id, 'logoUrl', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="https://..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">رابط البنر (Banner URL)</label>
                                  <input
                                    type="text"
                                    value={panel.bannerUrl || ''}
                                    onChange={(e) => updatePanel(panel.id, 'bannerUrl', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex md:flex-col gap-3">
                              <button
                                onClick={() => {
                                  const el = document.getElementById(`preview-${panel.id}`);
                                  if (el) el.classList.toggle('hidden');
                                }}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-3 transition-all active:scale-95"
                              >
                                <Activity size={18} /> معاينة
                              </button>
                              <button
                                onClick={() => handleDeploy(panel.id)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-3 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95"
                              >
                                <Send size={18} /> إرسال
                              </button>
                              <button
                                onClick={() => removePanel(panel.id)}
                                className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90"
                              >
                                <Trash2 size={22} />
                              </button>
                            </div>
                          </div>

                          <div id={`preview-${panel.id}`} className="hidden px-10 pt-10">
                            <div className="bg-black/40 rounded-[2rem] p-8 border border-zinc-800/50">
                              <div className="flex items-center gap-3 mb-6">
                                <Layout size={20} className="text-zinc-500" />
                                <h4 className="font-black text-xl text-zinc-300">مظهر اللوحة في ديسكورد</h4>
                              </div>
                              <DiscordPreview
                                panelName={panel.name}
                                message={panel.message}
                                sectors={panel.sectors}
                                logoUrl={panel.logoUrl}
                                bannerUrl={panel.bannerUrl}
                              />
                            </div>
                          </div>

                          <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <MessageSquare size={20} className="text-zinc-600" />
                                <h4 className="font-black text-xl text-zinc-300">أزرار اللوحة <span className="text-indigo-500 ml-1">{panel.sectors.length}</span></h4>
                              </div>
                              <button
                                onClick={() => addSector(panel.id)}
                                className="h-10 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black transition-all flex items-center gap-2"
                              >
                                <Plus size={16} /> إضافة زر جديد
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {panel.sectors.map((sector) => (
                                <div key={sector.id} className="bg-black/40 border border-zinc-800 rounded-[2rem] p-8 space-y-6">
                                  <div className="flex items-center gap-4">
                                    <input
                                      type="text"
                                      value={sector.emoji}
                                      onChange={(e) => updateSector(panel.id, sector.id, 'emoji', e.target.value)}
                                      className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl text-center text-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        value={sector.name}
                                        onChange={(e) => updateSector(panel.id, sector.id, 'name', e.target.value)}
                                        className="w-full bg-transparent border-none text-xl font-black text-white focus:ring-0 p-0"
                                        placeholder="اسم الزر..."
                                      />
                                    </div>
                                    <button onClick={() => removeSector(panel.id, sector.id)} className="text-zinc-700 hover:text-rose-500 transition-all active:scale-90"><Trash2 size={20} /></button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest pl-1">قسم التذاكر (Category)</label>
                                      <select
                                        value={sector.categoryId}
                                        onChange={(e) => updateSector(panel.id, sector.id, 'categoryId', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                      >
                                        <option value="">بدون فئة...</option>
                                        {discordData.channels.filter(c => c.type === 4).map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                        {!discordData.channels.length && sector.categoryId && (
                                          <option value={sector.categoryId}>{sector.categoryId}</option>
                                        )}
                                      </select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest pl-1">رتبة الدعم (Role)</label>
                                      <select
                                        value={sector.staffRoleId}
                                        onChange={(e) => updateSector(panel.id, sector.id, 'staffRoleId', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                      >
                                        <option value="">بدون رتبة...</option>
                                        {discordData.roles.map(r => (
                                          <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                        {!discordData.roles.length && sector.staffRoleId && (
                                          <option value={sector.staffRoleId}>{sector.staffRoleId}</option>
                                        )}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest pl-1">قناة السجلات (Logs)</label>
                                    <select
                                      value={sector.logsChannelId}
                                      onChange={(e) => updateSector(panel.id, sector.id, 'logsChannelId', e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                    >
                                      <option value="">بدون قناة سجلات...</option>
                                      {discordData.channels.filter(c => c.type === 0).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                      {!discordData.channels.length && sector.logsChannelId && (
                                        <option value={sector.logsChannelId}>{sector.logsChannelId}</option>
                                      )}
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest pl-1">لوجو التذكرة (URL)</label>
                                      <input
                                        type="text"
                                        value={sector.ticketLogoUrl || ''}
                                        onChange={(e) => updateSector(panel.id, sector.id, 'ticketLogoUrl', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="رابط اللوجو..."
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest pl-1">بنر التذكرة (URL)</label>
                                      <input
                                        type="text"
                                        value={sector.ticketBannerUrl || ''}
                                        onChange={(e) => updateSector(panel.id, sector.id, 'ticketBannerUrl', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="رابط البنر..."
                                      />
                                    </div>
                                  </div>

                                  <div className="pt-6 border-t border-zinc-800/50">
                                    <div className="flex items-center justify-between mb-4">
                                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">نموذج الأسئلة ({sector.questions.length}/5)</label>
                                      <button
                                        onClick={() => addQuestion(panel.id, sector.id)}
                                        className="text-[10px] font-black text-zinc-500 hover:text-white transition-all"
                                      >
                                        + إضافة سؤال
                                      </button>
                                    </div>

                                    <div className="space-y-3">
                                      {sector.questions.map((q, idx) => (
                                        <div key={idx} className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-2xl relative group/q">
                                          <div className="flex items-center justify-between mb-3">
                                            <input
                                              type="text"
                                              value={q.label}
                                              onChange={(e) => updateQuestion(panel.id, sector.id, idx, 'label', e.target.value)}
                                              className="flex-1 bg-transparent border-none text-xs font-black text-zinc-300 focus:ring-0 p-0"
                                              placeholder="السؤال..."
                                            />
                                            <button onClick={() => removeQuestion(panel.id, sector.id, idx)} className="opacity-0 group-hover/q:opacity-100 text-zinc-700 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="text"
                                              value={q.placeholder}
                                              onChange={(e) => updateQuestion(panel.id, sector.id, idx, 'placeholder', e.target.value)}
                                              className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-3 py-1.5 text-[10px] outline-none text-zinc-600 focus:border-indigo-500/50"
                                              placeholder="نص مساعد..."
                                            />
                                            <div className="flex items-center gap-2 shrink-0 h-6">
                                              <input
                                                type="checkbox"
                                                checked={q.isLong}
                                                onChange={(e) => updateQuestion(panel.id, sector.id, idx, 'isLong', e.target.checked)}
                                                className="w-3.5 h-3.5 rounded border-zinc-800 bg-black text-indigo-600"
                                              />
                                              <span className="text-[9px] font-bold text-zinc-600">طويل</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {(!selectedInstance || selectedInstance.panels.length === 0) && (
                      <div className="h-80 border-2 border-dashed border-zinc-800 rounded-[3rem] flex flex-col items-center justify-center text-zinc-600">
                        <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center mb-6 border border-zinc-800">
                          <Layout size={40} className="text-zinc-700" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-400 mb-2">لا توجد لوحات بعد</h3>
                        <p className="font-bold text-sm">ابدأ بإنشاء لوحتك الأولى الآن.</p>
                      </div>
                    )}
                    {/* App Branding Settings */}
                    <section className="mt-20 pt-20 border-t border-zinc-800/50">
                       <div className="flex items-center gap-4 mb-10">
                          <Crown className="text-[#c5a059]" size={32} />
                          <div>
                             <h3 className="text-4xl font-black text-white tracking-tight">هوية النظام (Branding)</h3>
                             <p className="text-zinc-500 font-bold">تغيير الألوان والشعارات الخاصة بلوحة التحكم.</p>
                          </div>
                       </div>

                       <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                             {[
                               { label: 'اسم النظام', key: 'name', parent: 'app' },
                               { label: 'اللون الأساسي', key: 'primaryColor', parent: 'branding' },
                               { label: 'رابط الشعار', key: 'logo', parent: 'branding' },
                               { label: 'رابط البنر', key: 'banner', parent: 'branding' },
                               { label: 'نص الفوتر', key: 'footer', parent: 'branding' }
                             ].map((item) => (
                               <div key={item.key} className="space-y-2">
                                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">{item.label}</label>
                                  <input
                                     type="text"
                                     value={(item.parent === 'app' ? (config.app as any)?.[item.key] : (config.app?.branding as any)?.[item.key]) ?? ''}
                                     onChange={(e) => {
                                        if (item.parent === 'app') {
                                           const newApp = { ...config.app, [item.key]: e.target.value };
                                           setConfig({ ...config, app: newApp as any });
                                        } else {
                                           const newBranding = { ...config.app?.branding, [item.key]: e.target.value };
                                           const newApp = { ...config.app, branding: newBranding };
                                           setConfig({ ...config, app: newApp as any });
                                        }
                                     }}
                                     className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-xs focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                                     placeholder="أدخل القيمة هنا..."
                                  />
                               </div>
                             ))}
                          </div>

                          <div className="mt-10 flex justify-end">
                             <button
                                onClick={async () => {
                                   setLoading(true);
                                   try {
                                      await safeJsonFetch('/api/instances/update', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify({ app: config.app })
                                      });
                                      setMessage({ text: 'تم حفظ هوية النظام بنجاح', type: 'success' });
                                   } catch (err: any) {
                                      setMessage({ text: err.message, type: 'error' });
                                   } finally {
                                      setLoading(false);
                                   }
                                }}
                                className="bg-[#c5a059] text-black px-10 py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#c5a059]/20"
                             >
                                حفظ الهوية
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* Technical Settings */}
                    <section className="mt-20 pt-20 border-t border-zinc-800/50">
                       <div className="flex items-center gap-4 mb-10">
                          <ShieldCheck className="text-[#c5a059]" size={32} />
                          <div>
                             <h3 className="text-4xl font-black text-white tracking-tight">الإعدادات التقنية (Global)</h3>
                             <p className="text-zinc-500 font-bold">تحديد المعرفات (IDs) الأساسية للسيرفر.</p>
                          </div>
                       </div>

                       <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {[
                                { label: 'سيرفر العمل (Guild ID)', key: 'guildId', type: 'text' },
                                { label: 'رتبة الإدارة (Admin Role)', key: 'adminRoleId', type: 'role' },
                                { label: 'رتبة الطاقم (Staff Role)', key: 'staffRoleId', type: 'role' },
                                { label: 'قناة السجلات الكبرى (Log Channel)', key: 'logChannelId', type: 'channel' },
                                { label: 'فئة التذاكر الافتراضية (Category)', key: 'ticketCategoryId', type: 'category' },
                                { label: 'قناة الأرشيف (Transcript)', key: 'transcriptChannelId', type: 'channel' }
                             ].map((item) => (
                               <div key={item.key} className="space-y-2 text-right">
                                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">{item.label}</label>
                                  {item.type === 'text' ? (
                                    <input
                                       type="text"
                                       value={(config.globalDiscord as any)?.[item.key] || ''}
                                       onChange={(e) => {
                                          const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                          setConfig({ ...config, globalDiscord: newGlobal as any });
                                       }}
                                       className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-xs font-mono focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-white text-right"
                                       placeholder="أدخل المعرف هنا..."
                                    />
                                  ) : item.type === 'role' ? (
                                    <div className="relative">
                                      <select
                                         value={(config.globalDiscord as any)?.[item.key] || ''}
                                         onChange={(e) => {
                                            const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                            setConfig({ ...config, globalDiscord: newGlobal as any });
                                         }}
                                         className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-xs focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-white appearance-none cursor-pointer text-right"
                                         dir="rtl"
                                      >
                                         <option value="">اختر رتبة...</option>
                                         {discordData.roles.map(r => (
                                           <option key={r.id} value={r.id}>{r.name}</option>
                                         ))}
                                         {!discordData.roles.length && (config.globalDiscord as any)?.[item.key] && (
                                           <option value={(config.globalDiscord as any)?.[item.key]}>{(config.globalDiscord as any)?.[item.key]}</option>
                                         )}
                                      </select>
                                      {!discordData.roles.length && (
                                        <input
                                           type="text"
                                           value={(config.globalDiscord as any)?.[item.key] || ''}
                                           onChange={(e) => {
                                              const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                              setConfig({ ...config, globalDiscord: newGlobal as any });
                                           }}
                                           className="w-full mt-2 bg-black/50 border border-zinc-800 rounded-2xl px-5 py-2.5 text-[10px] font-mono focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-zinc-400 text-right"
                                           placeholder="أو أدخل المعرف يدوياً..."
                                        />
                                      )}
                                    </div>
                                  ) : item.type === 'category' ? (
                                    <div className="relative">
                                      <select
                                         value={(config.globalDiscord as any)?.[item.key] || ''}
                                         onChange={(e) => {
                                            const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                            setConfig({ ...config, globalDiscord: newGlobal as any });
                                         }}
                                         className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-xs focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-white appearance-none cursor-pointer text-right"
                                         dir="rtl"
                                      >
                                         <option value="">اختر فئة...</option>
                                         {discordData.channels.filter(c => c.type === 4).map(c => (
                                           <option key={c.id} value={c.id}>{c.name}</option>
                                         ))}
                                         {!discordData.channels.length && (config.globalDiscord as any)?.[item.key] && (
                                           <option value={(config.globalDiscord as any)?.[item.key]}>{(config.globalDiscord as any)?.[item.key]}</option>
                                         )}
                                      </select>
                                      {!discordData.channels.length && (
                                        <input
                                           type="text"
                                           value={(config.globalDiscord as any)?.[item.key] || ''}
                                           onChange={(e) => {
                                              const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                              setConfig({ ...config, globalDiscord: newGlobal as any });
                                           }}
                                           className="w-full mt-2 bg-black/50 border border-zinc-800 rounded-2xl px-5 py-2.5 text-[10px] font-mono focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-zinc-400 text-right"
                                           placeholder="أو أدخل المعرف يدوياً..."
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <select
                                         value={(config.globalDiscord as any)?.[item.key] || ''}
                                         onChange={(e) => {
                                            const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                            setConfig({ ...config, globalDiscord: newGlobal as any });
                                         }}
                                         className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-xs focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-white appearance-none cursor-pointer text-right"
                                         dir="rtl"
                                      >
                                         <option value="">اختر قناة...</option>
                                         {discordData.channels.filter(c => c.type === 0).map(c => (
                                           <option key={c.id} value={c.id}>{c.name}</option>
                                         ))}
                                         {!discordData.channels.length && (config.globalDiscord as any)?.[item.key] && (
                                           <option value={(config.globalDiscord as any)?.[item.key]}>{(config.globalDiscord as any)?.[item.key]}</option>
                                         )}
                                      </select>
                                      {!discordData.channels.length && (
                                        <input
                                           type="text"
                                           value={(config.globalDiscord as any)?.[item.key] || ''}
                                           onChange={(e) => {
                                              const newGlobal = { ...(config.globalDiscord || {}), [item.key]: e.target.value };
                                              setConfig({ ...config, globalDiscord: newGlobal as any });
                                           }}
                                           className="w-full mt-2 bg-black/50 border border-zinc-800 rounded-2xl px-5 py-2.5 text-[10px] font-mono focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-zinc-400 text-right"
                                           placeholder="أو أدخل المعرف يدوياً..."
                                        />
                                      )}
                                    </div>
                                  )}
                               </div>
                             ))}
                          </div>

                          <div className="mt-10 flex justify-end">
                             <button
                                onClick={async () => {
                                   setLoading(true);
                                   try {
                                      await safeJsonFetch('/api/instances/update', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify({ globalDiscord: config.globalDiscord })
                                      });
                                      setMessage({ text: 'تم حفظ الإعدادات التقنية بنجاح', type: 'success' }); if (selectedInstance?.status === 'متصل') { fetchDiscordData(config.globalDiscord?.guildId, false); }
                                   } catch (err: any) {
                                      setMessage({ text: err.message, type: 'error' });
                                   } finally {
                                      setLoading(false);
                                   }
                                }}
                                className="bg-[#c5a059] text-black px-10 py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#c5a059]/20"
                             >
                                حفظ الإعدادات التقنية
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* System Alerts Configuration */}
                    <section className="mt-20 pt-20 border-t border-zinc-800/50">
                       <div className="flex items-center gap-4 mb-10">
                          <AlertCircle className="text-rose-500" size={32} />
                          <div>
                             <h3 className="text-4xl font-black text-white tracking-tight">إشعارات النظام (Global)</h3>
                             <p className="text-zinc-500 font-bold">تخصيص الرسائل التلقائية العالمية التي يرسلها البوت.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Already Has Ticket */}
                          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-10 space-y-6">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <h4 className="font-black text-xl text-zinc-300">تنبيه وجود تذكرة مفتوحة</h4>
                             </div>
                             <div className="space-y-4">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">عنوان الرسالة</label>
                                   <input
                                      type="text"
                                      value={config.globalSystemEmbeds?.alreadyHasTicket?.title ?? ''}
                                      onChange={(e) => {
                                        const newEmbeds = {
                                          ...config.globalSystemEmbeds!,
                                          alreadyHasTicket: { ...(config.globalSystemEmbeds?.alreadyHasTicket || {}), title: e.target.value }
                                        };
                                        setConfig({ ...config, globalSystemEmbeds: newEmbeds as any });
                                      }}
                                      className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">محتوى الرسالة</label>
                                   <textarea
                                      value={config.globalSystemEmbeds?.alreadyHasTicket?.description ?? ''}
                                      onChange={(e) => {
                                        const newEmbeds = {
                                          ...config.globalSystemEmbeds!,
                                          alreadyHasTicket: { ...(config.globalSystemEmbeds?.alreadyHasTicket || {}), description: e.target.value }
                                        };
                                        setConfig({ ...config, globalSystemEmbeds: newEmbeds as any });
                                      }}
                                      className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all h-24 resize-none"
                                   />
                                </div>
                             </div>
                          </div>

                          {/* Ticket Warning */}
                          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-10 space-y-6">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <h4 className="font-black text-xl text-zinc-300">رسالة تنبيه العضو</h4>
                             </div>
                             <div className="space-y-4">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">عنوان الرسالة</label>
                                   <input
                                      type="text"
                                      value={config.globalSystemEmbeds?.ticketWarning?.title ?? ''}
                                      onChange={(e) => {
                                        const newEmbeds = {
                                          ...config.globalSystemEmbeds!,
                                          ticketWarning: { ...(config.globalSystemEmbeds?.ticketWarning || {}), title: e.target.value }
                                        };
                                        setConfig({ ...config, globalSystemEmbeds: newEmbeds as any });
                                      }}
                                      className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">محتوى الرسالة</label>
                                   <textarea
                                      value={config.globalSystemEmbeds?.ticketWarning?.description ?? ''}
                                      onChange={(e) => {
                                        const newEmbeds = {
                                          ...config.globalSystemEmbeds!,
                                           ticketWarning: { ...(config.globalSystemEmbeds?.ticketWarning || {}), description: e.target.value }
                                         };
                                         setConfig({ ...config, globalSystemEmbeds: newEmbeds as any });
                                       }}
                                       className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all h-24 resize-none"
                                    />
                                    <p className="text-[9px] text-zinc-600">استخدم {"{channel}"} للقناة و {"{reason}"} للسبب.</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                           <button
                              onClick={async () => {
                                 setLoading(true);
                                 try {
                                    await safeJsonFetch('/api/instances/update', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ globalSystemEmbeds: config.globalSystemEmbeds })
                                    });
                                    setMessage({ text: 'تم حفظ إشعارات النظام العالمية بنجاح', type: 'success' });
                                 } catch (err: any) {
                                    setMessage({ text: err.message, type: 'error' });
                                 } finally {
                                    setLoading(false);
                                 }
                              }}
                              className="bg-[#c5a059] text-black px-10 py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#c5a059]/20"
                           >
                              حفظ التنبيهات العالمية
                           </button>
                        </div>
                     </section>
                  </main>
                </div>
              ) : (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-12 text-center space-y-6 text-right flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-[#c5a059] rounded-full flex items-center justify-center">
                    <Bot size={40} />
                  </div>
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-black text-white">لم يتم تحديد أي بوت نشط</h3>
                    <p className="text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">
                      يرجى التوجه إلى قسم "البوتات المضافة" وتحديد البوت الذي ترغب في تخصيصه وتعديل لوحاته.
                    </p>
                  </div>
                  <button
                    onClick={() => changeTab('bots')}
                    className="bg-[#c5a059] text-black px-8 py-3.5 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    عرض البوتات المضافة
                  </button>
                </div>
              )) : (
                !isOperationsVerified ? (
                  <div className="max-w-md mx-auto bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 text-center space-y-8 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl shadow-2xl mt-8" dir="rtl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-[#c5a059] rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5">
                      <Lock size={40} />
                    </div>
                    
                    <div className="space-y-3 text-center">
                      <h3 className="text-3xl font-black text-white tracking-tight">غرفة العمليات مغلقة</h3>
                      <p className="text-zinc-500 font-bold text-sm leading-relaxed max-w-sm mx-auto">
                        هذا القسم مخصص فقط للإدارة وطاقم العمل. يرجى تسجيل الدخول بحساب ديسكورد للتحقق من هويتك وصلاحياتك.
                      </p>
                    </div>
                    
                    <div className="w-full space-y-4">
                      {verificationError && (
                        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-500 text-sm font-bold text-right" dir="rtl">
                          <AlertCircle size={18} className="shrink-0" />
                          <span>{verificationError}</span>
                        </div>
                      )}

                      <button
                        onClick={handleDiscordLogin}
                        disabled={loading}
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#5865F2]/20 cursor-pointer"
                      >
                        <LogIn size={20} />
                        {loading ? 'جاري الاتصال بديسكورد...' : 'تسجيل الدخول عبر ديسكورد'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 justify-center text-zinc-600 font-semibold text-xs">
                      <ShieldCheck size={14} />
                      <span>نظام حماية وتأكيد الهوية الرقمية لـ RS TEAM</span>
                    </div>
                  </div>
                ) : selectedInstance ? (
                  <div className="flex flex-col gap-12">
                     <div className="space-y-16">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-2">
                           <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="w-10 h-1 bg-indigo-500 rounded-full" />
                              <span className="text-indigo-400 font-black text-xs uppercase tracking-[0.2em]">غرفة المحرك</span>
                               {verifiedUser && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-emerald-500 text-xs font-black mr-2" dir="rtl">
                                  <div className="w-4 h-4 rounded-full overflow-hidden border border-emerald-500/30">
                                    <img src={verifiedUser.avatar} alt={verifiedUser.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                  <span>{verifiedUser.username}</span>
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded-full font-black",
                                    verifiedUser.role === 'admin' ? "bg-yellow-400/20 text-yellow-400" :
                                    verifiedUser.role === 'staff' ? "bg-blue-400/20 text-blue-400" :
                                    "bg-green-400/20 text-green-400"
                                  )}>
                                    {verifiedUser.role === 'admin' ? '👑 مدير' : verifiedUser.role === 'staff' ? '🛡️ طاقم' : '👤 مشترك'}
                                  </span>
                                  <button 
                                    onClick={handleLockOperations}
                                    className="hover:text-rose-500 transition-all font-black pl-1 border-r border-emerald-500/20 pr-1 mr-1"
                                    title="قفل الغرفة"
                                  >
                                    <Lock size={12} className="inline mr-1" />
                                    خروج
                                  </button>
                                </div>
                              )}
                            </div>
                            <h2 className="text-6xl font-black text-white tracking-tighter">لوحة التشغيل</h2>
                            <p className="text-zinc-500 font-bold text-lg max-w-xl leading-relaxed">تحكم كامل في دورة حياة النظام للبوت: <span className="text-[#c5a059]">{selectedInstance.name}</span></p>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={async () => {
                                  const name = prompt('اسم البوت الجديد:') || 'بوت جديد';
                                  try {
                                    const newInst = await safeJsonFetch('/api/instances/add', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ name, ownerId: ownerIdFilter })
                                    });
                                    fetchConfig();
                                    setSelectedInstanceId(newInst.id);
                                    setMessage({ text: 'تم إضافة البوت الجديد بنجاح!', type: 'success' });
                                  } catch (err) {
                                    setMessage({ text: err.message || "حدث خطأ ما", type: 'error' });
                                  }
                                }}
                                className="bg-white hover:bg-zinc-200 text-black h-16 px-8 rounded-[1.8rem] font-black flex items-center gap-3 transition-all shadow-xl active:scale-95 text-lg"
                              >
                                <Plus size={24} strokeWidth={4} /> إضافة بوت جديد
                              </button>
                              <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-rose-500 hover:text-white h-16 px-8 rounded-[1.8rem] font-black flex items-center gap-3 transition-all shadow-xl active:scale-95 text-lg"
                              >
                                <Trash2 size={24} /> حذف بوت الشخص
                              </button>
                             <button
                              onClick={handleDeployAll}
                              disabled={loading || selectedInstance.panels.length === 0}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white h-16 px-10 rounded-[1.8rem] font-black flex items-center gap-4 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 text-lg disabled:opacity-30 group"
                            >
                              <Zap size={24} fill="currentColor" className="group-hover:scale-125 transition-transform" />
                              نشر التعديلات {selectedInstance.name}
                            </button>
                          </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                           <div className="lg:col-span-5 space-y-8">
                              <section className="bg-zinc-900/40 border border-zinc-800 rounded-[3.5rem] p-12">
                                <div className="flex items-center gap-5 mb-12">
                                  <div className={cn(
                                    "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all",
                                    selectedInstance.status === 'متصل' ? "bg-emerald-500/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] border border-emerald-500/30" :
                                    selectedInstance.status === 'خطأ في التوكن' ? "bg-rose-500/20 text-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] border border-rose-500/30" :
                                    "bg-zinc-800 text-zinc-600 border border-zinc-700"
                                  )}>
                                    <Activity size={32} />
                                  </div>
                                  <div>
                                    <h4 className={cn(
                                      "text-3xl font-black",
                                      selectedInstance.status === 'متصل' ? "text-emerald-400" :
                                      selectedInstance.status === 'خطأ في التوكن' ? "text-rose-400" :
                                      "text-white"
                                    )}>{selectedInstance.status}</h4>
                                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Bot Identity Status</p>
                                  </div>
                                </div>

                                {selectedInstance.status === 'خطأ في التوكن' && (
                                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 text-xs text-rose-200 leading-relaxed font-bold">
                                    ⚠️ فشل تسجيل الدخول للبوت. يرجى إدخال توكن صالح وصحيح في حقل التوكن أدناه، والضغط على "بدء التشغيل" لحفظ التعديلات وإعادة التشغيل.
                                  </div>
                                )}

                                <div className="space-y-6">
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Discord Application Token</label>
                                    <div className="relative">
                                      <input
                                        type="password"
                                        value={selectedInstance.token}
                                        onChange={(e) => {
                                          const newInstances = [...config.instances];
                                          const idx = newInstances.findIndex(i => i.id === selectedInstance.id);
                                          newInstances[idx].token = e.target.value;
                                          setConfig({ ...config, instances: newInstances });
                                        }}
                                        className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-[#c5a059] outline-none transition-all font-mono tracking-widest"
                                        placeholder="NzI5..."
                                      />
                                      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                        <ShieldCheck className="text-zinc-700" size={20} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 text-right block">معرف ديسكورد لمالك البوت (Discord User ID)</label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        value={selectedInstance.ownerId || ""}
                                        onChange={(e) => {
                                          const newInstances = [...config.instances];
                                          const idx = newInstances.findIndex(i => i.id === selectedInstance.id);
                                          newInstances[idx].ownerId = e.target.value;
                                          setConfig({ ...config, instances: newInstances });
                                        }}
                                        className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-left text-white font-mono"
                                        placeholder="مثال: 412345678901234567"
                                        dir="ltr"
                                      />
                                    </div>
                                    <p className="text-[10px] text-zinc-500 font-bold leading-relaxed text-right">
                                      عند تحديد هذا المعرف، سيظهر هذا البوت في قائمة البوتات فقط للمستخدم الذي يقوم بإدخال هذا المعرف في أعلى لوحة التحكم.
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-4">
                                    <button
                                      onClick={handleStart}
                                      disabled={loading || selectedInstance.status === 'متصل'}
                                      className="w-full bg-white hover:bg-zinc-200 text-black h-20 rounded-[2rem] font-black flex items-center justify-center gap-4 transition-all disabled:opacity-20 shadow-2xl active:scale-95 text-xl"
                                    >
                                      <Zap size={24} fill="black" />
                                      <span>بدء التشغيل</span>
                                    </button>
                                    <button
                                      onClick={handleStop}
                                      disabled={loading || selectedInstance.status === 'متوقف'}
                                      className="w-full bg-zinc-800/50 hover:bg-rose-500 text-zinc-500 hover:text-white h-16 rounded-[1.8rem] font-black flex items-center justify-center gap-4 transition-all disabled:opacity-20 active:scale-95 border border-white/5"
                                    >
                                      <Power size={20} />
                                      <span>إيقاف العمليات</span>
                                    </button>
                                    <button
                                       onClick={async () => {
                                          await safeJsonFetch('/api/instances/update', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(selectedInstance)
                                          });
                                          setMessage({ text: 'تم حفظ التعديلات للبوت', type: 'success' });
                                       }}
                                       className="w-full h-12 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all"
                                    >
                                       مزامنة البيانات السحابية
                                    </button>
                                  </div>
                                </div>
                              </section>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
                                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">اللوحات</p>
                                  <p className="text-3xl font-black text-white">{selectedInstance.panels.length}</p>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
                                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">الاستجابة</p>
                                  <p className="text-3xl font-black text-emerald-500">14ms</p>
                                </div>
                              </div>
                           </div>

                           <div className="lg:col-span-7 h-full">
                              <section className="bg-black/60 border border-zinc-800 rounded-[3.5rem] p-12 h-full flex flex-col shadow-2xl relative overflow-hidden">
                                <h4 className="font-black text-2xl text-white tracking-tight mb-8">وحدة التحكم {selectedInstance.name}</h4>
                                <div className="flex-1 space-y-4 font-mono text-xs overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
                                   <div className="flex gap-4 p-4 rounded-2xl bg-zinc-950/50 border border-white/5">
                                      <span className="text-zinc-700">[{new Date().toLocaleTimeString()}]</span>
                                      <span className="text-indigo-400 font-bold">INFO</span>
                                      <span className="text-zinc-400">نظام المراقبة يبحث عن نشاط للبوت {selectedInstance.id}...</span>
                                   </div>
                                   {selectedInstance.status === 'متصل' && (
                                     <div className="flex gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                        <span className="text-zinc-700">[{new Date().toLocaleTimeString()}]</span>
                                        <span className="text-emerald-500 font-bold">LIVE</span>
                                        <span className="text-emerald-200/50">النظام متصل الآن ويقوم بمعالجة الأحداث المباشرة.</span>
                                     </div>
                                   )}
                                </div>
                              </section>
                           </div>
                        </div>

                        {/* Discovered Server Information */}
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] p-12 space-y-8">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-800/50">
                            <div className="space-y-1 text-right md:text-right w-full">
                              <h3 className="text-3xl font-black text-white tracking-tight">رتب وقنوات السيرفر المكتشفة</h3>
                              <p className="text-sm font-bold text-zinc-500">هذه هي البيانات المجلوبة مباشرة من سيرفر Discord الذي يتصل به البوت حالياً.</p>
                            </div>
                            <button
                              onClick={() => fetchDiscordData(undefined, true)}
                              disabled={loading || selectedInstance.status !== 'متصل'}
                              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 transition-all font-black text-xs text-white shrink-0"
                            >
                              <Activity size={14} />
                              تحديث البيانات المجلوبة
                            </button>
                          </div>

                          {!discordData.roles.length && !discordData.channels.length ? (
                            <div className="text-center py-12 space-y-4">
                              <AlertCircle size={48} className="mx-auto text-zinc-600 animate-bounce" />
                              <div className="text-zinc-400 font-bold text-lg">لم يتم جلب أي بيانات بعد</div>
                              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                                تأكد من أن البوت متصل بالإنترنت ومضاف للسيرفر ولديه الصلاحيات الكافية، ثم اضغط على زر "تحديث البيانات المجلوبة".
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" dir="rtl">
                              {/* Roles Column */}
                              <div className="space-y-4 text-right">
                                <h4 className="font-black text-lg text-zinc-400 flex items-center gap-2 justify-start">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                                  رتب السيرفر ({discordData.roles.length})
                                </h4>
                                <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 text-right">
                                  {discordData.roles.map(r => (
                                    <div key={r.id} className="flex justify-between items-center bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 p-3 rounded-xl transition-all">
                                      <span className="text-xs text-zinc-400 font-mono select-all bg-black/40 px-2.5 py-1 rounded-md border border-white/5">{r.id}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#c5a059]" />
                                        <span className="text-sm font-bold text-white">{r.name}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Channels Column */}
                              <div className="space-y-4 text-right">
                                <h4 className="font-black text-lg text-zinc-400 flex items-center gap-2 justify-start">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  قنوات وفئات السيرفر ({discordData.channels.length})
                                </h4>
                                <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 text-right">
                                  {discordData.channels.map(c => (
                                    <div key={c.id} className="flex justify-between items-center bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 p-3 rounded-xl transition-all">
                                      <span className="text-xs text-zinc-400 font-mono select-all bg-black/40 px-2.5 py-1 rounded-md border border-white/5">{c.id}</span>
                                      <span className="text-sm font-bold text-white flex items-center gap-2">
                                        <span className="text-zinc-500 font-black text-xs">{c.type === 4 ? "📁 [فئة]" : "💬 [قناة]"}</span>
                                        {c.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-12 text-center space-y-6 text-right flex flex-col items-center justify-center w-full">
                      <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-[#c5a059] rounded-full flex items-center justify-center mx-auto">
                        <Bot size={40} />
                      </div>
                      <div className="space-y-2 text-center">
                        <h3 className="text-2xl font-black text-white">لم يتم تحديد أي بوت نشط</h3>
                        <p className="text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">
                          يرجى التوجه إلى قسم "البوتات المضافة" وتحديد البوت الذي ترغب في تشغيله والتحكم بعملياته.
                        </p>
                      </div>
                      <div className="flex gap-4 flex-wrap justify-center">
                        <button
                          onClick={async () => {
                            const name = prompt('اسم البوت الجديد:') || 'بوت جديد';
                            try {
                              const newInst = await safeJsonFetch('/api/instances/add', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name, ownerId: ownerIdFilter })
                              });
                              fetchConfig();
                              setSelectedInstanceId(newInst.id);
                              setMessage({ text: 'تم إضافة البوت الجديد بنجاح!', type: 'success' });
                            } catch (err) {
                              setMessage({ text: err.message || "حدث خطأ ما", type: 'error' });
                            }
                          }}
                          className="bg-white hover:bg-zinc-200 text-black px-8 py-3.5 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
                        >
                          إضافة بوت جديد
                        </button>
                        <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-rose-500 hover:text-white px-8 py-3.5 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          حذف بوت الشخص
                        </button>
                        <button 
                          onClick={() => changeTab('bots')}
                          className="bg-[#c5a059] text-black px-8 py-3.5 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
                        >
                          عرض البوتات المضافة
                        </button>
                      </div>
                    </div>
                  )
                )
            }
</motion.div>
      </AnimatePresence>
    </div>


      {/* Toast Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-12 right-12 z-50 bg-white text-black p-6 rounded-[2rem] flex items-center justify-between gap-8 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-black"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                message.type === 'success' ? "bg-emerald-500" : "bg-rose-500"
              )}>
                {message.type === 'success' ? <CheckCircle2 className="text-white" /> : <AlertCircle className="text-white" />}
              </div>
              <p className="text-lg font-black tracking-tight">{message.text}</p>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs font-black uppercase bg-black text-white px-4 py-2 rounded-xl">إغلاق</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Bot Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setConfirmDeleteId(null);
                setConfirmDeleteOwnerId(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border-2 border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 max-h-[85vh] overflow-hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3 text-rose-500">
                  <Trash2 size={28} />
                  <h3 className="text-2xl font-black text-white">حذف بوت شخص معين</h3>
                </div>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setConfirmDeleteId(null);
                    setConfirmDeleteOwnerId(null);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 p-2 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Input for custom ID */}
              <div className="space-y-2">
                <label className="text-zinc-400 font-bold text-sm">أدخل معرف ديسكورد الخاص بالشخص (Discord User ID):</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={deleteTargetOwnerId}
                    onChange={(e) => {
                      setDeleteTargetOwnerId(e.target.value);
                      if (confirmDeleteOwnerId) setConfirmDeleteOwnerId(null);
                    }}
                    placeholder="مثال: 412345678901234567"
                    className="flex-1 bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-base focus:ring-2 focus:ring-rose-500 outline-none transition-all text-white font-mono text-left"
                    dir="ltr"
                  />
                  {confirmDeleteOwnerId === deleteTargetOwnerId ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteByOwnerId(deleteTargetOwnerId)}
                        disabled={loading}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-6 rounded-2xl transition-all flex items-center gap-2 text-sm animate-pulse"
                      >
                        {loading ? 'جاري الحذف...' : 'تأكيد الحذف؟'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteOwnerId(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black px-4 rounded-2xl transition-all text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (deleteTargetOwnerId) setConfirmDeleteOwnerId(deleteTargetOwnerId);
                      }}
                      disabled={!deleteTargetOwnerId || loading}
                      className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black px-6 rounded-2xl transition-all flex items-center gap-2 text-sm"
                    >
                      حذف البوت
                    </button>
                  )}
                </div>
              </div>

              {/* List of registered bots */}
              <div className="flex-1 overflow-y-auto min-h-[250px] pr-1 space-y-3">
                <p className="text-zinc-500 text-xs font-black tracking-wider uppercase mb-2">قائمة البوتات المسجلة حالياً:</p>
                {config.instances && config.instances.length > 0 ? (
                  config.instances.map((inst) => (
                    <div
                      key={inst.id}
                      className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-zinc-900/80"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-700 overflow-hidden">
                          {inst.avatar ? (
                            <img src={inst.avatar} alt={inst.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Bot size={24} />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-white text-base leading-snug">{inst.name}</div>
                          <div className="text-zinc-400 text-xs font-mono select-all mt-1" dir="ltr">
                            Owner ID: {inst.ownerId}
                          </div>
                        </div>
                      </div>
                      
                      {confirmDeleteId === inst.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await handleDeleteInstance(inst.id, inst.name);
                              setConfirmDeleteId(null);
                            }}
                            disabled={loading}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1 animate-pulse"
                          >
                            تأكيد الحذف؟
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs px-3 py-2.5 rounded-xl transition-all"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmDeleteId(inst.id);
                          }}
                          disabled={loading}
                          className="bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-rose-500/10 hover:border-rose-600 flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          حذف
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-500 font-bold py-12 bg-zinc-900/20 border border-zinc-900 rounded-2xl">
                    لا توجد أي بوتات مسجلة حالياً.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
