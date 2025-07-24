import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Solana network configuration
export const SOLANA_NETWORK = 'devnet'; // Use devnet for development
export const RPC_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

// Initialize Solana connection
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Treasury configuration from the Next.js app
export const PROJECT_TREASURY = new PublicKey('ATs1VRY6PGi8nSJA1RZJTpEmFc6mXNEnbWBCwWsVKWWY');
export const BACKUP_TREASURY = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');

// Fee structure (same as Next.js app)
export const FEE_STRUCTURE = {
  traditional: {
    buyFeePercent: 0.25,
    sellFeePercent: 0.35,
    minFeeSOL: 0.001,
    maxFeeSOL: 0.1
  },
  crypto: {
    buyFeePercent: 0.35,
    sellFeePercent: 0.45,
    minFeeSOL: 0.002,
    maxFeeSOL: 0.15
  },
  premium: {
    buyFeePercent: 0.5,
    sellFeePercent: 0.6,
    minFeeSOL: 0.003,
    maxFeeSOL: 0.2
  }
} as const;

// Stock categories for fee calculation
export const STOCK_CATEGORIES = {
  traditional: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'],
  crypto: ['COIN', 'MSTR', 'RIOT', 'MARA', 'HOOD', 'SQ', 'VANA', 'BTBT', 'BTCS', 'SBET', 'GAME', 'UPXI'],
  premium: ['CIRCLE', 'GEMINI', 'KRAKEN', 'OPENSEA']
} as const;

// Mock SOL price for conversions
export const MOCK_SOL_PRICE_USD = 200;

// Mock BONK token mint address (for testnet)
export const BONK_MINT = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');

// Solana Mobile Stack App Identity
export const APP_IDENTITY = {
  name: 'Sol Stocks',
  uri: 'https://solstocks.com',
  icon: 'favicon.ico', // Add your app icon here
};

// dApp Store compatibility
export const DAPP_METADATA = {
  name: 'Sol Stocks',
  description: 'Trade stocks with SOL and BONK on Solana',
  image: 'https://solstocks.com/icon.png',
  website: 'https://solstocks.com',
  category: 'Finance',
  version: '1.0.0',
};