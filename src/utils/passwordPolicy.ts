export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
  errors: string[];
}

export function validatePassword(password: string, confirmPassword?: string): PasswordValidationResult {
  const hasMinLength = !!password && password.length >= 8;
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  const hasSpecialChar = !!password && specialCharRegex.test(password);
  
  let passwordsMatch = true;
  if (confirmPassword !== undefined) {
    passwordsMatch = password === confirmPassword;
  }

  const errors: string[] = [];
  if (!hasMinLength) {
    errors.push("A senha deve conter no mínimo 8 caracteres.");
  }
  if (!hasSpecialChar) {
    errors.push("A senha deve conter pelo menos 1 caractere especial (!@#$%^&*...).");
  }
  if (!passwordsMatch) {
    errors.push("A confirmação de senha não confere.");
  }

  return {
    isValid: hasMinLength && hasSpecialChar && passwordsMatch,
    hasMinLength,
    hasSpecialChar,
    passwordsMatch,
    errors
  };
}
