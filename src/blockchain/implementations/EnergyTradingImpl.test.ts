/**
 * Unit Tests for EnergyTradingImpl
 * Tests blockchain energy trading functionality
 */

import { EnergyTradingImpl } from './EnergyTradingImpl';
import { defaultBlockchainConfig } from './index';
import {
  EnergyContract,
  EnergyWallet,
  ContractFilters,
  TradingPreferences
} from '../interfaces/EnergyTrading';

describe('EnergyTradingImpl', () => {
  let energyTrading: EnergyTradingImpl;
  let mockWallet: EnergyWallet;
  let mockContract: Omit<EnergyContract, 'id' | 'status' | 'smartContractAddress'>;

  beforeEach(() => {
    energyTrading = new EnergyTradingImpl(defaultBlockchainConfig, false); // Don't initialize connections for testing
    
    mockContract = {
      seller: '0x1234567890123456789012345678901234567890',
      buyer: '',
      energyAmount: 100,
      pricePerKWh: 0.12,
      totalPrice: 12.0,
      currency: 'USD',
      contractType: 'spot',
      deliveryStart: new Date('2024-01-01T00:00:00Z'),
      deliveryEnd: new Date('2024-01-01T01:00:00Z'),
      blockchainNetwork: 'ethereum',
      carbonCredits: 5,
      renewablePercentage: 100,
      metadata: {
        energySource: 'solar',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          region: 'California',
          gridZone: 'CAISO'
        },
        qualityCertificates: ['REC-001', 'GREEN-CERT-001'],
        sustainabilityScore: 95,
        gridImpact: 'positive',
        peakHours: false,
        weatherDependent: true
      }
    };
  });

  describe('Wallet Management', () => {
    test('should create a new energy wallet', async () => {
      const userId = 'user123';
      const wallet = await energyTrading.createWallet(userId);

      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe(userId);
      expect(wallet.address).toMatch(/^0x[a-f0-9]{40}$/);
      expect(wallet.balance.fiatBalance).toBe(1000); // Starting bonus
      expect(wallet.reputation.score).toBe(50); // Starting reputation
      expect(wallet.reputation.badges).toContain('newcomer');
    });

    test('should retrieve existing wallet', async () => {
      const userId = 'user123';
      const createdWallet = await energyTrading.createWallet(userId);
      const retrievedWallet = await energyTrading.getWallet(createdWallet.address);

      expect(retrievedWallet).toEqual(createdWallet);
    });

    test('should return null for non-existent wallet', async () => {
      const wallet = await energyTrading.getWallet('0x0000000000000000000000000000000000000000');
      expect(wallet).toBeNull();
    });

    test('should transfer tokens between wallets', async () => {
      const sender = await energyTrading.createWallet('sender');
      const receiver = await energyTrading.createWallet('receiver');
      
      const transferAmount = 100;
      const transaction = await energyTrading.transferTokens(
        sender.address,
        receiver.address,
        transferAmount,
        'USD'
      );

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('buy'); // From receiver's perspective
      expect(transaction.amount).toBe(transferAmount);
      expect(transaction.currency).toBe('USD');
      expect(transaction.status).toBe('confirmed');

      // Check updated balances
      const updatedSender = await energyTrading.getWallet(sender.address);
      const updatedReceiver = await energyTrading.getWallet(receiver.address);
      
      expect(updatedSender?.balance.fiatBalance).toBe(900); // 1000 - 100
      expect(updatedReceiver?.balance.fiatBalance).toBe(1100); // 1000 + 100
    });

    test('should fail transfer with insufficient balance', async () => {
      const sender = await energyTrading.createWallet('sender');
      const receiver = await energyTrading.createWallet('receiver');

      await expect(
        energyTrading.transferTokens(sender.address, receiver.address, 2000, 'USD')
      ).rejects.toThrow('Insufficient balance');
    });

    test('should stake energy tokens', async () => {
      const wallet = await energyTrading.createWallet('staker');
      
      // Add some energy tokens first
      const walletObj = await energyTrading.getWallet(wallet.address);
      if (walletObj) {
        walletObj.balance.energyTokens = 500;
      }

      const stakeAmount = 100;
      const lockPeriod = 30; // 30 days
      
      const transaction = await energyTrading.stakeTokens(
        wallet.address,
        stakeAmount,
        lockPeriod
      );

      expect(transaction.type).toBe('stake');
      expect(transaction.amount).toBe(stakeAmount);
      expect(transaction.currency).toBe('ENERGY_TOKEN');

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.staking.stakedAmount).toBe(stakeAmount);
      expect(updatedWallet?.balance.energyTokens).toBe(400); // 500 - 100
    });
  });

  describe('Contract Management', () => {
    test('should create a new energy contract', async () => {
      const contract = await energyTrading.createContract(mockContract);

      expect(contract).toBeDefined();
      expect(contract.id).toMatch(/^contract_/);
      expect(contract.status).toBe('pending');
      expect(contract.smartContractAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(contract.energyAmount).toBe(mockContract.energyAmount);
      expect(contract.pricePerKWh).toBe(mockContract.pricePerKWh);
    });

    test('should validate contract parameters', async () => {
      const invalidContract = {
        ...mockContract,
        energyAmount: -10 // Invalid negative amount
      };

      await expect(
        energyTrading.createContract(invalidContract)
      ).rejects.toThrow('Energy amount must be positive');
    });

    test('should validate price per kWh', async () => {
      const invalidContract = {
        ...mockContract,
        pricePerKWh: 0 // Invalid zero price
      };

      await expect(
        energyTrading.createContract(invalidContract)
      ).rejects.toThrow('Price per kWh must be positive');
    });

    test('should validate delivery time range', async () => {
      const invalidContract = {
        ...mockContract,
        deliveryStart: new Date('2024-01-01T01:00:00Z'),
        deliveryEnd: new Date('2024-01-01T00:00:00Z') // End before start
      };

      await expect(
        energyTrading.createContract(invalidContract)
      ).rejects.toThrow('Invalid delivery time range');
    });

    test('should retrieve contract by ID', async () => {
      const createdContract = await energyTrading.createContract(mockContract);
      const retrievedContract = await energyTrading.getContract(createdContract.id);

      expect(retrievedContract).toEqual(createdContract);
    });

    test('should return null for non-existent contract', async () => {
      const contract = await energyTrading.getContract('non-existent-id');
      expect(contract).toBeNull();
    });

    test('should get active contracts', async () => {
      await energyTrading.createContract(mockContract);
      await energyTrading.createContract({
        ...mockContract,
        pricePerKWh: 0.15
      });

      const activeContracts = await energyTrading.getActiveContracts();
      expect(activeContracts).toHaveLength(2);
      expect(activeContracts[0].status).toBe('pending');
      
      // Should be sorted by price (highest first)
      expect(activeContracts[0].pricePerKWh).toBeGreaterThanOrEqual(
        activeContracts[1].pricePerKWh
      );
    });

    test('should filter contracts by energy source', async () => {
      await energyTrading.createContract(mockContract); // Solar
      await energyTrading.createContract({
        ...mockContract,
        metadata: {
          ...mockContract.metadata,
          energySource: 'wind'
        }
      });

      const filters: ContractFilters = {
        energySource: 'solar'
      };

      const filteredContracts = await energyTrading.getActiveContracts(filters);
      expect(filteredContracts).toHaveLength(1);
      expect(filteredContracts[0].metadata.energySource).toBe('solar');
    });

    test('should filter contracts by price range', async () => {
      await energyTrading.createContract(mockContract); // $0.12/kWh
      await energyTrading.createContract({
        ...mockContract,
        pricePerKWh: 0.20
      });

      const filters: ContractFilters = {
        priceRange: { min: 0.10, max: 0.15 }
      };

      const filteredContracts = await energyTrading.getActiveContracts(filters);
      expect(filteredContracts).toHaveLength(1);
      expect(filteredContracts[0].pricePerKWh).toBe(0.12);
    });

    test('should filter renewable-only contracts', async () => {
      await energyTrading.createContract(mockContract); // Solar (renewable)
      await energyTrading.createContract({
        ...mockContract,
        metadata: {
          ...mockContract.metadata,
          energySource: 'fossil'
        }
      });

      const filters: ContractFilters = {
        renewableOnly: true
      };

      const filteredContracts = await energyTrading.getActiveContracts(filters);
      expect(filteredContracts).toHaveLength(1);
      expect(filteredContracts[0].metadata.energySource).toBe('solar');
    });

    test('should cancel pending contract', async () => {
      const contract = await energyTrading.createContract(mockContract);
      
      await energyTrading.cancelContract(contract.id, 'User requested cancellation');
      
      const cancelledContract = await energyTrading.getContract(contract.id);
      expect(cancelledContract?.status).toBe('cancelled');
    });

    test('should fail to cancel non-pending contract', async () => {
      const contract = await energyTrading.createContract(mockContract);
      
      // Manually set status to active
      if (contract) {
        (contract as any).status = 'active';
      }

      await expect(
        energyTrading.cancelContract(contract.id, 'Test cancellation')
      ).rejects.toThrow('Contract cannot be cancelled');
    });
  });

  describe('Trade Execution', () => {
    test('should execute successful trade', async () => {
      const seller = await energyTrading.createWallet('seller');
      const buyer = await energyTrading.createWallet('buyer');
      
      const contract = await energyTrading.createContract({
        ...mockContract,
        seller: seller.address
      });

      const transaction = await energyTrading.executeTrade(contract.id, buyer.address);

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('buy');
      expect(transaction.amount).toBe(contract.totalPrice);
      expect(transaction.relatedContract).toBe(contract.id);
      expect(transaction.status).toBe('confirmed');

      // Check contract status updated
      const updatedContract = await energyTrading.getContract(contract.id);
      expect(updatedContract?.status).toBe('active');
      expect(updatedContract?.buyer).toBe(buyer.address);
    });

    test('should fail trade with insufficient balance', async () => {
      const seller = await energyTrading.createWallet('seller');
      const buyer = await energyTrading.createWallet('buyer');
      
      const expensiveContract = await energyTrading.createContract({
        ...mockContract,
        seller: seller.address,
        totalPrice: 2000 // More than buyer's starting balance
      });

      await expect(
        energyTrading.executeTrade(expensiveContract.id, buyer.address)
      ).rejects.toThrow('Insufficient balance');
    });

    test('should fail trade for non-existent contract', async () => {
      const buyer = await energyTrading.createWallet('buyer');

      await expect(
        energyTrading.executeTrade('non-existent-contract', buyer.address)
      ).rejects.toThrow('Contract not found');
    });

    test('should fail trade for non-pending contract', async () => {
      const seller = await energyTrading.createWallet('seller');
      const buyer = await energyTrading.createWallet('buyer');
      
      const contract = await energyTrading.createContract({
        ...mockContract,
        seller: seller.address
      });

      // Manually set status to completed
      (contract as any).status = 'completed';

      await expect(
        energyTrading.executeTrade(contract.id, buyer.address)
      ).rejects.toThrow('Contract is not available for trading');
    });
  });

  describe('Market Statistics', () => {
    test('should get market statistics', async () => {
      await energyTrading.createContract(mockContract);
      
      const stats = await energyTrading.getMarketStats();

      expect(stats).toBeDefined();
      expect(stats.totalVolume24h).toBeGreaterThan(0);
      expect(stats.totalTrades24h).toBeGreaterThan(0);
      expect(stats.activeUsers).toBeGreaterThan(0);
      expect(typeof stats.renewablePercentage).toBe('number');
    });

    test('should get marketplace information', async () => {
      const marketplace = await energyTrading.getMarketplace('global-energy-marketplace');

      expect(marketplace).toBeDefined();
      expect(marketplace?.name).toBe('Global Energy Marketplace');
      expect(marketplace?.supportedNetworks).toContain('ethereum');
      expect(marketplace?.supportedNetworks).toContain('polygon');
      expect(marketplace?.tradingPairs).toHaveLength(2);
    });
  });

  describe('Carbon Credits', () => {
    test('should calculate carbon offset', async () => {
      const energyUsage = 100; // kWh
      const energyMix = {
        coal: 30,
        natural_gas: 40,
        solar: 20,
        wind: 10
      };

      const carbonOffset = await energyTrading.calculateCarbonOffset(energyUsage, energyMix);

      expect(carbonOffset).toBeGreaterThan(0);
      expect(typeof carbonOffset).toBe('number');
    });

    test('should purchase carbon credits', async () => {
      const amount = 5;
      const criteria = {
        standard: 'VCS',
        vintage: 2023,
        verified: true
      };

      const credits = await energyTrading.purchaseCarbonCredits(amount, criteria);

      expect(credits).toHaveLength(amount);
      expect(credits[0].standard).toBe('VCS');
      expect(credits[0].verification.verified).toBe(true);
      expect(credits[0].retirement.retired).toBe(false);
    });

    test('should retire carbon credits', async () => {
      const credits = await energyTrading.purchaseCarbonCredits(2, {});
      const creditIds = credits.map(c => c.id);

      await expect(
        energyTrading.retireCarbonCredits(creditIds, 'Offset energy consumption')
      ).resolves.not.toThrow();
    });
  });

  describe('Trading Recommendations', () => {
    test('should get trading recommendations', async () => {
      const wallet = await energyTrading.createWallet('trader');
      const preferences: TradingPreferences = {
        riskTolerance: 'medium',
        investmentHorizon: 'short',
        sustainabilityFocus: true,
        maxTradeSize: 1000,
        preferredEnergySource: ['solar', 'wind'],
        autoTrading: false
      };

      const recommendations = await energyTrading.getTradingRecommendations(
        wallet.address,
        preferences
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('type');
        expect(recommendations[0]).toHaveProperty('reasoning');
        expect(recommendations[0]).toHaveProperty('confidence');
        expect(recommendations[0].confidence).toBeGreaterThanOrEqual(0);
        expect(recommendations[0].confidence).toBeLessThanOrEqual(100);
      }
    });

    test('should get compliance status', async () => {
      const wallet = await energyTrading.createWallet('compliant-user');
      
      const compliance = await energyTrading.getComplianceStatus(
        wallet.address,
        'US'
      );

      expect(compliance).toBeDefined();
      expect(compliance.jurisdiction).toBe('US');
      expect(typeof compliance.compliant).toBe('boolean');
      expect(Array.isArray(compliance.requirements)).toBe(true);
      expect(Array.isArray(compliance.certifications)).toBe(true);
    });

    test('should generate trading report', async () => {
      const wallet = await energyTrading.createWallet('reporter');
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const report = await energyTrading.generateTradingReport(
        wallet.address,
        timeRange
      );

      expect(report).toBeDefined();
      expect(report.walletAddress).toBe(wallet.address);
      expect(report.timeRange).toEqual(timeRange);
      expect(report.summary).toHaveProperty('totalTrades');
      expect(report.performance).toHaveProperty('roi');
      expect(report.breakdown).toHaveProperty('byEnergySource');
      expect(report.taxInformation).toHaveProperty('capitalGains');
    });
  });

  describe('Multi-Blockchain Support', () => {
    test('should support multiple blockchain networks', async () => {
      const networks = ['ethereum', 'polygon', 'binance'] as const;
      
      for (const network of networks) {
        const contract = await energyTrading.createContract({
          ...mockContract,
          blockchainNetwork: network
        });

        expect(contract.blockchainNetwork).toBe(network);
        expect(contract.smartContractAddress).toMatch(/^0x[a-f0-9]{40}$/);
      }
    });

    test('should handle Solana network', async () => {
      const solanaContract = await energyTrading.createContract({
        ...mockContract,
        blockchainNetwork: 'solana'
      });

      expect(solanaContract.blockchainNetwork).toBe('solana');
      expect(solanaContract.smartContractAddress).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle wallet not found errors gracefully', async () => {
      const result = await energyTrading.getWallet('invalid-address');
      expect(result).toBeNull();
    });

    test('should handle contract not found errors gracefully', async () => {
      const result = await energyTrading.getContract('invalid-contract-id');
      expect(result).toBeNull();
    });

    test('should handle marketplace not found errors gracefully', async () => {
      const result = await energyTrading.getMarketplace('invalid-marketplace');
      expect(result).toBeNull();
    });
  });
});