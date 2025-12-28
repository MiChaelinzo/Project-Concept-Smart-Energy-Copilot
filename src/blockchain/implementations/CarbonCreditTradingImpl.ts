/**
 * Carbon Credit Trading Implementation
 * Comprehensive carbon offset marketplace with blockchain verification
 */

import {
  CarbonCreditTrading,
  CarbonCredit,
  CarbonCreditCriteria,
  CarbonPortfolio,
  CarbonEmissionCalculation,
  CarbonOffsetRecommendation,
  RetirementCertificate,
  CarbonMarketData,
  CarbonAchievement
} from '../interfaces/CarbonCreditTrading';

interface BlockchainConfig {
  ethereum: {
    rpcUrl: string;
    chainId: number;
    gasPrice: string;
  };
  polygon: {
    rpcUrl: string;
    chainId: number;
    gasPrice: string;
  };
  binanceSmartChain: {
    rpcUrl: string;
    chainId: number;
    gasPrice: string;
  };
}

interface EmissionFactor {
  activityType: string;
  unit: string;
  factor: number; // kg CO2 per unit
  methodology: string;
  source: string;
  lastUpdated: Date;
}

export class CarbonCreditTradingImpl implements CarbonCreditTrading {
  private config: BlockchainConfig;
  private availableCredits: Map<string, CarbonCredit> = new Map();
  private portfolios: Map<string, CarbonPortfolio> = new Map();
  private retirementCertificates: Map<string, RetirementCertificate[]> = new Map();
  private achievements: Map<string, CarbonAchievement[]> = new Map();
  private autoOffsetSettings: Map<string, { criteria: CarbonCreditCriteria; offsetPercentage: number }> = new Map();
  private emissionFactors: Map<string, EmissionFactor> = new Map();

  constructor(config: BlockchainConfig, initializeData: boolean = true) {
    this.config = config;
    if (initializeData) {
      this.initializeEmissionFactors();
      this.initializeMockCredits();
    }
  }

  private initializeEmissionFactors(): void {
    const factors: EmissionFactor[] = [
      {
        activityType: 'energy_consumption',
        unit: 'kWh',
        factor: 0.5, // kg CO2 per kWh (grid average)
        methodology: 'EPA eGRID',
        source: 'US Environmental Protection Agency',
        lastUpdated: new Date('2024-01-01')
      },
      {
        activityType: 'transportation',
        unit: 'km',
        factor: 0.21, // kg CO2 per km (average car)
        methodology: 'IPCC Guidelines',
        source: 'Intergovernmental Panel on Climate Change',
        lastUpdated: new Date('2024-01-01')
      },
      {
        activityType: 'manufacturing',
        unit: 'kg',
        factor: 2.5, // kg CO2 per kg product (average)
        methodology: 'LCA Database',
        source: 'Life Cycle Assessment Database',
        lastUpdated: new Date('2024-01-01')
      },
      {
        activityType: 'natural_gas',
        unit: 'm3',
        factor: 2.0, // kg CO2 per m3
        methodology: 'IPCC Guidelines',
        source: 'Intergovernmental Panel on Climate Change',
        lastUpdated: new Date('2024-01-01')
      }
    ];

    factors.forEach(factor => {
      this.emissionFactors.set(`${factor.activityType}_${factor.unit}`, factor);
    });
  }

