/**
 * Weather Service Interface
 * Provides weather data integration for energy optimization
 */

export interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  dewPoint: number;
  feelsLike: number;
  cloudCover: number;
  precipitationChance: number;
  precipitationType?: 'rain' | 'snow' | 'sleet' | 'hail';
  timestamp: Date;
  location: Location;
}

export interface Location {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  timezone: string;
}

export interface WeatherForecast {
  date: Date;
  highTemp: number;
  lowTemp: number;
  conditions: string;
  precipitationChance: number;
  precipitationType?: string;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  sunrise: Date;
  sunset: Date;
  moonPhase: string;
}

export interface WeatherAlert {
  id: string;
  type: 'warning' | 'watch' | 'advisory';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  areas: string[];
}

export interface EnergyWeatherImpact {
  heatingCoolingLoad: number;
  solarGeneration: number;
  windGeneration: number;
  demandForecast: number;
  recommendations: WeatherRecommendation[];
}

export interface WeatherRecommendation {
  type: 'heating' | 'cooling' | 'ventilation' | 'solar' | 'general';
  priority: 'low' | 'medium' | 'high';
  action: string;
  description: string;
  energySavings: number;
  validUntil: Date;
}

export interface WeatherService {
  /**
   * Get current weather conditions
   */
  getCurrentWeather(location?: Location): Promise<WeatherData>;

  /**
   * Get weather forecast for specified days
   */
  getForecast(days: number, location?: Location): Promise<WeatherForecast[]>;

  /**
   * Get hourly weather forecast
   */
  getHourlyForecast(hours: number, location?: Location): Promise<WeatherData[]>;

  /**
   * Get active weather alerts
   */
  getWeatherAlerts(location?: Location): Promise<WeatherAlert[]>;

  /**
   * Analyze weather impact on energy consumption
   */
  analyzeEnergyImpact(forecast: WeatherForecast[], currentUsage: number): Promise<EnergyWeatherImpact>;

  /**
   * Get weather-based energy recommendations
   */
  getEnergyRecommendations(weather: WeatherData, deviceStates: Record<string, any>): Promise<WeatherRecommendation[]>;

  /**
   * Calculate heating/cooling degree days
   */
  calculateDegreeDays(forecast: WeatherForecast[], baseTemp: number): Promise<{ heating: number; cooling: number }>;

  /**
   * Predict solar energy generation based on weather
   */
  predictSolarGeneration(forecast: WeatherForecast[], systemCapacity: number): Promise<number[]>;

  /**
   * Get optimal ventilation recommendations
   */
  getVentilationRecommendations(indoor: WeatherData, outdoor: WeatherData): Promise<WeatherRecommendation[]>;

  /**
   * Subscribe to weather change notifications
   */
  subscribeToWeatherUpdates(callback: (weather: WeatherData) => void, location?: Location): Promise<string>;

  /**
   * Unsubscribe from weather notifications
   */
  unsubscribeFromWeatherUpdates(subscriptionId: string): Promise<void>;
}