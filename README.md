# Sol Stocks Mobile

A React Native Android application for trading stocks with Solana (SOL) and BONK tokens, built with full Solana Mobile Stack integration.

## Features

### 🚀 Solana Mobile Stack Integration
- **Mobile Wallet Adapter (MWA)**: Native mobile wallet connections
- **Seed Vault**: Secure hardware-backed key management
- **Solana Pay**: Mobile payment integration with deep linking
- **dApp Store**: Full compatibility with Solana dApp Store

### 📱 Mobile-First Trading
- Professional stock trading interface optimized for mobile
- Real-time portfolio tracking and analytics
- Support for traditional, crypto, and premium stock categories
- Mobile-optimized transaction signing and confirmation

### 🔒 Security Features
- Hardware-backed biometric authentication
- Secure key storage with Android Keystore
- Device security validation
- Encrypted transaction signing

### 💰 Payment Options
- **SOL**: Primary payment method for stock purchases
- **BONK**: Alternative token payment option
- Automatic fee calculation based on stock categories
- Treasury fee collection (0.25% - 0.6% based on stock type)

### 📊 Stock Categories
- **Traditional**: Apple, Google, Microsoft, Tesla, Amazon (0.25% buy / 0.35% sell fees)
- **Crypto**: Coinbase, MicroStrategy, Riot, Marathon, Hood, Vana (0.35% buy / 0.45% sell fees)
- **Premium**: Circle, Gemini, Kraken, OpenSea (0.5% buy / 0.6% sell fees)

## Technical Architecture

### Core Technologies
- **React Native 0.71.4**: Cross-platform mobile development
- **TypeScript**: Type-safe development
- **Solana Web3.js**: Blockchain interaction
- **Solana Mobile Stack SDK**: Native mobile wallet integration

### Key Components

#### Mobile Wallet Adapter (`src/utils/mobileWalletAdapter.ts`)
- Native wallet connection management
- Transaction signing and sending
- Balance checking and airdrop functionality
- Error handling and connection status management

#### Seed Vault (`src/utils/seedVault.ts`)
- Hardware-backed secure key generation and storage
- Biometric authentication integration
- Encrypted seed management
- Device security validation

#### Solana Pay Integration (`src/utils/solanaPayIntegration.ts`)
- Payment URL generation for stock purchases
- Transaction creation and confirmation
- Fee calculation and treasury management
- Payment history tracking

#### Trading Interface (`src/components/`)
- **MobileStockListing**: Stock browsing and purchasing interface
- **MobilePortfolio**: Portfolio management and trading history
- Real-time price updates and P&L calculations

### Android Integration

#### AndroidManifest.xml Configuration
- Solana Mobile Stack permissions and features
- Biometric authentication capabilities
- Deep linking for Solana Pay
- dApp Store metadata

#### Security Features
- Hardware security module integration
- Biometric authentication (fingerprint, face recognition)
- Secure transaction signing
- Network security configuration

## Development Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- React Native CLI
- Android Studio and Android SDK
- Android device with Solana Mobile Stack support (recommended: Saga phone)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd SolStocksMobile
npm install
```

2. **Android setup**:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

3. **Start Metro bundler**:
```bash
npx react-native start
```

### Environment Configuration

#### Solana Network (`src/utils/solanaConfig.ts`)
- **Network**: Devnet for development, Mainnet for production
- **Treasury Wallet**: `ATs1VRY6PGi8nSJA1RZJTpEmFc6mXNEnbWBCwWsVKWWY`
- **RPC Endpoint**: Configurable Solana cluster API

#### Fee Structure
```typescript
traditional: { buyFeePercent: 0.25, sellFeePercent: 0.35 }
crypto: { buyFeePercent: 0.35, sellFeePercent: 0.45 }
premium: { buyFeePercent: 0.5, sellFeePercent: 0.6 }
```

## App Flow

### 1. App Initialization
- Check device security capabilities
- Initialize Seed Vault and biometric services
- Set up deep link handlers for Solana Pay
- Connect to existing wallet if available

### 2. Wallet Connection
- Present Mobile Wallet Adapter authorization
- Connect to Phantom, Solflare, or other MWA-compatible wallets
- Store wallet connection securely
- Display wallet address and SOL balance

### 3. Stock Trading
- Browse stocks by category (traditional, crypto, premium)
- Search and filter stock listings
- Calculate purchase amounts in SOL/BONK
- Create and sign transactions with biometric authentication
- Confirm transactions on Solana blockchain

### 4. Portfolio Management
- Track holdings and unrealized P&L
- View transaction history
- Monitor portfolio performance
- Execute sell orders with fee calculations

## Solana Mobile Hackathon Compliance

This application meets all Solana Mobile Hackathon technical requirements:

✅ **Mobile Wallet Adapter (MWA)**: Full native wallet integration  
✅ **Seed Vault**: Hardware-backed secure key management  
✅ **dApp Store Compatibility**: Complete Android manifest configuration  
✅ **Solana Pay**: Mobile payment and deep linking support  
✅ **Native Android Features**: Biometrics, notifications, hardware security  
✅ **Mobile Wallet Support**: Phantom and Solflare mobile compatibility  
✅ **Multi-Token Support**: SOL primary, BONK alternative payments  
✅ **Professional Interface**: Mobile-optimized trading experience  

## Security Considerations

### Private Key Management
- Keys are stored in Android Keystore with hardware backing
- Biometric authentication required for sensitive operations
- Seed phrases encrypted and stored securely
- No private keys transmitted or logged

### Transaction Security
- All transactions signed locally on device
- Biometric confirmation for transaction signing
- Hardware security validation
- Secure communication with Solana network

### Data Protection
- Local storage encryption for sensitive data
- Network traffic over HTTPS
- No personal information stored on external servers
- Transaction history stored locally with encryption

## Building for Production

### Android Release Build
```bash
cd android
./gradlew assembleRelease
```

### Signing Configuration
1. Generate signing key in Android Studio
2. Configure `android/app/build.gradle` with release signing
3. Build signed APK for distribution

### dApp Store Submission
The app includes all required metadata for Solana dApp Store submission:
- App identity and description
- Category: Finance
- Website and icon assets
- Version information
- Required permissions documentation

## Troubleshooting

### Common Issues

**Wallet Connection Failed**
- Ensure device has MWA-compatible wallet installed
- Check Solana Mobile Stack version compatibility
- Verify Android permissions are granted

**Transaction Signing Failed**
- Check biometric authentication is enabled
- Verify sufficient SOL balance for fees
- Ensure network connectivity to Solana cluster

**Build Errors**
- Clean and rebuild: `cd android && ./gradlew clean && cd .. && npx react-native run-android`
- Check React Native and dependencies versions
- Verify Android SDK and build tools are up to date

## Contributing

This project is built for the Solana Mobile Hackathon. Please follow security best practices when contributing:

1. No hardcoded private keys or sensitive data
2. Test all wallet integration thoroughly
3. Validate transaction amounts and fees
4. Follow React Native and TypeScript best practices
5. Ensure Android compatibility across devices

## License

This project is developed for the Solana Mobile Hackathon and follows Solana Mobile Stack licensing terms.

---

**Built with ❤️ for the Solana Mobile Ecosystem**

Trade stocks on the go with the power of Solana blockchain and mobile-native experiences.



