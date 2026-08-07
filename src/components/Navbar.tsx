import React, { useState, useEffect } from 'react';
import { MainTab, UserRole, User, SystemStats } from '../types';
import { 
  Building2,
  MessageSquare, 
  BookOpen, 
  FileText, 
  Folder, 
  Users, 
  ShieldCheck, 
  Zap,
  Search,
  LogOut,
  History,
  User as UserIcon,
  KeyRound,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Download
} from 'lucide-react';

const CURRENT_VERSION = 'v1.0.2';

interface NavbarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenChangePasswordModal: () => void;
  stats: SystemStats;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onOpenChangePasswordModal,
  stats,
  searchQuery,
  setSearchQuery
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hasNewRelease, setHasNewRelease] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('v1.0.2');
  const [releaseUrl, setReleaseUrl] = useState<string>('https://github.com/joaomarcosls/SupportHub/releases');
  const [isUpdateBannerOpen, setIsUpdateBannerOpen] = useState(false);

  const isTrainee = currentUser.role === 'TRAINEE';
  const isAdmin = currentUser.role === 'ADMIN';

  // Checar em tempo real se há uma nova versão lançada no GitHub Open-Source
  useEffect(() => {
    const checkGitHubRelease = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/joaomarcosls/SupportHub/releases/latest');
        if (res.ok) {
          const data = await res.json();
          if (data.tag_name && data.tag_name !== CURRENT_VERSION) {
            setHasNewRelease(true);
            setLatestVersion(data.tag_name);
            if (data.html_url) setReleaseUrl(data.html_url);
          }
        }
      } catch (e) {
        // Silencioso se estiver offline ou sem internet
      }
    };
    checkGitHubRelease();
  }, []);

  return (
    <>
      {/* Banner de Notificação de Nova Versão do GitHub */}
      {hasNewRelease && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-950 fill-current animate-bounce" />
              <span>Nova versão <strong>{latestVersion}</strong> do SupportHub disponível no GitHub!</span>
            </span>
            <a
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-900 text-white px-2.5 py-0.5 rounded text-[11px] font-bold shadow transition-all border border-amber-400/40"
            >
              <span>Ver Release & Baixar</span>
              <Download className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-lg">
      {/* Main Header Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('cities-catalog')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-xl tracking-tight border border-blue-400/30">
              <Zap className="w-6 h-6 fill-current text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-100">SupportHub</span>
                <a
                  href="https://github.com/joaomarcosls/SupportHub/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border transition-all flex items-center gap-1 group/version ${
                    hasNewRelease
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30 hover:text-white'
                  }`}
                  title={hasNewRelease ? `Nova versão ${latestVersion} disponível no GitHub!` : 'Versão v1.0.2 - Ver releases no GitHub'}
                >
                  <span>v1.0.2</span>
                  {hasNewRelease ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  ) : (
                    <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/version:opacity-100" />
                  )}
                </a>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Utilitário de Produtividade para Suporte Técnico</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-md mx-2 relative hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Busca rápida em cidades, links e templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Active User Card & Interactive Dropdown Menu */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-2.5 bg-slate-950 hover:bg-slate-900 px-3 py-1.5 rounded-lg border transition-all text-left group ${
                  isUserMenuOpen ? 'border-purple-500/70 ring-1 ring-purple-500/30 bg-slate-900' : 'border-slate-800 hover:border-slate-700'
                }`}
                title="Clique para abrir opções do usuário"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 group-hover:border-purple-500/50">
                  <UserIcon className="w-4 h-4 text-slate-300" />
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-purple-400' : 'group-hover:text-slate-200'}`} />
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {currentUser.department || (currentUser.role === 'ADMIN' ? 'Coordenador' : 'Suporte')}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 lg:hidden transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-purple-400' : ''}`} />
              </button>

              {/* User Menu Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2.5 border-b border-slate-800/80 mb-1">
                      <div className="text-xs font-bold text-slate-100">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser.email}</div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3 text-purple-400" />
                        <span>
                          {currentUser.role === 'ADMIN' ? 'Administrador (Acesso Total)' : currentUser.role === 'AGENT' ? 'Agente de Suporte' : 'Trainee (Leitura)'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenChangePasswordModal();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors font-medium group"
                    >
                      <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200 group-hover:text-white">Alterar Senha</span>
                        <span className="text-[10px] text-slate-400">Cadastrar nova senha pessoal</span>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-800/80" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-950/40 flex items-center gap-2.5 transition-colors font-medium group"
                    >
                      <div className="w-6 h-6 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:bg-red-500/20">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-red-400">Sair do Sistema</span>
                        <span className="text-[10px] text-slate-400">Encerrar sessão ativa</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>


          </div>

        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 pb-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => setActiveTab('cities-catalog')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'cities-catalog'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            Cidades & Links
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('canned-responses')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'canned-responses'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Respostas Rápidas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('knowledge-base')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'knowledge-base'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Base de Conhecimento
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scratchpad')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'scratchpad'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Bloco de Rascunho
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4" />
            Categorias
          </button>

          {/* Admin Only Tab: User Management */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                  : 'text-purple-300 hover:bg-purple-900/30 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Usuários & RBAC
            </button>
          )}

          {/* Admin / Supervisor Only Tab: Audit Trail */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('audit-trail')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'audit-trail'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                  : 'text-purple-300 hover:bg-purple-900/30 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico de Alterações
            </button>
          )}
        </nav>

      </div>
    </header>
  </>
  );
};
