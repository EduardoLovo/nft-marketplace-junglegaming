import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Wallet } from '@/contracts/wallets'
import { useOwnerKey } from '@/features/auth/use-session'
import { apiClient } from '@/lib/api/client'

export async function fetchWallets(signal?: AbortSignal) {
  const { data } = await apiClient.get<Wallet[]>('/wallets', { signal })
  return data
}

export async function connectWallet(walletId: string) {
  const { data } = await apiClient.post<Wallet>(`/wallets/${encodeURIComponent(walletId)}/connect`)
  return data
}

export async function disconnectWallet(walletId: string) {
  const { data } = await apiClient.post<Wallet>(`/wallets/${encodeURIComponent(walletId)}/disconnect`)
  return data
}

export const walletKeys = {
  all: ['wallets'] as const,
  list: (owner: string) => [...walletKeys.all, owner] as const,
}

export const walletsQueryOptions = (owner: string) =>
  queryOptions({ queryKey: walletKeys.list(owner), queryFn: ({ signal }) => fetchWallets(signal) })

export function useWallets() {
  return useQuery(walletsQueryOptions(useOwnerKey()))
}

/** Atualiza a carteira na lista em cache com a resposta do servidor. */
function useWalletMutation(mutationFn: (walletId: string) => Promise<Wallet>) {
  const queryClient = useQueryClient()
  const owner = useOwnerKey()
  return useMutation({
    mutationFn,
    onSuccess: (wallet) => {
      queryClient.setQueryData<Wallet[]>(walletKeys.list(owner), (list) =>
        list?.map((item) => (item.id === wallet.id ? wallet : item)),
      )
    },
  })
}

export const useConnectWallet = () => useWalletMutation(connectWallet)
export const useDisconnectWallet = () => useWalletMutation(disconnectWallet)
