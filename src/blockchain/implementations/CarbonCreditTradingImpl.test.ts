/**
 * Unit Tests for Carbon Credit Trading Implementation
 * Tests carbon emission calculations, credit trading, and portfolio management
 */

import { CarbonCreditTradingImpl } from './CarbonCreditTradingImpl';
import { CarbonCreditCriteria } from '../interfaces/CarbonCreditTrading';

describe('Carbon Credit Trading Tests', () => {
  let carbonTrading: CarbonCreditTradingImpl;
  const mockConfig = {
    ethereum: {
      rpcUrl: 'https://mainnet.infura.io/v3/test',
      chainId: 1,
      gasPrice: '20000000000'
    },
    polygon: {
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      gasPrice: '30000000000'
    },
    binanceSmartChain: {
      rpcUrl: 'https://bsc-dataseed.binance.org',
      chainId: 56,
      gasPrice: '5000000000'
    }
  };

  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    carbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
  });

  describe('Carbon Emission Calculations', () => {
    test('should calculate emissions for energy consumption', async () => {
      const result = await carbonTrading.calculateEmissions('energy_consumption', 1000, 'kWh');

      expect(result.activityType).toBe('energy_consumption');
      expect(result.amount).toBe(1000);
      expect(result.unit).toBe('kWh');
      expect(result.emissionFactor).toBe(0.5);
      expect(result.totalEmissions).toBe(500); // 1000 * 0.5
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.methodology).toBeDefined();
      expect(result.calculationDate).toBeInstanceOf(Date);
      expect(result.metadata).toBeDefined();
    });

    test('should calculate emissions for transportation', async () => {
      const result = await carbonTrading.calculateEmissions('transportation', 100, 'km');

      expect(result.activityType).toBe('transportation');
      expect(result.amount).toBe(100);
      expect(result.unit).toBe('km');
      expect(result.emissionFactor).toBe(0.21);
      expect(result.totalEmissions).toBe(21); // 100 * 0.21
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should calculate emissions for manufacturing', async () => {
      const result = await carbonTrading.calculateEmissions('manufacturing', 50, 'kg');

      expect(result.activityType).toBe('manufacturing');
      expect(result.amount).toBe(50);
      expect(result.unit).toBe('kg');
      expect(result.emissionFactor).toBe(2.5);
      expect(result.totalEmissions).toBe(125); // 50 * 2.5
    });

    test('should handle unknown activity types', async () => {
      await expect(
        carbonTrading.calculateEmissions('unknown_activity', 100, 'units')
      ).rejects.toThrow('No emission factor found');
    });

    test('should handle zero emissions', async () => {
      const result = await carbonTrading.calculateEmissions('energy_consumption', 0, 'kWh');

      expect(result.totalEmissions).toBe(0);
      expect(result.amount).toBe(0);
    });
  });

  describe('Carbon Offset Recommendations', () => {
    test('should provide offset recommendations for emissions', async () => {
      const emissions = 5000; // 5 tons CO2 in kg
      const recommendations = await carbonTrading.getOffsetRecommendations(emissions);

      expect(recommendations.recommendedAmount).toBe(5); // tons
      expect(recommendations.estimatedCost).toBeGreaterThan(0);
      expect(recommendations.currency).toBe('USD');
      expect(Array.isArray(recommendations.recommendedCredits)).toBe(true);
      expect(recommendations.reasoning).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(recommendations.urgency);
      expect(recommendations.alternatives).toBeDefined();
      expect(Array.isArray(recommendations.alternatives.budget)).toBe(true);
      expect(Array.isArray(recommendations.alternatives.premium)).toBe(true);
      expect(Array.isArray(recommendations.alternatives.local)).toBe(true);
    });

    test('should provide recommendations with preferences', async () => {
      const emissions = 2000; // 2 tons CO2 in kg
      const preferences: CarbonCreditCriteria = {
        standard: 'VCS',
        maxPrice: 20,
        minQualityScore: 90
      };

      const recommendations = await carbonTrading.getOffsetRecommendations(emissions, preferences);

      expect(recommendations.recommendedAmount).toBe(2);
      recommendations.recommendedCredits.forEach(credit => {
        expect(credit.standard).toBe('VCS');
        expect(credit.price).toBeLessThanOrEqual(20);
        expect(credit.metadata.qualityScore).toBeGreaterThanOrEqual(90);
      });
    });

    test('should determine urgency based on emission amount', async () => {
      const lowEmissions = 5000; // 5 tons
      const mediumEmissions = 50000; // 50 tons
      const highEmissions = 150000; // 150 tons

      const lowRec = await carbonTrading.getOffsetRecommendations(lowEmissions);
      const mediumRec = await carbonTrading.getOffsetRecommendations(mediumEmissions);
      const highRec = await carbonTrading.getOffsetRecommendations(highEmissions);

      expect(lowRec.urgency).toBe('low');
      expect(mediumRec.urgency).toBe('medium');
      expect(highRec.urgency).toBe('high');
    });
  });

  describe('Carbon Credit Search and Filtering', () => {
    test('should search credits without filters', async () => {
      const credits = await carbonTrading.searchCredits({});

      expect(Array.isArray(credits)).toBe(true);
      expect(credits.length).toBeGreaterThan(0);
      
      credits.forEach(credit => {
        expect(credit.id).toBeDefined();
        expect(credit.issuer).toBeDefined();
        expect(credit.project).toBeDefined();
        expect(credit.vintage).toBeGreaterThan(2000);
        expect(credit.amount).toBeGreaterThan(0);
        expect(credit.price).toBeGreaterThan(0);
        expect(['VCS', 'CDM', 'GS', 'CAR', 'RGGI']).toContain(credit.standard);
        expect(credit.verification.verified).toBe(true);
        expect(credit.retirement.retired).toBe(false);
      });
    });

    test('should filter credits by standard', async () => {
      const criteria: CarbonCreditCriteria = { standard: 'VCS' };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.standard).toBe('VCS');
      });
    });

    test('should filter credits by vintage', async () => {
      const criteria: CarbonCreditCriteria = { vintage: 2023 };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.vintage).toBe(2023);
      });
    });

    test('should filter credits by vintage range', async () => {
      const criteria: CarbonCreditCriteria = { 
        minVintage: 2022, 
        maxVintage: 2023 
      };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.vintage).toBeGreaterThanOrEqual(2022);
        expect(credit.vintage).toBeLessThanOrEqual(2023);
      });
    });

    test('should filter credits by price range', async () => {
      const criteria: CarbonCreditCriteria = { 
        minPrice: 10, 
        maxPrice: 20 
      };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.price).toBeGreaterThanOrEqual(10);
        expect(credit.price).toBeLessThanOrEqual(20);
      });
    });

    test('should filter credits by location', async () => {
      const criteria: CarbonCreditCriteria = { 
        location: { country: 'Brazil' }
      };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.location.country).toBe('Brazil');
      });
    });

    test('should filter credits by project type', async () => {
      const criteria: CarbonCreditCriteria = { 
        projectType: 'Forest Conservation'
      };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.metadata.projectType).toBe('Forest Conservation');
      });
    });

    test('should filter credits by quality score', async () => {
      const criteria: CarbonCreditCriteria = { 
        minQualityScore: 90
      };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.metadata.qualityScore).toBeGreaterThanOrEqual(90);
      });
    });

    test('should filter credits by risk rating', async () => {
      const criteria: CarbonCreditCriteria = { 
        riskRating: 'low'
      };
      const credits = await carbonTrading.searchCredits(criteria);

      credits.forEach(credit => {
        expect(credit.metadata.riskRating).toBe('low');
      });
    });
  });

  describe('Carbon Credit Purchase and Portfolio Management', () => {
    test('should purchase carbon credits successfully', async () => {
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];

      const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, testWalletAddress);

      expect(Array.isArray(purchasedCredits)).toBe(true);
      expect(purchasedCredits.length).toBe(1);
      expect(purchasedCredits[0].id).toContain(availableCredits[0].id);
      expect(purchasedCredits[0].project).toBe(availableCredits[0].project);
    });

    test('should update portfolio after purchase', async () => {
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id, availableCredits[1].id];

      await carbonTrading.purchaseCredits(creditIds, testWalletAddress);
      const portfolio = await carbonTrading.getPortfolio(testWalletAddress);

      expect(portfolio.walletAddress).toBe(testWalletAddress);
      expect(portfolio.totalCredits).toBeGreaterThan(0);
      expect(portfolio.totalValue).toBeGreaterThan(0);
      expect(portfolio.currency).toBe('USD');
      expect(portfolio.credits.length).toBe(2);
      expect(portfolio.performance.totalPurchased).toBeGreaterThan(0);
      expect(portfolio.performance.averagePurchasePrice).toBeGreaterThan(0);
    });

    test('should handle purchase of non-existent credit', async () => {
      const invalidCreditIds = ['non-existent-credit'];

      await expect(
        carbonTrading.purchaseCredits(invalidCreditIds, testWalletAddress)
      ).rejects.toThrow('Credit not found');
    });

    test('should create empty portfolio for new wallet', async () => {
      const newWalletAddress = '0x9876543210987654321098765432109876543210';
      const portfolio = await carbonTrading.getPortfolio(newWalletAddress);

      expect(portfolio.walletAddress).toBe(newWalletAddress);
      expect(portfolio.totalCredits).toBe(0);
      expect(portfolio.totalValue).toBe(0);
      expect(portfolio.credits.length).toBe(0);
      expect(portfolio.performance.totalPurchased).toBe(0);
      expect(portfolio.performance.totalRetired).toBe(0);
    });
  });

  describe('Carbon Credit Retirement', () => {
    test('should retire carbon credits successfully', async () => {
      // First purchase some credits
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];
      const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, testWalletAddress);

      // Then retire them
      const retirementReason = 'Offsetting company emissions';
      const certificate = await carbonTrading.retireCredits(
        [purchasedCredits[0].id], 
        retirementReason, 
        testWalletAddress
      );

      expect(certificate.id).toBeDefined();
      expect(certificate.creditIds).toEqual([purchasedCredits[0].id]);
      expect(certificate.retiredBy).toBe(testWalletAddress);
      expect(certificate.retirementDate).toBeInstanceOf(Date);
      expect(certificate.totalAmount).toBeGreaterThan(0);
      expect(certificate.reason).toBe(retirementReason);
      expect(certificate.blockchainProof).toMatch(/^0x[a-f0-9]{64}$/i);
      expect(certificate.certificateUrl).toBeDefined();
      expect(certificate.verificationHash).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    test('should update portfolio after retirement', async () => {
      // Purchase and retire credits
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];
      const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, testWalletAddress);
      
      await carbonTrading.retireCredits([purchasedCredits[0].id], 'Test retirement', testWalletAddress);
      
      const portfolio = await carbonTrading.getPortfolio(testWalletAddress);
      const retiredCredit = portfolio.credits.find(c => c.id === purchasedCredits[0].id);

      expect(retiredCredit?.retirement.retired).toBe(true);
      expect(retiredCredit?.retirement.retiredBy).toBe(testWalletAddress);
      expect(retiredCredit?.retirement.retirementDate).toBeInstanceOf(Date);
      expect(retiredCredit?.retirement.reason).toBe('Test retirement');
      expect(portfolio.performance.totalRetired).toBeGreaterThan(0);
    });

    test('should handle retirement of non-existent credit', async () => {
      // First create an empty portfolio by getting it
      await carbonTrading.getPortfolio(testWalletAddress);
      
      const invalidCreditIds = ['non-existent-credit'];

      await expect(
        carbonTrading.retireCredits(invalidCreditIds, 'Test', testWalletAddress)
      ).rejects.toThrow('Credit not found in portfolio');
    });

    test('should prevent double retirement', async () => {
      // Purchase and retire credits
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];
      const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, testWalletAddress);
      
      await carbonTrading.retireCredits([purchasedCredits[0].id], 'First retirement', testWalletAddress);

      // Try to retire again
      await expect(
        carbonTrading.retireCredits([purchasedCredits[0].id], 'Second retirement', testWalletAddress)
      ).rejects.toThrow('Credit already retired');
    });
  });

  describe('Carbon Credit Verification', () => {
    test('should verify valid carbon credits', async () => {
      const availableCredits = await carbonTrading.searchCredits({});
      const isValid = await carbonTrading.verifyCredit(availableCredits[0].id);

      expect(isValid).toBe(true);
    });

    test('should reject invalid carbon credits', async () => {
      const isValid = await carbonTrading.verifyCredit('invalid-credit-id');

      expect(isValid).toBe(false);
    });

    test('should handle verification errors gracefully', async () => {
      const isValid = await carbonTrading.verifyCredit('');

      expect(isValid).toBe(false);
    });
  });

  describe('Market Data and Analytics', () => {
    test('should provide comprehensive market data', async () => {
      const marketData = await carbonTrading.getMarketData();

      expect(marketData.timestamp).toBeInstanceOf(Date);
      expect(marketData.prices).toBeDefined();
      expect(marketData.prices.byStandard).toBeDefined();
      expect(marketData.prices.byVintage).toBeDefined();
      expect(marketData.prices.average).toBeGreaterThan(0);
      expect(marketData.volume).toBeDefined();
      expect(marketData.volume.daily).toBeGreaterThan(0);
      expect(marketData.volume.weekly).toBeGreaterThan(0);
      expect(marketData.volume.monthly).toBeGreaterThan(0);
      expect(marketData.trends).toBeDefined();
      expect(marketData.marketCap).toBeGreaterThan(0);
      expect(marketData.activeProjects).toBeGreaterThan(0);
    });

    test('should calculate price trends', async () => {
      const marketData = await carbonTrading.getMarketData();

      expect(typeof marketData.trends.priceChange24h).toBe('number');
      expect(typeof marketData.trends.priceChange7d).toBe('number');
      expect(typeof marketData.trends.priceChange30d).toBe('number');
      expect(typeof marketData.trends.volumeChange24h).toBe('number');
    });
  });

  describe('Retirement Certificates and Achievements', () => {
    test('should retrieve retirement certificates', async () => {
      // Purchase and retire credits first
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];
      const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, testWalletAddress);
      
      await carbonTrading.retireCredits([purchasedCredits[0].id], 'Test retirement', testWalletAddress);
      
      const certificates = await carbonTrading.getRetirementCertificates(testWalletAddress);

      expect(Array.isArray(certificates)).toBe(true);
      expect(certificates.length).toBeGreaterThan(0);
      
      certificates.forEach(cert => {
        expect(cert.id).toBeDefined();
        expect(Array.isArray(cert.creditIds)).toBe(true);
        expect(cert.retiredBy).toBe(testWalletAddress);
        expect(cert.retirementDate).toBeInstanceOf(Date);
        expect(cert.totalAmount).toBeGreaterThan(0);
        expect(cert.reason).toBeDefined();
      });
    });

    test('should track achievements', async () => {
      // Purchase credits to trigger first purchase achievement
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];
      await carbonTrading.purchaseCredits(creditIds, testWalletAddress);
      
      const achievements = await carbonTrading.getAchievements(testWalletAddress);

      expect(Array.isArray(achievements)).toBe(true);
      
      if (achievements.length > 0) {
        achievements.forEach(achievement => {
          expect(achievement.id).toBeDefined();
          expect(achievement.type).toBeDefined();
          expect(achievement.title).toBeDefined();
          expect(achievement.description).toBeDefined();
          expect(achievement.earnedDate).toBeInstanceOf(Date);
          expect(achievement.badge).toBeDefined();
          expect(achievement.badge.imageUrl).toBeDefined();
          expect(achievement.badge.color).toBeDefined();
          expect(['common', 'rare', 'epic', 'legendary']).toContain(achievement.badge.rarity);
        });
      }
    });

    test('should return empty arrays for new wallets', async () => {
      const newWalletAddress = '0x9876543210987654321098765432109876543210';
      
      const certificates = await carbonTrading.getRetirementCertificates(newWalletAddress);
      const achievements = await carbonTrading.getAchievements(newWalletAddress);

      expect(certificates).toEqual([]);
      expect(achievements).toEqual([]);
    });
  });

  describe('Auto-Offset Configuration', () => {
    test('should set up auto-offset successfully', async () => {
      const criteria: CarbonCreditCriteria = {
        standard: 'VCS',
        maxPrice: 20,
        minQualityScore: 85
      };
      const offsetPercentage = 50;

      const result = await carbonTrading.setupAutoOffset(testWalletAddress, criteria, offsetPercentage);

      expect(result).toBe(true);
    });

    test('should validate offset percentage range', async () => {
      const criteria: CarbonCreditCriteria = { standard: 'VCS' };

      await expect(
        carbonTrading.setupAutoOffset(testWalletAddress, criteria, -10)
      ).rejects.toThrow('Offset percentage must be between 0 and 100');

      await expect(
        carbonTrading.setupAutoOffset(testWalletAddress, criteria, 150)
      ).rejects.toThrow('Offset percentage must be between 0 and 100');
    });

    test('should accept valid percentage boundaries', async () => {
      const criteria: CarbonCreditCriteria = { standard: 'VCS' };

      const result0 = await carbonTrading.setupAutoOffset(testWalletAddress, criteria, 0);
      const result100 = await carbonTrading.setupAutoOffset(testWalletAddress, criteria, 100);

      expect(result0).toBe(true);
      expect(result100).toBe(true);
    });
  });

  describe('Carbon Neutrality Status', () => {
    test('should calculate carbon neutrality status', async () => {
      const status = await carbonTrading.getCarbonNeutralityStatus(testWalletAddress, 'monthly');

      expect(typeof status.isNeutral).toBe('boolean');
      expect(status.totalEmissions).toBeGreaterThan(0);
      expect(status.totalOffsets).toBeGreaterThanOrEqual(0);
      expect(status.deficit).toBeGreaterThanOrEqual(0);
      expect(status.recommendations).toBeDefined();
      expect(status.recommendations.recommendedAmount).toBeGreaterThanOrEqual(0);
    });

    test('should handle yearly timeframe', async () => {
      const monthlyStatus = await carbonTrading.getCarbonNeutralityStatus(testWalletAddress, 'monthly');
      const yearlyStatus = await carbonTrading.getCarbonNeutralityStatus(testWalletAddress, 'yearly');

      expect(yearlyStatus.totalEmissions).toBeGreaterThan(monthlyStatus.totalEmissions);
    });

    test('should provide recommendations when not neutral', async () => {
      const status = await carbonTrading.getCarbonNeutralityStatus(testWalletAddress, 'monthly');

      if (!status.isNeutral) {
        expect(status.deficit).toBeGreaterThan(0);
        expect(status.recommendations.recommendedAmount).toBeGreaterThan(0);
        expect(status.recommendations.recommendedCredits.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Impact Report Generation', () => {
    test('should generate comprehensive impact report', async () => {
      // Purchase and retire some credits first
      const availableCredits = await carbonTrading.searchCredits({});
      const creditIds = [availableCredits[0].id];
      const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, testWalletAddress);
      await carbonTrading.retireCredits([purchasedCredits[0].id], 'Impact test', testWalletAddress);

      const report = await carbonTrading.generateImpactReport(testWalletAddress, 'monthly');

      expect(report.totalCreditsRetired).toBeGreaterThanOrEqual(0);
      expect(report.totalCO2Offset).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.projectsSupported)).toBe(true);
      expect(report.impactMetrics).toBeDefined();
      expect(typeof report.impactMetrics.forestsProtected).toBe('number');
      expect(typeof report.impactMetrics.renewableEnergySupported).toBe('number');
      expect(typeof report.impactMetrics.communitiesHelped).toBe('number');
      expect(typeof report.impactMetrics.biodiversityProjects).toBe('number');
      expect(Array.isArray(report.achievements)).toBe(true);
      expect(report.reportUrl).toBeDefined();
      expect(report.reportUrl).toContain(testWalletAddress);
    });

    test('should handle different timeframes', async () => {
      const monthlyReport = await carbonTrading.generateImpactReport(testWalletAddress, 'monthly');
      const quarterlyReport = await carbonTrading.generateImpactReport(testWalletAddress, 'quarterly');
      const yearlyReport = await carbonTrading.generateImpactReport(testWalletAddress, 'yearly');

      expect(monthlyReport.reportUrl).toContain('monthly');
      expect(quarterlyReport.reportUrl).toContain('quarterly');
      expect(yearlyReport.reportUrl).toContain('yearly');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty search criteria', async () => {
      const credits = await carbonTrading.searchCredits({});
      expect(Array.isArray(credits)).toBe(true);
    });

    test('should handle invalid wallet addresses gracefully', async () => {
      const portfolio = await carbonTrading.getPortfolio('invalid_address');
      expect(portfolio.walletAddress).toBe('invalid_address');
      expect(portfolio.totalCredits).toBe(0);
    });

    test('should handle calculation with zero values', async () => {
      const result = await carbonTrading.calculateEmissions('energy_consumption', 0, 'kWh');
      expect(result.totalEmissions).toBe(0);
    });

    test('should handle recommendations for zero emissions', async () => {
      const recommendations = await carbonTrading.getOffsetRecommendations(0);
      expect(recommendations.recommendedAmount).toBe(0);
      expect(recommendations.estimatedCost).toBe(0);
    });
  });
});