/**
 * Blockchain Energy Trading Interface
 * Peer-to-peer energy marketplace with smart contracts
 */

export interface EnergyContract {
  id: string;
  seller: string;
  buyer: string;
  energyAmount: number; // kWh
  pricePerKWh: number;
  totalPrice: number;
  currency: 'USD' | 'EUR' | 'BTC' | 'ETH' | 'ENERGY_TOKEN';
  contractType: 'spot' | 'forward' | 'subscription' | 'auction';
  deliveryStart: Date;
  deliveryEnd: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  smartContractAddress: string;
  blockchainNetwork: 'ethereum' | 'polygon' | 'binance' | 'solana';
  carbonCredits: number; // kg CO2 offset
  renewablePercentage: number; // 0-100
  metadata: ContractMetadata;
}

export interface ContractMetadata {
  energySource: 'solar' | 'wind' | 'hydro' | 'nuclear' | 'mixed' | 'fossil';
  location: {
    latitude: number;
    longitude: number;
    region: string;
    gridZone: string;
  };
  qualityCertificates: string[];
  sustainabilityScore: number; // 0-100
  gridImpact: 'positive' | 'neutral' | 'negative';
  peakHours: boolean;
  weatherDependent: boolean;
}

export interface EnergyWallet {
  address: string;
  userId: string;
  balance: {
    energyTokens: number;
    carbonCredits: number;
    fiatBalance: number;
    cryptoBalances: Record<string, number>;
  };
  transactions: WalletTransaction[];
  staking: {
    stakedAmount: number;
    rewards: number;
    lockPeriod: Date;
  };
  reputation: {
    score: number; // 0-100
    completedTrades: number;
    averageRating: number;
    badges: string[];
  };
}

export interface WalletTransaction {
  id: string;
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'reward' | 'fee' | 'carbon_offset';
  amount: number;
  currency: string;
  timestamp: Date;
  blockHash: string;
  gasUsed: number;
  status: 'pending' | 'confirmed' | 'failed';
  relatedContract?: string;
}

export interface EnergyMarketplace {
  id: string;
  name: string;
  region: string;
  supportedNetworks: string[];
  tradingPairs: TradingPair[];
  marketStats: MarketStats;
  regulations: MarketRegulation[];
  fees: {
    tradingFee: number; // Percentage
    withdrawalFee: number;
    listingFee: number;
    carbonCreditFee: number;
  };
}

export interface TradingPair {
  baseAsset: string;
  quoteAsset: string;
  currentPrice: number;
  volume24h: number;
  priceChange24h: number;
  highPrice24h: number;
  lowPrice24h: number;
  liquidity: number;
}

export interface MarketStats {
  totalVolume24h: number;
  totalTrades24h: number;
  averagePrice: number;
  marketCap: number;
  activeUsers: number;
  totalEnergyTraded: number; // kWh
  carbonCreditsTraded: number;
  renewablePercentage: number;
}

export interface MarketRegulation {
  jurisdiction: string;
  requirements: string[];
  compliance: boolean;
  certifications: string[];
  restrictions: {
    maxTradeSize: number;
    allowedParticipants: string[];
    tradingHours: {
      start: string;
      end: string;
    };
  };
}

export interface SmartContract {
  address: string;
  network: string;
  abi: any[];
  bytecode: string;
  version: string;
  verified: boolean;
  functions: ContractFunction[];
  events: ContractEvent[];
  security: {
    audited: boolean;
    auditReports: string[];
    vulnerabilities: string[];
    riskScore: number; // 0-100
  };
}

export interface ContractFunction {
  name: string;
  inputs: ContractParameter[];
  outputs: ContractParameter[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  gasEstimate: number;
}

export interface ContractParameter {
  name: string;
  type: string;
  description: string;
}

export interface ContractEvent {
  name: string;
  inputs: ContractParameter[];
  anonymous: boolean;
}

export interface EnergyOracle {
  id: string;
  name: string;
  dataFeeds: OracleDataFeed[];
  reliability: number; // 0-100
  updateFrequency: number; // Seconds
  lastUpdate: Date;
  consensus: {
    required: boolean;
    threshold: number;
    participants: string[];
  };
}

export interface OracleDataFeed {
  type: 'price' | 'weather' | 'grid_load' | 'carbon_intensity' | 'renewable_generation';
  source: string;
  value: number;
  timestamp: Date;
  confidence: number; // 0-100
  deviation: number;
}

export interface CarbonCredit {
  id: string;
  issuer: string;
  project: string;
  vintage: number; // Year
  amount: number; // Tons CO2
  price: number;
  currency: string;
  standard: 'VCS' | 'CDM' | 'GS' | 'CAR' | 'RGGI';
  methodology: string;
  verification: {
    verified: boolean;
    verifier: string;
    verificationDate: Date;
    certificate: string;
  };
  retirement: {
    retired: boolean;
    retiredBy: string;
    retirementDate?: Date;
    reason: string;
  };
}

export interface EnergyTrading {
  /**
   * Create a new energy trading contract
   */
  createContract(contract: Omit<EnergyContract, 'id' | 'status' | 'smartContractAddress'>): Promise<EnergyContract>;

  /**
   * Execute an energy trade
   */
  executeTrade(contractId: string, buyerWallet: string): Promise<WalletTransaction>;

  /**
   * Cancel a pending contract
   */
  cancelContract(contractId: string, reason: string): Promise<void>;

  /**
   * Get active contracts in marketplace
   */
  getActiveContracts(filters?: ContractFilters): Promise<EnergyContract[]>;

