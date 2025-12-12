import { 
  SmartGridIntegration, 
  GridPricing, 
  DemandResponseEvent, 
  RenewableEnergySource, 
  GridLoadBalance,
  EnergyTradingOffer 
} from '../interfaces/SmartGridIntegration';

/**
 * Smart Grid Integration Implementation
 * Connects the Smart Energy Copilot to grid services and markets
 */
export class SmartGridIntegrationImpl implements SmartGridIntegration {
  private demandResponseCallbacks: Array<(event: DemandResponseEvent) => void> = [];
  private renewableSources: Map<string, RenewableEnergySource> = new Map();
  private energyOffers: Map<string, EnergyTradingOffer> = new Map();
  private participatedEvents: Set<string> = new Set();

  // Regional pricing data (in production, this would come from grid APIs)
  private readonly REGIONAL_BASE_PRICES = {
    'US-CA': 0.25,  // California
    'US-TX': 0.12,  // Texas
    'US-NY': 0.18,  // New York
    'EU-DE': 0.32,  // Germany
    'EU-UK': 0.28   // United Kingdom
  };

  // Carbon intensity by region (gCO2/kWh)
  private readonly REGIONAL_CARBON_INTENSITY = {
    'US-CA': 250,
    'US-TX': 450,
    'US-NY': 300,
    'EU-DE': 350,
    'EU-UK': 280
  };

  /**
   * Get current dynamic pricing information
   */
  async getCurrentPricing(region: string): Promise<GridPricing> {
    const basePrice = this.REGIONAL_BASE_PRICES[region as keyof typeof this.REGIONAL_BASE_PRICES] || 0.15;
    const currentHour = new Date().getHours();
    
    // Simulate time-of-use pricing
    let priceMultiplier = 1.0;
    let priceType: GridPricing['priceType'] = 'off-peak';

    if (currentHour >= 16 && currentHour <= 21) {
      // Peak hours (4 PM - 9 PM)
      priceMultiplier = 2.5;
      priceType = 'peak';
    } else if (currentHour >= 22 || currentHour <= 6) {
      // Super off-peak (10 PM - 6 AM)
      priceMultiplier = 0.6;
      priceType = 'super-off-peak';
    } else if (currentHour >= 7 && currentHour <= 15) {
      // Standard hours
      priceMultiplier = 1.2;
      priceType = 'off-peak';
    }

    // Add some randomness to simulate market conditions
    const marketVariation = 0.9 + (Math.random() * 0.2); // ±10% variation
    
    const now = new Date();
    const validUntil = new Date(now.getTime() + 15 * 60 * 1000); // Valid for 15 minutes

    return {
      timestamp: now,
      pricePerKwh: basePrice * priceMultiplier * marketVariation,
      priceType,
      validUntil,
      region
    };
  }

  /**
   * Get pricing forecast for the next 24 hours
   */
  async getPricingForecast(region: string, hours: number = 24): Promise<GridPricing[]> {
    const forecast: GridPricing[] = [];
    const basePrice = this.REGIONAL_BASE_PRICES[region as keyof typeof this.REGIONAL_BASE_PRICES] || 0.15;
    
    for (let i = 0; i < hours; i++) {
      const forecastTime = new Date(Date.now() + i * 60 * 60 * 1000);
      const hour = forecastTime.getHours();
      
      let priceMultiplier = 1.0;
      let priceType: GridPricing['priceType'] = 'off-peak';

      if (hour >= 16 && hour <= 21) {
        priceMultiplier = 2.5;
        priceType = 'peak';
      } else if (hour >= 22 || hour <= 6) {
        priceMultiplier = 0.6;
        priceType = 'super-off-peak';
      } else {
        priceMultiplier = 1.2;
        priceType = 'off-peak';
      }

      // Add day-of-week variation
      const dayOfWeek = forecastTime.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        priceMultiplier *= 0.85; // Weekend discount
      }

      // Add seasonal variation
      const month = forecastTime.getMonth();
      const seasonalMultiplier = this.getSeasonalPriceMultiplier(month);
      
      forecast.push({
        timestamp: forecastTime,
        pricePerKwh: basePrice * priceMultiplier * seasonalMultiplier,
        priceType,
        validUntil: new Date(forecastTime.getTime() + 60 * 60 * 1000),
        region
      });
    }

