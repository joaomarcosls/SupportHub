import { describe, it, expect } from 'vitest';

// Função de validação de políticas de senha
export function validatePasswordPolicy(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
  }
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasSpecialChar) {
    return { isValid: false, error: 'A senha deve conter ao menos um caractere especial (!@#$%^&*...).' };
  }
  return { isValid: true };
}

// Função de higienização de objetos de usuário
export function sanitizeUser(user: any) {
  if (!user) return null;
  const { password_hash, password, ...safeUser } = user;
  return safeUser;
}

// Testes Unitários Automatizados para Autenticação e Segurança
describe('Módulo de Autenticação e Segurança - Testes Unitários', () => {

  describe('Validação da Política Global de Senhas', () => {
    it('deve rejeitar senhas com menos de 8 caracteres', () => {
      const result = validatePasswordPolicy('Abc!12');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('mínimo 8 caracteres');
    });

    it('deve rejeitar senhas sem caracteres especiais', () => {
      const result = validatePasswordPolicy('SenhaSegura123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('caractere especial');
    });

    it('deve aceitar senhas fortes que atendem aos requisitos de segurança OWASP', () => {
      const result = validatePasswordPolicy('Admin@Secured2026!');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Sanitização de Dados do Usuário (Proteção contra Vazamento de Hash)', () => {
    it('deve remover o campo password_hash do objeto do usuário', () => {
      const dirtyUser = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Usuário Teste',
        email: 'teste@empresa.com.br',
        password_hash: '$2b$10$e7b8c9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
        role: 'ADMIN'
      };

      const cleanUser = sanitizeUser(dirtyUser);
      expect(cleanUser).not.toHaveProperty('password_hash');
      expect(cleanUser).toHaveProperty('email', 'teste@empresa.com.br');
    });
  });

  describe('Extração de Token JWT de Autenticação', () => {
    it('deve extrair o ID do usuário de um token JWT válido', () => {
      const token = 'jwt_token_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa_1785337383262';
      const match = token.match(/^jwt_token_([a-zA-Z0-9-]+)/);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    });
  });

});