  private initializeMockCredits(): void {
    const mockCredits: CarbonCredit[] = [
      {
        id: 'VCS-001-2023',
        issuer: 'Verra',
        project: 'Amazon Rainforest Conservation',
        vintage: 2023,
        amount: 1000,
        price: 15.50,
        currency: 'USD',
        standard: 'VCS',
        methodology: 'VM0015',
        location: {
          country: 'Brazil',
          region: 'Amazon',
          coordinates: { latitude: -3.4653, longitude: -62.2159 }
        },
        verification: {
          verified: true,
          verifier: 'SCS Global Services',
          verificationDate: new Date('2023-12-01'),
          certificate: 'VCS-CERT-001-2023',
          blockchainProof: this.generateBlockchainProof()
        },
        retirement: {
          retired: false,
          reason: ''
        },
        metadata: {
          projectType: 'Forest Conservation',
          additionalBenefits: ['Biodiversity Protection', 'Community Development'],
          riskRating: 'low',
          qualityScore: 95
        }
      },
      {
        id: 'GS-002-2023',
        issuer: 'Gold Standard',
        project: 'Solar Farm Kenya',
        vintage: 2023,
        amount: 500,
        price: 22.00,
        currency: 'USD',
        standard: 'GS',
        methodology: 'AMS-I.D',
        location: {
          country: 'Kenya',
          region: 'Nairobi',
          coordinates: { latitude: -1.2921, longitude: 36.8219 }
        },
        verification: {
          verified: true,
          verifier: 'TUV SUD',
          verificationDate: new Date('2023-11-15'),
          certificate: 'GS-CERT-002-2023',
          blockchainProof: this.generateBlockchainProof()
        },
        retirement: {
          retired: false,
          reason: ''
        },
        metadata: {
          projectType: 'Renewable Energy',
          additionalBenefits: ['Job Creation', 'Energy Access'],
          riskRating: 'low',
          qualityScore: 92
        }
      },
      {
        id: 'CDM-003-2022',
        issuer: 'UNFCCC',
        project: 'Wind Power India',
        vintage: 2022,
        amount: 750,
        price: 12.75,
        currency: 'USD',
        standard: 'CDM',
        methodology: 'ACM0002',
        location: {
          country: 'India',
          region: 'Gujarat',
          coordinates: { latitude: 23.0225, longitude: 72.5714 }
        },
        verification: {
          verified: true,
          verifier: 'DNV GL',
          verificationDate: new Date('2022-10-20'),
          certificate: 'CDM-CERT-003-2022',
          blockchainProof: this.generateBlockchainProof()
        },
        retirement: {
          retired: false,
          reason: ''
        },
        metadata: {
          projectType: 'Wind Energy',
          additionalBenefits: ['Rural Development', 'Technology Transfer'],
          riskRating: 'medium',
          qualityScore: 88
        }
      }
    ];

    mockCredits.forEach(credit => {
      this.availableCredits.set(credit.id, credit);
    });
  }

  async calculateEmissions(activityType: string, amount: number, unit: string): Promise<CarbonEmissionCalculation> {
    try {
      const factorKey = `${activityType}_${unit}`;
      const emissionFactor = this.emissionFactors.get(factorKey);

      if (!emissionFactor) {
        throw new Error(`No emission factor found for ${activityType} in ${unit}`);
      }

      const totalEmissions = amount * emissionFactor.factor;

      return {
        activityType: activityType as any,
        amount,
        unit,
        emissionFactor: emissionFactor.factor,
        totalEmissions,
        confidence: 85, // High confidence for standard factors
        methodology: emissionFactor.methodology,
        calculationDate: new Date(),
        metadata: {
          source: emissionFactor.source,
          lastUpdated: emissionFactor.lastUpdated
        }
      };
    } catch (error: any) {
      throw new Error(`Emission calculation failed: ${error.message}`);
    }
  }

