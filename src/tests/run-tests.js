// Runner de Testes Unitários de Segurança e Regras de Negócio (Compatível com Node 18, 20 e 22+)
import assert from 'node:assert/strict';

console.log('🧪 Executando Testes Unitários de Autenticação e Segurança...');

// 1. Função de Validação de Senha (OWASP)
function validatePasswordPolicy(password) {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
  }
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasSpecialChar) {
    return { isValid: false, error: 'A senha deve conter ao menos um caractere especial (!@#$%^&*...).' };
  }
  return { isValid: true };
}

// 2. Função de Higienização de Usuário
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, password, ...safeUser } = user;
  return safeUser;
}

// Execução dos Testes:

// Teste 1: Rejeitar senha curta
const test1 = validatePasswordPolicy('Abc!12');
assert.equal(test1.isValid, false, 'Teste 1 Falhou: Senha curta deveria ser rejeitada');
console.log('✅ Teste 1 Passou: Rejeita senhas com menos de 8 caracteres.');

// Teste 2: Rejeitar senha sem caractere especial
const test2 = validatePasswordPolicy('SenhaSegura123');
assert.equal(test2.isValid, false, 'Teste 2 Falhou: Senha sem caractere especial deveria ser rejeitada');
console.log('✅ Teste 2 Passou: Rejeita senhas sem caractere especial.');

// Teste 3: Aceitar senha válida OWASP
const test3 = validatePasswordPolicy('Admin@Secured2026!');
assert.equal(test3.isValid, true, 'Teste 3 Falhou: Senha forte válida deveria ser aceita');
console.log('✅ Teste 3 Passou: Aceita senhas fortes atendendo requisitos OWASP.');

// Teste 4: Sanitização contra vazamento de hash
const dirtyUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Usuário Teste',
  email: 'teste@empresa.com.br',
  password_hash: '$2b$10$e7b8c9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
  role: 'ADMIN'
};
const cleanUser = sanitizeUser(dirtyUser);
assert.equal(cleanUser.password_hash, undefined, 'Teste 4 Falhou: Hash de senha vaza no objeto');
assert.equal(cleanUser.email, 'teste@empresa.com.br', 'Teste 4 Falhou: E-mail alterado incorretamente');
console.log('✅ Teste 4 Passou: Higienização de usuário previne vazamento de hash de senha.');

// Teste 5: Extração de Token JWT via Regex
const token = 'jwt_token_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa_1785337383262';
const match = token.match(/^jwt_token_([a-zA-Z0-9-]+)/);
assert.notEqual(match, null, 'Teste 5 Falhou: Regex não casou com o token');
assert.equal(match[1], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Teste 5 Falhou: ID do usuário extraído incorretamente');
console.log('✅ Teste 5 Passou: Extração de ID de usuário a partir do token JWT via Regex.');

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS PASSARAM COM SUCESSO! 🎉');
