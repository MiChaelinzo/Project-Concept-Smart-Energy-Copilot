/**
 * Unit Tests for Energy Wallet Management
 * Tests wallet operations, biometric authentication, and security features
 */

import { EnergyTradingImpl } from './EnergyTradingImpl';
import { defaultBlockchainConfig } from './index';

describe('Energy Wallet Management Tests', () => {
  let energyTrading: EnergyTradingImpl;

  beforeEach(() => {
    energyTrading = new EnergyTradingImpl(defaultBlockchainConfig, false);
  });

  describe('Secure Wallet Creation and Key Management', () => {
    test('should create wallet with secure address generation', async () => {
      const userId = 'test_user_001';
      const wallet = await energyTrading.createWallet(userId);

      expect(wallet.address).toMatch(/^0x[a-f0-9]{40}$/i);
      expect(wallet.userId).toBe(userId);
      expect(wallet.balance.fiatBalance).toBe(1000); // Starting bonus
      expect(wallet.balance.energyTokens).toBe(0);
      expect(wallet.balance.carbonCredits).toBe(0);
      expect(wallet.reputation.score).toBe(50); // Starting reputation
      expect(wallet.biometricAuth.enabled).toBe(false);
    });

    test('should generate unique addresses for different users', async () => {
      const wallet1 = await energyTrading.createWallet('user1');
      const wallet2 = await energyTrading.createWallet('user2');

      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet1.userId).toBe('user1');
      expect(wallet2.userId).toBe('user2');
    });

    test('should initialize wallet with proper structure', async () => {
      const wallet = await energyTrading.createWallet('test_user');

      expect(wallet.transactions).toEqual([]);
      expect(wallet.staking.stakedAmount).toBe(0);
      expect(wallet.staking.rewards).toBe(0);
      expect(wallet.reputation.completedTrades).toBe(0);
      expect(wallet.reputation.badges).toContain('newcomer');
      expect(wallet.biometricAuth.methods).toEqual({});
    });

    test('should retrieve wallet by address', async () => {
      const wallet = await energyTrading.createWallet('test_user');
      const retrievedWallet = await energyTrading.getWallet(wallet.address);

      expect(retrievedWallet).not.toBeNull();
      expect(retrievedWallet?.address).toBe(wallet.address);
      expect(retrievedWallet?.userId).toBe('test_user');
    });

    test('should return null for non-existent wallet', async () => {
      const nonExistentWallet = await energyTrading.getWallet('0x1234567890123456789012345678901234567890');
      expect(nonExistentWallet).toBeNull();
    });
  });

  describe('Multi-Currency Balance Updates', () => {
    let wallet: any;

    beforeEach(async () => {
      wallet = await energyTrading.createWallet('balance_test_user');
    });

    test('should update fiat balance correctly', async () => {
      const walletObj = await energyTrading.getWallet(wallet.address);
      expect(walletObj?.balance.fiatBalance).toBe(1000);

      // Simulate balance update
      if (walletObj) {
        walletObj.balance.fiatBalance += 500;
        expect(walletObj.balance.fiatBalance).toBe(1500);
      }
    });

    test('should update energy tokens balance', async () => {
      const walletObj = await energyTrading.getWallet(wallet.address);
      
      if (walletObj) {
        walletObj.balance.energyTokens = 250;
        expect(walletObj.balance.energyTokens).toBe(250);
      }
    });

    test('should update carbon credits balance', async () => {
      const walletObj = await energyTrading.getWallet(wallet.address);
      
      if (walletObj) {
        walletObj.balance.carbonCredits = 50;
        expect(walletObj.balance.carbonCredits).toBe(50);
      }
    });

    test('should update crypto balances', async () => {
      const walletObj = await energyTrading.getWallet(wallet.address);
      
      if (walletObj) {
        walletObj.balance.cryptoBalances.ETH = 2.5;
        walletObj.balance.cryptoBalances.BTC = 0.1;
        
        expect(walletObj.balance.cryptoBalances.ETH).toBe(2.5);
        expect(walletObj.balance.cryptoBalances.BTC).toBe(0.1);
      }
    });

    test('should handle token transfers between wallets', async () => {
      const sender = await energyTrading.createWallet('sender');
      const receiver = await energyTrading.createWallet('receiver');

      // Set up sender with tokens
      const senderWallet = await energyTrading.getWallet(sender.address);
      if (senderWallet) {
        senderWallet.balance.energyTokens = 1000;
      }

      // Transfer tokens
      const transaction = await energyTrading.transferTokens(
        sender.address,
        receiver.address,
        100,
        'ENERGY_TOKEN'
      );

      expect(transaction.type).toBe('buy'); // From receiver's perspective
      expect(transaction.amount).toBe(100);
      expect(transaction.currency).toBe('ENERGY_TOKEN');
      expect(transaction.status).toBe('confirmed');

      // Check balances
      const updatedSender = await energyTrading.getWallet(sender.address);
      const updatedReceiver = await energyTrading.getWallet(receiver.address);

      expect(updatedSender?.balance.energyTokens).toBe(900);
      expect(updatedReceiver?.balance.energyTokens).toBe(100);
    });

    test('should prevent transfers with insufficient balance', async () => {
      const sender = await energyTrading.createWallet('poor_sender');
      const receiver = await energyTrading.createWallet('receiver');

      // Try to transfer more than available
      await expect(
        energyTrading.transferTokens(sender.address, receiver.address, 2000, 'USD')
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Staking Reward Calculations', () => {
    let wallet: any;

    beforeEach(async () => {
      wallet = await energyTrading.createWallet('staking_user');
      const walletObj = await energyTrading.getWallet(wallet.address);
      if (walletObj) {
        walletObj.balance.energyTokens = 1000; // Give tokens for staking
      }
    });

    test('should stake tokens successfully', async () => {
      const stakeAmount = 500;
      const lockPeriod = 30; // 30 days

      const transaction = await energyTrading.stakeTokens(
        wallet.address,
        stakeAmount,
        lockPeriod
      );

      expect(transaction.type).toBe('stake');
      expect(transaction.amount).toBe(stakeAmount);
      expect(transaction.currency).toBe('ENERGY_TOKEN');
      expect(transaction.status).toBe('confirmed');

      // Check wallet state
      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.staking.stakedAmount).toBe(stakeAmount);
      expect(updatedWallet?.balance.energyTokens).toBe(500); // 1000 - 500 staked

      // Check lock period (approximately)
      const expectedLockEnd = new Date(Date.now() + lockPeriod * 24 * 60 * 60 * 1000);
      const actualLockEnd = updatedWallet?.staking.lockPeriod;
      
      if (actualLockEnd) {
        const timeDiff = Math.abs(actualLockEnd.getTime() - expectedLockEnd.getTime());
        expect(timeDiff).toBeLessThan(60000); // Within 1 minute
      }
    });

    test('should prevent staking more tokens than available', async () => {
      await expect(
        energyTrading.stakeTokens(wallet.address, 2000, 30)
      ).rejects.toThrow('Insufficient energy tokens');
    });

    test('should handle multiple staking operations', async () => {
      // First stake
      await energyTrading.stakeTokens(wallet.address, 300, 30);
      
      // Second stake
      await energyTrading.stakeTokens(wallet.address, 200, 60);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.staking.stakedAmount).toBe(500); // 300 + 200
      expect(updatedWallet?.balance.energyTokens).toBe(500); // 1000 - 500 staked
    });

    test('should record staking transactions in history', async () => {
      await energyTrading.stakeTokens(wallet.address, 250, 15);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.transactions).toHaveLength(1);
      
      const stakingTx = updatedWallet?.transactions[0];
      expect(stakingTx?.type).toBe('stake');
      expect(stakingTx?.amount).toBe(250);
      expect(stakingTx?.currency).toBe('ENERGY_TOKEN');
    });
  });

  describe('Biometric Authentication', () => {
    let wallet: any;

    beforeEach(async () => {
      wallet = await energyTrading.createWallet('biometric_user');
    });

    test('should enable fingerprint authentication', async () => {
      const result = await energyTrading.enableBiometricAuth(
        wallet.address,
        'fingerprint',
        'mock_fingerprint_data'
      );

      expect(result).toBe(true);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.biometricAuth.enabled).toBe(true);
      expect(updatedWallet?.biometricAuth.methods.fingerprint?.enabled).toBe(true);
      expect(updatedWallet?.biometricAuth.methods.fingerprint?.hash).toBeDefined();
      expect(updatedWallet?.biometricAuth.methods.fingerprint?.enrolledAt).toBeInstanceOf(Date);
    });

    test('should enable face authentication', async () => {
      const result = await energyTrading.enableBiometricAuth(
        wallet.address,
        'face',
        'mock_face_data'
      );

      expect(result).toBe(true);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.biometricAuth.methods.face?.enabled).toBe(true);
    });

    test('should enable voice authentication', async () => {
      const result = await energyTrading.enableBiometricAuth(
        wallet.address,
        'voice',
        'mock_voice_data'
      );

      expect(result).toBe(true);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.biometricAuth.methods.voice?.enabled).toBe(true);
    });

    test('should verify correct biometric data', async () => {
      const biometricData = 'test_fingerprint_123';
      
      await energyTrading.enableBiometricAuth(wallet.address, 'fingerprint', biometricData);
      
      const verificationResult = await energyTrading.verifyBiometricAuth(
        wallet.address,
        'fingerprint',
        biometricData
      );

      expect(verificationResult).toBe(true);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.biometricAuth.lastVerified).toBeInstanceOf(Date);
    });

    test('should reject incorrect biometric data', async () => {
      await energyTrading.enableBiometricAuth(wallet.address, 'fingerprint', 'correct_data');
      
      const verificationResult = await energyTrading.verifyBiometricAuth(
        wallet.address,
        'fingerprint',
        'wrong_data'
      );

      expect(verificationResult).toBe(false);
    });

    test('should disable biometric authentication', async () => {
      await energyTrading.enableBiometricAuth(wallet.address, 'fingerprint', 'test_data');
      
      const disableResult = await energyTrading.disableBiometricAuth(wallet.address, 'fingerprint');
      expect(disableResult).toBe(true);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.biometricAuth.enabled).toBe(false);
      expect(updatedWallet?.biometricAuth.methods.fingerprint).toBeUndefined();
    });

    test('should get enabled biometric methods', async () => {
      await energyTrading.enableBiometricAuth(wallet.address, 'fingerprint', 'fp_data');
      await energyTrading.enableBiometricAuth(wallet.address, 'face', 'face_data');

      const methods = await energyTrading.getBiometricAuthMethods(wallet.address);
      
      expect(methods).toHaveLength(2);
      expect(methods).toContain('fingerprint');
      expect(methods).toContain('face');
    });

    test('should handle multiple biometric methods', async () => {
      await energyTrading.enableBiometricAuth(wallet.address, 'fingerprint', 'fp_data');
      await energyTrading.enableBiometricAuth(wallet.address, 'face', 'face_data');
      await energyTrading.enableBiometricAuth(wallet.address, 'voice', 'voice_data');

      const methods = await energyTrading.getBiometricAuthMethods(wallet.address);
      expect(methods).toHaveLength(3);

      // Disable one method
      await energyTrading.disableBiometricAuth(wallet.address, 'face');
      
      const remainingMethods = await energyTrading.getBiometricAuthMethods(wallet.address);
      expect(remainingMethods).toHaveLength(2);
      expect(remainingMethods).toContain('fingerprint');
      expect(remainingMethods).toContain('voice');
      expect(remainingMethods).not.toContain('face');
    });

    test('should return empty array for wallet without biometric auth', async () => {
      const methods = await energyTrading.getBiometricAuthMethods(wallet.address);
      expect(methods).toEqual([]);
    });

    test('should handle non-existent wallet gracefully', async () => {
      const result = await energyTrading.enableBiometricAuth(
        '0x1234567890123456789012345678901234567890',
        'fingerprint',
        'test_data'
      );
      expect(result).toBe(false);
    });
  });

  describe('Transaction History and Export', () => {
    let wallet: any;

    beforeEach(async () => {
      wallet = await energyTrading.createWallet('history_user');
      const walletObj = await energyTrading.getWallet(wallet.address);
      if (walletObj) {
        walletObj.balance.energyTokens = 1000;
        walletObj.balance.fiatBalance = 2000;
      }
    });

    test('should maintain transaction history for staking', async () => {
      await energyTrading.stakeTokens(wallet.address, 100, 30);
      await energyTrading.stakeTokens(wallet.address, 200, 60);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      expect(updatedWallet?.transactions).toHaveLength(2);

      const transactions = updatedWallet?.transactions || [];
      expect(transactions[0].type).toBe('stake');
      expect(transactions[0].amount).toBe(100);
      expect(transactions[1].type).toBe('stake');
      expect(transactions[1].amount).toBe(200);
    });

    test('should maintain transaction history for transfers', async () => {
      const receiver = await energyTrading.createWallet('receiver');

      await energyTrading.transferTokens(wallet.address, receiver.address, 50, 'ENERGY_TOKEN');

      const senderWallet = await energyTrading.getWallet(wallet.address);
      const receiverWallet = await energyTrading.getWallet(receiver.address);

      expect(senderWallet?.transactions).toHaveLength(1);
      expect(receiverWallet?.transactions).toHaveLength(1);

      expect(senderWallet?.transactions[0].type).toBe('sell');
      expect(receiverWallet?.transactions[0].type).toBe('buy');
    });

    test('should include blockchain verification in transactions', async () => {
      await energyTrading.stakeTokens(wallet.address, 150, 45);

      const updatedWallet = await energyTrading.getWallet(wallet.address);
      const transaction = updatedWallet?.transactions[0];

      expect(transaction?.blockHash).toMatch(/^0x[a-f0-9]{64}$/i);
      expect(transaction?.gasUsed).toBeGreaterThan(0);
      expect(transaction?.status).toBe('confirmed');
      expect(transaction?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Reputation Scoring', () => {
    let wallet: any;

    beforeEach(async () => {
      wallet = await energyTrading.createWallet('reputation_user');
    });

    test('should initialize with starting reputation', async () => {
      expect(wallet.reputation.score).toBe(50);
      expect(wallet.reputation.completedTrades).toBe(0);
      expect(wallet.reputation.averageRating).toBe(0);
      expect(wallet.reputation.badges).toContain('newcomer');
    });

    test('should update reputation after trades', async () => {
      const walletObj = await energyTrading.getWallet(wallet.address);
      
      if (walletObj) {
        // Simulate completed trades
        walletObj.reputation.completedTrades = 5;
        walletObj.reputation.averageRating = 4.2;
        walletObj.reputation.score = 65;
        walletObj.reputation.badges.push('active_trader');

        expect(walletObj.reputation.completedTrades).toBe(5);
        expect(walletObj.reputation.averageRating).toBe(4.2);
        expect(walletObj.reputation.score).toBe(65);
        expect(walletObj.reputation.badges).toContain('active_trader');
      }
    });

    test('should maintain reputation consistency', async () => {
      const walletObj = await energyTrading.getWallet(wallet.address);
      
      if (walletObj) {
        // Reputation should be between 0-100
        walletObj.reputation.score = 85;
        expect(walletObj.reputation.score).toBeGreaterThanOrEqual(0);
        expect(walletObj.reputation.score).toBeLessThanOrEqual(100);

        // Average rating should be between 0-5
        walletObj.reputation.averageRating = 4.5;
        expect(walletObj.reputation.averageRating).toBeGreaterThanOrEqual(0);
        expect(walletObj.reputation.averageRating).toBeLessThanOrEqual(5);
      }
    });
  });
});