  async getOffsetRecommendations(emissions: number, preferences?: CarbonCreditCriteria): Promise<CarbonOffsetRecommendation> {
    try {
      const emissionsInTons = emissions / 1000; // Convert kg to tons
      const availableCredits = Array.from(this.availableCredits.values());
      
      // Filter credits based on preferences
      let filteredCredits = availableCredits.filter(credit => !credit.retirement.retired);
      
      if (preferences) {
        if (preferences.standard) {
          filteredCredits = filteredCredits.filter(c => c.standard === preferences.standard);
        }
        if (preferences.maxPrice) {
          filteredCredits = filteredCredits.filter(c => c.price <= preferences.maxPrice!);
        }
        if (preferences.minQualityScore) {
          filteredCredits = filteredCredits.filter(c => c.metadata.qualityScore >= preferences.minQualityScore!);
        }
        if (preferences.projectType) {
          filteredCredits = filteredCredits.filter(c => c.metadata.projectType === preferences.projectType);
        }
      }

      // Sort by quality score and price
      filteredCredits.sort((a, b) => {
        const qualityDiff = b.metadata.qualityScore - a.metadata.qualityScore;
        if (qualityDiff !== 0) return qualityDiff;
        return a.price - b.price; // Lower price is better
      });

      // Select credits to cover emissions
      const recommendedCredits: CarbonCredit[] = [];
      let remainingEmissions = emissionsInTons;
      let totalCost = 0;

      for (const credit of filteredCredits) {
        if (remainingEmissions <= 0) break;
        
        const amountToUse = Math.min(remainingEmissions, credit.amount);
        const creditCopy = { ...credit, amount: amountToUse };
        recommendedCredits.push(creditCopy);
        
        totalCost += amountToUse * credit.price;
        remainingEmissions -= amountToUse;
      }

      // Determine urgency based on emissions amount
      let urgency: 'low' | 'medium' | 'high' = 'low';
      if (emissionsInTons > 100) urgency = 'high';
      else if (emissionsInTons > 10) urgency = 'medium';

      // Create alternatives
      const budgetCredits = filteredCredits
        .filter(c => c.price <= 15)
        .slice(0, 3);
      
      const premiumCredits = filteredCredits
        .filter(c => c.metadata.qualityScore >= 90)
        .slice(0, 3);
      
      const localCredits = filteredCredits
        .filter(c => c.location.country === 'USA') // Assuming US-based user
        .slice(0, 3);

      return {
        recommendedAmount: emissionsInTons,
        estimatedCost: totalCost,
        currency: 'USD',
        recommendedCredits,
        reasoning: `Based on ${emissionsInTons.toFixed(2)} tons CO2 emissions, we recommend high-quality credits with good price-performance ratio.`,
        urgency,
        alternatives: {
          budget: budgetCredits,
          premium: premiumCredits,
          local: localCredits
        }
      };
    } catch (error: any) {
      throw new Error(`Offset recommendation failed: ${error.message}`);
    }
  }

  async searchCredits(criteria: CarbonCreditCriteria): Promise<CarbonCredit[]> {
    try {
      let credits = Array.from(this.availableCredits.values());

      // Apply filters
      if (criteria.standard) {
        credits = credits.filter(c => c.standard === criteria.standard);
      }
      
      if (criteria.vintage) {
        credits = credits.filter(c => c.vintage === criteria.vintage);
      }
      
      if (criteria.minVintage) {
        credits = credits.filter(c => c.vintage >= criteria.minVintage!);
      }
      
      if (criteria.maxVintage) {
        credits = credits.filter(c => c.vintage <= criteria.maxVintage!);
      }
      
      if (criteria.project) {
        credits = credits.filter(c => c.project.toLowerCase().includes(criteria.project!.toLowerCase()));
      }
      
      if (criteria.location?.country) {
        credits = credits.filter(c => c.location.country === criteria.location!.country);
      }
      
      if (criteria.maxPrice) {
        credits = credits.filter(c => c.price <= criteria.maxPrice!);
      }
      
      if (criteria.minPrice) {
        credits = credits.filter(c => c.price >= criteria.minPrice!);
      }
      
      if (criteria.verified !== undefined) {
        credits = credits.filter(c => c.verification.verified === criteria.verified);
      }
      
      if (criteria.projectType) {
        credits = credits.filter(c => c.metadata.projectType === criteria.projectType);
      }
      
      if (criteria.minQualityScore) {
        credits = credits.filter(c => c.metadata.qualityScore >= criteria.minQualityScore!);
      }
      
      if (criteria.riskRating) {
        credits = credits.filter(c => c.metadata.riskRating === criteria.riskRating);
      }

      // Filter out retired credits
      credits = credits.filter(c => !c.retirement.retired);

      return credits;
    } catch (error: any) {
      throw new Error(`Credit search failed: ${error.message}`);
    }
  }

