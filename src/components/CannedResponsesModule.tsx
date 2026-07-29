import React, { useState, useMemo } from 'react';
import { CannedResponse, Category, User, TemplateVariable } from '../types';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Star, 
  Sparkles, 
  Zap, 
  Sliders, 
  X,
  FileText,
  Tag,
  CheckCircle2
} from 'lucide-react';

interface CannedResponsesModuleProps {
  responses: CannedResponse[];
  categories: Category[];
  currentUser: User;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onCopyResponse: (id: string, textToCopy: string) => void;
  onCreateResponse: (newResp: Partial<CannedResponse>) => void;
  onUpdateResponse: (id: string, updated: Partial<CannedResponse>) => void;
  onDeleteResponse: (id: string) => void;
}

export const CannedResponsesModule: React.FC<CannedResponsesModuleProps> = ({
  responses,
  categories,
  currentUser,
  searchQuery,
  setSearchQuery,
  onCopyResponse,
  onCreateResponse,
  onUpdateResponse,
  onDeleteResponse,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Variable Filling Modal State
  const [activeTemplateModal, setActiveTemplateModal] = useState<CannedResponse | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Create / Edit Template Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<CannedResponse | null>(null);

  // Form State for Template Creation
  const [formTitle, setFormTitle] = useState('');
  const [formShortcut, setFormShortcut] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formVariables, setFormVariables] = useState<TemplateVariable[]>([]);

  const isReadonly = currentUser.role === 'TRAINEE';

  // Filtered Responses
  const filteredResponses = useMemo(() => {
    return responses.filter((resp) => {
      const matchesCategory = selectedCategory === 'all' || resp.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        resp.title.toLowerCase().includes(q) ||
        resp.body.toLowerCase().includes(q) ||
        (resp.shortcut && resp.shortcut.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [responses, selectedCategory, searchQuery]);

  // Open Variable Fill Drawer
  const handleOpenFillModal = (resp: CannedResponse) => {
    setActiveTemplateModal(resp);
    const initialVals: Record<string, string> = {};
    resp.variables.forEach((v) => {
      initialVals[v.key] = v.defaultValue || '';
    });
    setVariableValues(initialVals);
  };

  // Generate Rendered Text with Variables
  const renderCompiledBody = (resp: CannedResponse, vals: Record<string, string>) => {
    let output = resp.body;
    resp.variables.forEach((v) => {
      const replacement = vals[v.key] || v.defaultValue || `{{${v.key}}}`;
      const regex = new RegExp(`{{\\s*${v.key}\\s*}}`, 'g');
      output = output.replace(regex, replacement);
    });
    return output;
  };

  // Fast Copy (Uses Default Values)
  const handleDirectCopy = (resp: CannedResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    const initialVals: Record<string, string> = {};
    resp.variables.forEach((v) => {
      initialVals[v.key] = v.defaultValue || '';
    });
    const finalContent = renderCompiledBody(resp, initialVals);

    onCopyResponse(resp.id, finalContent);
    setCopiedId(resp.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy From Filled Modal
  const handleCopyFromModal = () => {
    if (!activeTemplateModal) return;
    const finalContent = renderCompiledBody(activeTemplateModal, variableValues);
    onCopyResponse(activeTemplateModal.id, finalContent);
    setCopiedId(activeTemplateModal.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveTemplateModal(null);
  };

  // Open Editor Modal (Create or Edit)
  const handleOpenEditor = (template?: CannedResponse) => {
    if (template) {
      setEditingTemplate(template);
      setFormTitle(template.title);
      setFormShortcut(template.shortcut || '');
      setFormCategoryId(template.categoryId);
      setFormBody(template.body);
      setFormVariables(template.variables || []);
    } else {
      setEditingTemplate(null);
      setFormTitle('');
      setFormShortcut('');
      setFormCategoryId(categories[0]?.id || '');
      setFormBody('');
      setFormVariables([
        { key: 'nome_cliente', label: 'Nome do Cliente', defaultValue: 'Cliente' },
        { key: 'nome_agente', label: 'Nome do Operador', defaultValue: currentUser.name }
      ]);
    }
    setIsEditorOpen(true);
  };

  // Save Template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCategoryId || !formBody) return;

    if (editingTemplate) {
      onUpdateResponse(editingTemplate.id, {
        title: formTitle,
        shortcut: formShortcut,
        categoryId: formCategoryId,
        body: formBody,
        variables: formVariables
      });
    } else {
      onCreateResponse({
        title: formTitle,
        shortcut: formShortcut,
        categoryId: formCategoryId,
        body: formBody,
        variables: formVariables
      });
    }
    setIsEditorOpen(false);
  };

  // Add Variable Tag in Editor
  const handleAddVariableToForm = () => {
    const key = prompt('Informe a chave da variável (ex: link_chamado):');
    if (!key) return;
    const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
    const label = prompt('Informe o Rótulo visível (ex: Link do Chamado):') || cleanKey;
    const defaultValue = prompt('Informe um valor padrão (opcional):') || '';

    setFormVariables((prev) => [
      ...prev,
      { key: cleanKey, label, defaultValue }
    ]);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar & Category Filters */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-400" />
              Respostas Rápidas & Templates
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Modelos de mensagens pré-formatados com suporte a variáveis dinâmicas e cópia em 1 clique.
            </p>
          </div>

          {!isReadonly && (
            <button
              type="button"
              onClick={() => handleOpenEditor()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all border border-blue-400/30 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Novo Template
            </button>
          )}
        </div>

        {/* Category Pills & Search Row */}
        <div className="flex flex-col lg:flex-row gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Todas as Categorias ({responses.length})
            </button>

            {categories.map((cat) => {
              const count = responses.filter((r) => r.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar mensagem ou atalho..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredResponses.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800/80">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Nenhum modelo de resposta encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">Tente alterar os termos da busca ou selecione outra categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResponses.map((resp) => {
            const category = categories.find((c) => c.id === resp.categoryId);
            const isCopied = copiedId === resp.id;

            return (
              <div
                key={resp.id}
                onClick={() => handleOpenFillModal(resp)}
                className="group bg-slate-900 hover:bg-slate-850 rounded-2xl p-5 border border-slate-800 hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Category & Favorite Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                      style={{
                        backgroundColor: `${category?.color || '#3B82F6'}15`,
                        borderColor: `${category?.color || '#3B82F6'}30`,
                        color: category?.color || '#60A5FA'
                      }}
                    >
                      {category?.name || 'Geral'}
                    </span>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {resp.shortcut && (
                        <span className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                          {resp.shortcut}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">{resp.usageCount}x copiado</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {resp.title}
                  </h3>

                  {/* Body Preview */}
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 whitespace-pre-wrap">
                    {resp.body}
                  </p>

                  {/* Variables Tag Chips */}
                  {resp.variables && resp.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {resp.variables.map((v) => (
                        <span
                          key={v.key}
                          className="text-[10px] bg-blue-950/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/30 flex items-center gap-1 font-mono"
                        >
                          <Tag className="w-2.5 h-2.5 text-blue-400" />
                          {`{{${v.key}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    Preencher Variáveis
                  </span>

                  <div className="flex items-center gap-2">
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditor(resp);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title="Editar Modelo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* 1-Click Fast Copy Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDirectCopy(resp, e)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-md ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: PREENCHIMENTO DINÂMICO DE VARIÁVEIS ANTES DE COPIAR       */}
      {/* =================================================================== */}
      {activeTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Substituição Dinâmica de Variáveis
                </span>
                <h2 className="text-base font-bold text-slate-100">{activeTemplateModal.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTemplateModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Dynamic Inputs Form */}
              {activeTemplateModal.variables && activeTemplateModal.variables.length > 0 ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    Preencha os dados do atendimento:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTemplateModal.variables.map((v) => (
                      <div key={v.key} className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
                          <span>{v.label}</span>
                          <span className="font-mono text-[10px] text-slate-500">{`{{${v.key}}}`}</span>
                        </label>
                        <input
                          type="text"
                          value={variableValues[v.key] ?? v.defaultValue ?? ''}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [v.key]: e.target.value
                            }))
                          }
                          placeholder={v.defaultValue || 'Preencher...'}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Este modelo não possui variáveis dinâmicas parametrizadas.
                </div>
              )}

              {/* Live Render Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Pré-visualização em tempo real (Texto Final):
                </label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                  {renderCompiledBody(activeTemplateModal, variableValues)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                A cópia salvará o texto pré-formatado na área de transferência.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTemplateModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCopyFromModal}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  Copiar com 1 Clique
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CRIAR OU EDITAR TEMPLATE (ADMIN & AGENTE)                */}
      {/* =================================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">
                {editingTemplate ? 'Editar Resposta Rápida' : 'Cadastrar Nova Resposta Rápida'}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Título do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Redefinição de Senha e Token"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Categoria *</label>
                  <select
                    required
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Atalho / Comando Rápido (Opcional)</label>
                <input
                  type="text"
                  value={formShortcut}
                  onChange={(e) => setFormShortcut(e.target.value)}
                  placeholder="Ex: /reset-senha ou /boleto"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Variable Tag Builder */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Variáveis Dinâmicas Configuradas:</span>
                  <button
                    type="button"
                    onClick={handleAddVariableToForm}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Variável
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formVariables.map((v, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-xs"
                    >
                      <span className="font-mono text-blue-300">{`{{${v.key}}}`}</span>
                      <span className="text-slate-400">({v.label})</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormVariables((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-red-400 hover:text-red-300 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Mensagem do Modelo *</label>
                <textarea
                  required
                  rows={7}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Olá {{nome_cliente}}, conforme solicitado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              {editingTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente excluir este modelo?')) {
                      onDeleteResponse(editingTemplate.id);
                      setIsEditorOpen(false);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Modelo
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
                >
                  Salvar Resposta Rápida
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
