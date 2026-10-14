import { z } from 'zod'
import { PASSWORD_RULES } from '@/contracts/auth'

const email = z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const signupSchema = z
  .object({
    name: z.string().trim().min(3, 'Use ao menos 3 caracteres.').max(40, 'Use no máximo 40 caracteres.'),
    email,
    password: z
      .string()
      .min(PASSWORD_RULES.minLength, PASSWORD_RULES.message)
      .regex(PASSWORD_RULES.pattern, PASSWORD_RULES.message),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>

/**
 * Destino após o login. Só aceita caminhos internos, para um link
 * malicioso não usar o login como redirecionador para outro site.
 */
export const authSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .catch(undefined)
    .transform((value) =>
      value && value.startsWith('/') && !value.startsWith('//') && !/^\/(login|signup)\b/.test(value)
        ? value
        : undefined,
    ),
  reason: z.enum(['expired']).optional().catch(undefined),
})