  async purchaseCredits(creditIds: string[], walletAddress: string): Promise<CarbonCredit[]> {
    try {
      const purchasedCredits: CarbonCredit[] = [];
      let totalCost = 0;

      for (const creditId of creditIds) {
        const credit = this.availableCredits.get(creditId);
        if (!credit) {
          throw new Error(`Credit not found: ${creditId}`);
        }

        if (credit.retirement.retired) {
          throw new Error(`Credit already retired: ${creditId}`);
        }

        // Create a copy for the user's portfolio
        const purchasedCredit: CarbonCredit = {
          ...credit,
          id: `${credit.id}-${Date.now()}`, // Unique ID for user's copy
        };

        purchasedCredits.push(purchasedCredit);
        totalCost += credit.price * credit.amount;
      }

      // Update or create portfolio
      let portfolio = this.portfolios.get(walletAddress);
      if (!portfolio) {
        portfolio = this.createEmptyPortfolio(walletAddress);
      }

      // Add credits to portfolio
      portfolio.credits.push(...purchasedCredits);
      portfolio.totalCredits += purchasedCredits.reduce((sum, c) => sum + c.amount, 0);
      portfolio.totalValue += totalCost;

      // Update diversification
      this.updatePortfolioDiversification(portfolio);
      
      // Update performance
      portfolio.performance.totalPurchased += purchasedCredits.reduce((sum, c) => sum + c.amount, 0);
      portfolio.performance.averagePurchasePrice = portfolio.totalValue / portfolio.totalCredits;
      portfolio.performance.currentValue = portfolio.totalValue; // Simplified

      this.portfolios.set(walletAddress, portfolio);

      // Check for achievements
      await this.checkAchievements(walletAddress);

      console.log(`Purchased ${purchasedCredits.length} carbon credits for ${walletAddress}`);
      return purchasedCredits;
    } catch (error: any) {
      throw new Error(`Credit purchase failed: ${error.message}`);
    }
  }

  async retireCredits(creditIds: string[], reason: string, walletAddress: string): Promise<RetirementCertificate> {
    try {
      const portfolio = this.portfolios.get(walletAddress);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const creditsToRetire: CarbonCredit[] = [];
      let totalAmount = 0;

      // Find and validate credits
      for (const creditId of creditIds) {
        const creditIndex = portfolio.credits.findIndex(c => c.id === creditId);
        if (creditIndex === -1) {
          throw new Error(`Credit not found in portfolio: ${creditId}`);
        }

        const credit = portfolio.credits[creditIndex];
        if (credit.retirement.retired) {
          throw new Error(`Credit already retired: ${creditId}`);
        }

        // Mark as retired
        credit.retirement.retired = true;
        credit.retirement.retiredBy = walletAddress;
        credit.retirement.retirementDate = new Date();
        credit.retirement.reason = reason;
        credit.retirement.retirementCertificate = this.generateCertificateId();

        creditsToRetire.push(credit);
        totalAmount += credit.amount;
      }

      // Create retirement certificate
      const certificate: RetirementCertificate = {
        id: this.generateCertificateId(),
        creditIds,
        retiredBy: walletAddress,
        retirementDate: new Date(),
        totalAmount,
        reason,
        blockchainProof: this.generateBlockchainProof(),
        certificateUrl: `https://carbon-registry.com/certificates/${this.generateCertificateId()}`,
        verificationHash: this.generateBlockchainProof()
      };

      // Store certificate
      const certificates = this.retirementCertificates.get(walletAddress) || [];
      certificates.push(certificate);
      this.retirementCertificates.set(walletAddress, certificates);

      // Update portfolio performance
      portfolio.performance.totalRetired += totalAmount;
      this.updatePortfolioDiversification(portfolio);

      // Check for achievements
      await this.checkAchievements(walletAddress);

      console.log(`Retired ${totalAmount} tons CO2 for ${walletAddress}`);
      return certificate;
    } catch (error: any) {
      throw new Error(`Credit retirement failed: ${error.message}`);
    }
  }

