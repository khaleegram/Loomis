'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  ChevronDown, 
  CheckCircle2, 
  RefreshCw, 
  User, 
  Coins, 
  Award, 
  CalendarDays,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
  Sliders,
  Users,
  ShieldAlert,
  MapPin,
  TrendingUp,
  Target
} from 'lucide-react';

type School = {
  id: string;
  name: string;
  level: string;
  students: number;
  grading: string;
  revenue: string;
  ledgerStatus: 'Verified' | 'Pending';
  logoLetter: string;
  studentTrend: string;
  revenueTrend: string;
  activeTeachers: number;
};

const SCHOOLS: School[] = [
  {
    id: 'grange',
    name: 'Grange School (Ikeja)',
    level: 'Primary & Secondary',
    students: 1250,
    activeTeachers: 84,
    grading: 'Cambridge IGCSE Standard',
    revenue: '₦124.5M',
    ledgerStatus: 'Verified',
    logoLetter: 'G',
    studentTrend: 'M 0 20 Q 25 15 50 18 T 100 2',
    revenueTrend: 'M 0 22 L 20 22 L 20 15 L 40 15 L 40 10 L 60 10 L 60 5 L 80 5 L 80 2 L 100 2',
  },
  {
    id: 'corona',
    name: 'Corona Secondary (Agbara)',
    level: 'Senior Secondary',
    students: 850,
    activeTeachers: 62,
    grading: 'WAEC National Standard',
    revenue: '₦82.4M',
    ledgerStatus: 'Verified',
    logoLetter: 'C',
    studentTrend: 'M 0 22 Q 25 25 50 15 T 100 5',
    revenueTrend: 'M 0 25 L 20 25 L 20 18 L 40 18 L 40 12 L 60 12 L 60 8 L 80 8 L 80 4 L 100 4',
  },
  {
    id: 'saviours',
    name: 'St. Saviour\'s (Lekki)',
    level: 'Nursery & Primary',
    students: 420,
    activeTeachers: 35,
    grading: 'Early Years / British Foundation',
    revenue: '₦28.1M',
    ledgerStatus: 'Verified',
    logoLetter: 'S',
    studentTrend: 'M 0 15 Q 25 10 50 12 T 100 4',
    revenueTrend: 'M 0 20 L 20 20 L 20 16 L 40 16 L 40 11 L 60 11 L 60 7 L 80 7 L 80 3 L 100 3',
  },
];

const LEDGER_LOGS = [
  {
    id: '1',
    action: 'Term 3 Fee Collection Verified',
    school: 'Grange School',
    block: '#10842',
    hash: '0x8f2c...e41b',
    timestamp: 'Just now',
  },
  {
    id: '2',
    action: 'Student Promotion Register Signed',
    school: 'Corona Secondary',
    block: '#10841',
    hash: '0x7a31...a92d',
    timestamp: '2m ago',
  },
  {
    id: '3',
    action: 'New Academic Session Activated',
    school: 'St. Saviour\'s',
    block: '#10840',
    hash: '0x5d9b...882c',
    timestamp: '15m ago',
  },
];

const TOASTS = [
  'Grange School settled ₦124.5M term liabilities via IVP Ledger.',
  'Corona Secondary completed class promotion for 850 students.',
  'St. Saviour\'s (Lekki) synchronized Early Years British assessments.',
  'Conflict-of-interest check passed for Regional Manager referral reward.',
  'Cross-tenant isolation audit successfully completed on Platform Ledger.'
];

