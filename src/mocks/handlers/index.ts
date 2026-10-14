import { cartHandlers } from './cart'
import { nftHandlers } from './nfts'

export const handlers = [...nftHandlers, ...cartHandlers]