  async getPortfolio(walletAddress: string): Promise<CarbonPortfolio> {
    try {
      let portfolio = this.portfolios.get(walletAddress);
      if (!portfolio) {
        portfolio = this.createEmptyPortfolio(walletAddress);
        this.portfolios.set(walletAddress, portfolio);
      }

      return portfolio;
    } catch (error: any) {
      throw new Error(`Portfolio retrieval failed: ${error.message}`);
    }
  }

  async verifyCredit(creditId: string): Promise<boolean> {
    try {
      // Check in available credits first
      let credit = this.availableCredits.get(creditId);
      
      // If not found in available credits, check in all portfolios
      if (!credit) {
        for (const portfolio of this.portfolios.values()) {
          const foundCredit = portfolio.credits.find(c => c.id === creditId || c.id.startsWith(creditId.split('-')[0]));
          if (foundCredit) {
            credit = foundCredit;
            break;
          }
        }
      }

      if (!credit) {
        return false;
      }

      // Simulate blockchain verification
      const isValid = credit.verification.verified && 
                     credit.verification.blockchainProof.length === 66 &&
                     credit.verification.certificate.length > 0;

      return isValid;
    } catch (error: any) {
      console.error('Credit verification failed:', error);
      return false;
    }
  }

  async getMarketData(): Promise<CarbonMarketData> {
    try {
      const credits = Array.from(this.availableCredits.values());
      const activeCredits = credits.filter(c => !c.retirement.retired);

      // Calculate prices by standard
      const pricesByStandard: Record<string, number> = {};
      const pricesByVintage: Record<number, number> = {};
      
      activeCredits.forEach(credit => {
        if (!pricesByStandard[credit.standard]) {
          pricesByStandard[credit.standard] = 0;
        }
        pricesByStandard[credit.standard] += credit.price;

        if (!pricesByVintage[credit.vintage]) {
          pricesByVintage[credit.vintage] = 0;
        }
        pricesByVintage[credit.vintage] += credit.price;
      });

      // Average prices
      Object.keys(pricesByStandard).forEach(standard => {
        const count = activeCredits.filter(c => c.standard === standard).length;
        pricesByStandard[standard] /= count;
      });

      Object.keys(pricesByVintage).forEach(vintage => {
        const count = activeCredits.filter(c => c.vintage === parseInt(vintage)).length;
        pricesByVintage[parseInt(vintage)] /= count;
      });

      const averagePrice = activeCredits.reduce((sum, c) => sum + c.price, 0) / activeCredits.length;
      const totalVolume = activeCredits.reduce((sum, c) => sum + c.amount, 0);

      return {
        timestamp: new Date(),
        prices: {
          byStandard: pricesByStandard,
          byVintage: pricesByVintage,
          average: averagePrice
        },
        volume: {
          daily: totalVolume * 0.1, // Mock daily volume
          weekly: totalVolume * 0.3,
          monthly: totalVolume
        },
        trends: {
          priceChange24h: (Math.random() - 0.5) * 10, // -5% to +5%
          priceChange7d: (Math.random() - 0.5) * 20,
          priceChange30d: (Math.random() - 0.5) * 40,
          volumeChange24h: (Math.random() - 0.5) * 30
        },
        marketCap: totalVolume * averagePrice,
        activeProjects: new Set(activeCredits.map(c => c.project)).size
      };
    } catch (error: any) {
      throw new Error(`Market data retrieval failed: ${error.message}`);
    }
  }

  async getRetirementCertificates(walletAddress: string): Promise<RetirementCertificate[]> {
    try {
      return this.retirementCertificates.get(walletAddress) || [];
    } catch (error: any) {
      throw new Error(`Certificate retrieval failed: ${error.message}`);
    }
  }

