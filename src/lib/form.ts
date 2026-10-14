import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { isApiError } from '@/lib/api/errors'

/**
 * Leva os erros por campo da API (`error.fields`) para o formulário, focando o
 * primeiro. Devolve `true` se algum campo recebeu erro; senão o chamador
 * mostra a mensagem geral.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  fields: ReadonlyArray<Path<T>>,
): boolean {
  if (!isApiError(error)) return false
  let applied = false
  for (const [field, message] of Object.entries(error.fields)) {
    if ((fields as readonly string[]).includes(field)) {
      form.setError(field as Path<T>, { message }, { shouldFocus: !applied })
      applied = true
    }
  }
  return applied
}
