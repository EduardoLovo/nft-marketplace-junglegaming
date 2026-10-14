import { realtimeHandlers } from '../realtime'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { walletHandlers } from './wallets'

export const handlers = [
  ...nftHandlers,
  ...cartHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...walletHandlers,
  ...favoriteHandlers,
  ...orderHandlers,
  ...realtimeHandlers,
]
