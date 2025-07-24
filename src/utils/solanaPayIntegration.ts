import {
  createTransfer,
  createTransferInstruction,
  encodeURL,
  findTransactionSignature,
  parseURL,
  validateTransactionSignature,
  TransferRequestURL,
  TransactionRequestURL,
} from '@solana/pay';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  SendOptions,
} from '@solana/web3.js';
import { connection, PROJECT_TREASURY, FEE_STRUCTURE, MOCK_SOL_PRICE_USD, BONK_MINT } from './solanaConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaymentRequest {
  recipient: PublicKey;
  amount: number;
  splToken?: PublicKey;
  reference?: PublicKey;
  label?: string;
  message?: string;
  memo?: string;
}

export interface StockPurchasePayment {
  stockSymbol: string;
  stockPrice: number;
  quantity: number;
  totalUSD: number;
  solAmount: number;
  bonkAmount?: number;
  feeSOL: number;
  category: 'traditional' | 'crypto' | 'premium';
}

/**
 * Solana Pay integration for mobile payments
 * Supports both SOL and BONK token payments
 */
export class SolanaPayService {
  private connection: Connection;

  constructor() {
    this.connection = connection;
  }

  /**
   * Create a Solana Pay transfer URL for stock purchases
   */
  async createStockPurchaseURL(
    payment: StockPurchasePayment,
    paymentMethod: 'SOL' | 'BONK' = 'SOL'
  ): Promise<{ url: URL; reference: PublicKey }> {
    try {
      const reference = new PublicKey(Array(32).fill(0).map(() => Math.floor(Math.random() * 256)));
      
      const transferRequest: TransferRequestURL = {
        recipient: PROJECT_TREASURY,
        amount: paymentMethod === 'SOL' ? payment.solAmount + payment.feeSOL : payment.bonkAmount || 0,
        splToken: paymentMethod === 'BONK' ? BONK_MINT : undefined,
        reference,
        label: `Sol Stocks - ${payment.stockSymbol}`,
        message: `Purchase ${payment.quantity} shares of ${payment.stockSymbol} for $${payment.totalUSD.toFixed(2)}`,
        memo: `STOCK_PURCHASE:${payment.stockSymbol}:${payment.quantity}:${paymentMethod}`,
      };

      const url = encodeURL(transferRequest);
      
      // Store payment details for confirmation
      await this.storePaymentReference(reference.toBase58(), {
        ...payment,
        paymentMethod,
        timestamp: Date.now(),
        status: 'pending',
      });

      return { url, reference };
    } catch (error) {
      console.error('Failed to create payment URL:', error);
      throw new Error('Failed to create payment URL');
    }
  }

