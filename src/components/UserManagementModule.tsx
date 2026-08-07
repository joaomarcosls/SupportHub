import React, { useState } from 'react';
import { User as UserType, UserRole } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  UserX, 
  UserCheck, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Shield,
  Trash2,
  UserIcon,
  Lock,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { validatePassword } from '../utils/passwordPolicy';

interface UserManagementModuleProps {
  users: UserType[];
  currentUser: UserType;
  onCreateUser: (usr: Partial<UserType>) => void;
  onUpdateUser: (id: string, updated: Partial<UserType>) => void;
  onToggleUserStatus: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onSwitchUserInDev: (userId: string) => void;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onToggleUserStatus,
  onDeleteUser,
  onSwitchUserInDev,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('AGENT');
  const [formDepartment, setFormDepartment] = useState('Suporte N1');
  const [formPassword, setFormPassword] = useState('');
  const [formMustChangePassword, setFormMustChangePassword] = useState(true);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  const passwordValidation = validatePassword(formPassword);

  const handleOpenModal = (usr?: UserType) => {
    setFormError(null);
    if (usr) {
      setEditingUser(usr);
      setFormName(usr.name);
      setFormEmail(usr.email);
      setFormRole(usr.role);
      setFormDepartment(usr.department || 'Suporte N1');
      setFormPassword('');
      setFormMustChangePassword(usr.mustChangePassword ?? false);
    } else {
      setEditingUser(null);
      setFormName('');
      setFormEmail('');
      setFormRole('AGENT');
      setFormDepartment('Suporte N1');
      setFormPassword('Suporte@123'); // Sugestão padrão que atende à política
      setFormMustChangePassword(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName || !formEmail || !formRole) {
      setFormError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!editingUser && !formPassword) {
      setFormError("É necessário definir uma senha inicial para o novo operador.");
      return;
    }

    if (formPassword) {
      if (!passwordValidation.isValid) {
        setFormError(passwordValidation.errors[0] || "A senha não atende aos critérios de segurança.");
        return;
      }
    }

    if (editingUser) {
      onUpdateUser(editingUser.id, {
        name: formName,
        email: formEmail,
        role: formRole,
        department: formDepartment,
        ...(formPassword ? { newPassword: formPassword, password: formPassword } : {}),
        mustChangePassword: formMustChangePassword
      } as any);
    } else {
      onCreateUser({
        name: formName,
        email: formEmail,
        role: formRole,
        department: formDepartment,
        password: formPassword,
        mustChangePassword: formMustChangePassword
      } as any);
    }
    setIsModalOpen(false);
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-100">Acesso Restrito a Administradores</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
          Seu nível de acesso atual ({currentUser.role}) não possui permissão para gerenciar operadores e acessos RBAC.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Gestão de Usuários e Controle de Acesso (RBAC)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre operadores, defina perfis de permissão e ative/desative contas de acesso ao SupportHub.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all border border-purple-400/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Operador
        </button>
      </div>

      {/* Permission Matrix Summary */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-purple-400" />
          Matriz de Níveis de Acesso (RBAC)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/20 space-y-1">
            <div className="font-bold text-purple-400 flex items-center justify-between">
              <span>Administrador (Admin)</span>
              <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded">Acesso Total</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gerencia usuários, cria/edita/exclui categorias, respostas rápidas, wiki e acessa logs de sistema.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-500/20 space-y-1">
            <div className="font-bold text-blue-400 flex items-center justify-between">
              <span>Agente / Suporte</span>
              <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded">Operacional</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cria e edita respostas rápidas, publica artigos na wiki e usa o bloco de rascunho. Sem gestão de usuários.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/20 space-y-1">
            <div className="font-bold text-amber-400 flex items-center justify-between">
              <span>Leitura (Trainee)</span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded">Apenas Consulta</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Consulta artigos e respostas, utiliza o botão de cópia e bloco de rascunho. Botões de criação ficam ocultos.
            </p>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200">Operadores Cadastrados ({users.length})</h3>
          <span className="text-[10px] text-slate-500">Gestão e controle de permissões dos operadores</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                <th className="p-3.5">Operador</th>
                <th className="p-3.5">Setor / Função</th>
                <th className="p-3.5">Nível de Permissão (Role)</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((usr) => {
                const isCurrentActive = currentUser.id === usr.id;

                return (
                  <tr key={usr.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <UserIcon className="w-4 h-4 text-slate-300" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            {usr.name}
                            {isCurrentActive && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{usr.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-300 font-medium">
                      {usr.department || 'Suporte'}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] ${
                          usr.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                            : usr.role === 'AGENT'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {usr.role === 'ADMIN' ? 'Administrador' : usr.role === 'AGENT' ? 'Analista de suporte' : 'Usuário consulta'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            usr.active ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {usr.active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                              Inativo
                            </>
                          )}
                        </span>
                        {usr.mustChangePassword && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded w-fit">
                            <KeyRound className="w-3 h-3" />
                            Troca de Senha Pendente
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(usr)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                          title="Editar operador"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleUserStatus(usr.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            usr.active
                              ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                              : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                          }`}
                          title={usr.active ? 'Desativar operador' : 'Ativar operador'}
                        >
                          {usr.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteUser(usr.id)}
                          disabled={isCurrentActive}
                          className={`p-1.5 rounded-lg transition-all ${
                            isCurrentActive
                              ? 'text-slate-700 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                          }`}
                          title={isCurrentActive ? 'Não é possível excluir a própria conta logada' : 'Excluir operador'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">
                {editingUser ? 'Editar Usuário Operador' : 'Cadastrar Novo Operador'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Roberto Alves"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="roberto@empresa.com.br"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Setor / Departamento</label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="Ex: Suporte N1, N2, Plantão TI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Nível de Permissão (RBAC) *</label>
                <select
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="ADMIN">Administrador (Total)</option>
                  <option value="AGENT">Analista de suporte (Operacional + Edição)</option>
                  <option value="TRAINEE">Leitura (Usuário consulta - Apenas Consulta)</option>
                </select>
              </div>

              {/* Password Management */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{editingUser ? 'Redefinir Senha do Operador (Opcional)' : 'Senha Provisória do Operador *'}</span>
                    <span className="text-[10px] text-purple-400 font-normal">Acesso Inicial</span>
                  </label>

                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showFormPassword ? "text" : "password"}
                      required={!editingUser}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUser ? "Deixe em branco para manter a senha atual" : "Defina a senha do primeiro acesso"}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Policy Indicator */}
                {formPassword.length > 0 && (
                  <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1 text-[11px]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Regras Globais de Segurança:
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordValidation.hasMinLength ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                      {passwordValidation.hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                      <span>No mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordValidation.hasSpecialChar ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                      {passwordValidation.hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                      <span>Pelo menos 1 caractere especial (!@#$%^&*...)</span>
                    </div>
                  </div>
                )}

                {/* Must Change Password Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="mustChangePasswordCheck"
                    checked={formMustChangePassword}
                    onChange={(e) => setFormMustChangePassword(e.target.checked)}
                    className="mt-0.5 rounded border-slate-800 bg-slate-950 text-purple-600 focus:ring-purple-500/20"
                  />
                  <label htmlFor="mustChangePasswordCheck" className="text-xs text-slate-300 cursor-pointer select-none">
                    <span className="font-semibold block text-slate-200">Exigir alteração de senha no primeiro login</span>
                    <span className="text-[11px] text-slate-400 block">
                      O operador será obrigado a cadastrar uma nova senha de sua escolha assim que entrar no sistema.
                    </span>
                  </label>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30"
              >
                Salvar Operador
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
