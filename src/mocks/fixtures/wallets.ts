import type { Wallet } from '@/contracts/wallets'

export interface WalletRecord extends Wallet {
  userId: string
}

/** Carteiras dos usuários de demonstração (endereços fictícios). */
export const WALLET_FIXTURES: WalletRecord[] = [
  {
    id: 'wal_ana_main',
    userId: 'usr_ana',
    label: 'Principal',
    provider: 'metamask',
    address: '0x7A42c1F09b3E5d2A84b0Ce9F71aD3E6B21C419E8',
    ensName: null,
    networks: ['ethereum', 'polygon'],
    isDefault: true,
    connected: false,
  },
  {
    id: 'wal_ana_backup',
    userId: 'usr_ana',
    label: 'Reserva',
    provider: 'coinbase',
    address: '0x3B91e0A7c45D2f8E1b6A9C03dF57e4B8A20f6C1D',
    ensName: 'nova.kurio.eth',
    networks: ['polygon'],
    isDefault: false,
    connected: false,
  },
  {
    id: 'wal_bruno_main',
    userId: 'usr_bruno',
    label: 'Principal',
    provider: 'walletconnect',
    address: '0x9C0dE4b17aF2836B5e1D40c9A8F3b62E7D51a0B4',
    ensName: null,
    networks: ['ethereum'],
    isDefault: true,
    connected: false,
  },
]