    return forecast;
  }

  /**
   * Subscribe to demand response events
   */
  subscribeToDemandResponse(callback: (event: DemandResponseEvent) => void): void {
    this.demandResponseCallbacks.push(callback);
    
    // Simulate periodic demand response events
    this.simulateDemandResponseEvents();
  }

  /**
   * Participate in demand response event
   */
  async participateInDemandResponse(eventId: string, expectedReduction: number): Promise<{
    accepted: boolean;
    estimatedIncentive: number;
  }> {
    // Simulate grid operator response
    const accepted = expectedReduction >= 5; // Minimum 5% reduction required
    
    if (accepted) {
      this.participatedEvents.add(eventId);
      
      // Calculate incentive based on reduction amount
      const baseIncentive = 0.50; // $0.50 per kWh reduced
      const estimatedIncentive = expectedReduction * baseIncentive;
      
      return { accepted: true, estimatedIncentive };
    }

    return { accepted: false, estimatedIncentive: 0 };
  }

  /**
   * Register renewable energy source
   */
  async registerRenewableSource(source: Omit<RenewableEnergySource, 'sourceId'>): Promise<string> {
    const sourceId = `renewable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const renewableSource: RenewableEnergySource = {
      ...source,
      sourceId
    };

    this.renewableSources.set(sourceId, renewableSource);
    
    return sourceId;
  }

  /**
   * Update renewable energy output
   */
  async updateRenewableOutput(sourceId: string, currentOutput: number): Promise<void> {
    const source = this.renewableSources.get(sourceId);
    
    if (!source) {
      throw new Error(`Renewable source not found: ${sourceId}`);
    }

    if (currentOutput > source.capacity) {
      throw new Error(`Output ${currentOutput}kW exceeds capacity ${source.capacity}kW`);
    }

    source.currentOutput = currentOutput;
    source.efficiency = (currentOutput / source.capacity) * 100;
    
    this.renewableSources.set(sourceId, source);
  }

  /**
   * Get grid load balance information
   */
  async getGridLoadBalance(region: string): Promise<GridLoadBalance> {
    // Simulate grid conditions
    const baseLoad = this.getRegionalBaseLoad(region);
    const timeVariation = this.getTimeBasedLoadVariation();
    const randomVariation = 0.95 + (Math.random() * 0.1); // ±5% random variation
    
    const totalDemand = baseLoad * timeVariation * randomVariation;
    const totalSupply = totalDemand * (0.98 + Math.random() * 0.04); // Supply slightly varies around demand
    
    const frequency = 60 + (Math.random() - 0.5) * 0.2; // 59.9 - 60.1 Hz
    const voltage = 120 + (Math.random() - 0.5) * 2; // 119 - 121 V
    
    let stability: GridLoadBalance['stability'] = 'stable';
    if (Math.abs(totalSupply - totalDemand) > totalDemand * 0.05) {
      stability = 'unstable';
    }
    if (Math.abs(totalSupply - totalDemand) > totalDemand * 0.1) {
      stability = 'critical';
    }

    return {
      timestamp: new Date(),
      totalDemand,
      totalSupply,
      frequency,
      voltage,
      stability,
      region
    };
  }

  /**
   * Optimize energy usage based on grid conditions
   */
  async optimizeForGrid(currentUsage: number, flexibleLoad: number): Promise<{
    recommendedUsage: number;
    reasoning: string[];
    potentialSavings: number;
  }> {
    const gridBalance = await this.getGridLoadBalance('US-CA'); // Default region
    const currentPricing = await this.getCurrentPricing('US-CA');
    
    const reasoning: string[] = [];
    let recommendedUsage = currentUsage;
    let potentialSavings = 0;

    // Optimize based on grid stability
    if (gridBalance.stability === 'critical') {
      recommendedUsage = Math.max(currentUsage - flexibleLoad * 0.5, currentUsage * 0.7);
      reasoning.push('Grid stability is critical - reducing load by 30-50%');
      potentialSavings += (currentUsage - recommendedUsage) * 0.75; // Emergency incentive
    } else if (gridBalance.stability === 'unstable') {
      recommendedUsage = Math.max(currentUsage - flexibleLoad * 0.3, currentUsage * 0.8);
      reasoning.push('Grid stability is unstable - reducing load by 20-30%');
      potentialSavings += (currentUsage - recommendedUsage) * 0.50;
    }

    // Optimize based on pricing
    if (currentPricing.priceType === 'peak' || currentPricing.priceType === 'critical-peak') {
      const priceReduction = Math.min(flexibleLoad * 0.4, currentUsage * 0.3);
      recommendedUsage = Math.min(recommendedUsage, currentUsage - priceReduction);
      reasoning.push(`High pricing period (${currentPricing.priceType}) - shifting flexible loads`);
      potentialSavings += priceReduction * currentPricing.pricePerKwh;
    }

    // Consider renewable availability
    const renewableOutput = this.getTotalRenewableOutput();
    if (renewableOutput > currentUsage * 1.2) {
      recommendedUsage = Math.min(currentUsage * 1.1, currentUsage + flexibleLoad * 0.2);
      reasoning.push('Excess renewable energy available - increasing usage is beneficial');
    }

    return {
      recommendedUsage,
      reasoning,
      potentialSavings
    };
  }

  /**
   * Submit energy to peer-to-peer trading
   */
  async submitEnergyOffer(offer: Omit<EnergyTradingOffer, 'offerId' | 'verified'>): Promise<string> {
    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const energyOffer: EnergyTradingOffer = {
      ...offer,
      offerId,
      verified: this.verifyEnergyOffer(offer)
    };

    this.energyOffers.set(offerId, energyOffer);
    
    return offerId;
  }

  /**
   * Browse available energy offers
   */
  async browseEnergyOffers(maxPrice: number, minAmount: number): Promise<EnergyTradingOffer[]> {
    return Array.from(this.energyOffers.values())
      .filter(offer => 
        offer.pricePerKwh <= maxPrice && 
        offer.energyAmount >= minAmount &&
        offer.verified &&
        offer.availableUntil > new Date()
      )
      .sort((a, b) => a.pricePerKwh - b.pricePerKwh); // Sort by price (lowest first)
  }

  /**
   * Purchase energy from peer-to-peer market
   */
  async purchaseEnergy(offerId: string, amount: number): Promise<{
    success: boolean;
    transactionId?: string;
    totalCost?: number;
  }> {
    const offer = this.energyOffers.get(offerId);
    
    if (!offer) {
      return { success: false };
    }

    if (amount > offer.energyAmount) {
      return { success: false };
    }

    if (offer.availableUntil < new Date()) {
      return { success: false };
    }

    const totalCost = amount * offer.pricePerKwh;
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update offer (reduce available amount)
    offer.energyAmount -= amount;
    if (offer.energyAmount <= 0) {
      this.energyOffers.delete(offerId);
    } else {
      this.energyOffers.set(offerId, offer);
    }

    return {
      success: true,
      transactionId,
      totalCost
    };
  }

  /**
   * Get carbon intensity of grid electricity
   */
  async getGridCarbonIntensity(region: string): Promise<{
    timestamp: Date;
    carbonIntensity: number;
    primarySources: Array<{ source: string; percentage: number; }>;
  }> {
    const baseCarbonIntensity = this.REGIONAL_CARBON_INTENSITY[region as keyof typeof this.REGIONAL_CARBON_INTENSITY] || 400;
    
    // Simulate time-based variation (lower at night when renewables might be stored)
    const hour = new Date().getHours();
    let timeMultiplier = 1.0;
    
    if (hour >= 10 && hour <= 16) {
      // Daytime - more solar
      timeMultiplier = 0.8;
    } else if (hour >= 22 || hour <= 6) {
      // Night - more fossil fuels
      timeMultiplier = 1.2;
    }

    const carbonIntensity = baseCarbonIntensity * timeMultiplier;

    // Simulate energy mix
    const primarySources = this.getRegionalEnergyMix(region, hour);

    return {
      timestamp: new Date(),
      carbonIntensity,
      primarySources
    };
  }

  /**
   * Schedule energy usage to minimize carbon footprint
   */
  async scheduleForMinimalCarbon(
    energyNeeded: number,
    timeWindow: { start: Date; end: Date },
    flexibility: number
  ): Promise<{
    recommendedTime: Date;
    carbonSavings: number;
    costImpact: number;
  }> {
    const windowHours = (timeWindow.end.getTime() - timeWindow.start.getTime()) / (1000 * 60 * 60);
    const flexibilityHours = Math.min(flexibility, windowHours);
    
    let bestTime = timeWindow.start;
    let lowestCarbon = Infinity;
    let bestCost = 0;

    // Check carbon intensity for each hour in the flexible window
    for (let i = 0; i < flexibilityHours; i++) {
      const checkTime = new Date(timeWindow.start.getTime() + i * 60 * 60 * 1000);
      const carbonData = await this.getGridCarbonIntensity('US-CA'); // Default region
      
      // Simulate carbon intensity variation by hour
      const hour = checkTime.getHours();
      let hourlyCarbon = carbonData.carbonIntensity;
      
      if (hour >= 10 && hour <= 16) {
        hourlyCarbon *= 0.7; // Lower carbon during solar peak
      } else if (hour >= 18 && hour <= 22) {
        hourlyCarbon *= 1.3; // Higher carbon during evening peak
      }

      if (hourlyCarbon < lowestCarbon) {
        lowestCarbon = hourlyCarbon;
        bestTime = checkTime;
        
        // Get cost for this time
        const pricing = await this.getCurrentPricing('US-CA');
        bestCost = energyNeeded * pricing.pricePerKwh;
      }
    }

    // Calculate carbon savings compared to immediate usage
    const immediateCarbon = (await this.getGridCarbonIntensity('US-CA')).carbonIntensity;
    const carbonSavings = (immediateCarbon - lowestCarbon) * energyNeeded / 1000; // Convert to kg CO2

    // Calculate cost impact
    const immediateCost = energyNeeded * (await this.getCurrentPricing('US-CA')).pricePerKwh;
    const costImpact = bestCost - immediateCost;

    return {
      recommendedTime: bestTime,
      carbonSavings,
      costImpact
    };
  }

  // Private helper methods
  private getSeasonalPriceMultiplier(month: number): number {
    // Higher prices in summer (cooling) and winter (heating)
    const seasonalFactors = [1.2, 1.1, 1.0, 0.9, 0.8, 1.3, 1.4, 1.3, 1.0, 0.9, 1.0, 1.2];
    return seasonalFactors[month];
  }

  private simulateDemandResponseEvents(): void {
    // Simulate demand response events every 2-6 hours
    const scheduleNextEvent = () => {
      const delay = (2 + Math.random() * 4) * 60 * 60 * 1000; // 2-6 hours
      
      setTimeout(() => {
        const event: DemandResponseEvent = {
          eventId: `dr_${Date.now()}`,
          startTime: new Date(Date.now() + 30 * 60 * 1000), // Starts in 30 minutes
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // Lasts 2.5 hours
          targetReduction: 10 + Math.random() * 20, // 10-30% reduction
          incentive: 0.25 + Math.random() * 0.75, // $0.25-$1.00 per kWh
          priority: Math.random() > 0.7 ? 'high' : 'medium',
          participationOptional: Math.random() > 0.3 // 70% optional, 30% mandatory
        };

        this.demandResponseCallbacks.forEach(callback => callback(event));
        scheduleNextEvent(); // Schedule next event
      }, delay);
    };

    scheduleNextEvent();
  }

  private getRegionalBaseLoad(region: string): number {
    // Base load in MW for different regions
    const baseLoads = {
      'US-CA': 25000,
      'US-TX': 35000,
      'US-NY': 18000,
      'EU-DE': 45000,
      'EU-UK': 30000
    };
    
    return baseLoads[region as keyof typeof baseLoads] || 20000;
  }

  private getTimeBasedLoadVariation(): number {
    const hour = new Date().getHours();
    
    // Load variation throughout the day
    if (hour >= 6 && hour <= 9) return 1.2; // Morning peak
    if (hour >= 17 && hour <= 21) return 1.4; // Evening peak
    if (hour >= 22 || hour <= 5) return 0.7; // Night low
    return 1.0; // Daytime normal
  }

  private getTotalRenewableOutput(): number {
    return Array.from(this.renewableSources.values())
      .reduce((total, source) => total + source.currentOutput, 0);
  }

  private verifyEnergyOffer(offer: Omit<EnergyTradingOffer, 'offerId' | 'verified'>): boolean {
    // Simulate verification process
    return offer.energyAmount > 0 && 
           offer.pricePerKwh > 0 && 
           offer.availableUntil > new Date() &&
           offer.sellerId.length > 0;
  }

  private getRegionalEnergyMix(region: string, hour: number): Array<{ source: string; percentage: number }> {
    // Simulate regional energy mix with time-of-day variation
    const baseMix = {
      'US-CA': [
        { source: 'Natural Gas', percentage: 40 },
        { source: 'Solar', percentage: 25 },
        { source: 'Wind', percentage: 15 },
        { source: 'Hydro', percentage: 12 },
        { source: 'Nuclear', percentage: 8 }
      ],
      'US-TX': [
        { source: 'Natural Gas', percentage: 45 },
        { source: 'Wind', percentage: 25 },
        { source: 'Coal', percentage: 15 },
        { source: 'Solar', percentage: 10 },
        { source: 'Nuclear', percentage: 5 }
      ]
    };

    let mix = baseMix[region as keyof typeof baseMix] || baseMix['US-CA'];

    // Adjust for time of day (more solar during day, more wind at night)
    if (hour >= 10 && hour <= 16) {
      mix = mix.map(source => {
        if (source.source === 'Solar') {
          return { ...source, percentage: source.percentage * 1.5 };
        }
        return { ...source, percentage: source.percentage * 0.9 };
      });
    }

    // Normalize percentages
    const total = mix.reduce((sum, source) => sum + source.percentage, 0);
    return mix.map(source => ({
      ...source,
      percentage: Math.round((source.percentage / total) * 100)
    }));
  }
}