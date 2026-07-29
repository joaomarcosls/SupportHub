import React, { useState, useMemo } from 'react';
import Markdown from 'react-markdown';
import { KnowledgeArticle, Category, User } from '../types';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Tag, 
  Eye, 
  ThumbsUp, 
  Clock, 
  Edit3, 
  Trash2, 
  X, 
  Folder, 
  ChevronRight,
  FileCode,
  Copy,
  Check
} from 'lucide-react';

interface KnowledgeBaseModuleProps {
  articles: KnowledgeArticle[];
  categories: Category[];
  currentUser: User;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onCreateArticle: (newArt: Partial<KnowledgeArticle>) => void;
  onUpdateArticle: (id: string, updated: Partial<KnowledgeArticle>) => void;
  onDeleteArticle: (id: string) => void;
}

export const KnowledgeBaseModule: React.FC<KnowledgeBaseModuleProps> = ({
  articles,
  categories,
  currentUser,
  searchQuery,
  setSearchQuery,
  onCreateArticle,
  onUpdateArticle,
  onDeleteArticle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Article Reader Modal State
  const [readingArticle, setReadingArticle] = useState<KnowledgeArticle | null>(null);
  
  // Article Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);

  // Form State for Article
  const [formTitle, setFormTitle] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formContentMd, setFormContentMd] = useState('');
  const [formTagsStr, setFormTagsStr] = useState('');

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const isReadonly = currentUser.role === 'TRAINEE';

  // All unique tags across articles
  const allTags = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => a.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [articles]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCategory = selectedCategory === 'all' || art.categoryId === selectedCategory;
      const matchesTag = !selectedTag || art.tags?.includes(selectedTag);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        art.title.toLowerCase().includes(q) ||
        art.contentMd.toLowerCase().includes(q) ||
        art.tags?.some((t) => t.toLowerCase().includes(q));
      
      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [articles, selectedCategory, selectedTag, searchQuery]);

  // Open Reader
  const handleOpenReader = (art: KnowledgeArticle) => {
    setReadingArticle(art);
  };

  // Open Editor
  const handleOpenEditor = (art?: KnowledgeArticle) => {
    if (art) {
      setEditingArticle(art);
      setFormTitle(art.title);
      setFormCategoryId(art.categoryId);
      setFormContentMd(art.contentMd);
      setFormTagsStr(art.tags ? art.tags.join(', ') : '');
    } else {
      setEditingArticle(null);
      setFormTitle('');
      setFormCategoryId(categories[0]?.id || '');
      setFormContentMd(`# Título do Procedimento

Descreva brevemente o problema e a solução.

### 🔍 Passo a Passo (Troubleshooting)

1. **Passo 1:** Verifique as credenciais no painel.
2. **Passo 2:** Execute o comando de teste:
   \`\`\`bash
   curl -X GET "https://api.empresa.com.br/v1/health"
   \`\`\`

:::info
💡 **Observação Importante:** Adicione notas relevantes para o operador.
:::`);
      setFormTagsStr('SOP, Troubleshooting, API');
    }
    setIsEditorOpen(true);
  };

  // Save Article
  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCategoryId || !formContentMd) return;

    const tagsArray = formTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingArticle) {
      onUpdateArticle(editingArticle.id, {
        title: formTitle,
        categoryId: formCategoryId,
        contentMd: formContentMd,
        tags: tagsArray
      });
    } else {
      onCreateArticle({
        title: formTitle,
        categoryId: formCategoryId,
        contentMd: formContentMd,
        tags: tagsArray
      });
    }

    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
              Base de Conhecimento e Procedimentos (Wiki)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Repositório central de artigos de solução de problemas (Troubleshooting), scripts e SOPs.
            </p>
          </div>

          {!isReadonly && (
            <button
              type="button"
              onClick={() => handleOpenEditor()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all border border-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              Novo Artigo / Procedimento
            </button>
          )}
        </div>

        {/* Categories & Tags Filters */}
        <div className="flex flex-col lg:flex-row gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Todas as Categorias ({articles.length})
            </button>

            {categories.map((cat) => {
              const count = articles.filter((a) => a.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white font-semibold'
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

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar wiki por palavra-chave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tags Row */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" /> Tags:
            </span>
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-semibold"
              >
                Limpar Tag (×)
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Article Cards Grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Nenhum artigo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">Tente ajustar os filtros de categoria, tags ou palavra de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((art) => {
            const category = categories.find((c) => c.id === art.categoryId);

            return (
              <div
                key={art.id}
                onClick={() => handleOpenReader(art)}
                className="group bg-slate-900 hover:bg-slate-850 rounded-2xl p-5 border border-slate-800 hover:border-blue-500/50 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Category & Stats */}
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

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-400" />
                        {art.viewsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-500" />
                        {art.helpfulCount}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {art.title}
                  </h3>

                  {/* Markdown Content Excerpt */}
                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                    {art.contentMd.replace(/[#*`_]/g, '')}
                  </p>

                  {/* Tag Chips */}
                  {art.tags && art.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {art.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Info & Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Por {art.authorName || 'Suporte'}
                  </span>

                  <div className="flex items-center gap-2">
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditor(art);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Editar Artigo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="text-xs text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Ler Artigo
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: ARTIGO COMPLETO (LEITOR MARKDOWN)                         */}
      {/* =================================================================== */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-100">{readingArticle.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>Autor: {readingArticle.authorName}</span>
                    <span>•</span>
                    <span>{readingArticle.viewsCount} Visualizações</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => {
                      const art = readingArticle;
                      setReadingArticle(null);
                      handleOpenEditor(art);
                    }}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReadingArticle(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Markdown Body Content */}
            <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-slate-200">
              
              {/* Render Markdown */}
              <div className="prose prose-invert max-w-none text-sm leading-relaxed font-sans">
                <Markdown>{readingArticle.contentMd}</Markdown>
              </div>

              {/* Tags Footer */}
              {readingArticle.tags && readingArticle.tags.length > 0 && (
                <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {readingArticle.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-slate-950 text-blue-300 px-2 py-0.5 rounded border border-slate-800 font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Última atualização: {new Date(readingArticle.updatedAt).toLocaleDateString('pt-BR')}
              </span>

              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Fechar Artigo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CRIAR OU EDITAR ARTIGO (MARKDOWN EDITOR)                   */}
      {/* =================================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveArticle}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">
                {editingArticle ? 'Editar Artigo na Wiki' : 'Novo Artigo na Base de Conhecimento'}
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
                  <label className="text-xs font-medium text-slate-300">Título do Artigo / Procedimento *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Guia de Resolução do Erro 401"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Categoria Obrigatória *</label>
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
                <label className="text-xs font-medium text-slate-300">Tags (Separadas por vírgula)</label>
                <input
                  type="text"
                  value={formTagsStr}
                  onChange={(e) => setFormTagsStr(e.target.value)}
                  placeholder="Ex: API, JWT, Erro 401, Troubleshooting"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Conteúdo do Artigo (Formatação Markdown) *</span>
                  <span className="text-[10px] text-slate-500">Suporta # Títulos, ```código``` e listas</span>
                </label>
                <textarea
                  required
                  rows={12}
                  value={formContentMd}
                  onChange={(e) => setFormContentMd(e.target.value)}
                  placeholder="# Título do Procedimento&#10;&#10;Descreva o passo a passo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              {editingArticle && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja excluir este artigo da wiki?')) {
                      onDeleteArticle(editingArticle.id);
                      setIsEditorOpen(false);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Artigo
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
                  Publicar Artigo
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
