/**
 * Usuários do backend simulado. A senha nunca é guardada: só o hash
 * SHA-256 de `salt:senha`, com um salt por usuário. As credenciais de
 * demonstração estão no README.
 */
export interface UserRecord {
  id: string
  name: string
  username: string
  email: string
  ensName: string | null
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  createdAt: string
}

export const USER_FIXTURES: UserRecord[] = [
  {
    id: 'usr_ana',
    name: 'Ana Souza',
    username: 'ana.souza',
    email: 'ana@kurio.dev',
    ensName: 'ana.kurio.eth',
    avatarUrl: null,
    passwordSalt: 'a91f3c2e7b4d6058',
    passwordHash: '86eea0aedd761a8a78bb3fc18ce44f958063275282757c2b8d39f202865544d3',
    createdAt: '2026-08-02T14:00:00.000Z',
  },
  {
    id: 'usr_bruno',
    name: 'Bruno Lima',
    username: 'bruno.lima',
    email: 'bruno@kurio.dev',
    ensName: null,
    avatarUrl: null,
    passwordSalt: '5e0b8d71c3a2f946',
    passwordHash: '8f95f1b40b24e8d3330633da8c9f94a86f0efcae19403ca99c42a2c63067b8de',
    createdAt: '2026-09-11T09:30:00.000Z',
  },
]
