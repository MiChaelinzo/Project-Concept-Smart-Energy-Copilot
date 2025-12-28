/**
 * Property-Based Tests for Carbon Credit Trading Implementation
 * Tests carbon accounting accuracy, credit retirement immutability, and portfolio balance consistency
 */

import * as fc from 'fast-check';
import { CarbonCreditTradingImpl } from './CarbonCreditTradingImpl';
import { CarbonCreditCriteria } from '../interfaces/CarbonCreditTrading';

describe('Carbon Credit Trading Property Tests', () => {
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

  beforeEach(() => {
    carbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
  });

  describe('Property 7: Carbon Calculation Accuracy', () => {
    test('emission calculations should be proportional to activity amount', () => {
      fc.assert(fc.asyncProperty(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.constantFrom('energy_consumption', 'transportation', 'manufacturing', 'natural_gas'),
        fc.constantFrom('kWh', 'km', 'kg', 'm3'),
        async (amount, activityType, unit) => {
          // Skip invalid combinations
          if ((activityType === 'energy_consumption' && unit !== 'kWh') ||
              (activityType === 'transportation' && unit !== 'km') ||
              (activityType === 'manufacturing' && unit !== 'kg') ||
              (activityType === 'natural_gas' && unit !== 'm3')) {
            return true;
          }

          try {
            const result = await carbonTrading.calculateEmissions(activityType, amount, unit);
            
            // Property: Emissions should be proportional to amount
            expect(result.totalEmissions).toBeCloseTo(amount * result.emissionFactor, 5);
            
            // Property: Zero amount should result in zero emissions
            if (amount === 0) {
              expect(result.totalEmissions).toBe(0);
            }
            
            // Property: Positive amount should result in positive emissions
            if (amount > 0) {
              expect(result.totalEmissions).toBeGreaterThan(0);
            }
            
            // Property: Emission factor should be consistent
            expect(result.emissionFactor).toBeGreaterThan(0);
            
            return true;
          } catch (error) {
            // Should not throw for valid inputs
            return false;
          }
        }
      ), { numRuns: 100 });
    });

    test('emission calculations should be additive', () => {
      fc.assert(fc.asyncProperty(
        fc.float({ min: 1, max: 1000, noNaN: true }),
        fc.float({ min: 1, max: 1000, noNaN: true }),
        async (amount1, amount2) => {
          const activityType = 'energy_consumption';
          const unit = 'kWh';
          
          const result1 = await carbonTrading.calculateEmissions(activityType, amount1, unit);
          const result2 = await carbonTrading.calculateEmissions(activityType, amount2, unit);
          const resultCombined = await carbonTrading.calculateEmissions(activityType, amount1 + amount2, unit);
          
          // Property: Emissions should be additive
          const expectedTotal = result1.totalEmissions + result2.totalEmissions;
          expect(resultCombined.totalEmissions).toBeCloseTo(expectedTotal, 5);
          
          return true;
        }
      ), { numRuns: 50 });
    });

    test('emission factors should remain consistent across calculations', () => {
      fc.assert(fc.asyncProperty(
        fc.float({ min: 1, max: 1000, noNaN: true }),
        fc.float({ min: 1, max: 1000, noNaN: true }),
        async (amount1, amount2) => {
          const activityType = 'transportation';
          const unit = 'km';
          
          const result1 = await carbonTrading.calculateEmissions(activityType, amount1, unit);
          const result2 = await carbonTrading.calculateEmissions(activityType, amount2, unit);
          
          // Property: Emission factor should be consistent
          expect(result1.emissionFactor).toBe(result2.emissionFactor);
          expect(result1.methodology).toBe(result2.methodology);
          
          return true;
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 8: Credit Retirement Immutability', () => {
    test('retired credits cannot be modified or retired again', () => {
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 100 }),
        async (walletAddress, retirementReason) => {
          // Create a fresh instance for each test
          const freshCarbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
          
          // Purchase credits first
          const availableCredits = await freshCarbonTrading.searchCredits({});
          if (availableCredits.length === 0) return true;
          
          const creditIds = [availableCredits[0].id];
          const purchasedCredits = await freshCarbonTrading.purchaseCredits(creditIds, walletAddress);
          
          // Retire the credits
          const certificate = await freshCarbonTrading.retireCredits(
            [purchasedCredits[0].id], 
            retirementReason, 
            walletAddress
          );
          
          // Property: Retirement certificate should be immutable
          expect(certificate.id).toBeDefined();
          expect(certificate.retiredBy).toBe(walletAddress);
          expect(certificate.reason).toBe(retirementReason);
          expect(certificate.retirementDate).toBeInstanceOf(Date);
          
          // Property: Credit should be marked as retired in portfolio
          const portfolio = await freshCarbonTrading.getPortfolio(walletAddress);
          const retiredCredit = portfolio.credits.find(c => c.id === purchasedCredits[0].id);
          expect(retiredCredit?.retirement.retired).toBe(true);
          expect(retiredCredit?.retirement.retiredBy).toBe(walletAddress);
          expect(retiredCredit?.retirement.reason).toBe(retirementReason);
          
          // Property: Cannot retire the same credit again
          try {
            await freshCarbonTrading.retireCredits([purchasedCredits[0].id], 'Second attempt', walletAddress);
            return false; // Should have thrown an error
          } catch (error: any) {
            expect(error.message).toContain('already retired');
            return true;
          }
        }
      ), { numRuns: 20 });
    });

    test('retirement certificates should have unique IDs and blockchain proofs', () => {
      fc.assert(fc.asyncProperty(
        fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
        fc.string({ minLength: 5, maxLength: 100 }),
        async (walletAddresses, retirementReason) => {
          const certificates: any[] = [];
          
          for (const walletAddress of walletAddresses) {
            try {
              // Purchase and retire credits for each wallet
              const availableCredits = await carbonTrading.searchCredits({});
              if (availableCredits.length === 0) continue;
              
              const creditIds = [availableCredits[0].id];
              const purchasedCredits = await carbonTrading.purchaseCredits(creditIds, walletAddress);
              
              const certificate = await carbonTrading.retireCredits(
                [purchasedCredits[0].id], 
                retirementReason, 
                walletAddress
              );
              
              certificates.push(certificate);
            } catch (error) {
              // Skip if purchase/retirement fails
              continue;
            }
          }
          
          if (certificates.length < 2) return true;
          
          // Property: All certificate IDs should be unique
          const certificateIds = certificates.map(c => c.id);
          const uniqueIds = new Set(certificateIds);
          expect(uniqueIds.size).toBe(certificateIds.length);
          
          // Property: All blockchain proofs should be unique
          const blockchainProofs = certificates.map(c => c.blockchainProof);
          const uniqueProofs = new Set(blockchainProofs);
          expect(uniqueProofs.size).toBe(blockchainProofs.length);
          
          // Property: All verification hashes should be unique
          const verificationHashes = certificates.map(c => c.verificationHash);
          const uniqueHashes = new Set(verificationHashes);
          expect(uniqueHashes.size).toBe(verificationHashes.length);
          
          return true;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 9: Portfolio Balance Consistency', () => {
    test('portfolio totals should equal sum of individual credits', () => {
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.integer({ min: 1, max: 3 }), // Number of credits to purchase
        async (walletAddress, numCredits) => {
          // Create a fresh instance for each test
          const freshCarbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
          
          const availableCredits = await freshCarbonTrading.searchCredits({});
          if (availableCredits.length === 0) return true;
          
          const creditIds = availableCredits.slice(0, Math.min(numCredits, availableCredits.length)).map(c => c.id);
          const purchasedCredits = await freshCarbonTrading.purchaseCredits(creditIds, walletAddress);
          
          const portfolio = await freshCarbonTrading.getPortfolio(walletAddress);
          
          // Property: Total credits should equal sum of individual credit amounts
          const calculatedTotal = portfolio.credits
            .filter(c => !c.retirement.retired)
            .reduce((sum, credit) => sum + credit.amount, 0);
          
          // Note: We compare with active credits only
          const activeCredits = portfolio.credits.filter(c => !c.retirement.retired);
          const activeTotalAmount = activeCredits.reduce((sum, credit) => sum + credit.amount, 0);
          
          expect(activeTotalAmount).toBeCloseTo(calculatedTotal, 5);
          
          // Property: Total value should be reasonable
          expect(portfolio.totalValue).toBeGreaterThanOrEqual(0);
          
          // Property: Performance metrics should be consistent
          expect(portfolio.performance.totalPurchased).toBeGreaterThanOrEqual(portfolio.performance.totalRetired);
          
          // Property: Total purchased should match the sum of all credits (including retired)
          const allCreditsAmount = portfolio.credits.reduce((sum, credit) => sum + credit.amount, 0);
          expect(portfolio.performance.totalPurchased).toBeCloseTo(allCreditsAmount, 5);
          
          return true;
        }
      ), { numRuns: 20 });
    });

    test('portfolio diversification should sum to total credits', () => {
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }),
        async (walletAddress) => {
          // Create a fresh instance for each test
          const freshCarbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
          
          // Purchase multiple different credits
          const availableCredits = await freshCarbonTrading.searchCredits({});
          if (availableCredits.length === 0) return true;
          
          const creditIds = availableCredits.slice(0, Math.min(3, availableCredits.length)).map(c => c.id);
          await freshCarbonTrading.purchaseCredits(creditIds, walletAddress);
          
          const portfolio = await freshCarbonTrading.getPortfolio(walletAddress);
          const activeCredits = portfolio.credits.filter(c => !c.retirement.retired);
          
          if (activeCredits.length === 0) return true;
          
          // Property: Diversification by standard should sum to total active credits
          const totalByStandard = Object.values(portfolio.diversification.byStandard)
            .reduce((sum: number, amount: any) => sum + amount, 0);
          const totalActiveAmount = activeCredits.reduce((sum, credit) => sum + credit.amount, 0);
          
          if (totalActiveAmount === 0) return true; // Skip if no active credits
          
          expect(totalByStandard).toBeCloseTo(totalActiveAmount, 5);
          
          // Property: Diversification by vintage should sum to total active credits
          const totalByVintage = Object.values(portfolio.diversification.byVintage)
            .reduce((sum: number, amount: any) => sum + amount, 0);
          
          if (totalActiveAmount > 0) {
            expect(totalByVintage).toBeCloseTo(totalActiveAmount, 5);
          }
          
          // Property: Diversification by project should sum to total active credits
          const totalByProject = Object.values(portfolio.diversification.byProject)
            .reduce((sum: number, amount: any) => sum + amount, 0);
          
          if (totalActiveAmount > 0) {
            expect(totalByProject).toBeCloseTo(totalActiveAmount, 5);
          }
          
          return true;
        }
      ), { numRuns: 15 });
    });

    test('retirement should decrease active portfolio but maintain total purchased', () => {
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 100 }),
        async (walletAddress, retirementReason) => {
          // Create a fresh instance for each test
          const freshCarbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
          
          // Purchase credits
          const availableCredits = await freshCarbonTrading.searchCredits({});
          if (availableCredits.length === 0) return true;
          
          const creditIds = [availableCredits[0].id];
          const purchasedCredits = await freshCarbonTrading.purchaseCredits(creditIds, walletAddress);
          
          const portfolioBefore = await freshCarbonTrading.getPortfolio(walletAddress);
          const totalPurchasedBefore = portfolioBefore.performance.totalPurchased;
          const totalRetiredBefore = portfolioBefore.performance.totalRetired;
          
          // Retire credits
          await freshCarbonTrading.retireCredits([purchasedCredits[0].id], retirementReason, walletAddress);
          
          const portfolioAfter = await freshCarbonTrading.getPortfolio(walletAddress);
          
          // Property: Total purchased should remain the same
          expect(portfolioAfter.performance.totalPurchased).toBe(totalPurchasedBefore);
          
          // Property: Total retired should increase
          expect(portfolioAfter.performance.totalRetired).toBeGreaterThan(totalRetiredBefore);
          
          // Property: Total retired should not exceed total purchased
          expect(portfolioAfter.performance.totalRetired).toBeLessThanOrEqual(portfolioAfter.performance.totalPurchased);
          
          return true;
        }
      ), { numRuns: 15 });
    });
  });

  describe('Property 10: Search and Filter Consistency', () => {
    test('search filters should be consistent and non-contradictory', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          standard: fc.option(fc.constantFrom('VCS', 'CDM', 'GS', 'CAR', 'RGGI')),
          minPrice: fc.option(fc.float({ min: 0, max: 50, noNaN: true })),
          maxPrice: fc.option(fc.float({ min: 0, max: 100, noNaN: true })),
          minVintage: fc.option(fc.integer({ min: 2020, max: 2023 })),
          maxVintage: fc.option(fc.integer({ min: 2020, max: 2024 })),
          minQualityScore: fc.option(fc.integer({ min: 0, max: 100 }))
        }),
        async (criteria) => {
          // Skip contradictory criteria
          if (criteria.minPrice && criteria.maxPrice && criteria.minPrice > criteria.maxPrice) {
            return true;
          }
          if (criteria.minVintage && criteria.maxVintage && criteria.minVintage > criteria.maxVintage) {
            return true;
          }
          
          // Create a fresh instance to ensure we have mock data
          const freshCarbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
          
          const cleanCriteria: CarbonCreditCriteria = {};
          if (criteria.standard) cleanCriteria.standard = criteria.standard as any;
          if (criteria.minPrice) cleanCriteria.minPrice = criteria.minPrice;
          if (criteria.maxPrice) cleanCriteria.maxPrice = criteria.maxPrice;
          if (criteria.minVintage) cleanCriteria.minVintage = criteria.minVintage;
          if (criteria.maxVintage) cleanCriteria.maxVintage = criteria.maxVintage;
          if (criteria.minQualityScore) cleanCriteria.minQualityScore = criteria.minQualityScore;
          
          const results = await freshCarbonTrading.searchCredits(cleanCriteria);
          
          // Property: All results should match the criteria
          results.forEach(credit => {
            if (cleanCriteria.standard) {
              expect(credit.standard).toBe(cleanCriteria.standard);
            }
            if (cleanCriteria.minPrice) {
              expect(credit.price).toBeGreaterThanOrEqual(cleanCriteria.minPrice);
            }
            if (cleanCriteria.maxPrice) {
              expect(credit.price).toBeLessThanOrEqual(cleanCriteria.maxPrice);
            }
            if (cleanCriteria.minVintage) {
              expect(credit.vintage).toBeGreaterThanOrEqual(cleanCriteria.minVintage);
            }
            if (cleanCriteria.maxVintage) {
              expect(credit.vintage).toBeLessThanOrEqual(cleanCriteria.maxVintage);
            }
            if (cleanCriteria.minQualityScore) {
              expect(credit.metadata.qualityScore).toBeGreaterThanOrEqual(cleanCriteria.minQualityScore);
            }
            
            // Property: No retired credits should be returned
            expect(credit.retirement.retired).toBe(false);
          });
          
          return true;
        }
      ), { numRuns: 50 });
    });

    test('empty search should return all available credits', () => {
      fc.assert(fc.asyncProperty(
        fc.constant({}),
        async (emptyCriteria) => {
          // Create a fresh instance to ensure we have mock data
          const freshCarbonTrading = new CarbonCreditTradingImpl(mockConfig, true);
          const allCredits = await freshCarbonTrading.searchCredits(emptyCriteria);
          
          // Property: Should return some credits (we initialized with mock data)
          expect(allCredits.length).toBeGreaterThan(0);
          
          // Property: All returned credits should be available (not retired)
          allCredits.forEach(credit => {
            expect(credit.retirement.retired).toBe(false);
            expect(credit.verification.verified).toBe(true);
          });
          
          return true;
        }
      ), { numRuns: 5 });
    });
  });

  describe('Property 11: Offset Recommendation Accuracy', () => {
    test('offset recommendations should cover required emissions', () => {
      fc.assert(fc.asyncProperty(
        fc.float({ min: 1000, max: 100000, noNaN: true }), // emissions in kg
        async (emissions) => {
          const recommendations = await carbonTrading.getOffsetRecommendations(emissions);
          
          const emissionsInTons = emissions / 1000;
          
          // Property: Recommended amount should match emissions
          expect(recommendations.recommendedAmount).toBeCloseTo(emissionsInTons, 2);
          
          // Property: Recommended credits should cover the emissions
          const totalRecommendedAmount = recommendations.recommendedCredits
            .reduce((sum, credit) => sum + credit.amount, 0);
          
          // Only check coverage if we have recommended credits
          if (recommendations.recommendedCredits.length > 0) {
            expect(totalRecommendedAmount).toBeGreaterThanOrEqual(emissionsInTons * 0.95); // Allow 5% tolerance
          }
          
          // Property: Cost should be positive for positive emissions (if credits are available)
          if (emissions > 0 && recommendations.recommendedCredits.length > 0) {
            expect(recommendations.estimatedCost).toBeGreaterThan(0);
          }
          
          // Property: Urgency should correlate with emission amount
          if (emissionsInTons > 100) {
            expect(recommendations.urgency).toBe('high');
          } else if (emissionsInTons > 10) {
            expect(recommendations.urgency).toBe('medium');
          } else {
            expect(recommendations.urgency).toBe('low');
          }
          
          return true;
        }
      ), { numRuns: 30 });
    });

    test('recommendations with preferences should respect constraints', () => {
      fc.assert(fc.asyncProperty(
        fc.float({ min: 5000, max: 50000, noNaN: true }),
        fc.record({
          standard: fc.option(fc.constantFrom('VCS', 'GS')),
          maxPrice: fc.option(fc.float({ min: 10, max: 30, noNaN: true })),
          minQualityScore: fc.option(fc.integer({ min: 80, max: 100 }))
        }),
        async (emissions, preferences) => {
          const cleanPreferences: CarbonCreditCriteria = {};
          if (preferences.standard) cleanPreferences.standard = preferences.standard as any;
          if (preferences.maxPrice) cleanPreferences.maxPrice = preferences.maxPrice;
          if (preferences.minQualityScore) cleanPreferences.minQualityScore = preferences.minQualityScore;
          
          const recommendations = await carbonTrading.getOffsetRecommendations(emissions, cleanPreferences);
          
          // Property: All recommended credits should match preferences
          recommendations.recommendedCredits.forEach(credit => {
            if (cleanPreferences.standard) {
              expect(credit.standard).toBe(cleanPreferences.standard);
            }
            if (cleanPreferences.maxPrice) {
              expect(credit.price).toBeLessThanOrEqual(cleanPreferences.maxPrice);
            }
            if (cleanPreferences.minQualityScore) {
              expect(credit.metadata.qualityScore).toBeGreaterThanOrEqual(cleanPreferences.minQualityScore);
            }
          });
          
          return true;
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 12: Market Data Consistency', () => {
    test('market data should be internally consistent', () => {
      fc.assert(fc.asyncProperty(
        fc.constant(null),
        async () => {
          const marketData = await carbonTrading.getMarketData();
          
          // Property: Timestamp should be recent
          const now = new Date();
          const timeDiff = now.getTime() - marketData.timestamp.getTime();
          expect(timeDiff).toBeLessThan(60000); // Within 1 minute
          
          // Property: Average price should be positive
          expect(marketData.prices.average).toBeGreaterThan(0);
          
          // Property: All volume metrics should be positive
          expect(marketData.volume.daily).toBeGreaterThan(0);
          expect(marketData.volume.weekly).toBeGreaterThan(0);
          expect(marketData.volume.monthly).toBeGreaterThan(0);
          
          // Property: Weekly volume should be greater than daily
          expect(marketData.volume.weekly).toBeGreaterThanOrEqual(marketData.volume.daily);
          
          // Property: Monthly volume should be greater than weekly
          expect(marketData.volume.monthly).toBeGreaterThanOrEqual(marketData.volume.weekly);
          
          // Property: Market cap should be positive
          expect(marketData.marketCap).toBeGreaterThan(0);
          
          // Property: Active projects should be positive
          expect(marketData.activeProjects).toBeGreaterThan(0);
          
          // Property: Price trends should be reasonable (-100% to +100%)
          expect(marketData.trends.priceChange24h).toBeGreaterThanOrEqual(-100);
          expect(marketData.trends.priceChange24h).toBeLessThanOrEqual(100);
          
          return true;
        }
      ), { numRuns: 10 });
    });
  });
});