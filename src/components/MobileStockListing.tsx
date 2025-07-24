import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { mobileWalletService } from '../utils/mobileWalletAdapter';
import { solanaPayService, StockPurchasePayment } from '../utils/solanaPayIntegration';
import { seedVaultService } from '../utils/seedVault';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: 'traditional' | 'crypto' | 'premium';
  logo?: string;
}

interface MobileStockListingProps {
  onStockSelect?: (stock: Stock) => void;
}

export const MobileStockListing: React.FC<MobileStockListingProps> = ({ onStockSelect }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'traditional' | 'crypto' | 'premium'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<PublicKey | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Mock stock data (in production, this would come from an API)
  const mockStocks: Stock[] = [
    // Traditional stocks
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.72, change: 2.15, changePercent: 1.22, category: 'traditional' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.21, change: -1.45, changePercent: -1.04, category: 'traditional' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.85, change: 3.22, changePercent: 0.86, category: 'traditional' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -8.75, changePercent: -3.40, category: 'traditional' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.89, change: 1.89, changePercent: 1.23, category: 'traditional' },
    
    // Crypto stocks
    { symbol: 'COIN', name: 'Coinbase Global', price: 245.67, change: 15.23, changePercent: 6.60, category: 'crypto' },
    { symbol: 'MSTR', name: 'MicroStrategy Inc.', price: 387.45, change: 22.15, changePercent: 6.07, category: 'crypto' },
    { symbol: 'RIOT', name: 'Riot Platforms', price: 12.85, change: 0.95, changePercent: 7.98, category: 'crypto' },
    { symbol: 'MARA', name: 'Marathon Digital', price: 19.67, change: 1.34, changePercent: 7.31, category: 'crypto' },
    { symbol: 'HOOD', name: 'Robinhood Markets', price: 23.45, change: -0.67, changePercent: -2.78, category: 'crypto' },
    { symbol: 'VANA', name: 'Vanna Holdings', price: 45.32, change: 3.21, changePercent: 7.62, category: 'crypto' },
    
    // Premium stocks
    { symbol: 'CIRCLE', name: 'Circle Internet Financial', price: 125.00, change: 5.67, changePercent: 4.75, category: 'premium' },
    { symbol: 'GEMINI', name: 'Gemini Trust Company', price: 89.50, change: 2.15, changePercent: 2.46, category: 'premium' },
    { symbol: 'KRAKEN', name: 'Kraken Digital Asset Exchange', price: 156.78, change: 8.90, changePercent: 6.02, category: 'premium' },
    { symbol: 'OPENSEA', name: 'OpenSea Technologies', price: 67.34, change: -2.45, changePercent: -3.51, category: 'premium' },
  ];

  useEffect(() => {
    loadStocks();
    checkWalletConnection();
  }, []);

  useEffect(() => {
    filterStocks();
  }, [searchQuery, selectedCategory, stocks]);

  const loadStocks = async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStocks(mockStocks);
    } catch (error) {
      console.error('Failed to load stocks:', error);
      Alert.alert('Error', 'Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  const checkWalletConnection = async () => {
    try {
      const publicKey = mobileWalletService.getPublicKey();
      setConnectedWallet(publicKey);
      
      if (publicKey) {
        const balance = await mobileWalletService.getBalance();
        setUserBalance(balance);
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      const publicKey = await mobileWalletService.connect();
      if (publicKey) {
        setConnectedWallet(publicKey);
        const balance = await mobileWalletService.getBalance();
        setUserBalance(balance);
        Alert.alert('Success', `Wallet connected: ${publicKey.toBase58().substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const filterStocks = () => {
    let filtered = stocks;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(stock => stock.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(stock =>
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStocks(filtered);
  };

  const handleStockPurchase = async (stock: Stock) => {
    if (!connectedWallet) {
      Alert.alert('Wallet Required', 'Please connect your wallet to make purchases');
      return;
    }

    Alert.prompt(
      'Purchase Stock',
      `How many shares of ${stock.symbol} would you like to buy?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async (quantity) => {
            if (quantity && !isNaN(Number(quantity))) {
              await processPurchase(stock, Number(quantity));
            }
          },
        },
      ],
      'plain-text',
      '1'
    );
  };

  const processPurchase = async (stock: Stock, quantity: number) => {
    try {
      // Create payment details
      const payment = solanaPayService.createStockPurchasePayment(
        stock.symbol,
        stock.price,
        quantity
      );

      // Show payment confirmation
      Alert.alert(
        'Confirm Purchase',
        `Purchase ${quantity} shares of ${stock.symbol}\n\n` +
        `Total: $${payment.totalUSD.toFixed(2)}\n` +
        `SOL Amount: ${payment.solAmount.toFixed(4)} SOL\n` +
        `Trading Fee: ${payment.feeSOL.toFixed(4)} SOL\n` +
        `Total SOL: ${(payment.solAmount + payment.feeSOL).toFixed(4)} SOL`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay with SOL', onPress: () => executePurchase(payment, 'SOL') },
          { text: 'Pay with BONK', onPress: () => executePurchase(payment, 'BONK') },
        ]
      );
    } catch (error) {
      console.error('Purchase processing failed:', error);
      Alert.alert('Error', 'Failed to process purchase');
    }
  };

  const executePurchase = async (payment: StockPurchasePayment, paymentMethod: 'SOL' | 'BONK') => {
    try {
      if (!connectedWallet) return;

      // Create transaction
      const transaction = await solanaPayService.createStockPurchaseTransaction(
        connectedWallet,
        payment,
        paymentMethod
      );

      // Sign and send transaction
      const signature = await mobileWalletService.signAndSendTransaction(transaction);

      if (signature) {
        Alert.alert(
          'Purchase Successful!',
          `Transaction: ${signature.substring(0, 8)}...\n\n` +
          `You now own ${payment.quantity} shares of ${payment.stockSymbol}`,
          [{ text: 'OK', onPress: () => refreshBalance() }]
        );
      } else {
        Alert.alert('Error', 'Transaction failed');
      }
    } catch (error) {
      console.error('Purchase execution failed:', error);
      Alert.alert('Error', 'Failed to execute purchase');
    }
  };

  const refreshBalance = async () => {
    if (connectedWallet) {
      const balance = await mobileWalletService.getBalance();
      setUserBalance(balance);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStocks();
    await refreshBalance();
    setRefreshing(false);
  };

  const renderStockItem = ({ item }: { item: Stock }) => (
    <TouchableOpacity
      style={styles.stockItem}
      onPress={() => onStockSelect ? onStockSelect(item) : handleStockPurchase(item)}
    >
      <View style={styles.stockInfo}>
        <View style={styles.stockHeader}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <View style={[styles.categoryBadge, styles[`${item.category}Badge`]]}>
            <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.stockName}>{item.name}</Text>
        <View style={styles.stockPrice}>
          <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
          <Text style={[styles.changeText, item.change >= 0 ? styles.positive : styles.negative]}>
            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilter}>
      {['all', 'traditional', 'crypto', 'premium'].map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.activeCategoryButton
          ]}
          onPress={() => setSelectedCategory(category as any)}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === category && styles.activeCategoryButtonText
          ]}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9945FF" />
        <Text style={styles.loadingText}>Loading stocks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wallet Status */}
      <View style={styles.walletStatus}>
        {connectedWallet ? (
          <View style={styles.walletConnected}>
            <Text style={styles.walletText}>
              {connectedWallet.toBase58().substring(0, 8)}...
            </Text>
            <Text style={styles.balanceText}>
              {userBalance.toFixed(4)} SOL
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stocks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Stock List */}
      <FlatList
        data={filteredStocks}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.symbol}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  walletStatus: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  walletConnected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  balanceText: {
    fontSize: 16,
    color: '#9945FF',
    fontWeight: 'bold',
  },
  connectButton: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeCategoryButton: {
    backgroundColor: '#9945FF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
  stockItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stockInfo: {
    flex: 1,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  traditionalBadge: {
    backgroundColor: '#e3f2fd',
  },
  cryptoBadge: {
    backgroundColor: '#f3e5f5',
  },
  premiumBadge: {
    backgroundColor: '#fff3e0',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  stockName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  stockPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  positive: {
    color: '#4caf50',
  },
  negative: {
    color: '#f44336',
  },
});