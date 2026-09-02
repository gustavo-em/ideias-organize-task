import type { AuthErrorKind } from '../../domain/AuthError';

export type AuthLanguage = 'pt-BR' | 'en-US';

export interface AuthCopy {
  login: {
    title: string;
    subtitle: string;
    submit: string;
    forgotLink: string;
    signUpLink: string;
    divider: string;
    google: string;
    apple: string;
    anonymous: string;
  };
  anonymous: {
    title: string;
    subtitle: string;
    submit: string;
    notice: string;
    backToLoginLink: string;
    settingsNote: string;
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
    name: string;
  };
  fieldErrors: {
    nameRequired: string;
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
  profile: {
    title: string;
    subtitle: string;
    edit: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    handleLabel: string;
    handlePlaceholder: string;
    handleHint: string;
    changePhoto: string;
    removePhoto: string;
    photoAction: string;
    photoUploading: string;
    submit: string;
    saved: string;
    errors: {
      displayNameRequired: string;
      handleTooShort: string;
      handleTooLong: string;
      handleInvalidChars: string;
      handleTaken: string;
      refused: string;
      network: string;
      forbidden: string;
      photoStorageUnavailable: string;
      photoForbidden: string;
      photoNetwork: string;
    };
  };
}

const pt: AuthCopy = {
  login: {
    title: 'Entrar',
    subtitle: 'Use o e-mail e a senha da sua conta.',
    submit: 'Entrar',
    forgotLink: 'Esqueci minha senha',
    signUpLink: 'Criar conta',
    divider: 'OU',
    // The wording Google's own brand guidelines list for pt-BR.
    google: 'Fazer login com o Google',
    apple: 'Entrar com Apple',
    anonymous: 'Continuar só com nome',
  },
  anonymous: {
    title: 'Continuar só com nome',
    subtitle: 'Sem e-mail, sem senha. Só o nome que aparece nos espaços.',
    submit: 'Entrar',
    notice:
      'Esta conta fica só neste aparelho. Trocar de celular ou desinstalar o app leva as ideias junto. Dá para vincular a um e-mail ou ao Google depois, sem perder nada.',
    backToLoginLink: 'Voltar para o login',
    settingsNote: 'Conta só neste aparelho',
  },
  signUp: {
    title: 'Criar conta',
    subtitle: 'Leva menos de um minuto.',
    submit: 'Criar conta',
    backToLoginLink: 'Já tenho conta',
  },
  forgot: {
    title: 'Recuperar senha',
    subtitle:
      'Informe o e-mail da conta e enviamos um link para redefinir a senha.',
    submit: 'Enviar e-mail de recuperação',
    backToLoginLink: 'Voltar para o login',
    sent: email => `E-mail de recuperação enviado para ${email}.`,
  },
  fields: {
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirmar senha',
    name: 'Nome',
  },
  fieldErrors: {
    nameRequired: 'Digite um nome.',
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
    // Never rendered: a cancelled sheet leaves the screen exactly as it was.
    cancelled: '',
    'play-services-unavailable':
      'O Google Play Services não está disponível neste aparelho. Dá para entrar com e-mail e senha.',
    'provider-unavailable':
      'Esta forma de entrar está indisponível agora. Dá para entrar com e-mail e senha.',
    'account-exists-with-different-credential':
      'Este e-mail já entra por outro caminho. Use aquele para continuar.',
    unknown: 'Algo não funcionou.',
  },
  retry: 'Tentar de novo',
  account: {
    label: 'Conta',
    signOut: 'Sair',
  },
  profile: {
    title: 'Perfil',
    subtitle: 'É assim que as outras pessoas te reconhecem nos espaços.',
    edit: 'Editar perfil',
    displayNameLabel: 'Nome de exibição',
    displayNamePlaceholder: 'Como te chamam',
    handleLabel: 'Nome de usuário',
    handlePlaceholder: 'seu_nome',
    handleHint: '3–20 caracteres: letras minúsculas, números e _',
    changePhoto: 'Trocar foto',
    removePhoto: 'Remover foto',
    photoAction: 'Alterar foto de perfil',
    photoUploading: 'Enviando a foto',
    submit: 'Salvar',
    saved: 'Perfil atualizado',
    errors: {
      displayNameRequired: 'Escolha um nome de exibição.',
      handleTooShort: 'O nome de usuário precisa de 3 caracteres ou mais.',
      handleTooLong: 'O nome de usuário vai até 20 caracteres.',
      handleInvalidChars:
        'Use apenas letras minúsculas, números e _ no nome de usuário.',
      handleTaken:
        'Esse nome de usuário já está com outra pessoa. Tente outro.',
      refused:
        'O servidor recusou a alteração agora. Tente de novo em instantes.',
      network: 'Não deu para salvar agora. Tente de novo.',
      forbidden: 'Entre de novo na conta para salvar o perfil.',
      photoStorageUnavailable:
        'Não foi possível salvar a foto agora. Sua foto do Google e as iniciais continuam valendo.',
      photoForbidden:
        'Não foi possível salvar a foto agora. Entre de novo na conta e tente outra vez.',
      photoNetwork: 'Não deu para enviar a foto agora. Tente de novo.',
    },
  },
};

const en: AuthCopy = {
  login: {
    title: 'Log in',
    subtitle: "Use your account's email and password.",
    submit: 'Log in',
    forgotLink: 'Forgot my password',
    signUpLink: 'Create account',
    divider: 'OR',
    google: 'Sign in with Google',
    apple: 'Sign in with Apple',
    anonymous: 'Continue with just a name',
  },
  anonymous: {
    title: 'Continue with just a name',
    subtitle: 'No email, no password. Just the name shown in your spaces.',
    submit: 'Continue',
    notice:
      'This account stays on this device. Switching phones or uninstalling the app takes the ideas with it. You can link it to an email or to Google later, without losing anything.',
    backToLoginLink: 'Back to log in',
    settingsNote: 'Account on this device only',
  },
  signUp: {
    title: 'Create account',
    subtitle: 'Takes less than a minute.',
    submit: 'Create account',
    backToLoginLink: 'I already have an account',
  },
  forgot: {
    title: 'Reset password',
    subtitle: "Enter your account email and we'll send a reset link.",
    submit: 'Send recovery email',
    backToLoginLink: 'Back to log in',
    sent: email => `Recovery email sent to ${email}.`,
  },
  fields: {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    name: 'Name',
  },
  fieldErrors: {
    nameRequired: 'Enter a name.',
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
    // Never rendered: a cancelled sheet leaves the screen exactly as it was.
    cancelled: '',
    'play-services-unavailable':
      'Google Play Services is not available on this device. Email and password still works.',
    'provider-unavailable':
      'This way in is unavailable right now. Email and password still works.',
    'account-exists-with-different-credential':
      'This email already signs in another way. Use that one to continue.',
    unknown: "Something didn't work.",
  },
  retry: 'Try again',
  account: {
    label: 'Account',
    signOut: 'Log out',
  },
  profile: {
    title: 'Profile',
    subtitle: 'This is how other people recognise you in shared spaces.',
    edit: 'Edit profile',
    displayNameLabel: 'Display name',
    displayNamePlaceholder: 'What people call you',
    handleLabel: 'Username',
    handlePlaceholder: 'your_name',
    handleHint: '3–20 characters: lowercase letters, numbers and _',
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    photoAction: 'Change profile photo',
    photoUploading: 'Uploading the photo',
    submit: 'Save',
    saved: 'Profile updated',
    errors: {
      displayNameRequired: 'Pick a display name.',
      handleTooShort: 'The username needs 3 characters or more.',
      handleTooLong: 'The username goes up to 20 characters.',
      handleInvalidChars:
        'Use only lowercase letters, numbers and _ in the username.',
      handleTaken: 'That username is with someone else. Try another one.',
      refused: 'The server turned this change down. Try again in a moment.',
      network: "Couldn't save right now. Try again.",
      forbidden: 'Sign in again to save the profile.',
      photoStorageUnavailable:
        "Couldn't save the photo right now. Your Google photo and initials still work.",
      photoForbidden:
        "Couldn't save the photo right now. Sign in again and try once more.",
      photoNetwork: "Couldn't upload the photo right now. Try again.",
    },
  },
};

export function getAuthCopy(language: AuthLanguage): AuthCopy {
  return language === 'en-US' ? en : pt;
}