  /**
   * Create a direct transfer instruction for mobile wallet
   */
  async createStockPurchaseTransaction(
    userPublicKey: PublicKey,
    payment: StockPurchasePayment,
    paymentMethod: 'SOL' | 'BONK' = 'SOL'
  ): Promise<Transaction> {
    try {
      const transaction = new Transaction();
      
      if (paymentMethod === 'SOL') {
        // Add stock purchase amount transfer
        const stockTransfer = SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: PROJECT_TREASURY,
          lamports: payment.solAmount * LAMPORTS_PER_SOL,
        });
        transaction.add(stockTransfer);

        // Add trading fee transfer
        const feeTransfer = SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: PROJECT_TREASURY,
          lamports: payment.feeSOL * LAMPORTS_PER_SOL,
        });
        transaction.add(feeTransfer);
      } else if (paymentMethod === 'BONK' && payment.bonkAmount) {
        // BONK token transfer (would need SPL token program instructions)
        // For now, we'll implement SOL fallback
        const totalSOL = payment.solAmount + payment.feeSOL;
        const transfer = SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: PROJECT_TREASURY,
          lamports: totalSOL * LAMPORTS_PER_SOL,
        });
        transaction.add(transfer);
      }

      // Add memo instruction for transaction tracking
      const memoInstruction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: userPublicKey,
          lamports: 0,
        })
      );
      
      // Set recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      return transaction;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw new Error('Failed to create stock purchase transaction');
    }
  }

  /**
   * Calculate trading fees based on stock category
   */
  calculateTradingFee(
    stockSymbol: string,
    amount: number,
    action: 'buy' | 'sell' = 'buy'
  ): { category: 'traditional' | 'crypto' | 'premium'; feeSOL: number; feePercent: number } {
    // Determine stock category
    let category: 'traditional' | 'crypto' | 'premium' = 'traditional';
    
    const cryptoStocks = ['COIN', 'MSTR', 'RIOT', 'MARA', 'HOOD', 'SQ', 'VANA', 'BTBT', 'BTCS', 'SBET', 'GAME', 'UPXI'];
    const premiumStocks = ['CIRCLE', 'GEMINI', 'KRAKEN', 'OPENSEA'];
    
    if (cryptoStocks.includes(stockSymbol)) {
      category = 'crypto';
    } else if (premiumStocks.includes(stockSymbol)) {
      category = 'premium';
    }

    const feeConfig = FEE_STRUCTURE[category];
    const feePercent = action === 'buy' ? feeConfig.buyFeePercent : feeConfig.sellFeePercent;
    
    let feeSOL = (amount * feePercent) / 100;
    
    // Apply min/max limits
    feeSOL = Math.max(feeConfig.minFeeSOL, Math.min(feeSOL, feeConfig.maxFeeSOL));

    return { category, feeSOL, feePercent };
  }

  /**
   * Convert USD amount to SOL and BONK equivalents
   */
  convertUSDToTokens(usdAmount: number): { solAmount: number; bonkAmount: number } {
    const solAmount = usdAmount / MOCK_SOL_PRICE_USD;
    const bonkAmount = usdAmount * 1000000; // Mock BONK rate: 1 USD = 1M BONK
    
    return { solAmount, bonkAmount };
  }

  /**
   * Create complete stock purchase payment object
   */
  createStockPurchasePayment(
    stockSymbol: string,
    stockPrice: number,
    quantity: number
  ): StockPurchasePayment {
    const totalUSD = stockPrice * quantity;
    const { solAmount, bonkAmount } = this.convertUSDToTokens(totalUSD);
    const { category, feeSOL } = this.calculateTradingFee(stockSymbol, solAmount, 'buy');

    return {
      stockSymbol,
      stockPrice,
      quantity,
      totalUSD,
      solAmount,
      bonkAmount,
      feeSOL,
      category,
    };
  }

  /**
   * Confirm payment by checking transaction on blockchain
   */
  async confirmPayment(reference: PublicKey, timeout: number = 60000): Promise<{
    signature: string;
    confirmed: boolean;
    paymentDetails?: any;
  }> {
    try {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        try {
          // Look for transaction with this reference
          const signature = await findTransactionSignature(
            this.connection,
            reference,
            undefined,
            'confirmed'
          );

          if (signature) {
            // Validate the transaction
            const isValid = await validateTransactionSignature(
              this.connection,
              signature,
              PROJECT_TREASURY,
              undefined,
              reference,
              'confirmed'
            );

            if (isValid) {
              // Get stored payment details
              const paymentDetails = await this.getPaymentReference(reference.toBase58());
              
              // Update payment status
              if (paymentDetails) {
                await this.updatePaymentStatus(reference.toBase58(), 'confirmed', signature);
              }

              return {
                signature,
                confirmed: true,
                paymentDetails,
              };
            }
          }
        } catch (error) {
          // Continue polling
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return {
        signature: '',
        confirmed: false,
      };
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      return {
        signature: '',
        confirmed: false,
      };
    }
  }

  /**
   * Store payment reference for tracking
   */
  private async storePaymentReference(reference: string, paymentData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`payment_${reference}`, JSON.stringify(paymentData));
    } catch (error) {
      console.error('Failed to store payment reference:', error);
    }
  }

  /**
   * Get payment reference data
   */
  private async getPaymentReference(reference: string): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(`payment_${reference}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get payment reference:', error);
      return null;
    }
  }

  /**
   * Update payment status
   */
  private async updatePaymentStatus(
    reference: string,
    status: 'pending' | 'confirmed' | 'failed',
    signature?: string
  ): Promise<void> {
    try {
      const existingData = await this.getPaymentReference(reference);
      if (existingData) {
        const updatedData = {
          ...existingData,
          status,
          signature,
          confirmedAt: status === 'confirmed' ? Date.now() : undefined,
        };
        await AsyncStorage.setItem(`payment_${reference}`, JSON.stringify(updatedData));
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(): Promise<any[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const paymentKeys = keys.filter(key => key.startsWith('payment_'));
      
      const payments = await Promise.all(
        paymentKeys.map(async (key) => {
          try {
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
          } catch {
            return null;
          }
        })
      );

      return payments
        .filter(payment => payment !== null)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get payment history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const solanaPayService = new SolanaPayService();