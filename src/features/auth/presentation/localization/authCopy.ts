import type { AuthErrorKind } from '../../domain/AuthError';

export type AuthLanguage = 'pt-BR' | 'en-US';

export interface AuthCopy {
  login: {
    title: string;
    subtitle: string;
    submit: string;
    forgotLink: string;
    signUpLink: string;
  };
  signUp: {
    title: string;
    subtitle: string;
    submit: string;
    backToLoginLink: string;
  };
  forgot: {
    title: string;
    subtitle: string;
    submit: string;
    backToLoginLink: string;
    sent: (email: string) => string;
  };
  fields: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  fieldErrors: {
    emailRequired: string;
    emailInvalid: string;
    passwordRequired: string;
    passwordTooShort: string;
    confirmPasswordMismatch: string;
  };
  errors: Record<AuthErrorKind, string>;
  retry: string;
  account: {
    label: string;
    signOut: string;
  };
}

const pt: AuthCopy = {
  login: {
    title: 'Entrar',
    subtitle: 'Use o e-mail e a senha da sua conta.',
    submit: 'Entrar',
    forgotLink: 'Esqueci minha senha',
    signUpLink: 'Criar conta',
  },
  signUp: {
    title: 'Criar conta',
    subtitle: 'Leva menos de um minuto.',
    submit: 'Criar conta',
    backToLoginLink: 'Já tenho conta',
  },
  forgot: {
    title: 'Recuperar senha',
    subtitle: 'Enviamos um link para redefinir a senha.',
    submit: 'Enviar e-mail de recuperação',
    backToLoginLink: 'Voltar para o login',
    sent: email => `E-mail de recuperação enviado para ${email}.`,
  },
  fields: {
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirmar senha',
  },
  fieldErrors: {
    emailRequired: 'Digite seu e-mail.',
    emailInvalid: 'E-mail inválido.',
    passwordRequired: 'Digite sua senha.',
    passwordTooShort: 'Senha precisa ter 6 caracteres ou mais.',
    confirmPasswordMismatch: 'As senhas não são iguais.',
  },
  errors: {
    'invalid-credential':
      'E-mail ou senha não conferem. Confira e tente de novo.',
    network: 'Sem conexão no momento.',
    'email-in-use':
      'Este e-mail já tem conta. Que tal entrar em vez de cadastrar?',
    'too-many-requests':
      'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
    unknown: 'Algo não funcionou.',
  },
  retry: 'Tentar de novo',
  account: {
    label: 'Conta',
    signOut: 'Sair',
  },
};

const en: AuthCopy = {
  login: {
    title: 'Log in',
    subtitle: "Use your account's email and password.",
    submit: 'Log in',
    forgotLink: 'Forgot my password',
    signUpLink: 'Create account',
  },
  signUp: {
    title: 'Create account',
    subtitle: 'Takes less than a minute.',
    submit: 'Create account',
    backToLoginLink: 'I already have an account',
  },
  forgot: {
    title: 'Reset password',
    subtitle: "We'll send a link to reset your password.",
    submit: 'Send recovery email',
    backToLoginLink: 'Back to log in',
    sent: email => `Recovery email sent to ${email}.`,
  },
  fields: {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
  },
  fieldErrors: {
    emailRequired: 'Enter your email.',
    emailInvalid: 'Invalid email.',
    passwordRequired: 'Enter your password.',
    passwordTooShort: 'Password needs 6 characters or more.',
    confirmPasswordMismatch: "Passwords don't match.",
  },
  errors: {
    'invalid-credential':
      "Email or password didn't match. Check and try again.",
    network: 'No connection right now.',
    'email-in-use': 'This email already has an account. Log in instead?',
    'too-many-requests':
      'Too many attempts in a row. Wait a bit and try again.',
    unknown: "Something didn't work.",
  },
  retry: 'Try again',
  account: {
    label: 'Account',
    signOut: 'Log out',
  },
};

export function getAuthCopy(language: AuthLanguage): AuthCopy {
  return language === 'en-US' ? en : pt;
}
