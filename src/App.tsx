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
import { Check } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('cities-catalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [isMandatoryPasswordChange, setIsMandatoryPasswordChange] = useState<boolean>(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao alterar a senha.");
    }
    if (data.user) {
      setCurrentUser(data.user);
    }
    setIsChangePasswordModalOpen(false);
    setIsMandatoryPasswordChange(false);
    showToast("Senha cadastrada com sucesso!");
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

  // 3. Cities & Links Actions
  const handleCreateCity = async (cityData: Partial<City>) => {
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityData)
      });
      if (res.ok) {
        showToast("Nova cidade cadastrada com sucesso!");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cadastrar cidade.");
      }
    } catch (err) {
      console.error(err);
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
        showToast("Dados da cidade atualizados!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCity = async (id: string) => {
    try {
      const res = await fetch(`/api/cities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Cidade excluída.");
        fetchData();
      }
    } catch (err) {
      console.error(err);
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
        showToast("Novo sistema vinculado à cidade!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
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
        showToast("Link do sistema atualizado!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/cities/links/${linkId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Link removido.");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Response Copy Action
  const handleCopyResponse = async (id: string, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast("Copiado com 1 clique para a área de transferência!");

      // Update usage count in API
      await fetch(`/api/canned-responses/${id}/copy`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error(err);
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
        showToast("Novo modelo de resposta criado!");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar modelo.");
      }
    } catch (err) {
      console.error(err);
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
        showToast("Modelo atualizado com sucesso!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Response
  const handleDeleteResponse = async (id: string) => {
    try {
      await fetch(`/api/canned-responses/${id}`, { method: 'DELETE' });
      showToast("Modelo excluído.");
      fetchData();
    } catch (err) {
      console.error(err);
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
        showToast("Novo artigo publicado na Wiki!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateArticle = async (id: string, updated: Partial<KnowledgeArticle>) => {
    try {
      await fetch(`/api/kb/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      showToast("Artigo atualizado.");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await fetch(`/api/kb/articles/${id}`, { method: 'DELETE' });
      showToast("Artigo removido da wiki.");
      fetchData();
    } catch (err) {
      console.error(err);
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
    } catch (err) {
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
        showToast("Nova categoria cadastrada!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCategory = async (id: string, updated: Partial<Category>) => {
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      showToast("Categoria atualizada.");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      showToast("Categoria removida.");
      fetchData();
    } catch (err) {
      console.error(err);
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
        showToast("Operador cadastrado no sistema!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUser = async (id: string, updated: Partial<User>) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      showToast("Dados do operador atualizados.");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      await fetch(`/api/users/${id}/toggle-status`, { method: 'PATCH' });
      showToast("Status de acesso alterado.");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este operador do sistema?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Operador excluído com sucesso.");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao excluir operador.");
      }
    } catch (err) {
      console.error(err);
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
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-blue-400/40 animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

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

      {/* Footer with Developer Credits */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        <p className="text-slate-400 font-medium tracking-wide">Desenvolvido por João Marcos</p>
      </footer>

    </div>
  );
}

export default App;

