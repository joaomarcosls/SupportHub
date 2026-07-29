import React, { useState } from 'react';
import { Category, User } from '../types';
import { 
  Folder, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  KeyRound, 
  Receipt, 
  Server, 
  FileText, 
  Tag, 
  ShieldAlert,
  Sliders
} from 'lucide-react';

interface CategoryManagementModuleProps {
  categories: Category[];
  currentUser: User;
  onCreateCategory: (cat: Partial<Category>) => void;
  onUpdateCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryManagementModule: React.FC<CategoryManagementModuleProps> = ({
  categories,
  currentUser,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');
  const [formIcon, setFormIcon] = useState('Folder');
  const [formDescription, setFormDescription] = useState('');

  const isAdmin = currentUser.role === 'ADMIN';
  const isTrainee = currentUser.role === 'TRAINEE';

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormName(cat.name);
      setFormColor(cat.color || '#3B82F6');
      setFormIcon(cat.icon || 'Folder');
      setFormDescription(cat.description || '');
    } else {
      setEditingCategory(null);
      setFormName('');
      setFormColor('#3B82F6');
      setFormIcon('Folder');
      setFormDescription('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, {
        name: formName,
        color: formColor,
        icon: formIcon,
        description: formDescription
      });
    } else {
      onCreateCategory({
        name: formName,
        color: formColor,
        icon: formIcon,
        description: formDescription
      });
    }
    setIsModalOpen(false);
  };

  const colorPresets = [
    '#3B82F6', '#EC4899', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Folder className="w-6 h-6 text-blue-400" />
            Gestão de Categorias
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre e organize os tópicos que alimentam as Respostas Rápidas e a Base de Conhecimento.
          </p>
        </div>

        {!isTrainee && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all border border-blue-400/30 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        )}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm font-bold"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{cat.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500">{cat.slug}</span>
                  </div>
                </div>

                <span className="text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-slate-400 font-semibold">
                  {cat.itemCount || 0} itens
                </span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mt-2">
                {cat.description || 'Sem descrição cadastrada.'}
              </p>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs">
              <span className="text-[10px] text-slate-500 font-mono">ID: {cat.id.slice(0, 8)}...</span>

              <div className="flex items-center gap-2">
                {!isTrainee && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal(cat)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    title="Editar Categoria"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir categoria "${cat.name}"?`)) {
                        onDeleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                    title="Excluir Categoria (Admin)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">
                {editingCategory ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Integrações e Webhooks"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Cor Identificadora</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setFormColor(hex)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        formColor === hex ? 'scale-125 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Descrição</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explique quais assuntos esta categoria engloba..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
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
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Salvar Categoria
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
