import type { IsoDateTime } from './common'

export interface User {
  id: string
  name: string
  email: string
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

/** Regras de senha compartilhadas entre a validação do formulário e a da API. */
export const PASSWORD_RULES = {
  minLength: 8,
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  message: 'Use ao menos 8 caracteres, com letras e números.',
} as const
