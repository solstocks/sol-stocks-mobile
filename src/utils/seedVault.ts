import { Keypair, PublicKey } from '@solana/web3.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { getRandomBytes } from 'react-native-get-random-values';

export interface SeedVaultService {
  generateSeed(): Promise<Uint8Array>;
  storeSeed(seed: Uint8Array, alias: string): Promise<boolean>;
  retrieveSeed(alias: string): Promise<Uint8Array | null>;
  deleteSeed(alias: string): Promise<boolean>;
  createKeypairFromSeed(seed: Uint8Array): Keypair;
  isDeviceSecure(): Promise<boolean>;
}

/**
 * Seed Vault integration for secure key management
 * This implements the Solana Mobile Stack Seed Vault for secure storage
 */
export class MobileSeedVault implements SeedVaultService {
  private readonly SEED_VAULT_PREFIX = 'sol_stocks_seed_';
  private readonly KEYCHAIN_SERVICE = 'SolStocksKeychainService';

  /**
   * Generate cryptographically secure random seed
   */
  async generateSeed(): Promise<Uint8Array> {
    try {
      // Generate 32 bytes of cryptographically secure random data
      const seed = new Uint8Array(32);
      getRandomBytes(seed);
      return seed;
    } catch (error) {
      console.error('Seed generation failed:', error);
      throw new Error('Failed to generate secure seed');
    }
  }

  /**
   * Store seed securely in device keychain
   */
  async storeSeed(seed: Uint8Array, alias: string): Promise<boolean> {
    try {
      const seedBase64 = Buffer.from(seed).toString('base64');
      const keychainKey = `${this.SEED_VAULT_PREFIX}${alias}`;
      
      // Store in secure keychain with biometric protection if available
      const result = await Keychain.setInternetCredentials(
        keychainKey,
        alias,
        seedBase64,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          authenticatePrompt: 'Authenticate to store your Sol Stocks seed',
          service: this.KEYCHAIN_SERVICE,
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        }
      );

      if (result) {
        // Store metadata for seed management
        await AsyncStorage.setItem(`${keychainKey}_metadata`, JSON.stringify({
          alias,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        }));
      }

      return result;
    } catch (error) {
      console.error('Seed storage failed:', error);
      return false;
    }
  }

  /**
   * Retrieve seed from secure storage
   */
  async retrieveSeed(alias: string): Promise<Uint8Array | null> {
    try {
      const keychainKey = `${this.SEED_VAULT_PREFIX}${alias}`;
      
      const credentials = await Keychain.getInternetCredentials(keychainKey, {
        authenticatePrompt: 'Authenticate to access your Sol Stocks seed',
        service: this.KEYCHAIN_SERVICE,
      });

      if (credentials && credentials.password) {
        // Update last used timestamp
        await AsyncStorage.setItem(`${keychainKey}_metadata`, JSON.stringify({
          alias,
          lastUsed: Date.now(),
        }));

        const seedBuffer = Buffer.from(credentials.password, 'base64');
        return new Uint8Array(seedBuffer);
      }

      return null;
    } catch (error) {
      console.error('Seed retrieval failed:', error);
      return null;
    }
  }

  /**
   * Delete seed from secure storage
   */
  async deleteSeed(alias: string): Promise<boolean> {
    try {
      const keychainKey = `${this.SEED_VAULT_PREFIX}${alias}`;
      
      const result = await Keychain.resetInternetCredentials(keychainKey, {
        service: this.KEYCHAIN_SERVICE,
      });

      if (result) {
        // Remove metadata
        await AsyncStorage.removeItem(`${keychainKey}_metadata`);
      }

      return result;
    } catch (error) {
      console.error('Seed deletion failed:', error);
      return false;
    }
  }

  /**
   * Create Solana keypair from seed
   */
  createKeypairFromSeed(seed: Uint8Array): Keypair {
    try {
      return Keypair.fromSeed(seed.slice(0, 32));
    } catch (error) {
      console.error('Keypair creation failed:', error);
      throw new Error('Failed to create keypair from seed');
    }
  }

  /**
   * Check if device has secure hardware for key storage
   */
  async isDeviceSecure(): Promise<boolean> {
    try {
      const securityLevel = await Keychain.getSecurityLevel({
        service: this.KEYCHAIN_SERVICE,
      });
      
      return securityLevel === Keychain.SECURITY_LEVEL.SECURE_HARDWARE ||
             securityLevel === Keychain.SECURITY_LEVEL.SECURE_SOFTWARE;
    } catch (error) {
      console.error('Device security check failed:', error);
      return false;
    }
  }

  /**
   * List all stored seeds
   */
  async listSeeds(): Promise<Array<{ alias: string; createdAt: number; lastUsed: number }>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const seedKeys = keys.filter(key => key.includes(`${this.SEED_VAULT_PREFIX}`) && key.includes('_metadata'));
      
      const seedInfos = await Promise.all(
        seedKeys.map(async (key) => {
          try {
            const metadata = await AsyncStorage.getItem(key);
            return metadata ? JSON.parse(metadata) : null;
          } catch {
            return null;
          }
        })
      );

      return seedInfos.filter(info => info !== null);
    } catch (error) {
      console.error('Seed listing failed:', error);
      return [];
    }
  }

  /**
   * Generate and store a new seed for the user
   */
  async createUserSeed(userAlias: string = 'default'): Promise<{ seed: Uint8Array; keypair: Keypair; publicKey: string } | null> {
    try {
      const seed = await this.generateSeed();
      const keypair = this.createKeypairFromSeed(seed);
      
      const stored = await this.storeSeed(seed, userAlias);
      if (!stored) {
        throw new Error('Failed to store seed securely');
      }

      return {
        seed,
        keypair,
        publicKey: keypair.publicKey.toBase58(),
      };
    } catch (error) {
      console.error('User seed creation failed:', error);
      return null;
    }
  }

  /**
   * Recover user keypair from stored seed
   */
  async recoverUserKeypair(userAlias: string = 'default'): Promise<Keypair | null> {
    try {
      const seed = await this.retrieveSeed(userAlias);
      if (!seed) {
        return null;
      }

      return this.createKeypairFromSeed(seed);
    } catch (error) {
      console.error('User keypair recovery failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const seedVaultService = new MobileSeedVault();

// Utility functions for common operations
export const SeedVaultUtils = {
  async setupUserWallet(alias: string = 'sol_stocks_user'): Promise<{
    publicKey: string;
    isNewWallet: boolean;
  } | null> {
    try {
      // Try to recover existing wallet first
      let keypair = await seedVaultService.recoverUserKeypair(alias);
      let isNewWallet = false;

      if (!keypair) {
        // Create new wallet if none exists
        const result = await seedVaultService.createUserSeed(alias);
        if (!result) {
          return null;
        }
        keypair = result.keypair;
        isNewWallet = true;
      }

      return {
        publicKey: keypair.publicKey.toBase58(),
        isNewWallet,
      };
    } catch (error) {
      console.error('Wallet setup failed:', error);
      return null;
    }
  },

  async signTransaction(transaction: any, userAlias: string = 'sol_stocks_user'): Promise<any | null> {
    try {
      const keypair = await seedVaultService.recoverUserKeypair(userAlias);
      if (!keypair) {
        throw new Error('No keypair found for user');
      }

      // Sign the transaction
      transaction.sign(keypair);
      return transaction;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      return null;
    }
  },
};