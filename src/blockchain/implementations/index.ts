/**
 * Blockchain Implementations Index
 * Export all blockchain-related implementations
 */

export { EnergyTradingImpl } from './EnergyTradingImpl';

// Configuration types for blockchain setup
export interface BlockchainConfig {
  ethereum: {
    rpcUrl: string;
    chainId: number;
    gasPrice: string;
    contracts: {
      energyToken: string;
      marketplace: string;
      carbonCredits: string;
      staking: string;
    };
  };
  polygon: {
    rpcUrl: string;
    chainId: number;
    gasPrice: string;
    contracts: {
      energyToken: string;
      marketplace: string;
      carbonCredits: string;
      staking: string;
    };
  };
  binanceSmartChain: {
    rpcUrl: string;
    chainId: number;
    gasPrice: string;
    contracts: {
      energyToken: string;
      marketplace: string;
      carbonCredits: string;
      staking: string;
    };
  };
  solana: {
    rpcUrl: string;
    programId: string;
    commitment: string;
  };
}

// Default configuration for development/testing
export const defaultBlockchainConfig: BlockchainConfig = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
    chainId: 1,
    gasPrice: '20000000000', // 20 gwei
    contracts: {
      energyToken: '0x1234567890123456789012345678901234567890',
      marketplace: '0x2345678901234567890123456789012345678901',
      carbonCredits: '0x3456789012345678901234567890123456789012',
      staking: '0x4567890123456789012345678901234567890123'
    }
  },
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    chainId: 137,
    gasPrice: '30000000000', // 30 gwei
    contracts: {
      energyToken: '0x5678901234567890123456789012345678901234',
      marketplace: '0x6789012345678901234567890123456789012345',
      carbonCredits: '0x7890123456789012345678901234567890123456',
      staking: '0x8901234567890123456789012345678901234567'
    }
  },
  binanceSmartChain: {
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
    chainId: 56,
    gasPrice: '5000000000', // 5 gwei
    contracts: {
      energyToken: '0x9012345678901234567890123456789012345678',
      marketplace: '0x0123456789012345678901234567890123456789',
      carbonCredits: '0x1234567890123456789012345678901234567890',
      staking: '0x2345678901234567890123456789012345678901'
    }
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    programId: 'EnergyTradingProgram1111111111111111111111111',
    commitment: 'confirmed'
  }
};