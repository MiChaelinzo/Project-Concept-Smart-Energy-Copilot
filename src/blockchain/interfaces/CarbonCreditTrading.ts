/**
 * Carbon Credit Trading Interface
 * Comprehensive carbon offset marketplace with blockchain verification
 */

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
  location: {
    country: string;
    region: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  verification: {
    verified: boolean;
    verifier: string;
    verificationDate: Date;
    certificate: string;
    blockchainProof: string;
  };
  retirement: {
    retired: boolean;
    retiredBy?: string;
    retirementDate?: Date;
    reason?: string;
    retirementCertificate?: string;
  };
  metadata: {
    projectType: string;
    additionalBenefits: string[];
    riskRating: 'low' | 'medium' | 'high';
    qualityScore: number; // 0-100
  };
}

export interface CarbonCreditCriteria {
  standard?: 'VCS' | 'CDM' | 'GS' | 'CAR' | 'RGGI';
  vintage?: number;
  minVintage?: number;
  maxVintage?: number;
  project?: string;
  location?: {
    country?: string;
    region?: string;
  };
  maxPrice?: number;
  minPrice?: number;
  verified?: boolean;
  projectType?: string;
  minQualityScore?: number;
  additionalBenefits?: string[];
  riskRating?: 'low' | 'medium' | 'high';
}

export interface CarbonPortfolio {
  walletAddress: string;
  totalCredits: number;
  totalValue: number;
  currency: string;
  credits: CarbonCredit[];
  diversification: {
    byStandard: Record<string, number>;
    byVintage: Record<number, number>;
    byProject: Record<string, number>;
    byLocation: Record<string, number>;
  };
  performance: {
    totalPurchased: number;
    totalRetired: number;
    averagePurchasePrice: number;
    currentValue: number;
    unrealizedGains: number;
  };
}

export interface CarbonEmissionCalculation {
  activityType: 'energy_consumption' | 'transportation' | 'manufacturing' | 'other';
  amount: number;
  unit: string;
  emissionFactor: number; // kg CO2 per unit
  totalEmissions: number; // kg CO2
  confidence: number; // 0-100
  methodology: string;
  calculationDate: Date;
  metadata: Record<string, any>;
}

export interface CarbonOffsetRecommendation {
  recommendedAmount: number; // tons CO2
  estimatedCost: number;
  currency: string;
  recommendedCredits: CarbonCredit[];
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
  alternatives: {
    budget: CarbonCredit[];
    premium: CarbonCredit[];
    local: CarbonCredit[];
  };
}

export interface RetirementCertificate {
  id: string;
  creditIds: string[];
  retiredBy: string;
  retirementDate: Date;
  totalAmount: number; // tons CO2
  reason: string;
  blockchainProof: string;
  certificateUrl: string;
  verificationHash: string;
}

export interface CarbonMarketData {
  timestamp: Date;
  prices: {
    byStandard: Record<string, number>;
    byVintage: Record<number, number>;
    average: number;
  };
  volume: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  trends: {
    priceChange24h: number;
    priceChange7d: number;
    priceChange30d: number;
    volumeChange24h: number;
  };
  marketCap: number;
  activeProjects: number;
}

export interface CarbonAchievement {
  id: string;
  type: 'first_purchase' | 'milestone_retired' | 'carbon_neutral' | 'portfolio_diversified' | 'quality_focused';
  title: string;
  description: string;
  earnedDate: Date;
  criteria: Record<string, any>;
  badge: {
    imageUrl: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
}

export interface CarbonCreditTrading {
  /**
   * Calculate carbon emissions for activities
   */
  calculateEmissions(activityType: string, amount: number, unit: string): Promise<CarbonEmissionCalculation>;

  /**
   * Get carbon offset recommendations
   */
  getOffsetRecommendations(emissions: number, preferences?: CarbonCreditCriteria): Promise<CarbonOffsetRecommendation>;

  /**
   * Search available carbon credits
   */
  searchCredits(criteria: CarbonCreditCriteria): Promise<CarbonCredit[]>;

  /**
   * Purchase carbon credits
   */
  purchaseCredits(creditIds: string[], walletAddress: string): Promise<CarbonCredit[]>;

  /**
   * Retire carbon credits
   */
  retireCredits(creditIds: string[], reason: string, walletAddress: string): Promise<RetirementCertificate>;

  /**
   * Get carbon portfolio
   */
  getPortfolio(walletAddress: string): Promise<CarbonPortfolio>;

  /**
   * Verify carbon credit authenticity
   */
  verifyCredit(creditId: string): Promise<boolean>;

  /**
   * Get market data
   */
  getMarketData(): Promise<CarbonMarketData>;

  /**
   * Get retirement certificates
   */
  getRetirementCertificates(walletAddress: string): Promise<RetirementCertificate[]>;

  /**
   * Get carbon achievements
   */
  getAchievements(walletAddress: string): Promise<CarbonAchievement[]>;

  /**
   * Set up automatic carbon offsetting
   */
  setupAutoOffset(walletAddress: string, criteria: CarbonCreditCriteria, offsetPercentage: number): Promise<boolean>;

  /**
   * Get carbon neutrality status
   */
  getCarbonNeutralityStatus(walletAddress: string, timeframe: 'monthly' | 'yearly'): Promise<{
    isNeutral: boolean;
    totalEmissions: number;
    totalOffsets: number;
    deficit: number;
    recommendations: CarbonOffsetRecommendation;
  }>;

  /**
   * Generate carbon impact report
   */
  generateImpactReport(walletAddress: string, timeframe: 'monthly' | 'quarterly' | 'yearly'): Promise<{
    totalCreditsRetired: number;
    totalCO2Offset: number;
    projectsSupported: string[];
    impactMetrics: Record<string, number>;
    achievements: CarbonAchievement[];
    reportUrl: string;
  }>;
}