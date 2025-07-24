import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricService {
  isBiometricAvailable(): Promise<boolean>;
  getBiometricType(): Promise<BiometryTypes | null>;
  authenticateWithBiometrics(reason: string): Promise<boolean>;
  createBiometricKeys(): Promise<boolean>;
  signWithBiometrics(payload: string): Promise<string | null>;
  deleteBiometricKeys(): Promise<boolean>;
}

/**
 * Native Android biometric authentication service
 * Integrates with Android's biometric APIs for secure authentication
 */
export class AndroidBiometricService implements BiometricService {
  private rnBiometrics: ReactNativeBiometrics;
  private readonly keyAlias = 'sol_stocks_biometric_key';

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const { available } = await this.rnBiometrics.isSensorAvailable();
      return available;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  async getBiometricType(): Promise<BiometryTypes | null> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return available ? biometryType : null;
    } catch (error) {
      console.error('Biometric type check failed:', error);
      return null;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateWithBiometrics(reason: string): Promise<boolean> {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: reason,
        cancelButtonText: 'Cancel',
      });
      return success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Create biometric keys for advanced authentication
   */
  async createBiometricKeys(): Promise<boolean> {
    try {
      const { available } = await this.rnBiometrics.isSensorAvailable();
      if (!available) {
        return false;
      }

      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      if (keysExist) {
        return true; // Keys already exist
      }

      const { publicKey } = await this.rnBiometrics.createKeys();
      
      // Store public key for verification
      await AsyncStorage.setItem(`${this.keyAlias}_public`, publicKey);
      
      return true;
    } catch (error) {
      console.error('Biometric key creation failed:', error);
      return false;
    }
  }

  /**
   * Sign data with biometric authentication
   */
  async signWithBiometrics(payload: string): Promise<string | null> {
    try {
      const { available } = await this.rnBiometrics.isSensorAvailable();
      if (!available) {
        return null;
      }

      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      if (!keysExist) {
        const created = await this.createBiometricKeys();
        if (!created) {
          return null;
        }
      }

      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Authenticate to sign transaction',
        payload,
        cancelButtonText: 'Cancel',
      });

      return success ? signature : null;
    } catch (error) {
      console.error('Biometric signing failed:', error);
      return null;
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteBiometricKeys(): Promise<boolean> {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      
      if (keysDeleted) {
        // Remove stored public key
        await AsyncStorage.removeItem(`${this.keyAlias}_public`);
      }
      
      return keysDeleted;
    } catch (error) {
      console.error('Biometric key deletion failed:', error);
      return false;
    }
  }

  /**
   * Get stored public key
   */
  async getPublicKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`${this.keyAlias}_public`);
    } catch (error) {
      console.error('Public key retrieval failed:', error);
      return null;
    }
  }

  /**
   * Verify if biometric keys exist
   */
  async biometricKeysExist(): Promise<boolean> {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      console.error('Biometric keys check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const biometricService = new AndroidBiometricService();

// Utility functions for common operations
export const BiometricUtils = {
  /**
   * Initialize biometric authentication for the app
   */
  async initializeBiometrics(): Promise<{
    available: boolean;
    type: BiometryTypes | null;
    keysCreated: boolean;
  }> {
    try {
      const available = await biometricService.isBiometricAvailable();
      const type = await biometricService.getBiometricType();
      
      let keysCreated = false;
      if (available) {
        keysCreated = await biometricService.createBiometricKeys();
      }

      return { available, type, keysCreated };
    } catch (error) {
      console.error('Biometric initialization failed:', error);
      return { available: false, type: null, keysCreated: false };
    }
  },

  /**
   * Authenticate user for sensitive operations
   */
  async authenticateForSensitiveOperation(
    operation: string = 'access sensitive information'
  ): Promise<boolean> {
    try {
      const available = await biometricService.isBiometricAvailable();
      if (!available) {
        return false;
      }

      return await biometricService.authenticateWithBiometrics(
        `Authenticate to ${operation}`
      );
    } catch (error) {
      console.error('Sensitive operation authentication failed:', error);
      return false;
    }
  },

  /**
   * Get biometric capability info
   */
  async getBiometricInfo(): Promise<{
    available: boolean;
    type: string;
    keysExist: boolean;
  }> {
    try {
      const available = await biometricService.isBiometricAvailable();
      const biometryType = await biometricService.getBiometricType();
      const keysExist = await biometricService.biometricKeysExist();

      let type = 'None';
      if (biometryType === BiometryTypes.TouchID) {
        type = 'Touch ID';
      } else if (biometryType === BiometryTypes.FaceID) {
        type = 'Face ID';
      } else if (biometryType === BiometryTypes.Biometrics) {
        type = 'Biometrics';
      }

      return { available, type, keysExist };
    } catch (error) {
      console.error('Biometric info retrieval failed:', error);
      return { available: false, type: 'None', keysExist: false };
    }
  },

  /**
   * Sign transaction with biometric authentication
   */
  async signTransactionWithBiometrics(transactionData: string): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      const available = await biometricService.isBiometricAvailable();
      if (!available) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      const signature = await biometricService.signWithBiometrics(transactionData);
      
      if (signature) {
        return { success: true, signature };
      } else {
        return { success: false, error: 'Authentication failed or cancelled' };
      }
    } catch (error) {
      console.error('Transaction signing with biometrics failed:', error);
      return { success: false, error: 'Signing failed' };
    }
  },
};