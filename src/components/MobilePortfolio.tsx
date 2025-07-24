import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { mobileWalletService } from '../utils/mobileWalletAdapter';
import { solanaPayService } from '../utils/solanaPayIntegration';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  category: 'traditional' | 'crypto' | 'premium';
}

interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalPL: number;
  totalPLPercent: number;
  solBalance: number;
  dayChange: number;
  dayChangePercent: number;
}

export const MobilePortfolio: React.FC = () => {
  const [connectedWallet, setConnectedWallet] = useState<PublicKey | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    totalInvested: 0,
    totalPL: 0,
    totalPLPercent: 0,
    solBalance: 0,
    dayChange: 0,
    dayChangePercent: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (connectedWallet) {
      loadPortfolioData();
    }
  }, [connectedWallet]);

  const checkWalletConnection = async () => {
    try {
      const publicKey = mobileWalletService.getPublicKey();
      setConnectedWallet(publicKey);
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      const publicKey = await mobileWalletService.connect();
      if (publicKey) {
        setConnectedWallet(publicKey);
        Alert.alert('Success', `Wallet connected: ${publicKey.toBase58().substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const loadPortfolioData = async () => {
    if (!connectedWallet) return;

    setIsLoading(true);
    try {
      // Load user's transaction history and calculate holdings
      const paymentHistory = await solanaPayService.getPaymentHistory();
      const confirmedPurchases = paymentHistory.filter(p => p.status === 'confirmed');
      
      // Group purchases by stock symbol
      const holdingsMap = new Map<string, any>();
      
      confirmedPurchases.forEach(purchase => {
        if (holdingsMap.has(purchase.stockSymbol)) {
          const existing = holdingsMap.get(purchase.stockSymbol);
          existing.quantity += purchase.quantity;
          existing.totalInvested += purchase.totalUSD;
        } else {
          holdingsMap.set(purchase.stockSymbol, {
            symbol: purchase.stockSymbol,
            quantity: purchase.quantity,
            totalInvested: purchase.totalUSD,
            category: purchase.category,
          });
        }
      });

      // Convert to holdings array with current prices
      const holdingsArray: PortfolioHolding[] = Array.from(holdingsMap.values()).map(holding => {
        const currentPrice = getCurrentStockPrice(holding.symbol);
        const avgPrice = holding.totalInvested / holding.quantity;
        const totalValue = currentPrice * holding.quantity;
        const unrealizedPL = totalValue - holding.totalInvested;
        const unrealizedPLPercent = (unrealizedPL / holding.totalInvested) * 100;

        return {
          symbol: holding.symbol,
          name: getStockName(holding.symbol),
          quantity: holding.quantity,
          avgPrice,
          currentPrice,
          totalValue,
          unrealizedPL,
          unrealizedPLPercent,
          category: holding.category,
        };
      });

      setHoldings(holdingsArray);

      // Calculate portfolio summary
      const totalValue = holdingsArray.reduce((sum, holding) => sum + holding.totalValue, 0);
      const totalInvested = holdingsArray.reduce((sum, holding) => sum + (holding.avgPrice * holding.quantity), 0);
      const totalPL = totalValue - totalInvested;
      const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
      
      // Get SOL balance
      const solBalance = await mobileWalletService.getBalance();
      
      // Mock day change (in production, this would be calculated from historical data)
      const dayChange = totalValue * (Math.random() * 0.06 - 0.03); // Random ±3%
      const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

      setSummary({
        totalValue,
        totalInvested,
        totalPL,
        totalPLPercent,
        solBalance,
        dayChange,
        dayChangePercent,
      });

    } catch (error) {
      console.error('Failed to load portfolio data:', error);
      Alert.alert('Error', 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentStockPrice = (symbol: string): number => {
    // Mock current prices (in production, this would come from an API)
    const prices: { [key: string]: number } = {
      'AAPL': 178.72,
      'GOOGL': 138.21,
      'MSFT': 378.85,
      'TSLA': 248.50,
      'AMZN': 155.89,
      'COIN': 245.67,
      'MSTR': 387.45,
      'RIOT': 12.85,
      'MARA': 19.67,
      'HOOD': 23.45,
      'VANA': 45.32,
      'CIRCLE': 125.00,
      'GEMINI': 89.50,
      'KRAKEN': 156.78,
      'OPENSEA': 67.34,
    };
    return prices[symbol] || 100;
  };

  const getStockName = (symbol: string): string => {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corp.',
      'TSLA': 'Tesla Inc.',
      'AMZN': 'Amazon.com Inc.',
      'COIN': 'Coinbase Global',
      'MSTR': 'MicroStrategy Inc.',
      'RIOT': 'Riot Platforms',
      'MARA': 'Marathon Digital',
      'HOOD': 'Robinhood Markets',
      'VANA': 'Vanna Holdings',
      'CIRCLE': 'Circle Internet Financial',
      'GEMINI': 'Gemini Trust Company',
      'KRAKEN': 'Kraken Digital Asset Exchange',
      'OPENSEA': 'OpenSea Technologies',
    };
    return names[symbol] || symbol;
  };

  const handleSellStock = async (holding: PortfolioHolding) => {
    Alert.prompt(
      'Sell Stock',
      `How many shares of ${holding.symbol} would you like to sell?\nYou own ${holding.quantity} shares`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          onPress: async (quantity) => {
            if (quantity && !isNaN(Number(quantity))) {
              const sellQuantity = Number(quantity);
              if (sellQuantity > holding.quantity) {
                Alert.alert('Error', 'You cannot sell more shares than you own');
                return;
              }
              await processSell(holding, sellQuantity);
            }
          },
        },
      ],
      'plain-text',
      Math.min(holding.quantity, 1).toString()
    );
  };

  const processSell = async (holding: PortfolioHolding, quantity: number) => {
    try {
      if (!connectedWallet) return;

      const sellValue = holding.currentPrice * quantity;
      const { feeSOL } = solanaPayService.calculateTradingFee(holding.symbol, sellValue / 200, 'sell'); // Assuming $200 SOL
      const netSOL = (sellValue / 200) - feeSOL;

      Alert.alert(
        'Confirm Sale',
        `Sell ${quantity} shares of ${holding.symbol}\n\n` +
        `Sale Value: $${sellValue.toFixed(2)}\n` +
        `You'll receive: ${netSOL.toFixed(4)} SOL\n` +
        `Trading Fee: ${feeSOL.toFixed(4)} SOL`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Sale', onPress: () => executeSell(holding, quantity, netSOL) },
        ]
      );
    } catch (error) {
      console.error('Sell processing failed:', error);
      Alert.alert('Error', 'Failed to process sale');
    }
  };

  const executeSell = async (holding: PortfolioHolding, quantity: number, netSOL: number) => {
    try {
      // In a real implementation, this would create a sell transaction
      // For now, we'll simulate the sale by updating local storage
      
      Alert.alert(
        'Sale Successful!',
        `Sold ${quantity} shares of ${holding.symbol}\n` +
        `Received: ${netSOL.toFixed(4)} SOL`,
        [{ text: 'OK', onPress: () => onRefresh() }]
      );
    } catch (error) {
      console.error('Sell execution failed:', error);
      Alert.alert('Error', 'Failed to execute sale');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
  };

  const renderPortfolioSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Portfolio Value</Text>
        <Text style={styles.totalValue}>${summary.totalValue.toFixed(2)}</Text>
        <View style={styles.dayChange}>
          <Text style={[styles.dayChangeText, summary.dayChange >= 0 ? styles.positive : styles.negative]}>
            {summary.dayChange >= 0 ? '+' : ''}${Math.abs(summary.dayChange).toFixed(2)} (
            {summary.dayChangePercent >= 0 ? '+' : ''}{summary.dayChangePercent.toFixed(2)}%)
          </Text>
          <Text style={styles.dayChangeLabel}>Today</Text>
        </View>
      </View>

      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total P&L</Text>
          <Text style={[styles.statValue, summary.totalPL >= 0 ? styles.positive : styles.negative]}>
            {summary.totalPL >= 0 ? '+' : ''}${summary.totalPL.toFixed(2)}
          </Text>
          <Text style={[styles.statPercent, summary.totalPL >= 0 ? styles.positive : styles.negative]}>
            ({summary.totalPLPercent >= 0 ? '+' : ''}{summary.totalPLPercent.toFixed(2)}%)
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>SOL Balance</Text>
          <Text style={styles.statValue}>{summary.solBalance.toFixed(4)} SOL</Text>
          <Text style={styles.statPercent}>${(summary.solBalance * 200).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderHolding = (holding: PortfolioHolding) => (
    <TouchableOpacity
      key={holding.symbol}
      style={styles.holdingItem}
      onPress={() => handleSellStock(holding)}
    >
      <View style={styles.holdingHeader}>
        <View>
          <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
          <Text style={styles.holdingName}>{holding.name}</Text>
        </View>
        <View style={[styles.categoryBadge, styles[`${holding.category}Badge`]]}>
          <Text style={styles.categoryText}>{holding.category.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.holdingDetails}>
        <View style={styles.holdingRow}>
          <Text style={styles.holdingLabel}>Quantity</Text>
          <Text style={styles.holdingValue}>{holding.quantity} shares</Text>
        </View>
        <View style={styles.holdingRow}>
          <Text style={styles.holdingLabel}>Avg Price</Text>
          <Text style={styles.holdingValue}>${holding.avgPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.holdingRow}>
          <Text style={styles.holdingLabel}>Current Price</Text>
          <Text style={styles.holdingValue}>${holding.currentPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.holdingRow}>
          <Text style={styles.holdingLabel}>Total Value</Text>
          <Text style={styles.holdingValue}>${holding.totalValue.toFixed(2)}</Text>
        </View>
        <View style={styles.holdingRow}>
          <Text style={styles.holdingLabel}>Unrealized P&L</Text>
          <Text style={[styles.holdingValue, holding.unrealizedPL >= 0 ? styles.positive : styles.negative]}>
            {holding.unrealizedPL >= 0 ? '+' : ''}${holding.unrealizedPL.toFixed(2)} (
            {holding.unrealizedPLPercent >= 0 ? '+' : ''}{holding.unrealizedPLPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!connectedWallet) {
    return (
      <View style={styles.notConnectedContainer}>
        <Text style={styles.notConnectedTitle}>Connect Your Wallet</Text>
        <Text style={styles.notConnectedText}>
          Connect your Solana wallet to view your portfolio
        </Text>
        <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
          <Text style={styles.connectButtonText}>Connect Wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {renderPortfolioSummary()}

      <View style={styles.holdingsContainer}>
        <Text style={styles.holdingsTitle}>Your Holdings</Text>
        {holdings.length === 0 ? (
          <View style={styles.noHoldingsContainer}>
            <Text style={styles.noHoldingsText}>No holdings yet</Text>
            <Text style={styles.noHoldingsSubtext}>
              Start trading to build your portfolio
            </Text>
          </View>
        ) : (
          holdings.map(renderHolding)
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  notConnectedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  connectButton: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dayChange: {
    alignItems: 'center',
  },
  dayChangeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayChangeLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  positive: {
    color: '#4caf50',
  },
  negative: {
    color: '#f44336',
  },
  holdingsContainer: {
    padding: 16,
  },
  holdingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noHoldingsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noHoldingsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  noHoldingsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  holdingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  holdingName: {
    fontSize: 14,
    color: '#666',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  holdingDetails: {
    gap: 8,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingLabel: {
    fontSize: 14,
    color: '#666',
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});