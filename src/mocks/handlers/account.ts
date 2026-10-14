import { HttpResponse } from 'msw'
import {
  AVATAR_RULES,
  ENS_PATTERN,
  PASSWORD_RULES,
  USERNAME_RULES,
  type ChangePasswordInput,
  type UpdateProfileInput,
  type User,
} from '@/contracts/auth'
import { db } from '../db'
import { hashPassword, randomToken, requireUser, toPublicUser } from '../domain/auth'
import { apiError, route } from '../http'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) as Partial<T>) ?? {}
  } catch {
    return {}
  }
}

function updateUser(userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>) {
  db.update((state) => {
    const user = state.users.find((u) => u.id === userId)
    if (user) Object.assign(user, patch)
  })
  return toPublicUser(db.state.users.find((u) => u.id === userId)!)
}

const toDataUrl = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${file.type};base64,${btoa(binary)}`
}

export const accountHandlers = [
  route('get', '/me', ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    return HttpResponse.json<User>(toPublicUser(auth.user))
  }),

  route('patch', '/me', async ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const body = await readJson<UpdateProfileInput>(request)

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const ensName = typeof body.ensName === 'string' && body.ensName.trim() ? body.ensName.trim().toLowerCase() : null

    const fields: Record<string, string> = {}
    if (name.length < 2 || name.length > 40) fields.name = 'Use de 2 a 40 caracteres.'
    if (!USERNAME_RULES.pattern.test(username)) fields.username = USERNAME_RULES.message
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (ensName && !ENS_PATTERN.test(ensName)) fields.ensName = 'Use um nome ENS válido, terminado em .eth.'
    if (Object.keys(fields).length > 0) return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fields)

    const others = db.state.users.filter((u) => u.id !== auth.user.id)
    if (others.some((u) => u.username === username)) fields.username = 'Este nome de usuário já está em uso.'
    if (others.some((u) => u.email === email)) fields.email = 'Este e-mail já está em uso por outra conta.'
    if (Object.keys(fields).length > 0) return apiError(409, 'CONFLICT', 'Alguns dados já estão em uso.', fields)

    return HttpResponse.json<User>(updateUser(auth.user.id, { name, username, email, ensName }))
  }),

  route('put', '/me/avatar', async ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    let file: FormDataEntryValue | null = null
    try {
      file = (await request.formData()).get('avatar')
    } catch {
      file = null
    }
    if (!(file instanceof File)) {
      return apiError(422, 'VALIDATION_ERROR', 'Envie uma imagem.', { avatar: 'Envie uma imagem.' })
    }
    if (!(AVATAR_RULES.types as readonly string[]).includes(file.type)) {
      return apiError(422, 'VALIDATION_ERROR', 'Formato não suportado.', { avatar: 'Use PNG, JPEG ou WebP.' })
    }
    if (file.size > AVATAR_RULES.maxBytes) {
      return apiError(413, 'VALIDATION_ERROR', 'Imagem muito grande.', { avatar: 'A imagem deve ter até 512 KB.' })
    }
    return HttpResponse.json<User>(updateUser(auth.user.id, { avatarUrl: await toDataUrl(file) }))
  }),

  route('delete', '/me/avatar', ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    return HttpResponse.json<User>(updateUser(auth.user.id, { avatarUrl: null }))
  }),

  route('post', '/me/password', async ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const body = await readJson<ChangePasswordInput>(request)
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const next = typeof body.newPassword === 'string' ? body.newPassword : ''

    if ((await hashPassword(auth.user.passwordSalt, current)) !== auth.user.passwordHash) {
      return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' })
    }
    if (next.length < PASSWORD_RULES.minLength || !PASSWORD_RULES.pattern.test(next)) {
      return apiError(422, 'VALIDATION_ERROR', PASSWORD_RULES.message, { newPassword: PASSWORD_RULES.message })
    }
    if (next === current) {
      return apiError(422, 'VALIDATION_ERROR', 'A nova senha deve ser diferente da atual.', {
        newPassword: 'A nova senha deve ser diferente da atual.',
      })
    }

    const salt = randomToken(8)
    const hash = await hashPassword(salt, next)
    db.update((state) => {
      const user = state.users.find((u) => u.id === auth.user.id)
      if (user) {
        user.passwordSalt = salt
        user.passwordHash = hash
      }
      // Trocar a senha encerra as outras sessões da conta; a atual continua.
      for (const [token, session] of Object.entries(state.sessions)) {
        if (session.userId === auth.user.id && token !== auth.token) delete state.sessions[token]
      }
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
