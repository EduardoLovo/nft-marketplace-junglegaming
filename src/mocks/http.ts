import {
  delay,
  http,
  HttpResponse,
  type DefaultBodyType,
  type HttpResponseResolver,
  type PathParams,
} from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/errors'
import { consumeFailure, getMockConfig, type FailureRule, type RouteKey } from './config'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Monta a resposta de erro no envelope do contrato (`ApiErrorBody`). */
export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, fields } }, { status })
}

const outOfOrderCounters = new Map<RouteKey, number>()

function latencyFor(route: RouteKey): number {
  const config = getMockConfig()
  if (!config.outOfOrder || route !== 'GET /nfts') return config.latencyMs
  // Requisições ímpares são lentas e pares rápidas: a 1ª busca termina depois
  // da 2ª, o que reproduz respostas fora de ordem de forma determinística.
  const count = (outOfOrderCounters.get(route) ?? 0) + 1
  outOfOrderCounters.set(route, count)
  return count % 2 === 1 ? 1_500 : 150
}

function failureResponse(rule: FailureRule) {
  if (rule.kind === 'network') return HttpResponse.error()
  return apiError(
    rule.status ?? 500,
    rule.code ?? 'SERVER_ERROR',
    rule.message ?? 'Falha simulada no servidor.',
  )
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Declara um handler REST com o comportamento de rede simulado: latência,
 * modo offline, timeout e falhas forçadas por configuração ou cenário.
 * Todos os handlers devem ser criados por aqui.
 */
export function route<Params extends PathParams = PathParams, Body extends DefaultBodyType = DefaultBodyType>(
  method: Method,
  path: `/${string}`,
  resolver: HttpResponseResolver<Params, Body>,
) {
  const key = `${method.toUpperCase()} ${path}` as RouteKey

  return http[method]<Params, Body>(`${API_BASE_URL}${path}`, async (info) => {
    const config = getMockConfig()
    if (config.offline) return HttpResponse.error()

    const failure = consumeFailure(key)
    if (failure?.kind === 'timeout') {
      // Nunca responde: o cliente aborta pelo próprio timeout.
      await delay('infinite')
    }

    await delay(latencyFor(key))
    if (failure) return failureResponse(failure)
    return resolver(info)
  })
}
