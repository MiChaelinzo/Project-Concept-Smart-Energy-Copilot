/**
 * Smart Grid Integration Interface
 * Enables participation in grid services and dynamic pricing
 */

export interface GridPricing {
  timestamp: Date;
  pricePerKwh: number;
  priceType: 'peak' | 'off-peak' | 'super-off-peak' | 'critical-peak';
  validUntil: Date;
  region: string;
}

export interface DemandResponseEvent {
  eventId: string;
  startTime: Date;
  endTime: Date;
  targetReduction: number; // Percentage reduction requested
  incentive: number; // $/kWh saved
  priority: 'low' | 'medium' | 'high' | 'critical';
  participationOptional: boolean;
}

export interface RenewableEnergySource {
  sourceId: string;
  type: 'solar' | 'wind' | 'hydro' | 'battery';
  capacity: number; // kW
  currentOutput: number; // kW
  efficiency: number; // Percentage
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'online' | 'offline' | 'maintenance';
}

export interface GridLoadBalance {
  timestamp: Date;
  totalDemand: number; // MW
  totalSupply: number; // MW
  frequency: number; // Hz
  voltage: number; // V
  stability: 'stable' | 'unstable' | 'critical';
  region: string;
}

export interface EnergyTradingOffer {
  offerId: string;
  sellerId: string;
  energyAmount: number; // kWh
  pricePerKwh: number;
  availableFrom: Date;
  availableUntil: Date;
  energySource: 'grid' | 'solar' | 'wind' | 'battery';
  verified: boolean;
}

export interface SmartGridIntegration {
  /**
   * Get current dynamic pricing information
   */
  getCurrentPricing(region: string): Promise<GridPricing>;

  /**
   * Get pricing forecast for the next 24 hours
   */
  getPricingForecast(region: string, hours: number): Promise<GridPricing[]>;

  /**
   * Subscribe to demand response events
   */
  subscribeToDemandResponse(callback: (event: DemandResponseEvent) => void): void;

  /**
   * Participate in demand response event
   */
  participateInDemandResponse(eventId: string, expectedReduction: number): Promise<{
    accepted: boolean;
    estimatedIncentive: number;
  }>;

  /**
   * Register renewable energy source
   */
  registerRenewableSource(source: Omit<RenewableEnergySource, 'sourceId'>): Promise<string>;

  /**
   * Update renewable energy output
   */
  updateRenewableOutput(sourceId: string, currentOutput: number): Promise<void>;

  /**
   * Get grid load balance information
   */
  getGridLoadBalance(region: string): Promise<GridLoadBalance>;

  /**
   * Optimize energy usage based on grid conditions
   */
  optimizeForGrid(currentUsage: number, flexibleLoad: number): Promise<{
    recommendedUsage: number;
    reasoning: string[];
    potentialSavings: number;
  }>;

  /**
   * Submit energy to peer-to-peer trading
   */
  submitEnergyOffer(offer: Omit<EnergyTradingOffer, 'offerId' | 'verified'>): Promise<string>;

  /**
   * Browse available energy offers
   */
  browseEnergyOffers(maxPrice: number, minAmount: number): Promise<EnergyTradingOffer[]>;

  /**
   * Purchase energy from peer-to-peer market
   */
  purchaseEnergy(offerId: string, amount: number): Promise<{
    success: boolean;
    transactionId?: string;
    totalCost?: number;
  }>;

  /**
   * Get carbon intensity of grid electricity
   */
  getGridCarbonIntensity(region: string): Promise<{
    timestamp: Date;
    carbonIntensity: number; // gCO2/kWh
    primarySources: Array<{
      source: string;
      percentage: number;
    }>;
  }>;

  /**
   * Schedule energy usage to minimize carbon footprint
   */
  scheduleForMinimalCarbon(
    energyNeeded: number,
    timeWindow: { start: Date; end: Date },
    flexibility: number // Hours of flexibility
  ): Promise<{
    recommendedTime: Date;
    carbonSavings: number; // gCO2 saved
    costImpact: number; // $ difference
  }>;
}