  async getAchievements(walletAddress: string): Promise<CarbonAchievement[]> {
    try {
      return this.achievements.get(walletAddress) || [];
    } catch (error: any) {
      throw new Error(`Achievement retrieval failed: ${error.message}`);
    }
  }

  async setupAutoOffset(walletAddress: string, criteria: CarbonCreditCriteria, offsetPercentage: number): Promise<boolean> {
    try {
      if (offsetPercentage < 0 || offsetPercentage > 100) {
        throw new Error('Offset percentage must be between 0 and 100');
      }

      this.autoOffsetSettings.set(walletAddress, { criteria, offsetPercentage });
      
      console.log(`Auto-offset configured for ${walletAddress}: ${offsetPercentage}%`);
      return true;
    } catch (error: any) {
      throw new Error(`Auto-offset setup failed: ${error.message}`);
    }
  }

  async getCarbonNeutralityStatus(walletAddress: string, timeframe: 'monthly' | 'yearly'): Promise<{
    isNeutral: boolean;
    totalEmissions: number;
    totalOffsets: number;
    deficit: number;
    recommendations: CarbonOffsetRecommendation;
  }> {
    try {
      const portfolio = await this.getPortfolio(walletAddress);
      
      // Mock emissions calculation (would integrate with actual energy monitoring)
      const mockEmissions = timeframe === 'yearly' ? 12000 : 1000; // kg CO2
      const totalOffsets = portfolio.performance.totalRetired * 1000; // Convert tons to kg
      
      const deficit = Math.max(0, mockEmissions - totalOffsets);
      const isNeutral = deficit === 0;

      let recommendations: CarbonOffsetRecommendation;
      if (deficit > 0) {
        recommendations = await this.getOffsetRecommendations(deficit);
      } else {
        recommendations = {
          recommendedAmount: 0,
          estimatedCost: 0,
          currency: 'USD',
          recommendedCredits: [],
          reasoning: 'You are already carbon neutral!',
          urgency: 'low',
          alternatives: { budget: [], premium: [], local: [] }
        };
      }

      return {
        isNeutral,
        totalEmissions: mockEmissions,
        totalOffsets,
        deficit,
        recommendations
      };
    } catch (error: any) {
      throw new Error(`Carbon neutrality status failed: ${error.message}`);
    }
  }

  async generateImpactReport(walletAddress: string, timeframe: 'monthly' | 'quarterly' | 'yearly'): Promise<{
    totalCreditsRetired: number;
    totalCO2Offset: number;
    projectsSupported: string[];
    impactMetrics: Record<string, number>;
    achievements: CarbonAchievement[];
    reportUrl: string;
  }> {
    try {
      const portfolio = await this.getPortfolio(walletAddress);
      const achievements = await this.getAchievements(walletAddress);
      const certificates = await this.getRetirementCertificates(walletAddress);

      const retiredCredits = portfolio.credits.filter(c => c.retirement.retired);
      const projectsSupported = [...new Set(retiredCredits.map(c => c.project))];
      
      const impactMetrics = {
        forestsProtected: retiredCredits.filter(c => c.metadata.projectType === 'Forest Conservation').length,
        renewableEnergySupported: retiredCredits.filter(c => c.metadata.projectType.includes('Energy')).length,
        communitiesHelped: projectsSupported.length * 2, // Estimate
        biodiversityProjects: retiredCredits.filter(c => 
          c.metadata.additionalBenefits.includes('Biodiversity Protection')).length
      };

      return {
        totalCreditsRetired: portfolio.performance.totalRetired,
        totalCO2Offset: portfolio.performance.totalRetired,
        projectsSupported,
        impactMetrics,
        achievements,
        reportUrl: `https://carbon-impact.com/reports/${walletAddress}/${timeframe}`
      };
    } catch (error: any) {
      throw new Error(`Impact report generation failed: ${error.message}`);
    }
  }

