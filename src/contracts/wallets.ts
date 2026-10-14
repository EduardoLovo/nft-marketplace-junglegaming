/** Carteiras suportadas (selo "METAMASK • WALLETCONNECT • COINBASE" do Figma). */
export const WALLET_PROVIDERS = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
} as const satisfies Record<string, string>

export type WalletProvider = keyof typeof WALLET_PROVIDERS

/** Redes aceitas para pagamento (carteiras EVM). */
export const PAYMENT_NETWORKS = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
} as const satisfies Record<string, string>

export type PaymentNetwork = keyof typeof PAYMENT_NETWORKS

export interface Wallet {
  id: string
  /** Apelido dado pelo usuário, ex.: "Principal" ou "Reserva". */
  label: string
  provider: WalletProvider
  /** Endereço 0x da carteira. */
  address: string
  /** Nome ENS opcional, ex.: `nova.kurio.eth`. */
  ensName: string | null
  networks: PaymentNetwork[]
  isDefault: boolean
  /** Conexão simulada com a extensão da carteira. */
  connected: boolean
}

/** Endereço abreviado no formato do layout: `0x7A42…19E8`. */
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
