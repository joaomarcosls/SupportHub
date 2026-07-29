import React, { useState, useMemo } from 'react';
import { AuditLog, User } from '../types';
import { 
  History, 
  Search, 
  Filter, 
  ShieldAlert, 
  User as UserIcon, 
  Clock, 
  Tag, 
  PlusCircle, 
  Edit, 
  Trash2, 
  LogIn, 
  LogOut, 
  ChevronRight, 
  Database,
  X,
  FileJson
} from 'lucide-react';

interface AuditTrailModuleProps {
  auditLogs: AuditLog[];
  currentUser: User;
}

export const AuditTrailModule: React.FC<AuditTrailModuleProps> = ({
  auditLogs,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLogDetails, setSelectedLogDetails] = useState<AuditLog | null>(null);

  // Available Modules for Filter
  const availableModules = [
    'ALL',
    'Cidades',
    'Links',
    'Respostas Rápidas',
    'Base de Conhecimento',
    'Categorias',
    'Usuários',
    'Autenticação'
  ];

  // Available Actions for Filter
  const availableActions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Filter by Module
      if (selectedModule !== 'ALL' && log.module !== selectedModule) {
        return false;
      }

      // Filter by Action
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = log.userName.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchModule = log.module.toLowerCase().includes(q);
        const matchDetails = JSON.stringify(log.details || {}).toLowerCase().includes(q);

        return matchUser || matchDesc || matchModule || matchDetails;
      }

      return true;
    });
  }, [auditLogs, selectedModule, selectedAction, searchQuery]);

  // Action badge styling
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PlusCircle className="w-3 h-3" />
            CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Edit className="w-3 h-3" />
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <Trash2 className="w-3 h-3" />
            DELETE
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <LogIn className="w-3 h-3" />
            LOGIN
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <LogOut className="w-3 h-3" />
            LOGOUT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {action}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
        <h2 className="text-lg font-bold text-slate-100">Acesso Restrito</h2>
        <p className="text-xs text-slate-400">
          Apenas Administradores e Supervisores possuem permissão para visualizar o Histórico de Auditoria do PostgreSQL.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" />
            Histórico de Alterações & Audit Trail (PostgreSQL)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rastreamento e auditoria em tempo real de todas as operações de escrita (Criação, Edição, Exclusão e Sessões) realizadas no sistema.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-xl border border-purple-500/20 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-purple-400" />
            {auditLogs.length} Registros Gravados
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Module Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              Módulo:
            </span>

            {availableModules.map(mod => (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedModule === mod
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {mod === 'ALL' ? 'Todos' : mod}
              </button>
            ))}
          </div>

          {/* Action Filter & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Action Select */}
            <div className="w-full sm:w-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Ação:</span>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
              >
                {availableActions.map(act => (
                  <option key={act} value={act}>
                    {act === 'ALL' ? 'Todas as Ações' : act}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuário, detalhe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
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

        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">Nenhum log de auditoria encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ajuste os filtros de módulo ou tipo de ação para visualizar os registros cadastrados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Data / Hora</th>
                  <th className="py-3.5 px-4">Usuário</th>
                  <th className="py-3.5 px-4">Módulo</th>
                  <th className="py-3.5 px-4">Ação</th>
                  <th className="py-3.5 px-4">Descrição da Alteração</th>
                  <th className="py-3.5 px-4 text-right">Detalhes JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredLogs.map(log => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                      
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDate(log.timestamp)}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold">
                            {log.userName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200 block leading-tight">{log.userName}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{log.userRole}</span>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 font-medium text-[11px]">
                          {log.module}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderActionBadge(log.action)}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-200">
                        <span className="line-clamp-2">{log.description}</span>
                      </td>

                      {/* Details Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-purple-900/30 text-purple-300 rounded-lg border border-slate-800 hover:border-purple-500/30 font-semibold text-[11px] inline-flex items-center gap-1 transition-all"
                        >
                          <FileJson className="w-3.5 h-3.5 text-purple-400" />
                          <span>Ver JSON</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLogDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-purple-400" />
                Detalhes da Alteração (JSONB)
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLogDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold">Ação Registrada:</p>
                <div className="flex items-center gap-2">
                  {renderActionBadge(selectedLogDetails.action)}
                  <span className="text-xs text-slate-200 font-bold">{selectedLogDetails.description}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold">Payload JSON do PostgreSQL:</p>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(selectedLogDetails.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogDetails(null)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