type TabId = 'admin' | 'ledger' | 'parent';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('admin');
  const [selectedSchool, setSelectedSchool] = useState<School>(SCHOOLS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [auditProgress, setAuditProgress] = useState(100);

  // Floating Toast State
  const [toastIndex, setToastIndex] = useState(0);
  const [showToast, setShowToast] = useState(true);

  // Auto-cycle schools for dynamic feel if user doesn't interact
  useEffect(() => {
    if (activeTab !== 'admin' || isDropdownOpen) return;
    const interval = setInterval(() => {
      setSelectedSchool((current) => {
        const index = SCHOOLS.findIndex((s) => s.id === current.id);
        const nextIndex = (index + 1) % SCHOOLS.length;
        return SCHOOLS[nextIndex];
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab, isDropdownOpen]);

  // Auto-cycle floating toasts
  useEffect(() => {
    const toastInterval = setInterval(() => {
      setShowToast(false);
      setTimeout(() => {
        setToastIndex((prev) => (prev + 1) % TOASTS.length);
        setShowToast(true);
      }, 600); // fade transition delay
    }, 9000);
    return () => clearInterval(toastInterval);
  }, []);

  const triggerVerification = () => {
    setIsVerifying(true);
    setAuditProgress(0);
    const interval = setInterval(() => {
      setAuditProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsVerifying(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <div className="min-h-screen bg-stone-50/70 text-neutral-800 selection:bg-brand-100 selection:text-brand-900 font-sans relative overflow-x-hidden">
      
      {/* Global CSS overrides and keyframe animations */}
      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash-line {
          stroke-dasharray: 5 3;
          animation: dash 1.2s linear infinite;
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.96); opacity: 0.4; }
          50% { transform: scale(1.04); opacity: 0.85; }
          100% { transform: scale(0.96); opacity: 0.4; }
        }
        .animate-radar {
          animation: radar-pulse 2.5s infinite ease-in-out;
        }
        @keyframes float-badge {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float-badge 4s infinite ease-in-out;
        }
      `}</style>

      {/* Premium Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e2db_1px,transparent_1px),linear-gradient(to_bottom,#e5e2db_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none z-0" />

      {/* Premium Golden & Warm Amber Radial Backdrops */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-[15%] left-[5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(92,61,39,0.04),transparent_70%)] pointer-events-none z-0" />

      {/* 1. Glassmorphic Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/55 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9.5 items-center justify-center rounded bg-brand-700/5 border border-brand-700/15 shadow-inner">
              <span className="font-serif text-xl font-bold text-brand-700">L</span>
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-neutral-900">Loomis</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <a href="#features" className="hover:text-brand-700 transition-colors">Features</a>
            <a href="#ledger" className="hover:text-brand-700 transition-colors">Ledger Audit</a>
            <a href="#network" className="hover:text-brand-700 transition-colors">Regional Network</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-brand-700 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/login" 
              className="rounded bg-brand-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-brand-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-400/10 border border-gold-400/30 px-3.5 py-1.5 text-xs font-bold text-brand-800 shadow-sm animate-float">
              <Sparkles className="size-3.5 text-gold-600 shrink-0" />
              <span>Multi-Tenant Operations Console</span>
            </div>

            <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
              NURSERY • PRIMARY • JUNIOR & SENIOR SECONDARY
            </p>

            <h1 className="font-serif text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.12] bg-gradient-to-r from-neutral-950 via-brand-800 to-neutral-900 bg-clip-text text-transparent">
              The prestige operating system for elite academies.
            </h1>

            <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
              Unifying academic sessions, configurable term promotions, isolated client databases, and 
              cross-tenant parent profiles into a secure, audit-verified platform ledger.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded bg-brand-700 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-700/15 hover:bg-brand-800 hover:scale-[1.02] active:scale-[0.98] transition-all group"
              >
                Schedule Consultation
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#demo"
                className="flex items-center gap-2 rounded border border-neutral-300 bg-white/80 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm"
              >
                Interactive Tour
              </a>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-neutral-200/80 pt-8 mt-6">
              <div>
                <p className="text-3xl font-serif font-bold text-brand-800">100%</p>
                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5">Database Isolation</p>
              </div>
              <div>
                <p className="text-3xl font-serif font-bold text-brand-800">₦2.4B+</p>
                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5">Audit Ledger Verified</p>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Premium Interactive Mockup Console */}
          <div id="demo" className="lg:col-span-7 flex flex-col justify-center">
            <div className="w-full rounded-xl border border-neutral-200/80 bg-white/85 shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-brand-800/10 hover:translate-y-[-2px]">
              
              {/* Browser bar */}
              <div className="flex items-center justify-between border-b border-neutral-200/55 bg-neutral-50/90 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-neutral-200" />
                  <span className="size-2 rounded-full bg-neutral-200" />
                  <span className="size-2 rounded-full bg-neutral-200" />
                  <div className="ml-4 rounded-md bg-white border border-neutral-200/60 px-3.5 py-0.5 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success" />
                    <span className="font-mono text-[9px] text-neutral-400 select-none">
                      loomis.app/console/{selectedSchool.id}
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono font-medium text-brand-700 bg-brand-700/5 border border-brand-700/10 px-2 py-0.5 rounded shadow-sm">
                  <Lock className="size-2.5" />
                  AIRGAPPED_TENANT
                </span>
              </div>

              {/* Console Body */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[400px]">
                
                {/* 1. Dashboard Sidebar Menu */}
                <div className="md:col-span-3 border-r border-neutral-200/50 bg-neutral-50/45 p-3.5 space-y-1 flex flex-row md:flex-col gap-1 md:gap-0 overflow-x-auto md:overflow-x-visible select-none">
                  <span className="hidden md:block text-[8px] font-bold text-neutral-400 uppercase tracking-widest px-2.5 mb-2">
                    WORKSPACE
                  </span>
                  
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-2.5 w-full rounded px-2.5 py-2 text-left text-xs font-semibold transition-all ${
                      activeTab === 'admin'
                        ? 'bg-brand-700 text-white shadow-md shadow-brand-700/10'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <Building2 className="size-4 shrink-0" />
                    School Admin
                  </button>

                  <button
                    onClick={() => setActiveTab('ledger')}
                    className={`flex items-center gap-2.5 w-full rounded px-2.5 py-2 text-left text-xs font-semibold transition-all ${
                      activeTab === 'ledger'
                        ? 'bg-brand-700 text-white shadow-md shadow-brand-700/10'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <ShieldCheck className="size-4 shrink-0" />
                    Ledger Audit
                  </button>

                  <button
                    onClick={() => setActiveTab('parent')}
                    className={`flex items-center gap-2.5 w-full rounded px-2.5 py-2 text-left text-xs font-semibold transition-all ${
                      activeTab === 'parent'
                        ? 'bg-brand-700 text-white shadow-md shadow-brand-700/10'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <User className="size-4 shrink-0" />
                    Parent View
                  </button>
                  
                  <div className="hidden md:block border-t border-neutral-200/50 my-3 pt-2" />
                  
                  <span className="hidden md:block text-[8px] font-bold text-neutral-400 uppercase tracking-widest px-2.5 mb-1.5">
                    LEDGER FLOWS
                  </span>
                  <div className="hidden md:flex items-center gap-2 text-[10px] text-neutral-500 px-2.5 py-1">
                    <Sliders className="size-3 text-gold-600" />
                    <span>IVP Engine Ready</span>
                  </div>
                </div>

                {/* 2. Main Tab Viewport */}
                <div className="md:col-span-9 p-6 flex flex-col justify-between bg-white/40">
                  
                  {/* --- A. SCHOOL ADMIN TAB --- */}
                  {activeTab === 'admin' && (
                    <div className="space-y-5 animate-fadeIn">
                      
                      {/* Active School Switcher */}
                      <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400">Database Scope</span>
                          <div className="relative mt-1">
                            <button
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="flex items-center gap-2 rounded border border-neutral-200 bg-white hover:bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-800 transition-all shadow-sm"
                            >
                              <GraduationCap className="size-4 text-brand-700" />
                              {selectedSchool.name}
                              <ChevronDown className="size-3 text-neutral-400" />
                            </button>

                            {isDropdownOpen && (
                              <div className="absolute left-0 mt-1.5 z-30 w-60 rounded border border-neutral-200 bg-white shadow-xl py-1 animate-fadeIn">
                                {SCHOOLS.map((school) => (
                                  <button
                                    key={school.id}
                                    onClick={() => {
                                      setSelectedSchool(school);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2.5 text-xs font-medium flex items-center gap-2.5 hover:bg-neutral-50 transition-colors ${
                                      selectedSchool.id === school.id ? 'text-brand-700 font-bold bg-brand-700/5' : 'text-neutral-700'
                                    }`}
                                  >
                                    <span className="size-5 flex items-center justify-center rounded bg-brand-700/5 text-[10px] text-brand-700 font-extrabold border border-brand-700/10">
                                      {school.logoLetter}
                                    </span>
                                    {school.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400">IVP Link</span>
                          <span className="block mt-1.5 text-[9px] font-bold text-success bg-success/5 border border-success/20 px-2.5 py-1 rounded-full shadow-sm">
                            ✓ SECURED HASH
                          </span>
                        </div>
                      </div>

                      {/* Stats cards with dynamic SVG Sparklines */}
                      <div className="grid grid-cols-3 gap-3.5">
                        
                        {/* Stat 1 */}
                        <div className="rounded-lg border border-neutral-200 bg-white p-3.5 hover:border-brand-700/10 hover:shadow-md transition-all">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Enrollment</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg font-serif font-bold text-neutral-800">{selectedSchool.students}</span>
                            <span className="text-[8px] font-semibold text-success">active</span>
                          </div>
                          {/* Sparkline Graph */}
                          <div className="mt-2 h-8 w-full">
                            <svg viewBox="0 0 100 30" className="w-full h-full stroke-2 fill-none stroke-brand-600/80">
                              <path d={selectedSchool.studentTrend} />
                              <path d={`${selectedSchool.studentTrend} L 100 30 L 0 30 Z`} className="fill-brand-700/5 stroke-none" />
                            </svg>
                          </div>
                        </div>

                        {/* Stat 2 */}
                        <div className="rounded-lg border border-neutral-200 bg-white p-3.5 hover:border-brand-700/10 hover:shadow-md transition-all">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Grading System</span>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Award className="size-3.5 text-gold-600 shrink-0" />
                            <span className="text-[9px] font-bold text-neutral-700 truncate" title={selectedSchool.grading}>
                              {selectedSchool.grading.split(' ')[0]} {selectedSchool.grading.split(' ')[1] || ''}
                            </span>
                          </div>
                          <p className="text-[8px] text-neutral-400 mt-3 font-semibold uppercase tracking-wider">
                            Term assessments
                          </p>
                        </div>

                        {/* Stat 3 */}
                        <div className="rounded-lg border border-neutral-200 bg-white p-3.5 hover:border-brand-700/10 hover:shadow-md transition-all">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Settled Liability</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-bold font-mono text-neutral-800">{selectedSchool.revenue}</span>
                          </div>
                          {/* Stair-step Sparkline for revenue accrual */}
                          <div className="mt-4 h-8 w-full">
                            <svg viewBox="0 0 100 30" className="w-full h-full stroke-1.5 fill-none stroke-gold-500">
                              <path d={selectedSchool.revenueTrend} />
                              <path d={`${selectedSchool.revenueTrend} L 100 30 L 0 30 Z`} className="fill-gold-500/5 stroke-none" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Operations Lifecycle Control Widget */}
                      <div className="rounded-lg border border-neutral-200 bg-white p-3.5 flex items-center justify-between text-xs shadow-sm hover:border-brand-700/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded bg-brand-700/5 flex items-center justify-center text-brand-700 border border-brand-700/10">
                            <CalendarDays className="size-4.5" />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-800">2026/2027 Promotion Register</p>
                            <p className="text-[9px] text-neutral-400">Class promocode transition checks validated</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-brand-700 uppercase bg-brand-700/5 px-2.5 py-1 rounded border border-brand-700/10 shadow-inner">
                          ACTIVE TERM
                        </span>
                      </div>
                    </div>
                  )}

                  {/* --- B. PLATFORM LEDGER & IVP TAB --- */}
                  {activeTab === 'ledger' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-success animate-radar" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                            Independent Verification Pipeline (IVP)
                          </span>
                        </div>
                        <button
                          onClick={triggerVerification}
                          disabled={isVerifying}
                          className="text-[9px] font-bold flex items-center gap-1.5 text-brand-700 border border-brand-700/25 hover:bg-brand-700/5 px-3 py-1 rounded-md transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`size-3 ${isVerifying ? 'animate-spin' : ''}`} />
                          Verify Ledger
                        </button>
                      </div>

                      {/* Audit verification progress */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 border border-neutral-200 rounded-lg bg-neutral-50/50 shadow-inner relative overflow-hidden min-h-[90px]">
                          {isVerifying ? (
                            <div className="text-center space-y-1">
                              <span className="inline-block text-xl font-bold font-mono text-brand-700">{auditProgress}%</span>
                              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Scanning Blocks</p>
                              <div className="w-24 h-1 bg-neutral-200 rounded-full overflow-hidden mt-1 mx-auto">
                                <div className="h-full bg-brand-700 transition-all duration-150" style={{ width: `${auditProgress}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-1 animate-fadeIn">
                              <CheckCircle2 className="size-7 text-success mx-auto" />
                              <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-wider">Audit Complete</p>
                              <span className="text-[7.5px] font-mono text-neutral-400">ID: IVP_VERIFY_SUCCESS</span>
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-7 rounded-lg border border-neutral-200 bg-white p-3.5 font-mono text-[9.5px] leading-relaxed text-neutral-600 space-y-1.5 shadow-sm">
                          <div className="flex justify-between">
                            <span>Double-Entry Matching:</span>
                            <span className="font-bold text-success">✓ 100% Matches Valid</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Isolation Audit Check:</span>
                            <span className="font-bold text-success">✓ Zero Cross-Leaks</span>
                          </div>
                          <div className="flex justify-between border-t border-neutral-100 pt-1.5 mt-1">
                            <span>Ledger Anchor Hash:</span>
                            <span className="text-brand-700 font-bold truncate max-w-[120px]">0x44A87DF38EEF923B</span>
                          </div>
                        </div>
                      </div>

                      {/* Ledger Logs Table */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                          Immutable Block Signatures
                        </span>
                        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                          {LEDGER_LOGS.map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-[10px] bg-white border border-neutral-200/80 p-2.5 rounded-md transition-all hover:border-brand-700/10 shadow-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-success shrink-0" />
                                <div>
                                  <p className="font-bold text-neutral-800">{log.action}</p>
                                  <p className="text-[8px] text-neutral-400 font-medium">
                                    Tenant: {log.school} | Block: {log.block}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-brand-700 text-[9px] font-semibold">{log.hash}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- C. PARENT PORTAL TAB WITH SVG BEZIER GRAPH --- */}
                  {activeTab === 'parent' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <User className="size-4.5 text-brand-700" />
                          <div>
                            <p className="text-xs font-bold text-neutral-800">Parent Account Profile</p>
                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">
                              Cross-Tenant linked view
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold bg-brand-700/5 border border-brand-700/15 text-brand-700 px-2 py-0.5 rounded shadow-sm">
                          1 LOGIN / 2 SYSTEM SEGMENTS
                        </span>
                      </div>

                      {/* Network Graph Visualization */}
                      <div className="relative border border-neutral-200 rounded-xl bg-neutral-50/50 p-4 min-h-[180px] flex items-center justify-between overflow-hidden shadow-inner select-none">
                        
                        {/* Animated SVG connecting curves */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#923d27" stopOpacity="0.3" />
                              <stop offset="50%" stopColor="#d4af37" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#923d27" stopOpacity="0.3" />
                            </linearGradient>
                          </defs>
                          {/* Bezier curves mapping from School Tenant nodes on sides to Parent node in center */}
                          <path d="M 60 70 C 120 70, 120 90, 195 90" fill="none" stroke="url(#glow-grad)" strokeWidth="2" className="animate-dash-line" />
                          <path d="M 330 70 C 270 70, 270 90, 195 90" fill="none" stroke="url(#glow-grad)" strokeWidth="2" className="animate-dash-line" />
                          
                          {/* Pulsing visual circles along path */}
                          <circle r="3.5" fill="#d4af37" className="animate-pulse">
                            <animateMotion dur="3s" repeatCount="indefinite" path="M 60 70 C 120 70, 120 90, 195 90" />
                          </circle>
                          <circle r="3.5" fill="#d4af37" className="animate-pulse">
                            <animateMotion dur="3s" repeatCount="indefinite" path="M 330 70 C 270 70, 270 90, 195 90" />
                          </circle>
                        </svg>

                        {/* Node 1: Left Isolated Database Tenant */}
                        <div className="rounded-lg border border-neutral-200 bg-white p-2.5 w-32 shadow-sm text-center relative z-10 hover:border-brand-700/20 hover:shadow-md transition-all">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">TENANT SECURE #1</span>
                          <p className="text-[10px] font-bold font-serif text-brand-800 mt-1 truncate">Corona Secondary</p>
                          <span className="inline-block mt-2 text-[7px] bg-brand-700/5 text-brand-700 border border-brand-700/10 px-1.5 py-0.5 rounded font-bold">
                            Amara Obi
                          </span>
                        </div>

                        {/* Node 2: Central Parent Linked Account */}
                        <div className="rounded-full border border-gold-400/55 bg-gradient-to-br from-white to-neutral-50 size-20 shadow-md flex flex-col items-center justify-center text-center relative z-10 scale-105 border-double border-4">
                          <User className="size-5 text-brand-700" />
                          <span className="text-[8px] font-bold text-neutral-800 mt-1">Parent UID</span>
                          <span className="text-[7px] text-neutral-400">PRN-8392</span>
                        </div>

                        {/* Node 3: Right Isolated Database Tenant */}
                        <div className="rounded-lg border border-neutral-200 bg-white p-2.5 w-32 shadow-sm text-center relative z-10 hover:border-brand-700/20 hover:shadow-md transition-all">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">TENANT SECURE #2</span>
                          <p className="text-[10px] font-bold font-serif text-brand-800 mt-1 truncate">Grange School</p>
                          <span className="inline-block mt-2 text-[7px] bg-brand-700/5 text-brand-700 border border-brand-700/10 px-1.5 py-0.5 rounded font-bold">
                            Tunde Obi
                          </span>
                        </div>

                      </div>

                      {/* Explanation banner */}
                      <p className="text-[9.5px] text-neutral-500 leading-relaxed text-center italic bg-brand-700/5 border border-brand-700/5 p-2 rounded-md">
                        Cross-tenant parent linking allows single log-in credentials to fetch student profiles across strictly segregated database tenants.
                      </p>
                    </div>
                  )}

                  {/* Bottom Console Status Bar */}
                  <div className="mt-4 pt-3.5 border-t border-neutral-100 flex items-center justify-between text-[9px] text-neutral-400 font-mono select-none">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex size-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2 bg-success"></span>
                      </span>
                      LOOMIS LEDGER STANDARDS APPLIED
                    </span>
                    <span className="flex items-center gap-1 text-brand-700 font-bold hover:underline cursor-pointer">
                      <Sparkles className="size-3" />
                      KYC referral program active
                    </span>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 3. Features Section */}
      <section id="features" className="border-t border-neutral-200 bg-white py-16 sm:py-24 relative z-10">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-serif text-3xl font-bold text-neutral-900 sm:text-4xl">
              Complete School Management Ecosystem
            </h2>
            <p className="text-sm sm:text-base text-neutral-500">
              Loomis unifies academics, finances, and administration with a secure ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="rounded-xl border border-neutral-200 p-6 space-y-3 hover:border-brand-700/20 hover:shadow-lg transition-all bg-stone-50/20">
              <div className="size-10 rounded bg-brand-700/5 flex items-center justify-center text-brand-700 border border-brand-700/10">
                <GraduationCap className="size-5.5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">Academic Operations</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Automated year cycles, term transitions, grade calculations, promotions, and graduation pipelines. Fully configurable grading rules for diverse curricula.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 p-6 space-y-3 hover:border-brand-700/20 hover:shadow-lg transition-all bg-stone-50/20">
              <div className="size-10 rounded bg-brand-700/5 flex items-center justify-center text-brand-700 border border-brand-700/10">
                <Coins className="size-5.5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">Financial Integrity</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Per-student liability-based revenue model charged once per enrolled student per term. Double-checked by our Independent Verification Pipeline (IVP) ledger.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 p-6 space-y-3 hover:border-brand-700/20 hover:shadow-lg transition-all bg-stone-50/20">
              <div className="size-10 rounded bg-brand-700/5 flex items-center justify-center text-brand-700 border border-brand-700/10">
                <ShieldCheck className="size-5.5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">Multi-Tenant Isolation</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Strict database isolation guarantees complete privacy for school operators. Regional Managers onboard schools with structured KYC and conflict control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="border-t border-neutral-200 bg-stone-50 py-10 text-center text-xs text-neutral-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Loomis. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-brand-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-700 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Floating live ledger notification feed */}
      <div className={`fixed bottom-6 right-6 z-50 w-full max-w-xs sm:max-w-sm rounded-xl border border-neutral-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-500 ${
        showToast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}>
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-brand-700/5 flex items-center justify-center border border-brand-700/10 text-brand-700 shrink-0">
            <Sparkles className="size-4 text-gold-600 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Live Ledger Activity</p>
            <p className="text-xs text-neutral-700 font-semibold mt-0.5 leading-snug">{TOASTS[toastIndex]}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
