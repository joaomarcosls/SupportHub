import React, { useState, useEffect, useRef } from 'react';
import { User, QuickShortcut } from '../types';
import { 
  FileText, 
  Copy, 
  Check, 
  Trash2, 
  Zap, 
  Plus,
  X,
  ShieldAlert,
  Lock,
  Tag
} from 'lucide-react';

interface ScratchpadModuleProps {
  currentUser: User;
  scratchpadContent: string;
  lastSavedAt: string;
  onSaveScratchpad: (content: string) => void;
  onOpenAiAssist?: () => void;
}

export const ScratchpadModule: React.FC<ScratchpadModuleProps> = ({
  currentUser,
  scratchpadContent,
  lastSavedAt,
  onSaveScratchpad
}) => {
  const [content, setContent] = useState<string>(scratchpadContent);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Shortcuts / Models State
  const [shortcuts, setShortcuts] = useState<QuickShortcut[]>([]);
  const [isLoadingShortcuts, setIsLoadingShortcuts] = useState<boolean>(true);

  // Modal State for Registering Shortcut
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newShortcutLabel, setNewShortcutLabel] = useState<string>('');
  const [newShortcutContent, setNewShortcutContent] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canManageShortcuts = currentUser.role === 'ADMIN' || currentUser.role === 'AGENT';

  // Fetch Shortcuts from Server
  const fetchShortcuts = async () => {
    try {
      setIsLoadingShortcuts(true);
      const res = await fetch('/api/quick-shortcuts');
      if (res.ok) {
        const data = await res.json();
        setShortcuts(data);
      }
    } catch (err) {
      console.error("Erro ao carregar modelos de atalho:", err);
    } finally {
      setIsLoadingShortcuts(false);
    }
  };

  useEffect(() => {
    fetchShortcuts();
  }, []);

  // Keep local content synced with prop
  useEffect(() => {
    setContent(scratchpadContent);
  }, [scratchpadContent]);

  // Debounced auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSaveScratchpad(newVal);
      setIsSaving(false);
    }, 800);
  };

  const handleCopyScratchpad = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Insert Shortcut Model into Scratchpad
  const handleInsertShortcut = (sc: QuickShortcut) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    let textToInsert = sc.content;
    textToInsert = textToInsert.replace(/\{\{timestamp\}\}/g, timestamp);
    textToInsert = textToInsert.replace(/\{\{userName\}\}/g, currentUser.name);

    const updated = content ? `${content}\n\n${textToInsert}` : textToInsert;
    setContent(updated);
    onSaveScratchpad(updated);
  };

  // Create New Shortcut
  const handleCreateShortcut = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newShortcutLabel.trim() || !newShortcutContent.trim()) {
      setModalError("Por favor, preencha o nome do modelo e o texto do atalho.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/quick-shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newShortcutLabel,
          content: newShortcutContent
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar modelo.");
      }

      setShortcuts(prev => [...prev, data]);
      setNewShortcutLabel('');
      setNewShortcutContent('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || "Falha ao salvar o atalho.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Shortcut
  const handleDeleteShortcut = async (id: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageShortcuts) return;

    if (confirm(`Deseja realmente remover o modelo de atalho "${label}"?`)) {
      try {
        const res = await fetch(`/api/quick-shortcuts/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setShortcuts(prev => prev.filter(s => s.id !== id));
        }
      } catch (err) {
        console.error("Erro ao deletar modelo:", err);
      }
    }
  };

  const handleClear = () => {
    if (confirm('Deseja limpar completamente seu bloco de rascunho?')) {
      setContent('');
      onSaveScratchpad('');
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header Bar */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-400" />
              Bloco de Rascunho & Anotações Rápidas
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
              Auto-Save
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Espaço pessoal vinculado à sua conta ({currentUser.name}). Salva automaticamente enquanto você digita.
          </p>
        </div>

        {/* Auto-Save Indicator Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            {isSaving ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-amber-400 font-medium">Salvando alterações...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 font-medium">
                  Salvo às {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString('pt-BR') : 'agora'}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyScratchpad}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Rascunho Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Rascunho</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Snippets & Actions Toolbar */}
      <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Atalhos Rápidos:
          </span>

          {/* Quick Shortcut Buttons */}
          {shortcuts.map((sc) => (
            <div key={sc.id} className="relative group inline-flex items-center">
              <button
                type="button"
                onClick={() => handleInsertShortcut(sc)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-medium transition-all flex items-center gap-1.5"
                title={`Clique para inserir este modelo no rascunho`}
              >
                <span>+ {sc.label}</span>
              </button>

              {canManageShortcuts && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteShortcut(sc.id, sc.label, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded ml-0.5"
                  title="Excluir este modelo de atalho"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Button to Register New Shortcut (Admin & Support Only) */}
          {canManageShortcuts ? (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="ml-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Modelo</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-600" />
              <span>Apenas Admin e Suporte podem cadastrar novos modelos</span>
            </span>
          )}
        </div>

        {/* Clear Scratchpad Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
            title="Limpar Rascunho"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Textarea Scratchpad */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-2xl relative">
        <textarea
          rows={18}
          value={content}
          onChange={handleChange}
          placeholder="Digite ou cole aqui anotações temporárias de chamados (IDs de erro, fones, IPs, protocolos, rascunho de e-mails)..."
          className="w-full bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed p-4 rounded-xl border border-slate-800/80 focus:outline-none focus:border-blue-500/80 resize-y"
        />
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <span>{content.length} caracteres • {content.split('\n').length} linhas</span>
          <span>Vinculado a: {currentUser.email}</span>
        </div>
      </div>

      {/* Modal for Registering New Quick Shortcut Model */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Cadastrar Modelo de Atalho Rápido</h3>
                  <p className="text-[11px] text-slate-400">Exclusivo para Administradores e Agentes de Suporte</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateShortcut} className="p-6 space-y-4">
              {modalError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Nome do Atalho / Rótulo *</label>
                <input
                  type="text"
                  required
                  value={newShortcutLabel}
                  onChange={(e) => setNewShortcutLabel(e.target.value)}
                  placeholder="Ex: Script de Reembolso, Check-list PIX, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Conteúdo do Modelo / Texto do Atalho *</label>
                <textarea
                  rows={6}
                  required
                  value={newShortcutContent}
                  onChange={(e) => setNewShortcutContent(e.target.value)}
                  placeholder="Digite o texto padrão a ser inserido no rascunho ao clicar no botão..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500 resize-y"
                />
                <p className="text-[11px] text-purple-400/90 pt-1">
                  💡 <b>Dica de Variáveis:</b> Use <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-purple-300">{"{{timestamp}}"}</code> para data/hora atual e <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-purple-300">{"{{userName}}"}</code> para o nome do operador.
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Salvar Modelo'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
