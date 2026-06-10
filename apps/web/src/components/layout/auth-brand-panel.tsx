'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  ChevronDown, 
  CheckCircle2, 
  RefreshCw, 
  User, 
  Users, 
  Coins, 
  Award, 
  CalendarDays,
  Database,
  ArrowRight,
  Sparkles
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
};

const SCHOOLS: School[] = [
  {
    id: 'grange',
    name: 'Grange School (Ikeja)',
    level: 'Primary & Secondary',
    students: 1250,
    grading: 'Cambridge IGCSE Standard',
    revenue: '₦124.5M',
    ledgerStatus: 'Verified',
    logoLetter: 'G',
  },
  {
    id: 'corona',
    name: 'Corona Secondary (Agbara)',
    level: 'Senior Secondary',
    students: 850,
    grading: 'WAEC National Standard',
    revenue: '₦82.4M',
    ledgerStatus: 'Verified',
    logoLetter: 'C',
  },
  {
    id: 'saviours',
    name: 'St. Saviour\'s (Lekki)',
    level: 'Nursery & Primary',
    students: 420,
    grading: 'Early Years / British Foundation',
    revenue: '₦28.1M',
    ledgerStatus: 'Verified',
    logoLetter: 'S',
  },
];

type LedgerEntry = {
  id: string;
  action: string;
  school: string;
  block: string;
  hash: string;
  timestamp: string;
};

