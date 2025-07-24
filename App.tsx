import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { MobileStockListing } from './src/components/MobileStockListing';
import { MobilePortfolio } from './src/components/MobilePortfolio';
import { mobileWalletService } from './src/utils/mobileWalletAdapter';
import { seedVaultService } from './src/utils/seedVault';
import { PublicKey } from '@solana/web3.js';

type Tab = 'stocks' | 'portfolio';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stocks');
  const [connectedWallet, setConnectedWallet] = useState<PublicKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
    setupDeepLinkHandler();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if device supports secure hardware
      const isDeviceSecure = await seedVaultService.isDeviceSecure();
      if (!isDeviceSecure) {
        Alert.alert(
          'Security Warning',
          'Your device may not support hardware-backed key storage. Proceed with caution.',
          [{ text: 'OK' }]
        );
      }

      // Check for existing wallet connection
      const publicKey = mobileWalletService.getPublicKey();
      if (publicKey) {
        setConnectedWallet(publicKey);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      setIsLoading(false);
    }
  };

  const setupDeepLinkHandler = () => {
    // Handle Solana Pay deep links
    const handleDeepLink = (url: string) => {
      console.log('Received deep link:', url);
      
      if (url.startsWith('solana:')) {
        // Handle Solana Pay URLs
        Alert.alert(
          'Payment Request',
          'You have received a payment request. Would you like to process it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Pay', onPress: () => handleSolanaPayment(url) },
          ]
        );
      }
    };

    // Listen for deep links when app is running
    Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle deep links when app is launched
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });
  };

  const handleSolanaPayment = async (paymentUrl: string) => {
    try {
      // Parse and handle Solana Pay URL
      // This would integrate with the solanaPayService
      console.log('Processing Solana Pay URL:', paymentUrl);
      Alert.alert('Payment Processing', 'Processing your payment request...');
    } catch (error) {
      console.error('Payment processing failed:', error);
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const handleWalletConnect = async () => {
    try {
      const publicKey = await mobileWalletService.connect();
      if (publicKey) {
        setConnectedWallet(publicKey);
        Alert.alert(
          'Wallet Connected',
          `Successfully connected: ${publicKey.toBase58().substring(0, 8)}...`
        );
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      Alert.alert('Connection Failed', 'Unable to connect to wallet');
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      await mobileWalletService.disconnect();
      setConnectedWallet(null);
      Alert.alert('Wallet Disconnected', 'Your wallet has been disconnected');
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
    }
  };

  const requestAirdrop = async () => {
    if (!connectedWallet) {
      Alert.alert('No Wallet', 'Please connect your wallet first');
      return;
    }

    try {
      Alert.alert(
        'Request Airdrop',
        'Request 2 SOL from devnet faucet?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request',
            onPress: async () => {
              const signature = await mobileWalletService.requestAirdrop(2);
              if (signature) {
                Alert.alert(
                  'Airdrop Successful',
                  `Received 2 SOL!\n\nTransaction: ${signature.substring(0, 8)}...`
                );
              } else {
                Alert.alert('Airdrop Failed', 'Unable to request airdrop');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Airdrop request failed:', error);
      Alert.alert('Error', 'Failed to request airdrop');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.appTitle}>Sol Stocks</Text>
        <View style={styles.headerActions}>
          {connectedWallet ? (
            <View style={styles.walletInfo}>
              <Text style={styles.walletAddress}>
                {connectedWallet.toBase58().substring(0, 6)}...
              </Text>
              <TouchableOpacity
                style={styles.airdropButton}
                onPress={requestAirdrop}
              >
                <Text style={styles.airdropButtonText}>💧 Airdrop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleWalletDisconnect}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleWalletConnect}
            >
              <Text style={styles.connectButtonText}>Connect Wallet</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.appSubtitle}>
        Trade stocks with Solana • Powered by Mobile Wallet Adapter
      </Text>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'stocks' && styles.activeTab]}
        onPress={() => setActiveTab('stocks')}
      >
        <Text style={[styles.tabText, activeTab === 'stocks' && styles.activeTabText]}>
          📈 Stocks
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'portfolio' && styles.activeTab]}
        onPress={() => setActiveTab('portfolio')}
      >
        <Text style={[styles.tabText, activeTab === 'portfolio' && styles.activeTabText]}>
          💼 Portfolio
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#9945FF" />
        <Text style={styles.loadingText}>Loading Sol Stocks...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9945FF" />
      
      {renderHeader()}
      {renderTabBar()}
      
      <View style={styles.content}>
        {activeTab === 'stocks' ? (
          <MobileStockListing />
        ) : (
          <MobilePortfolio />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9945FF',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#e0e0ff',
    opacity: 0.9,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletAddress: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: 'monospace',
  },
  connectButton: {
    backgroundColor: '#14f195',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  airdropButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  airdropButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#9945FF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#9945FF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default App;
