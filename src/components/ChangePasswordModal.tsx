import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { validatePassword } from '../utils/passwordPolicy';

interface ChangePasswordModalProps {
  isOpen: boolean;
  isMandatory?: boolean; // Forced password change on first access
  onClose: () => void;
  onChangePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  isMandatory = false,
  onClose,
  onChangePassword,
}) => {
  if (!isOpen) return null;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = validatePassword(newPassword, confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isMandatory && !currentPassword) {
      setError("Por favor, informe a senha atual.");
      return;
    }

    if (!validation.isValid) {
      setError(validation.errors[0] || "A senha não atende aos requisitos de segurança.");
      return;
    }

    setLoading(true);
    try {
      await onChangePassword(newPassword, currentPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (!isMandatory) onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao alterar a senha. Verifique seus dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isMandatory 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {isMandatory ? 'Primeiro Acesso - Troca Obrigatoria de Senha' : 'Alterar Senha de Acesso'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isMandatory 
                  ? 'Sua conta utiliza uma senha provisória. Cadastre uma nova senha pessoal para continuar.' 
                  : 'Atualize sua senha respeitando as diretrizes globais de segurança.'}
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password Field (Only if not mandatory first-login) */}
          {!isMandatory && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 block">Senha Atual *</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPasswords ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* New Password Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 block">Nova Senha *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPasswords ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Crie uma nova senha segura"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 block">Confirmar Nova Senha *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPasswords ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Password Policy Requirements Checklist */}
          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Política de Segurança Global
            </div>

            <ul className="space-y-1.5 text-[11px]">
              <li className={`flex items-center gap-2 transition-colors ${
                validation.hasMinLength ? 'text-emerald-400 font-medium' : 'text-slate-500'
              }`}>
                {validation.hasMinLength ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span>Mínimo de 8 caracteres</span>
              </li>

              <li className={`flex items-center gap-2 transition-colors ${
                validation.hasSpecialChar ? 'text-emerald-400 font-medium' : 'text-slate-500'
              }`}>
                {validation.hasSpecialChar ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span>Pelo menos 1 caractere especial (!@#$%^&*...)</span>
              </li>

              <li className={`flex items-center gap-2 transition-colors ${
                confirmPassword.length > 0 && validation.passwordsMatch
                  ? 'text-emerald-400 font-medium'
                  : confirmPassword.length > 0
                  ? 'text-red-400 font-medium'
                  : 'text-slate-500'
              }`}>
                {confirmPassword.length > 0 && validation.passwordsMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : confirmPassword.length > 0 ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span>Confirmação de senha idêntica</span>
              </li>
            </ul>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !validation.isValid}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
                validation.isValid && !loading
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cadastrar Nova Senha</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