const LEDGER_LOGS: LedgerEntry[] = [
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

type TabId = 'admin' | 'ledger' | 'parent';

/** Left brand panel for the split-view auth shell with interactive dashboard preview. */
export function AuthBrandPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('admin');
  const [selectedSchool, setSelectedSchool] = useState<School>(SCHOOLS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const triggerVerification = () => {
    setIsVerifying(true);
    setTimeout(() => setIsVerifying(false), 1500);
  };

  return (
    <section className="relative flex flex-col justify-between bg-gradient-to-br from-brand-800 via-neutral-900 to-forest-950 px-8 py-12 text-white lg:w-[55%] lg:px-16 lg:py-16 overflow-hidden">
      {/* Decorative Floating Blobs from globals.css */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-brand-600/10 blur-3xl animate-blob-1 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-gold-600/10 blur-3xl animate-blob-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-success/5 blur-3xl animate-blob-3 pointer-events-none" />

      {/* Top Brand Info */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm border border-gold-400/30 bg-gold-400/10">
            <span className="font-serif text-xl font-bold text-gold-300">L</span>
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight">Loomis</span>
          <span className="ml-2 rounded-full border border-gold-400/20 bg-gold-400/5 px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase text-gold-300">
            Enterprise Console
          </span>
        </div>

        <h1 className="mt-8 font-serif text-3xl font-medium leading-tight tracking-tight lg:text-4xl xl:text-5xl">
          The prestige platform for premier West African schools.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-100/80">
          A unified, secure infrastructure for academic operations, multi-tenant financial ledgers, 
          and cross-school parent accounts. Built to preserve prestige and audit integrity.
        </p>

        {/* Tab Controls */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              activeTab === 'admin'
                ? 'bg-gold-500/20 text-gold-200 border border-gold-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building2 className="size-3.5" />
            School Admin Portal
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              activeTab === 'ledger'
                ? 'bg-gold-500/20 text-gold-200 border border-gold-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <ShieldCheck className="size-3.5" />
            Platform Ledger & IVP
          </button>
          <button
            onClick={() => setActiveTab('parent')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              activeTab === 'parent'
                ? 'bg-gold-500/20 text-gold-200 border border-gold-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <User className="size-3.5" />
            Unified Parent View
          </button>
        </div>
      </div>

      {/* Interactive Glassmorphic Console Preview */}
      <div className="relative z-10 mt-8 flex flex-1 flex-col justify-center">
        <div className="glass-beveled-3d w-full rounded-lg overflow-hidden border border-white/10 bg-forest-950/45 shadow-2xl transition-all duration-500 hover:border-gold-500/30">
          
          {/* Console Header Bar */}
          <div className="flex items-center justify-between bg-black/35 px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-danger/70" />
              <span className="size-2.5 rounded-full bg-warning/70" />
              <span className="size-2.5 rounded-full bg-success/70" />
              <span className="ml-2 font-mono text-[10px] text-neutral-400 tracking-wider">
                LOOMIS_SHELL v1.4.2
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gold-300 bg-gold-400/10 px-2 py-0.5 rounded border border-gold-400/20">
                <Database className="size-2.5" />
                SECURE TENANT
              </span>
            </div>
          </div>

          {/* Console Content Window */}
          <div className="p-5 min-h-[260px] flex flex-col justify-between">
            
            {/* 1. School Admin Tab */}
            {activeTab === 'admin' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400">Current Node</span>
                    {/* Interactive School Dropdown Switcher */}
                    <div className="relative mt-1">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 rounded border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-sm font-medium text-gold-200 transition-colors"
                      >
                        <GraduationCap className="size-4 text-gold-300" />
                        {selectedSchool.name}
                        <ChevronDown className="size-3 text-neutral-400" />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute left-0 mt-1 z-30 w-64 rounded border border-white/15 bg-neutral-900 shadow-xl overflow-hidden py-1">
                          {SCHOOLS.map((school) => (
                            <button
                              key={school.id}
                              onClick={() => {
                                setSelectedSchool(school);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2 hover:bg-brand-700/30 transition-colors ${
                                selectedSchool.id === school.id ? 'text-gold-300 bg-white/5' : 'text-neutral-300'
                              }`}
                            >
                              <span className="size-5 flex items-center justify-center rounded bg-gold-400/10 text-[10px] text-gold-300 font-bold">
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
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400">Regional Tier</span>
                    <p className="text-xs font-serif text-gold-300 mt-1 font-semibold">Zone Lagos West</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                    <span className="text-[10px] text-neutral-400 block uppercase tracking-wide">Enrolled Register</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <Users className="size-3.5 text-gold-300" />
                      <span className="text-lg font-semibold font-serif">{selectedSchool.students}</span>
                      <span className="text-[9px] text-success font-medium">Students</span>
                    </div>
                  </div>

                  <div className="rounded border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-colors col-span-1">
                    <span className="text-[10px] text-neutral-400 block uppercase tracking-wide">Assessment Grading</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Award className="size-3.5 text-gold-300 shrink-0" />
                      <span className="text-xs font-semibold truncate" title={selectedSchool.grading}>
                        {selectedSchool.grading.split(' ')[0]} {selectedSchool.grading.split(' ')[1] || ''}
                      </span>
                    </div>
                  </div>

                  <div className="rounded border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-colors col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-neutral-400 block uppercase tracking-wide">Term Liability Revenue</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <Coins className="size-3.5 text-gold-300" />
                      <span className="text-sm font-semibold font-mono text-gold-200">{selectedSchool.revenue}</span>
                    </div>
                  </div>
                </div>

                {/* Operations Lifecycle Footer */}
                <div className="rounded border border-success/10 bg-success/5 px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-success-foreground">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-success"></span>
                    </span>
                    <span className="font-medium">Active Session: 2026/2027 Academic Year</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    Promotion Phase
                  </span>
                </div>
              </div>
            )}

            {/* 2. Ledger & IVP Tab */}
            {activeTab === 'ledger' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2 rounded-full bg-success" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      Independent Verification Pipeline (IVP)
                    </span>
                  </div>
                  <button
                    onClick={triggerVerification}
                    disabled={isVerifying}
                    className="text-[10px] flex items-center gap-1 text-gold-300 border border-gold-300/30 hover:bg-gold-400/10 px-2 py-0.5 rounded transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`size-2.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    Verify Integrity
                  </button>
                </div>

                {/* Ledger Integrity Panel */}
                <div className="rounded border border-white/10 bg-black/45 p-3 font-mono text-[11px] leading-relaxed text-neutral-300 space-y-1.5 shadow-inner">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-neutral-500">Pipeline Status:</span>
                    <span className={isVerifying ? 'text-warning' : 'text-success'}>
                      {isVerifying ? '🔍 Running audits...' : '✓ 100% Ledger Hash Match'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Platform Ledger Hash:</span>
                    <span className="text-gold-200">0x44A...F8E3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Verified Contracts:</span>
                    <span className="text-neutral-400">MultiTenantIsolationV1, RevenueLedgerV2</span>
                  </div>
                </div>

                {/* Ledger Logs Table */}
                <div className="space-y-1.5 mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium block">
                    Immutable Platform Logs
                  </span>
                  <div className="space-y-1">
                    {LEDGER_LOGS.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-[11px] bg-white/5 hover:bg-white/10 p-2 rounded transition-colors border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-3 text-success shrink-0" />
                          <div>
                            <p className="font-medium text-neutral-200">{log.action}</p>
                            <p className="text-[9px] text-neutral-400 font-mono">
                              Tenant: {log.school} | Block: {log.block}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-gold-300 text-[10px]">{log.hash}</p>
                          <p className="text-[9px] text-neutral-500">{log.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Parent Portal Tab */}
            {activeTab === 'parent' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-gold-300" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">Khaleefah (Parent ID: PRN-8392)</p>
                      <p className="text-[9px] text-neutral-400 uppercase tracking-wider">
                        Cross-Tenant Linked Identity
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-success/15 border border-success/20 text-success px-2 py-0.5 rounded font-mono">
                    1 account / 2 isolated school databases
                  </span>
                </div>

                {/* Linked Children Mock Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-3 hover:border-gold-500/25 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold font-serif text-neutral-200">Amara Obi</span>
                      <span className="text-[9px] bg-gold-400/10 text-gold-300 px-1.5 py-0.5 rounded">
                        Secondary
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">Corona Secondary (Agbara)</p>
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px]">
                      <span className="text-neutral-500">Term 3 Assessment</span>
                      <span className="font-mono text-success">Grade A+ verified</span>
                    </div>
                  </div>

                  <div className="rounded border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-3 hover:border-gold-500/25 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold font-serif text-neutral-200">Tunde Obi</span>
                      <span className="text-[9px] bg-gold-400/10 text-gold-300 px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">Grange School (Ikeja)</p>
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px]">
                      <span className="text-neutral-500">Term 3 Assessment</span>
                      <span className="font-mono text-success">Grade Outstanding</span>
                    </div>
                  </div>
                </div>

                {/* Identity Linker Diagram Mock */}
                <div className="rounded bg-black/35 border border-white/5 p-2 flex items-center justify-center gap-3 text-[10px] text-neutral-400 font-mono">
                  <span>Parent identity link</span>
                  <ArrowRight className="size-3 text-gold-300" />
                  <span className="text-gold-200">Grange (Tenant #1)</span>
                  <span className="size-1 rounded-full bg-neutral-600" />
                  <span className="text-gold-200">Corona (Tenant #2)</span>
                </div>
              </div>
            )}

            {/* Bottom Status Panel */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-success"></span>
                </span>
                IMMUTABLE PLATFORM INTEGRITY ACTIVED
              </span>
              <span className="flex items-center gap-1 text-gold-300 hover:underline cursor-pointer">
                <Sparkles className="size-3" />
                Regional Manager KYC Linked
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