  // Private helper methods
  private createEmptyPortfolio(walletAddress: string): CarbonPortfolio {
    return {
      walletAddress,
      totalCredits: 0,
      totalValue: 0,
      currency: 'USD',
      credits: [],
      diversification: {
        byStandard: {},
        byVintage: {},
        byProject: {},
        byLocation: {}
      },
      performance: {
        totalPurchased: 0,
        totalRetired: 0,
        averagePurchasePrice: 0,
        currentValue: 0,
        unrealizedGains: 0
      }
    };
  }

  private updatePortfolioDiversification(portfolio: CarbonPortfolio): void {
    const activeCredits = portfolio.credits.filter(c => !c.retirement.retired);
    
    // Reset diversification
    portfolio.diversification = {
      byStandard: {},
      byVintage: {},
      byProject: {},
      byLocation: {}
    };

    // Calculate diversification
    activeCredits.forEach(credit => {
      // By standard
      portfolio.diversification.byStandard[credit.standard] = 
        (portfolio.diversification.byStandard[credit.standard] || 0) + credit.amount;
      
      // By vintage
      portfolio.diversification.byVintage[credit.vintage] = 
        (portfolio.diversification.byVintage[credit.vintage] || 0) + credit.amount;
      
      // By project
      portfolio.diversification.byProject[credit.project] = 
        (portfolio.diversification.byProject[credit.project] || 0) + credit.amount;
      
      // By location
      portfolio.diversification.byLocation[credit.location.country] = 
        (portfolio.diversification.byLocation[credit.location.country] || 0) + credit.amount;
    });
  }

  private async checkAchievements(walletAddress: string): Promise<void> {
    const portfolio = await this.getPortfolio(walletAddress);
    const currentAchievements = this.achievements.get(walletAddress) || [];
    const newAchievements: CarbonAchievement[] = [];

    // First purchase achievement
    if (portfolio.credits.length > 0 && !currentAchievements.some(a => a.type === 'first_purchase')) {
      newAchievements.push({
        id: 'first_purchase_' + Date.now(),
        type: 'first_purchase',
        title: 'Carbon Conscious',
        description: 'Made your first carbon credit purchase',
        earnedDate: new Date(),
        criteria: { firstPurchase: true },
        badge: {
          imageUrl: '/badges/first_purchase.png',
          color: '#4CAF50',
          rarity: 'common'
        }
      });
    }

    // Retirement milestone
    if (portfolio.performance.totalRetired >= 10 && !currentAchievements.some(a => a.type === 'milestone_retired')) {
      newAchievements.push({
        id: 'milestone_retired_' + Date.now(),
        type: 'milestone_retired',
        title: 'Climate Champion',
        description: 'Retired 10+ tons of CO2 credits',
        earnedDate: new Date(),
        criteria: { retiredAmount: 10 },
        badge: {
          imageUrl: '/badges/milestone_retired.png',
          color: '#2196F3',
          rarity: 'rare'
        }
      });
    }

    // Portfolio diversification
    const standardCount = Object.keys(portfolio.diversification.byStandard).length;
    if (standardCount >= 3 && !currentAchievements.some(a => a.type === 'portfolio_diversified')) {
      newAchievements.push({
        id: 'portfolio_diversified_' + Date.now(),
        type: 'portfolio_diversified',
        title: 'Diversification Expert',
        description: 'Portfolio includes 3+ different standards',
        earnedDate: new Date(),
        criteria: { standardDiversity: 3 },
        badge: {
          imageUrl: '/badges/diversified.png',
          color: '#FF9800',
          rarity: 'epic'
        }
      });
    }

    // Add new achievements
    if (newAchievements.length > 0) {
      currentAchievements.push(...newAchievements);
      this.achievements.set(walletAddress, currentAchievements);
    }
  }

  private generateCertificateId(): string {
    return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  private generateBlockchainProof(): string {
    const chars = '0123456789abcdef';
    let proof = '0x';
    for (let i = 0; i < 64; i++) {
      proof += chars[Math.floor(Math.random() * 16)];
    }
    return proof;
  }
}