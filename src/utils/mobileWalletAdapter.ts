import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { APP_IDENTITY, connection } from './solanaConfig';

export interface MobileWalletAdapterConfig {
  cluster: 'devnet' | 'testnet' | 'mainnet-beta';
  onConnect?: (publicKey: PublicKey) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export class MobileWalletService {
  private connection: Connection;
  private connectedPublicKey: PublicKey | null = null;
  private config: MobileWalletAdapterConfig;

  constructor(config: MobileWalletAdapterConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Connect to mobile wallet using Mobile Wallet Adapter
   */
  async connect(): Promise<PublicKey | null> {
    try {
      const authorizationResult = await transact(async (wallet: Web3MobileWallet) => {
        // Request authorization from the wallet
        const authorizationResult = await wallet.authorize({
          cluster: this.config.cluster,
          identity: APP_IDENTITY,
        });

        return authorizationResult;
      });

      if (authorizationResult.accounts.length > 0) {
        this.connectedPublicKey = authorizationResult.accounts[0].publicKey;
        this.config.onConnect?.(this.connectedPublicKey);
        return this.connectedPublicKey;
      }

      throw new Error('No accounts found');
    } catch (error) {
      console.error('Mobile wallet connection failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Disconnect from mobile wallet
   */
  async disconnect(): Promise<void> {
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({
          auth_token: '', // This would be stored from authorization
        });
      });

      this.connectedPublicKey = null;
      this.config.onDisconnect?.();
    } catch (error) {
      console.error('Mobile wallet disconnection failed:', error);
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Sign transaction using mobile wallet
   */
  async signTransaction(transaction: Transaction): Promise<Transaction | null> {
    if (!this.connectedPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransaction = await transact(async (wallet: Web3MobileWallet) => {
        // Get latest blockhash
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.connectedPublicKey!;

        // Sign the transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      return signedTransaction;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Sign and send transaction
   */
  async signAndSendTransaction(transaction: Transaction): Promise<string | null> {
    if (!this.connectedPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await transact(async (wallet: Web3MobileWallet) => {
        // Get latest blockhash
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.connectedPublicKey!;

        // Sign and send the transaction
        const signedTransactions = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Transaction failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Request airdrop for devnet testing
   */
  async requestAirdrop(amount: number = 2): Promise<string | null> {
    if (!this.connectedPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.connection.requestAirdrop(
        this.connectedPublicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Airdrop failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Get SOL balance
   */
  async getBalance(): Promise<number> {
    if (!this.connectedPublicKey) {
      return 0;
    }

    try {
      const balance = await this.connection.getBalance(this.connectedPublicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Balance fetch failed:', error);
      return 0;
    }
  }

  /**
   * Get connected public key
   */
  getPublicKey(): PublicKey | null {
    return this.connectedPublicKey;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connectedPublicKey !== null;
  }
}

// Export singleton instance
export const mobileWalletService = new MobileWalletService({
  cluster: 'devnet',
  onConnect: (publicKey) => {
    console.log('Wallet connected:', publicKey.toBase58());
  },
  onDisconnect: () => {
    console.log('Wallet disconnected');
  },
  onError: (error) => {
    console.error('Mobile wallet error:', error);
  },
});