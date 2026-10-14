import type { IsoDateTime } from './common'

export interface User {
  id: string
  /** Nome de exibição. */
  name: string
  /** Identificador público único, ex.: `ana.souza`. */
  username: string
  email: string
  ensName: string | null
  /** Imagem do avatar (data URL no backend simulado). */
  avatarUrl: string | null
  createdAt: IsoDateTime
}

/** Resposta de login e cadastro. O token vai no cabeçalho `Authorization: Bearer`. */
export interface Session {
  token: string
  expiresAt: IsoDateTime
  user: User
}

/** `GET /auth/session`: valida o token atual. */
export interface SessionInfo {
  expiresAt: IsoDateTime
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
}

/** `PATCH /me` */
export interface UpdateProfileInput {
  name: string
  username: string
  email: string
  ensName: string | null
}

/** `POST /me/password` */
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export const USERNAME_RULES = {
  pattern: /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/,
  message: 'Use de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.',
} as const

export const ENS_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/

/** Avatar: formatos aceitos e tamanho máximo após o redimensionamento no cliente. */
export const AVATAR_RULES = {
  types: ['image/png', 'image/jpeg', 'image/webp'],
  maxBytes: 512 * 1024,
} as const

/** Regras de senha compartilhadas entre a validação do formulário e a da API. */
export const PASSWORD_RULES = {
  minLength: 8,
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  message: 'Use ao menos 8 caracteres, com letras e números.',
} as const
