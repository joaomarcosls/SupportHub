export type UserRole = 'ADMIN' | 'AGENT' | 'TRAINEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  active: boolean;
  avatarUrl?: string;
  createdAt: string;
  mustChangePassword?: boolean;
}

export interface CitySystemLink {
  id: string;
  cityId: string;
  name: string; // e.g. "Portal Tributário", "ERP Municipal", "Intranet"
  url: string;
  category?: string; // e.g. "Tributos", "Atendimento", "Interno", "ERP"
  accessNotes?: string; // e.g. "Necessário VPN Corporativa", "Acesso restrito por IP"
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface City {
  id: string;
  name: string; // e.g. "São Paulo"
  uf: string; // e.g. "SP"
  codeIBGE?: string;
  primaryUser?: string; // Operador Titular Responsável
  backupUser?: string; // Operador Reserva Responsável
  active?: boolean;
  inactiveReason?: 'inadimplencia' | 'bloqueio_parcial' | 'bloqueio_total' | '';
  notes?: string;
  linksCount?: number;
  links?: CitySystemLink[];
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  description: string;
  itemCount?: number;
  createdAt: string;
}

export interface TemplateVariable {
  key: string; // e.g. "nome_cliente"
  label: string; // e.g. "Nome do Cliente"
  defaultValue?: string;
  type?: 'text' | 'select' | 'number';
  options?: string[];
}

export interface CannedResponse {
  id: string;
  title: string;
  shortcut?: string;
  categoryId: string;
  body: string; // Text containing {{nome_cliente}}, {{sistema}}, etc.
  variables: TemplateVariable[];
  usageCount: number;
  isFavorite?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  contentMd: string;
  tags: string[];
  viewsCount: number;
  helpfulCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserScratchpad {
  userId: string;
  content: string;
  lastSavedAt: string;
}

export interface QuickShortcut {
  id: string;
  label: string;
  content: string;
  createdBy?: string;
}

export type MainTab = 
  | 'cities-catalog'
  | 'canned-responses'
  | 'knowledge-base'
  | 'scratchpad'
  | 'categories'
  | 'users'
  | 'audit-trail';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: 'Cidades' | 'Links' | 'Respostas Rápidas' | 'Base de Conhecimento' | 'Categorias' | 'Usuários' | 'Autenticação';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  description: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SystemStats {
  totalCities: number;
  totalSystemLinks: number;
  totalResponses: number;
  totalArticles: number;
  totalCategories: number;
  totalUsers: number;
  totalCopies: number;
}