  /**
   * Get contract details
   */
  getContract(contractId: string): Promise<EnergyContract | null>;

  /**
   * Create or get energy wallet
   */
  createWallet(userId: string): Promise<EnergyWallet>;

  /**
   * Get wallet information
   */
  getWallet(address: string): Promise<EnergyWallet | null>;

  /**
   * Transfer energy tokens between wallets
   */
  transferTokens(fromWallet: string, toWallet: string, amount: number, currency: string): Promise<WalletTransaction>;

  /**
   * Stake energy tokens for rewards
   */
  stakeTokens(walletAddress: string, amount: number, lockPeriod: number): Promise<WalletTransaction>;

  /**
   * Get marketplace information
   */
  getMarketplace(marketplaceId: string): Promise<EnergyMarketplace | null>;

  /**
   * Get market statistics
   */
  getMarketStats(timeRange?: { start: Date; end: Date }): Promise<MarketStats>;

  /**
   * Deploy smart contract
   */
  deploySmartContract(contract: Omit<SmartContract, 'address' | 'verified'>): Promise<SmartContract>;

  /**
   * Interact with smart contract
   */
  callContractFunction(contractAddress: string, functionName: string, parameters: any[]): Promise<any>;

  /**
   * Listen to contract events
   */
  subscribeToContractEvents(contractAddress: string, eventName: string, callback: (event: any) => void): Promise<string>;

  /**
   * Get oracle data
   */
  getOracleData(oracleId: string, dataType: string): Promise<OracleDataFeed[]>;

  /**
   * Update oracle data (for oracle operators)
   */
  updateOracleData(oracleId: string, dataFeed: OracleDataFeed): Promise<void>;

  /**
   * Purchase carbon credits
   */
  purchaseCarbonCredits(amount: number, criteria: CarbonCreditCriteria): Promise<CarbonCredit[]>;

  /**
   * Retire carbon credits
   */
  retireCarbonCredits(creditIds: string[], reason: string): Promise<void>;

  /**
   * Get carbon credit portfolio
   */
  getCarbonCredits(walletAddress: string): Promise<CarbonCredit[]>;

  /**
   * Calculate carbon offset for energy usage
   */
  calculateCarbonOffset(energyUsage: number, energyMix: Record<string, number>): Promise<number>;

  /**
   * Get trading recommendations based on AI analysis
   */
  getTradingRecommendations(walletAddress: string, preferences: TradingPreferences): Promise<TradingRecommendation[]>;

  /**
   * Simulate trading strategy
   */
  simulateStrategy(strategy: TradingStrategy, timeRange: { start: Date; end: Date }): Promise<SimulationResult>;

  /**
   * Get regulatory compliance status
   */
  getComplianceStatus(walletAddress: string, jurisdiction: string): Promise<ComplianceStatus>;

  /**
   * Generate trading report
   */
  generateTradingReport(walletAddress: string, timeRange: { start: Date; end: Date }): Promise<TradingReport>;
}

export interface ContractFilters {
  energySource?: string;
  priceRange?: { min: number; max: number };
  deliveryTimeRange?: { start: Date; end: Date };
  location?: { latitude: number; longitude: number; radius: number };
  renewableOnly?: boolean;
  carbonNeutral?: boolean;
  minRating?: number;
}

export interface CarbonCreditCriteria {
  standard?: string;
  vintage?: number;
  project?: string;
  location?: string;
  maxPrice?: number;
  verified?: boolean;
}

export interface TradingPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  investmentHorizon: 'short' | 'medium' | 'long';
  sustainabilityFocus: boolean;
  maxTradeSize: number;
  preferredEnergySource: string[];
  autoTrading: boolean;
}

export interface TradingRecommendation {
  type: 'buy' | 'sell' | 'hold' | 'stake';
  contractId?: string;
  reasoning: string;
  confidence: number; // 0-100
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  action: {
    amount: number;
    maxPrice: number;
    conditions: string[];
  };
}

export interface TradingStrategy {
  name: string;
  type: 'arbitrage' | 'momentum' | 'mean_reversion' | 'grid' | 'dca';
  parameters: Record<string, any>;
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    maxDrawdown: number;
  };
  filters: ContractFilters;
}

export interface SimulationResult {
  strategy: TradingStrategy;
  performance: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  trades: {
    total: number;
    profitable: number;
    averageProfit: number;
    averageLoss: number;
  };
  timeline: {
    date: Date;
    portfolioValue: number;
    drawdown: number;
  }[];
}

export interface ComplianceStatus {
  compliant: boolean;
  jurisdiction: string;
  requirements: {
    requirement: string;
    status: 'met' | 'pending' | 'failed';
    details: string;
  }[];
  certifications: string[];
  restrictions: string[];
  nextReview: Date;
}

export interface TradingReport {
  walletAddress: string;
  timeRange: { start: Date; end: Date };
  summary: {
    totalTrades: number;
    totalVolume: number;
    totalFees: number;
    netProfit: number;
    energyTraded: number;
    carbonCreditsTraded: number;
  };
  performance: {
    roi: number;
    winRate: number;
    averageTradeSize: number;
    bestTrade: number;
    worstTrade: number;
  };
  breakdown: {
    byEnergySource: Record<string, number>;
    byMonth: Record<string, number>;
    byTradeType: Record<string, number>;
  };
  taxInformation: {
    capitalGains: number;
    ordinaryIncome: number;
    deductions: number;
    jurisdiction: string;
  };
}