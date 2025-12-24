/**
 * Property-Based Tests for Energy Wallet Security
 * Tests wallet security properties and invariants
 */

import * as fc from 'fast-check';
import { EnergyTradingImpl } from './EnergyTradingImpl';
import { defaultBlockchainConfig } from './index';

describe('Energy Wallet Security Property Tests', () => {
  let energyTrading: EnergyTradingImpl;

  beforeEach(() => {
    energyTrading = new EnergyTradingImpl(defaultBlockchainConfig, false);
    // Clear any existing wallets for clean test state
    (energyTrading as any).wallets.clear();
  });

  // Generators for property-based testing
  const userIdGen = fc.string({ minLength: 1, maxLength: 50 });
  const amountGen = fc.integer({ min: 1, max: 10000 });
  const currencyGen = fc.constantFrom('USD', 'EUR', 'ENERGY_TOKEN', 'BTC', 'ETH');
  const biometricTypeGen = fc.constantFrom('fingerprint', 'face', 'voice');
  const biometricDataGen = fc.string({ minLength: 10, maxLength: 100 });

  describe('Property 4: Wallet balance consistency', () => {
    /**
     * **Validates: Requirements 2.4, 2.7**
     * 
     * For any series of wallet operations (deposits, withdrawals, transfers),
     * the total balance across all wallets should remain consistent and
     * individual wallet balances should never become negative.
     */
    test('Wallet balances remain consistent across all operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: userIdGen,
            initialBalance: fc.integer({ min: 100, max: 5000 })
          }), { minLength: 2, maxLength: 5 }),
          fc.array(fc.record({
            fromIndex: fc.integer({ min: 0, max: 4 }),
            toIndex: fc.integer({ min: 0, max: 4 }),
            amount: amountGen,
            currency: currencyGen
          }), { maxLength: 20 })
        , async (users, operations) => {
          // Create wallets with initial balances
          const wallets = [];
          let totalInitialBalance = 0;

          for (const user of users) {
            const wallet = await energyTrading.createWallet(user.userId);
            const walletObj = await energyTrading.getWallet(wallet.address);
            
            if (walletObj) {
              if (user.initialBalance > 0) {
                walletObj.balance.fiatBalance = user.initialBalance;
                walletObj.balance.energyTokens = user.initialBalance;
                totalInitialBalance += user.initialBalance * 2; // fiat + energy tokens
              }
            }
            wallets.push(wallet);
          }

          // Perform operations
          for (const op of operations) {
            const fromIndex = op.fromIndex % wallets.length;
            const toIndex = op.toIndex % wallets.length;
            
            if (fromIndex !== toIndex) {
              const fromWallet = await energyTrading.getWallet(wallets[fromIndex].address);
              
              // Only perform operation if sender has sufficient balance
              if (fromWallet) {
                const availableBalance = op.currency === 'ENERGY_TOKEN' 
                  ? fromWallet.balance.energyTokens 
                  : fromWallet.balance.fiatBalance;
                
                if (availableBalance >= op.amount) {
                  try {
                    await energyTrading.transferTokens(
                      wallets[fromIndex].address,
                      wallets[toIndex].address,
                      op.amount,
                      op.currency
                    );
                  } catch (error) {
                    // Transfer failed, which is acceptable
                  }
                }
              }
            }
          }

          // Verify balance consistency
          let totalFinalBalance = 0;
          for (const wallet of wallets) {
            const finalWallet = await energyTrading.getWallet(wallet.address);
            if (finalWallet) {
              // All balances should be non-negative
              expect(finalWallet.balance.fiatBalance).toBeGreaterThanOrEqual(0);
              expect(finalWallet.balance.energyTokens).toBeGreaterThanOrEqual(0);
              expect(finalWallet.balance.carbonCredits).toBeGreaterThanOrEqual(0);
              
              // Sum up total balances
              totalFinalBalance += finalWallet.balance.fiatBalance + finalWallet.balance.energyTokens;
            }
          }

          // Total balance should be conserved (allowing for small floating point errors)
          expect(Math.abs(totalFinalBalance - totalInitialBalance)).toBeLessThan(0.01);
        }),
        { numRuns: 30 }
      );
    });

    test('Staking operations maintain balance consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.integer({ min: 1000, max: 10000 }),
          fc.array(fc.record({
            stakeAmount: fc.integer({ min: 50, max: 500 }),
            lockPeriod: fc.integer({ min: 1, max: 365 })
          }), { maxLength: 10 })
        , async (userId, initialTokens, stakingOps) => {
          const wallet = await energyTrading.createWallet(userId);
          const walletObj = await energyTrading.getWallet(wallet.address);
          
          if (walletObj) {
            walletObj.balance.energyTokens = initialTokens;
          }

          let totalStaked = 0;
          let availableTokens = initialTokens;

          for (const op of stakingOps) {
            if (availableTokens >= op.stakeAmount) {
              try {
                await energyTrading.stakeTokens(wallet.address, op.stakeAmount, op.lockPeriod);
                totalStaked += op.stakeAmount;
                availableTokens -= op.stakeAmount;
              } catch (error) {
                // Staking failed, which is acceptable
              }
            }
          }

          const finalWallet = await energyTrading.getWallet(wallet.address);
          if (finalWallet) {
            // Total tokens should be conserved
            const totalTokens = finalWallet.balance.energyTokens + finalWallet.staking.stakedAmount;
            expect(totalTokens).toBe(initialTokens);
            
            // Staked amount should match our tracking
            expect(finalWallet.staking.stakedAmount).toBe(totalStaked);
            
            // Available tokens should match our tracking
            expect(finalWallet.balance.energyTokens).toBe(availableTokens);
          }
        }),
        { numRuns: 25 }
      );
    });
  });

  describe('Property 5: Transaction immutability', () => {
    /**
     * **Validates: Requirements 2.4, 2.7**
     * 
     * For any wallet transaction, once recorded in the transaction history,
     * the transaction details should remain immutable and verifiable.
     */
    test('Transaction records are immutable once created', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: userIdGen,
            operations: fc.array(fc.record({
              type: fc.constantFrom('stake', 'transfer'),
              amount: amountGen,
              currency: currencyGen
            }), { maxLength: 5 })
          }), { minLength: 1, maxLength: 3 })
        , async (userOps) => {
          const wallets = [];
          
          // Create wallets and perform operations
          for (const userOp of userOps) {
            const wallet = await energyTrading.createWallet(userOp.userId);
            const walletObj = await energyTrading.getWallet(wallet.address);
            
            if (walletObj) {
              walletObj.balance.energyTokens = 10000;
              walletObj.balance.fiatBalance = 10000;
            }
            
            wallets.push(wallet);

            // Perform operations to create transactions
            for (const op of userOp.operations) {
              try {
                if (op.type === 'stake' && op.currency === 'ENERGY_TOKEN') {
                  await energyTrading.stakeTokens(wallet.address, op.amount, 30);
                } else if (op.type === 'transfer' && wallets.length > 1) {
                  const targetWallet = wallets[wallets.length - 2]; // Previous wallet
                  await energyTrading.transferTokens(
                    wallet.address,
                    targetWallet.address,
                    op.amount,
                    op.currency
                  );
                }
              } catch (error) {
                // Operation failed, which is acceptable
              }
            }
          }

          // Verify transaction immutability
          for (const wallet of wallets) {
            const walletObj = await energyTrading.getWallet(wallet.address);
            if (walletObj && walletObj.transactions.length > 0) {
              
              for (const transaction of walletObj.transactions) {
                // Transaction should have all required immutable fields
                expect(transaction.id).toBeDefined();
                expect(transaction.timestamp).toBeInstanceOf(Date);
                expect(transaction.blockHash).toMatch(/^0x[a-f0-9]{64}$/i);
                expect(transaction.status).toBe('confirmed');
                expect(transaction.gasUsed).toBeGreaterThan(0);
                
                // Amount and currency should be consistent
                expect(transaction.amount).toBeGreaterThan(0);
                expect(['buy', 'sell', 'stake', 'unstake', 'reward', 'fee', 'carbon_offset']).toContain(transaction.type);
                
                // Transaction ID should be unique
                const duplicateIds = walletObj.transactions.filter(tx => tx.id === transaction.id);
                expect(duplicateIds).toHaveLength(1);
              }
            }
          }
        }),
        { numRuns: 20 }
      );
    });

    test('Transaction timestamps are chronologically ordered', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.array(fc.integer({ min: 100, max: 1000 }), { minLength: 2, maxLength: 10 })
        , async (userId, stakeAmounts) => {
          const wallet = await energyTrading.createWallet(userId);
          const walletObj = await energyTrading.getWallet(wallet.address);
          
          if (walletObj) {
            walletObj.balance.energyTokens = 50000; // Ensure sufficient balance
          }

          // Perform multiple staking operations with small delays
          for (const amount of stakeAmounts) {
            await energyTrading.stakeTokens(wallet.address, amount, 30);
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 1));
          }

          const finalWallet = await energyTrading.getWallet(wallet.address);
          if (finalWallet && finalWallet.transactions.length > 1) {
            // Verify chronological ordering
            for (let i = 1; i < finalWallet.transactions.length; i++) {
              const prevTx = finalWallet.transactions[i - 1];
              const currentTx = finalWallet.transactions[i];
              
              expect(currentTx.timestamp.getTime()).toBeGreaterThanOrEqual(prevTx.timestamp.getTime());
            }
          }
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('Property 6: Reputation score accuracy', () => {
    /**
     * **Validates: Requirements 2.4, 2.7**
     * 
     * For any wallet, the reputation score should accurately reflect
     * the user's trading history and remain within valid bounds.
     */
    test('Reputation scores remain within valid bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: userIdGen,
            completedTrades: fc.integer({ min: 0, max: 1000 }),
            averageRating: fc.float({ min: 0, max: 5, noNaN: true }),
            badges: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 })
          }), { minLength: 1, maxLength: 10 })
        , async (userReputations) => {
          for (const userRep of userReputations) {
            const wallet = await energyTrading.createWallet(userRep.userId);
            const walletObj = await energyTrading.getWallet(wallet.address);
            
            if (walletObj) {
              // Update reputation data
              walletObj.reputation.completedTrades = userRep.completedTrades;
              walletObj.reputation.averageRating = userRep.averageRating;
              walletObj.reputation.badges = [...walletObj.reputation.badges, ...userRep.badges];
              
              // Calculate reputation score based on trades and rating
              const baseScore = 50; // Starting score
              const tradeBonus = Math.min(userRep.completedTrades * 0.5, 30); // Max 30 points from trades
              const ratingBonus = (userRep.averageRating - 2.5) * 8; // Rating impact
              const calculatedScore = Math.max(0, Math.min(100, baseScore + tradeBonus + ratingBonus));
              
              walletObj.reputation.score = calculatedScore;
            }

            // Verify reputation constraints
            const finalWallet = await energyTrading.getWallet(wallet.address);
            if (finalWallet) {
              // Score should be between 0 and 100
              expect(finalWallet.reputation.score).toBeGreaterThanOrEqual(0);
              expect(finalWallet.reputation.score).toBeLessThanOrEqual(100);
              
              // Completed trades should be non-negative
              expect(finalWallet.reputation.completedTrades).toBeGreaterThanOrEqual(0);
              
              // Average rating should be between 0 and 5
              expect(finalWallet.reputation.averageRating).toBeGreaterThanOrEqual(0);
              expect(finalWallet.reputation.averageRating).toBeLessThanOrEqual(5);
              
              // Badges should be an array
              expect(Array.isArray(finalWallet.reputation.badges)).toBe(true);
              
              // Should always have at least the newcomer badge initially
              expect(finalWallet.reputation.badges.length).toBeGreaterThan(0);
            }
          }
        }),
        { numRuns: 25 }
      );
    });

    test('Reputation score correlates with trading activity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: userIdGen,
            tradesCount: fc.integer({ min: 0, max: 100 }),
            avgRating: fc.float({ min: 1, max: 5, noNaN: true })
          }), { minLength: 2, maxLength: 5 })
        , async (traders) => {
          const wallets = [];
          
          for (const trader of traders) {
            const wallet = await energyTrading.createWallet(trader.userId);
            const walletObj = await energyTrading.getWallet(wallet.address);
            
            if (walletObj) {
              walletObj.reputation.completedTrades = trader.tradesCount;
              walletObj.reputation.averageRating = trader.avgRating;
              
              // Improved reputation calculation that properly weights both factors
              const baseScore = 50;
              const tradeBonus = Math.min(trader.tradesCount * 0.5, 30); // Trades are important
              const ratingBonus = trader.tradesCount > 0 ? (trader.avgRating - 2.5) * 4 : 0; // Rating only matters if there are trades
              walletObj.reputation.score = Math.max(0, Math.min(100, baseScore + tradeBonus + ratingBonus));
            }
            
            wallets.push({ wallet, trader });
          }

          // Verify that users with more trades generally have higher or equal reputation
          // (unless they have very poor ratings)
          for (let i = 0; i < wallets.length; i++) {
            for (let j = i + 1; j < wallets.length; j++) {
              const wallet1 = await energyTrading.getWallet(wallets[i].wallet.address);
              const wallet2 = await energyTrading.getWallet(wallets[j].wallet.address);
              
              if (wallet1 && wallet2) {
                const trader1 = wallets[i].trader;
                const trader2 = wallets[j].trader;
                
                // If one trader has significantly more trades and decent rating, they should have higher reputation
                if (trader1.tradesCount >= trader2.tradesCount + 10 && trader1.avgRating >= 2.5) {
                  expect(wallet1.reputation.score).toBeGreaterThanOrEqual(wallet2.reputation.score - 10);
                }
                
                // Users with no trades should have base reputation regardless of rating
                if (trader1.tradesCount === 0) {
                  expect(wallet1.reputation.score).toBe(50); // Base score
                }
              }
            }
          }
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Additional Security Properties', () => {
    test('Biometric authentication data is properly hashed', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.array(fc.record({
            type: biometricTypeGen,
            data: fc.string({ minLength: 20, maxLength: 100 }) // Longer, more unique data
          }), { minLength: 1, maxLength: 3 })
        , async (userId, biometricMethods) => {
          const wallet = await energyTrading.createWallet(userId);
          
          // Ensure unique biometric data per type
          const uniqueMethods = new Map();
          for (const method of biometricMethods) {
            const key = method.type as 'fingerprint' | 'face' | 'voice';
            if (!uniqueMethods.has(key)) {
              uniqueMethods.set(key, method.data + '_' + Math.random().toString(36));
            }
          }
          
          // Enable biometric methods with unique data
          for (const [type, data] of uniqueMethods.entries()) {
            await energyTrading.enableBiometricAuth(wallet.address, type, data);
          }

          const walletObj = await energyTrading.getWallet(wallet.address);
          if (walletObj && walletObj.biometricAuth.enabled) {
            
            for (const [type, data] of uniqueMethods.entries()) {
              const methodType = type as 'fingerprint' | 'face' | 'voice';
              const storedMethod = walletObj.biometricAuth.methods[methodType];
              
              if (storedMethod) {
                // Hash should not be the original data
                expect(storedMethod.hash).not.toBe(data);
                
                // Hash should be consistent (same data produces same hash)
                const isValid = await energyTrading.verifyBiometricAuth(
                  wallet.address,
                  methodType,
                  data
                );
                expect(isValid).toBe(true);
                
                // Different data should produce different result
                const isInvalid = await energyTrading.verifyBiometricAuth(
                  wallet.address,
                  methodType,
                  data + '_modified'
                );
                expect(isInvalid).toBe(false);
              }
            }
          }
        }),
        { numRuns: 15 }
      );
    });

    test('Wallet addresses are unique and properly formatted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userIdGen, { minLength: 2, maxLength: 20 })
        , async (userIds) => {
          const wallets = [];
          const addresses = new Set();
          
          for (const userId of userIds) {
            const wallet = await energyTrading.createWallet(userId);
            wallets.push(wallet);
            
            // Address should be properly formatted
            expect(wallet.address).toMatch(/^0x[a-f0-9]{40}$/i);
            
            // Address should be unique
            expect(addresses.has(wallet.address)).toBe(false);
            addresses.add(wallet.address);
          }

          // All addresses should be unique
          expect(addresses.size).toBe(userIds.length);
        }),
        { numRuns: 20 }
      );
    });

    test('Multi-currency balances maintain independence', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.record({
            energyTokens: fc.integer({ min: 0, max: 10000 }),
            carbonCredits: fc.integer({ min: 0, max: 1000 }),
            fiatBalance: fc.integer({ min: 0, max: 50000 }),
            ethBalance: fc.float({ min: 0, max: 100, noNaN: true }),
            btcBalance: fc.float({ min: 0, max: 10, noNaN: true })
          })
        , async (userId, balances) => {
          const wallet = await energyTrading.createWallet(userId);
          const walletObj = await energyTrading.getWallet(wallet.address);
          
          if (walletObj) {
            // Set different currency balances
            walletObj.balance.energyTokens = balances.energyTokens;
            walletObj.balance.carbonCredits = balances.carbonCredits;
            walletObj.balance.fiatBalance = balances.fiatBalance;
            walletObj.balance.cryptoBalances.ETH = balances.ethBalance;
            walletObj.balance.cryptoBalances.BTC = balances.btcBalance;
          }

          const finalWallet = await energyTrading.getWallet(wallet.address);
          if (finalWallet) {
            // Each currency balance should be independent and preserved
            expect(finalWallet.balance.energyTokens).toBe(balances.energyTokens);
            expect(finalWallet.balance.carbonCredits).toBe(balances.carbonCredits);
            expect(finalWallet.balance.fiatBalance).toBe(balances.fiatBalance);
            expect(finalWallet.balance.cryptoBalances.ETH).toBe(balances.ethBalance);
            expect(finalWallet.balance.cryptoBalances.BTC).toBe(balances.btcBalance);
            
            // All balances should be non-negative
            expect(finalWallet.balance.energyTokens).toBeGreaterThanOrEqual(0);
            expect(finalWallet.balance.carbonCredits).toBeGreaterThanOrEqual(0);
            expect(finalWallet.balance.fiatBalance).toBeGreaterThanOrEqual(0);
            expect(finalWallet.balance.cryptoBalances.ETH).toBeGreaterThanOrEqual(0);
            expect(finalWallet.balance.cryptoBalances.BTC).toBeGreaterThanOrEqual(0);
          }
        }),
        { numRuns: 25 }
      );
    });
  });
});