import React, { useState, useEffect } from 'react';
import { 
  MainTab, 
  User, 
  UserRole, 
  City,
  CitySystemLink,
  Category, 
  CannedResponse, 
  KnowledgeArticle, 
  SystemStats,
  AuditLog
} from './types';
import { Navbar } from './components/Navbar';
import { CitiesCatalogModule } from './components/CitiesCatalogModule';
import { CannedResponsesModule } from './components/CannedResponsesModule';
import { KnowledgeBaseModule } from './components/KnowledgeBaseModule';
import { ScratchpadModule } from './components/ScratchpadModule';
import { CategoryManagementModule } from './components/CategoryManagementModule';
import { UserManagementModule } from './components/UserManagementModule';
import { AuditTrailModule } from './components/AuditTrailModule';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Check, AlertCircle, ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('cities-catalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [isMandatoryPasswordChange, setIsMandatoryPasswordChange] = useState<boolean>(false);

  // Toast notification state
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // Global State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [scratchpadContent, setScratchpadContent] = useState<string>('');
  const [scratchpadLastSaved, setScratchpadLastSaved] = useState<string>('');
  const [stats, setStats] = useState<SystemStats>({
    totalCities: 0,
    totalSystemLinks: 0,
    totalResponses: 0,
    totalArticles: 0,
    totalCategories: 0,
    totalUsers: 0,
    totalCopies: 0
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 4500);
  };

  // 1. Initial Load of API Data
  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('supporthub_token');
      let loggedUser: User | null = null;

      if (token) {
        const userRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (userData.user) {
          loggedUser = userData.user;
          setCurrentUser(userData.user);
          if (userData.user.mustChangePassword) {
            setIsMandatoryPasswordChange(true);
            setIsChangePasswordModalOpen(true);
          }
        } else {
          sessionStorage.removeItem('supporthub_token');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      // Cities & Links
      const cityRes = await fetch('/api/cities');
      const cityData = await cityRes.json();
      if (Array.isArray(cityData)) setCities(cityData);

      // Categories
      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (Array.isArray(catData)) setCategories(catData);

      // Responses
      const respRes = await fetch('/api/canned-responses');
      const respData = await respRes.json();
      if (Array.isArray(respData)) setResponses(respData);

      // Articles
      const artRes = await fetch('/api/kb/articles');
      const artData = await artRes.json();
      if (Array.isArray(artData)) setArticles(artData);

      // Scratchpad
      const padRes = await fetch('/api/scratchpad');
      const padData = await padRes.json();
      if (padData.content !== undefined) {
        setScratchpadContent(padData.content);
        setScratchpadLastSaved(padData.lastSavedAt);
      }

      // Stats
      const statsRes = await fetch('/api/stats');
      const statsData = await statsRes.json();
      if (statsData.totalResponses !== undefined) setStats(statsData);

      // Users List & Audit Logs (if Admin)
      if (loggedUser?.role === 'ADMIN') {
        const uRes = await fetch('/api/users');
        const uData = await uRes.json();
        if (Array.isArray(uData)) setUsersList(uData);

        const auditRes = await fetch('/api/audit-logs');
        const auditData = await auditRes.json();
        if (Array.isArray(auditData)) setAuditLogs(auditData);
      }
    } catch (err) {
      console.error("Error fetching SupportHub data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auth: Login & Logout & Password Change
  const handleLogin = async (email: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Falha na autenticação.");
    }
    if (data.user && data.token) {
      sessionStorage.setItem('supporthub_token', data.token);
      setCurrentUser(data.user);
      setIsLoggedOut(false);
      showToast(`Sessão iniciada como ${data.user.name}!`);

      if (data.mustChangePassword || data.user.mustChangePassword) {
        setIsMandatoryPasswordChange(true);
        setIsChangePasswordModalOpen(true);
      }

      fetchData();
    }
  };

  const handleChangePassword = async (newPassword: string, currentPassword?: string) => {
    const token = sessionStorage.getItem('supporthub_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPassword, newPassword })
    });

    let data: any = {};
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const rawText = await res.text();
      console.error("Resposta não-JSON do servidor ao alterar senha:", rawText);
      throw new Error(`Erro no servidor (${res.status}): Não foi possível processar a alteração.`);
    }

    if (!res.ok) {
      throw new Error(data.error || "Erro ao alterar a senha.");
    }
    if (data.user) {
      setCurrentUser(data.user);
    }
    setIsChangePasswordModalOpen(false);
    setIsMandatoryPasswordChange(false);
    showToast("Senha alterada com sucesso!");
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      sessionStorage.removeItem('supporthub_token');
      setCurrentUser(null);
      setIsLoggedOut(true);
      setIsChangePasswordModalOpen(false);
      showToast("Sessão encerrada com sucesso.");
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Switch Role (Simulação RBAC em Tempo Real)
  const handleSwitchRole = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        showToast(`Permissão alterada para: ${role}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Switch User ID
  const handleSwitchUserId = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        showToast(`Sessão alterada para ${data.user.name}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. City Actions
  const handleCreateCity = async (cityData: Partial<City>) => {
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityData)
      });
      if (res.ok) {
        showToast("Nova cidade cadastrada no catálogo!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao cadastrar cidade.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao cadastrar cidade.", 'error');
    }
  };

  const handleUpdateCity = async (id: string, updated: Partial<City>) => {
    try {
      const res = await fetch(`/api/cities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Dados da cidade atualizados com sucesso!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao atualizar cidade.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao atualizar cidade.", 'error');
    }
  };

  const handleDeleteCity = async (id: string) => {
    try {
      const res = await fetch(`/api/cities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Cidade excluída.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao excluir cidade.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao excluir cidade.", 'error');
    }
  };

  const handleCreateLink = async (cityId: string, linkData: Partial<CitySystemLink>) => {
    try {
      const res = await fetch(`/api/cities/${cityId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkData)
      });
      if (res.ok) {
        showToast("Novo sistema vinculado à cidade!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao vincular sistema.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao vincular sistema.", 'error');
    }
  };

  const handleUpdateLink = async (linkId: string, updated: Partial<CitySystemLink>) => {
    try {
      const res = await fetch(`/api/cities/links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Link do sistema atualizado!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao atualizar link.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao atualizar link.", 'error');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/cities/links/${linkId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Link removido.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao remover link.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao remover link.", 'error');
    }
  };

  // 4. Response Copy Action
  const handleCopyResponse = async (id: string, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast("Copiado com 1 clique para a área de transferência!", 'success');

      // Update usage count in API
      await fetch(`/api/canned-responses/${id}/copy`, { method: 'POST' });
      fetchData();
    } catch (err: any) {
      showToast("Erro ao copiar para a área de transferência.", 'error');
    }
  };

  // Create Response
  const handleCreateResponse = async (newResp: Partial<CannedResponse>) => {
    try {
      const res = await fetch('/api/canned-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResp)
      });
      if (res.ok) {
        showToast("Novo modelo de resposta criado!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao criar modelo.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao criar modelo.", 'error');
    }
  };

  // Update Response
  const handleUpdateResponse = async (id: string, updated: Partial<CannedResponse>) => {
    try {
      const res = await fetch(`/api/canned-responses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Modelo atualizado com sucesso!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao atualizar modelo.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao atualizar modelo.", 'error');
    }
  };

  // Delete Response
  const handleDeleteResponse = async (id: string) => {
    try {
      const res = await fetch(`/api/canned-responses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Modelo excluído.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao excluir modelo.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao excluir modelo.", 'error');
    }
  };

  // 5. Knowledge Base Actions
  const handleCreateArticle = async (newArt: Partial<KnowledgeArticle>) => {
    try {
      const res = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArt)
      });
      if (res.ok) {
        showToast("Novo artigo publicado na Wiki!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao publicar artigo.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao publicar artigo.", 'error');
    }
  };

  const handleUpdateArticle = async (id: string, updated: Partial<KnowledgeArticle>) => {
    try {
      const res = await fetch(`/api/kb/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Artigo atualizado.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao atualizar artigo.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao atualizar artigo.", 'error');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      const res = await fetch(`/api/kb/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Artigo removido da wiki.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao remover artigo.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao remover artigo.", 'error');
    }
  };

  // 6. Scratchpad Save
  const handleSaveScratchpad = async (content: string) => {
    try {
      const res = await fetch('/api/scratchpad', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.lastSavedAt) {
        setScratchpadLastSaved(data.lastSavedAt);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // 7. Category Actions
  const handleCreateCategory = async (cat: Partial<Category>) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      if (res.ok) {
        showToast("Nova categoria cadastrada!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao cadastrar categoria.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao cadastrar categoria.", 'error');
    }
  };

  const handleUpdateCategory = async (id: string, updated: Partial<Category>) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Categoria atualizada.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao atualizar categoria.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao atualizar categoria.", 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Categoria removida com sucesso.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao remover categoria.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao remover categoria.", 'error');
    }
  };

  // 8. User & RBAC Actions
  const handleCreateUser = async (usr: Partial<User>) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usr)
      });
      if (res.ok) {
        showToast("Operador cadastrado no sistema!", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao cadastrar operador.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao cadastrar operador.", 'error');
    }
  };

  const handleUpdateUser = async (id: string, updated: Partial<User>) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Dados do operador atualizados.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao atualizar operador.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao atualizar operador.", 'error');
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/toggle-status`, { method: 'PATCH' });
      if (res.ok) {
        showToast("Status de acesso alterado.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao alterar status do operador.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao alterar status.", 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este operador do sistema?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Operador excluído com sucesso.", 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erro ao excluir operador.", 'error');
      }
    } catch (err: any) {
      showToast("Erro de conexão ao excluir operador.", 'error');
    }
  };

  if (isLoggedOut || !currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col antialiased">
      
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenChangePasswordModal={() => {
          setIsMandatoryPasswordChange(false);
          setIsChangePasswordModalOpen(true);
        }}
        stats={stats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        isMandatory={isMandatoryPasswordChange}
        onClose={() => {
          if (!isMandatoryPasswordChange) {
            setIsChangePasswordModalOpen(false);
          }
        }}
        onChangePassword={handleChangePassword}
      />

      {/* Main Workspace View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'cities-catalog' && (
          <CitiesCatalogModule
            cities={cities}
            categories={categories}
            usersList={usersList}
            currentUser={currentUser}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCreateCity={handleCreateCity}
            onUpdateCity={handleUpdateCity}
            onDeleteCity={handleDeleteCity}
            onCreateLink={handleCreateLink}
            onUpdateLink={handleUpdateLink}
            onDeleteLink={handleDeleteLink}
            onCopyText={(text) => showToast("Link copiado para a área de transferência!")}
          />
        )}

        {activeTab === 'canned-responses' && (
          <CannedResponsesModule
            responses={responses}
            categories={categories}
            currentUser={currentUser}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCopyResponse={handleCopyResponse}
            onCreateResponse={handleCreateResponse}
            onUpdateResponse={handleUpdateResponse}
            onDeleteResponse={handleDeleteResponse}
          />
        )}

        {activeTab === 'knowledge-base' && (
          <KnowledgeBaseModule
            articles={articles}
            categories={categories}
            currentUser={currentUser}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCreateArticle={handleCreateArticle}
            onUpdateArticle={handleUpdateArticle}
            onDeleteArticle={handleDeleteArticle}
          />
        )}

        {activeTab === 'scratchpad' && (
          <ScratchpadModule
            currentUser={currentUser}
            scratchpadContent={scratchpadContent}
            lastSavedAt={scratchpadLastSaved}
            onSaveScratchpad={handleSaveScratchpad}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManagementModule
            categories={categories}
            currentUser={currentUser}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'users' && (
          <UserManagementModule
            users={usersList}
            currentUser={currentUser}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onToggleUserStatus={handleToggleUserStatus}
            onDeleteUser={handleDeleteUser}
            onSwitchUserInDev={handleSwitchUserId}
          />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailModule
            auditLogs={auditLogs}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Toast Notification Banner System-Wide */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-bottom-5 duration-300 max-w-md bg-slate-900 border-slate-700">
          {toastNotification.type === 'success' && (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-1.5 rounded-lg shrink-0">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
          )}
          {toastNotification.type === 'error' && (
            <div className="bg-rose-500/20 text-rose-300 border border-rose-500/40 p-1.5 rounded-lg shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
          )}
          {toastNotification.type === 'warning' && (
            <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 p-1.5 rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-100">{toastNotification.message}</span>
        </div>
      )}

      {/* Footer with Developer Credits */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        <p className="text-slate-400 font-medium tracking-wide">Desenvolvido por João Marcos</p>
      </footer>

    </div>
  );
}

export default App;

