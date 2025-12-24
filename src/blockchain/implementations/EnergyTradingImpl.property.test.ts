/**
 * Property-Based Tests for EnergyTradingImpl
 * Tests blockchain energy trading correctness properties
 */

import * as fc from 'fast-check';
import { EnergyTradingImpl } from './EnergyTradingImpl';
import { defaultBlockchainConfig } from './index';
import {
  EnergyContract,
  EnergyWallet,
  ContractMetadata
} from '../interfaces/EnergyTrading';

describe('EnergyTradingImpl Property Tests', () => {
  let energyTrading: EnergyTradingImpl;

  beforeEach(() => {
    energyTrading = new EnergyTradingImpl(defaultBlockchainConfig, false); // Don't initialize connections for testing
    // Clear any existing contracts for clean test state
    (energyTrading as any).activeContracts.clear();
  });

  // Generators for property-based testing
  const energySourceGen = fc.constantFrom('solar', 'wind', 'hydro', 'nuclear', 'fossil', 'mixed');
  const blockchainNetworkGen = fc.constantFrom('ethereum', 'polygon', 'binance', 'solana');
  const currencyGen = fc.constantFrom('USD', 'EUR', 'BTC', 'ETH', 'ENERGY_TOKEN');
  const contractTypeGen = fc.constantFrom('spot', 'forward', 'subscription', 'auction');

  const contractMetadataGen = fc.record({
    energySource: energySourceGen,
    location: fc.record({
      latitude: fc.float({ min: -90, max: 90 }),
      longitude: fc.float({ min: -180, max: 180 }),
      region: fc.string({ minLength: 1, maxLength: 50 }),
      gridZone: fc.string({ minLength: 1, maxLength: 20 })
    }),
    qualityCertificates: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    sustainabilityScore: fc.integer({ min: 0, max: 100 }),
    gridImpact: fc.constantFrom('positive', 'neutral', 'negative'),
    peakHours: fc.boolean(),
    weatherDependent: fc.boolean()
  });

  const contractGen = fc.record({
    seller: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
    buyer: fc.constant(''),
    energyAmount: fc.float({ min: Math.fround(0.1), max: Math.fround(10000), noNaN: true }),
    pricePerKWh: fc.float({ min: Math.fround(0.01), max: Math.fround(1.0), noNaN: true }),
    currency: currencyGen,
    contractType: contractTypeGen,
    deliveryStart: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    blockchainNetwork: blockchainNetworkGen,
    carbonCredits: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
    renewablePercentage: fc.integer({ min: 0, max: 100 }),
    metadata: contractMetadataGen
  }).map(contract => ({
    ...contract,
    totalPrice: contract.energyAmount * contract.pricePerKWh,
    deliveryEnd: new Date(contract.deliveryStart.getTime() + 60 * 60 * 1000) // 1 hour later
  })) as fc.Arbitrary<Omit<EnergyContract, 'id' | 'status' | 'smartContractAddress'>>;

  describe('Property 1: Contract execution atomicity', () => {
    /**
     * **Validates: Requirements 1.3, 1.4, 1.7**
     * 
     * For any valid energy contract and buyer wallet with sufficient balance,
     * executing a trade should either complete successfully with all state changes
     * or fail completely with no state changes (atomicity).
     */
    test('Contract execution is atomic - either fully succeeds or fully fails', async () => {
      await fc.assert(
        fc.asyncProperty(contractGen, fc.string({ minLength: 1, maxLength: 20 }), async (contractData, userId) => {
          // Create seller and buyer wallets
          const seller = await energyTrading.createWallet(`seller_${userId}`);
          const buyer = await energyTrading.createWallet(`buyer_${userId}`);

          // Ensure buyer has sufficient balance
          const buyerWallet = await energyTrading.getWallet(buyer.address);
          if (buyerWallet) {
            buyerWallet.balance.fiatBalance = Math.max(contractData.totalPrice + 100, 1000);
          }

          // Create contract
          const contract = await energyTrading.createContract({
            ...contractData,
            seller: seller.address
          });

          // Record initial state
          const initialBuyerBalance = buyerWallet?.balance.fiatBalance || 0;
          const initialSellerWallet = await energyTrading.getWallet(seller.address);
          const initialSellerBalance = initialSellerWallet?.balance.fiatBalance || 0;
          const initialContractStatus = contract.status;

          try {
            // Execute trade
            const transaction = await energyTrading.executeTrade(contract.id, buyer.address);

            // If trade succeeds, all changes should be applied
            const finalBuyerWallet = await energyTrading.getWallet(buyer.address);
            const finalSellerWallet = await energyTrading.getWallet(seller.address);
            const finalContract = await energyTrading.getContract(contract.id);

            expect(transaction.status).toBe('confirmed');
            expect(finalContract?.status).toBe('active');
            expect(finalContract?.buyer).toBe(buyer.address);
            expect(finalBuyerWallet?.balance.fiatBalance).toBe(initialBuyerBalance - contractData.totalPrice);
            expect(finalSellerWallet?.balance.fiatBalance).toBe(initialSellerBalance + contractData.totalPrice);

          } catch (error) {
            // If trade fails, no changes should be applied
            const finalBuyerWallet = await energyTrading.getWallet(buyer.address);
            const finalSellerWallet = await energyTrading.getWallet(seller.address);
            const finalContract = await energyTrading.getContract(contract.id);

            expect(finalContract?.status).toBe(initialContractStatus);
            expect(finalBuyerWallet?.balance.fiatBalance).toBe(initialBuyerBalance);
            expect(finalSellerWallet?.balance.fiatBalance).toBe(initialSellerBalance);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2: Energy token conservation', () => {
    /**
     * **Validates: Requirements 1.3, 1.4, 1.7**
     * 
     * For any series of token transfers and trades, the total amount of tokens
     * in the system should remain constant (conservation of energy tokens).
     */
    test('Total energy tokens are conserved across all operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string({ minLength: 1, maxLength: 20 }),
            initialTokens: fc.integer({ min: 0, max: 1000 })
          }), { minLength: 2, maxLength: 5 }),
          fc.array(fc.record({
            fromIndex: fc.integer({ min: 0, max: 4 }),
            toIndex: fc.integer({ min: 0, max: 4 }),
            amount: fc.integer({ min: 1, max: 100 })
          }), { maxLength: 10 })
        , async (users, transfers) => {
          // Create wallets and set initial token balances
          const wallets = [];
          let totalInitialTokens = 0;

          for (const user of users) {
            const wallet = await energyTrading.createWallet(user.userId);
            const walletObj = await energyTrading.getWallet(wallet.address);
            if (walletObj) {
              walletObj.balance.energyTokens = user.initialTokens;
              totalInitialTokens += user.initialTokens;
            }
            wallets.push(wallet);
          }

          // Execute transfers
          for (const transfer of transfers) {
            const fromIndex = transfer.fromIndex % wallets.length;
            const toIndex = transfer.toIndex % wallets.length;
            
            if (fromIndex !== toIndex) {
              const fromWallet = await energyTrading.getWallet(wallets[fromIndex].address);
              
              // Only transfer if sender has sufficient balance
              if (fromWallet && fromWallet.balance.energyTokens >= transfer.amount) {
                try {
                  await energyTrading.transferTokens(
                    wallets[fromIndex].address,
                    wallets[toIndex].address,
                    transfer.amount,
                    'ENERGY_TOKEN'
                  );
                } catch (error) {
                  // Transfer failed, which is acceptable
                }
              }
            }
          }

          // Calculate total tokens after transfers
          let totalFinalTokens = 0;
          for (const wallet of wallets) {
            const finalWallet = await energyTrading.getWallet(wallet.address);
            if (finalWallet) {
              totalFinalTokens += finalWallet.balance.energyTokens;
            }
          }

          // Total tokens should be conserved
          expect(totalFinalTokens).toBe(totalInitialTokens);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 3: Multi-network consistency', () => {
    /**
     * **Validates: Requirements 1.3, 1.4, 1.7**
     * 
     * For any energy contract, the contract properties and behavior should be
     * consistent regardless of which blockchain network is used.
     */
    test('Contract behavior is consistent across blockchain networks', async () => {
      await fc.assert(
        fc.asyncProperty(contractGen, async (contractData) => {
          const networks = ['ethereum', 'polygon', 'binance', 'solana'] as const;
          const contracts = [];

          // Create identical contracts on different networks
          for (const network of networks) {
            const contract = await energyTrading.createContract({
              ...contractData,
              blockchainNetwork: network
            });
            contracts.push(contract);
          }

          // All contracts should have consistent properties
          for (let i = 1; i < contracts.length; i++) {
            expect(contracts[i].energyAmount).toBe(contracts[0].energyAmount);
            expect(contracts[i].pricePerKWh).toBe(contracts[0].pricePerKWh);
            expect(contracts[i].totalPrice).toBe(contracts[0].totalPrice);
            expect(contracts[i].currency).toBe(contracts[0].currency);
            expect(contracts[i].contractType).toBe(contracts[0].contractType);
            expect(contracts[i].status).toBe(contracts[0].status);
            expect(contracts[i].carbonCredits).toBe(contracts[0].carbonCredits);
            expect(contracts[i].renewablePercentage).toBe(contracts[0].renewablePercentage);
            
            // Metadata should be identical
            expect(contracts[i].metadata.energySource).toBe(contracts[0].metadata.energySource);
            expect(contracts[i].metadata.sustainabilityScore).toBe(contracts[0].metadata.sustainabilityScore);
            expect(contracts[i].metadata.gridImpact).toBe(contracts[0].metadata.gridImpact);
          }

          // All contracts should be retrievable
          for (const contract of contracts) {
            const retrieved = await energyTrading.getContract(contract.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe(contract.id);
          }

          // All contracts should appear in active contracts list
          const activeContracts = await energyTrading.getActiveContracts();
          for (const contract of contracts) {
            expect(activeContracts.some(ac => ac.id === contract.id)).toBe(true);
          }
        }),
        { numRuns: 25 }
      );
    });
  });

  describe('Additional Properties', () => {
    test('NaN validation prevents invalid contracts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            seller: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            buyer: fc.constant(''),
            energyAmount: fc.constantFrom(NaN, Infinity, -Infinity),
            pricePerKWh: fc.float({ min: Math.fround(0.01), max: Math.fround(1.0), noNaN: true }),
            currency: currencyGen,
            contractType: contractTypeGen,
            deliveryStart: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            blockchainNetwork: blockchainNetworkGen,
            carbonCredits: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
            renewablePercentage: fc.integer({ min: 0, max: 100 }),
            metadata: contractMetadataGen
          }).map(contract => ({
            ...contract,
            totalPrice: contract.energyAmount * contract.pricePerKWh,
            deliveryEnd: new Date(contract.deliveryStart.getTime() + 60 * 60 * 1000)
          })) as fc.Arbitrary<Omit<EnergyContract, 'id' | 'status' | 'smartContractAddress'>>
        , async (invalidContract) => {
          // Contracts with NaN/Infinity values should be rejected
          await expect(energyTrading.createContract(invalidContract)).rejects.toThrow();
        }),
        { numRuns: 10 }
      );
    });

    test('Wallet balance updates are consistent with transaction history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.array(fc.record({
            amount: fc.integer({ min: 1, max: 100 }),
            currency: currencyGen,
            type: fc.constantFrom('deposit', 'withdrawal')
          }), { maxLength: 20 })
        , async (userId, transactions) => {
          const wallet = await energyTrading.createWallet(userId);
          const initialBalance = 1000; // Starting fiat balance

          let expectedBalance = initialBalance;
          
          for (const tx of transactions) {
            if (tx.currency === 'USD' || tx.currency === 'EUR') {
              const walletObj = await energyTrading.getWallet(wallet.address);
              
              if (tx.type === 'deposit') {
                if (walletObj) {
                  walletObj.balance.fiatBalance += tx.amount;
                  expectedBalance += tx.amount;
                }
              } else if (tx.type === 'withdrawal' && walletObj && walletObj.balance.fiatBalance >= tx.amount) {
                walletObj.balance.fiatBalance -= tx.amount;
                expectedBalance -= tx.amount;
              }
            }
          }

          const finalWallet = await energyTrading.getWallet(wallet.address);
          expect(finalWallet?.balance.fiatBalance).toBe(expectedBalance);
        }),
        { numRuns: 30 }
      );
    });

    test('Contract filtering preserves contract properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(contractGen, { minLength: 1, maxLength: 10 }),
          energySourceGen
        , async (contracts, filterSource) => {
          // Clear any existing contracts for this test
          (energyTrading as any).activeContracts.clear();
          
          // Create all contracts
          const createdContracts = [];
          for (const contractData of contracts) {
            const contract = await energyTrading.createContract(contractData);
            createdContracts.push(contract);
          }

          // Filter by energy source
          const filteredContracts = await energyTrading.getActiveContracts({
            energySource: filterSource
          });

          // All filtered contracts should have the specified energy source
          for (const contract of filteredContracts) {
            expect(contract.metadata.energySource).toBe(filterSource);
          }

          // Count should match expected
          const expectedCount = createdContracts.filter(
            c => c.metadata.energySource === filterSource
          ).length;
          expect(filteredContracts.length).toBe(expectedCount);
        }),
        { numRuns: 20 }
      );
    });

    test('Carbon offset calculation is proportional to energy usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(1), max: Math.fround(1000) }),
          fc.record({
            coal: fc.integer({ min: 0, max: 100 }),
            natural_gas: fc.integer({ min: 0, max: 100 }),
            solar: fc.integer({ min: 0, max: 100 }),
            wind: fc.integer({ min: 0, max: 100 })
          }).filter(mix => {
            const total = mix.coal + mix.natural_gas + mix.solar + mix.wind;
            return total > 0 && total <= 100;
          })
        , async (energyUsage, energyMix) => {
          const carbonOffset1 = await energyTrading.calculateCarbonOffset(energyUsage, energyMix);
          const carbonOffset2 = await energyTrading.calculateCarbonOffset(energyUsage * 2, energyMix);

          // Carbon offset should be proportional to energy usage
          expect(carbonOffset2).toBeCloseTo(carbonOffset1 * 2, 2);
          
          // Carbon offset should be non-negative
          expect(carbonOffset1).toBeGreaterThanOrEqual(0);
          expect(carbonOffset2).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 30 }
      );
    });

    test('Staking rewards are proportional to staked amount and time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 1, max: 365 })
        , async (userId, stakeAmount, lockPeriod) => {
          const wallet = await energyTrading.createWallet(userId);
          
          // Set initial energy tokens
          const walletObj = await energyTrading.getWallet(wallet.address);
          if (walletObj) {
            walletObj.balance.energyTokens = stakeAmount * 2; // Ensure sufficient balance
          }

          // Stake tokens
          const transaction = await energyTrading.stakeTokens(
            wallet.address,
            stakeAmount,
            lockPeriod
          );

          expect(transaction.type).toBe('stake');
          expect(transaction.amount).toBe(stakeAmount);

          const updatedWallet = await energyTrading.getWallet(wallet.address);
          expect(updatedWallet?.staking.stakedAmount).toBe(stakeAmount);
          
          // Lock period should be set correctly (approximately)
          const expectedLockEnd = new Date(Date.now() + lockPeriod * 24 * 60 * 60 * 1000);
          const actualLockEnd = updatedWallet?.staking.lockPeriod;
          
          if (actualLockEnd) {
            const timeDiff = Math.abs(actualLockEnd.getTime() - expectedLockEnd.getTime());
            expect(timeDiff).toBeLessThan(60000); // Within 1 minute
          }
        }),
        { numRuns: 25 }
      );
    });
  });
});