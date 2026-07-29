import React, { useState, useMemo } from 'react';
import { City, CitySystemLink, Category, User } from '../types';
import { 
  Building2, 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  Lock, 
  Globe, 
  MapPin, 
  X, 
  Tag, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Link2,
  CheckCircle2,
  Folder
} from 'lucide-react';

interface CitiesCatalogModuleProps {
  cities: City[];
  categories: Category[];
  currentUser: User;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onCreateCity: (cityData: Partial<City>) => void;
  onUpdateCity: (id: string, updated: Partial<City>) => void;
  onDeleteCity: (id: string) => void;
  onCreateLink: (cityId: string, linkData: Partial<CitySystemLink>) => void;
  onUpdateLink: (linkId: string, updated: Partial<CitySystemLink>) => void;
  onDeleteLink: (linkId: string) => void;
  onCopyText: (text: string) => void;
}

export const CitiesCatalogModule: React.FC<CitiesCatalogModuleProps> = ({
  cities,
  categories,
  currentUser,
  searchQuery,
  setSearchQuery,
  onCreateCity,
  onUpdateCity,
  onDeleteCity,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onCopyText
}) => {
  const isTrainee = currentUser.role === 'TRAINEE';
  const isAdmin = currentUser.role === 'ADMIN';

  // Filters
  const [selectedUf, setSelectedUf] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Modals state
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CitySystemLink | null>(null);
  const [targetCityIdForLink, setTargetCityIdForLink] = useState<string>('');

  // Form City State
  const [cityName, setCityName] = useState('');
  const [cityUf, setCityUf] = useState('SP');
  const [cityIbge, setCityIbge] = useState('');
  const [cityNotes, setCityNotes] = useState('');

  // Form Link State
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCategory, setLinkCategory] = useState(categories[0]?.name || 'Tributário');
  const [linkAccessNotes, setLinkAccessNotes] = useState('');
  const [linkIsActive, setLinkIsActive] = useState(true);

  // Unique UFs list
  const availableUfs = useMemo(() => {
    const ufs = Array.from(new Set(cities.map(c => c.uf))).sort();
    return ufs;
  }, [cities]);

  // Filtered Cities list
  const filteredCities = useMemo(() => {
    return cities.filter(city => {
      // Filter by UF
      if (selectedUf !== 'ALL' && city.uf !== selectedUf) {
        return false;
      }

      // Filter by Category
      if (selectedCategory !== 'ALL') {
        const hasCategoryLink = city.links?.some(l => 
          l.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          l.category?.toLowerCase().includes(selectedCategory.toLowerCase())
        );
        if (!hasCategoryLink) return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCityName = city.name.toLowerCase().includes(q);
        const matchUF = city.uf.toLowerCase().includes(q);
        const matchNotes = city.notes?.toLowerCase().includes(q);
        const matchLinks = city.links?.some(l => 
          l.name.toLowerCase().includes(q) || 
          l.url.toLowerCase().includes(q) || 
          l.accessNotes?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q)
        );

        return matchCityName || matchUF || matchNotes || matchLinks;
      }

      return true;
    });
  }, [cities, selectedUf, selectedCategory, searchQuery]);

  // Handlers City Modal
  const handleOpenCityModal = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setCityName(city.name);
      setCityUf(city.uf);
      setCityIbge(city.codeIBGE || '');
      setCityNotes(city.notes || '');
    } else {
      setEditingCity(null);
      setCityName('');
      setCityUf('SP');
      setCityIbge('');
      setCityNotes('');
    }
    setIsCityModalOpen(true);
  };

  const handleSaveCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim() || !cityUf.trim()) return;

    if (editingCity) {
      onUpdateCity(editingCity.id, {
        name: cityName,
        uf: cityUf.toUpperCase(),
        codeIBGE: cityIbge,
        notes: cityNotes
      });
    } else {
      onCreateCity({
        name: cityName,
        uf: cityUf.toUpperCase(),
        codeIBGE: cityIbge,
        notes: cityNotes
      });
    }
    setIsCityModalOpen(false);
  };

  // Handlers Link Modal
  const handleOpenLinkModal = (cityId: string, link?: CitySystemLink) => {
    setTargetCityIdForLink(cityId);
    if (link) {
      setEditingLink(link);
      setLinkName(link.name);
      setLinkUrl(link.url);
      setLinkCategory(link.category || categories[0]?.name || 'Tributário');
      setLinkAccessNotes(link.accessNotes || '');
      setLinkIsActive(link.isActive);
    } else {
      setEditingLink(null);
      setLinkName('');
      setLinkUrl('');
      setLinkCategory(categories[0]?.name || 'Tributário');
      setLinkAccessNotes('');
      setLinkIsActive(true);
    }
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName.trim() || !linkUrl.trim()) return;

    let formattedUrl = linkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    if (editingLink) {
      onUpdateLink(editingLink.id, {
        name: linkName,
        url: formattedUrl,
        category: linkCategory,
        accessNotes: linkAccessNotes,
        isActive: linkIsActive
      });
    } else {
      onCreateLink(targetCityIdForLink, {
        name: linkName,
        url: formattedUrl,
        category: linkCategory,
        accessNotes: linkAccessNotes,
        isActive: linkIsActive
      });
    }
    setIsLinkModalOpen(false);
  };

  const handleCopy = (id: string, url: string) => {
    onCopyText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            Catálogo de Cidades & Acessos a Sistemas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Consulta rápida de links operantes, ERPs municipais, portais tributários e notas de acesso por localidade.
          </p>
        </div>

        {!isTrainee && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleOpenCityModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all border border-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Cidade
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* UF Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Filtrar UF:
            </span>

            <button
              type="button"
              onClick={() => setSelectedUf('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedUf === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Todas ({cities.length})
            </button>

            {availableUfs.map(uf => {
              const countForUf = cities.filter(c => c.uf === uf).length;
              return (
                <button
                  key={uf}
                  type="button"
                  onClick={() => setSelectedUf(uf)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedUf === uf
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {uf} ({countForUf})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cidade, UF ou sistema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Category Filter Row */}
        {categories && categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pt-2 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Folder className="w-3.5 h-3.5 text-purple-400" />
              Categoria do Sistema:
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Todas
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.name
                    ? 'bg-purple-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                ></span>
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cities Catalog Cards List */}
      {filteredCities.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Nenhuma cidade ou sistema encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tente ajustar os filtros de UF ou o termo pesquisado para encontrar o local desejado.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCities.map(city => {
            const linksList = city.links || [];

            return (
              <div
                key={city.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all hover:border-slate-700"
              >
                {/* City Card Header */}
                <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                      {city.uf}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-100">{city.name} - {city.uf}</h2>
                        {city.codeIBGE && (
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                            IBGE: {city.codeIBGE}
                          </span>
                        )}
                      </div>
                      {city.notes && (
                        <p className="text-xs text-slate-400 mt-0.5">{city.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                      {linksList.length} {linksList.length === 1 ? 'Sistema' : 'Sistemas'}
                    </span>

                    {!isTrainee && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenLinkModal(city.id)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-500/30 flex items-center gap-1"
                          title="Adicionar Novo Sistema a esta cidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCityModal(city)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          title="Editar dados da cidade"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja excluir a cidade ${city.name}? Todos os links vinculados serão removidos.`)) {
                                onDeleteCity(city.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                            title="Excluir cidade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* System Links Grid */}
                <div className="p-4 sm:p-5">
                  {linksList.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                      <p className="text-xs text-slate-500">Nenhum sistema ou link cadastrado para {city.name}.</p>
                      {!isTrainee && (
                        <button
                          type="button"
                          onClick={() => handleOpenLinkModal(city.id)}
                          className="mt-2 text-xs font-bold text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Cadastrar primeiro link
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {linksList.map(link => {
                        return (
                          <div
                            key={link.id}
                            className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all group"
                          >
                            <div>
                              {/* Header Title & Category */}
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h3 className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  {link.name}
                                </h3>

                                {link.category && (
                                  <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
                                    {link.category}
                                  </span>
                                )}
                              </div>

                              {/* Target URL */}
                              <p className="text-[11px] font-mono text-slate-400 truncate mb-3" title={link.url}>
                                {link.url}
                              </p>

                              {/* Access Warning / Notes Banner */}
                              {link.accessNotes && (
                                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-start gap-1.5 mb-2">
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span className="leading-tight font-medium">{link.accessNotes}</span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                              
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                                >
                                  <span>Abrir Sistema</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleCopy(link.id, link.url)}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-all"
                                  title="Copiar URL para área de transferência"
                                >
                                  {copiedLinkId === link.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              {!isTrainee && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLinkModal(city.id, link)}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                    title="Editar link"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Remover o link "${link.name}"?`)) {
                                        onDeleteLink(link.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                                    title="Excluir link"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cadastrar / Editar Cidade */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCity}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">
                {editingCity ? 'Editar Cidade / Praça' : 'Cadastrar Nova Cidade'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Nome da Cidade *</label>
                  <input
                    type="text"
                    required
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">UF *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={cityUf}
                    onChange={(e) => setCityUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 uppercase focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Código IBGE (Opcional)</label>
                <input
                  type="text"
                  value={cityIbge}
                  onChange={(e) => setCityIbge(e.target.value)}
                  placeholder="Ex: 3550308"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Observações de Atendimento</label>
                <textarea
                  rows={3}
                  value={cityNotes}
                  onChange={(e) => setCityNotes(e.target.value)}
                  placeholder="Ex: Praça com suporte prioritário N2 em horário comercial."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Salvar Cidade
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Cadastrar / Editar Link de Sistema */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLink}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">
                {editingLink ? 'Editar Sistema / Link' : 'Vincular Novo Sistema'}
              </h2>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Nome do Sistema / Portal *</label>
                <input
                  type="text"
                  required
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="Ex: Portal Tributário Municipal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">URL / Link de Acesso *</label>
                <input
                  type="text"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://tributario.municipio.sp.gov.br"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Categoria do Sistema *</label>
                <select
                  required
                  value={linkCategory}
                  onChange={(e) => setLinkCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {categories && categories.length > 0 ? (
                    categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Tributário">Tributário / NF-e</option>
                      <option value="ERP Municipal">ERP Municipal</option>
                      <option value="Atendimento Cidadão">Atendimento Cidadão / 156</option>
                      <option value="Intranet / Interno">Intranet / Interno</option>
                      <option value="Outros">Outros</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Notas de Acesso / Avisos Técnicos (Opcional)
                </label>
                <input
                  type="text"
                  value={linkAccessNotes}
                  onChange={(e) => setLinkAccessNotes(e.target.value)}
                  placeholder="Ex: Necessário VPN Corporativa / IP Restrito / Exige e-CNPJ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Salvar Sistema
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
