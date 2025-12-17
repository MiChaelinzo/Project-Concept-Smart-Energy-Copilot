/**
 * Weather Service Implementation
 * Integrates with weather APIs for energy optimization
 */

import axios from 'axios';
import { 
  WeatherService, 
  WeatherData, 
  WeatherForecast, 
  WeatherAlert,
  Location,
  EnergyWeatherImpact,
  WeatherRecommendation
} from '../interfaces/WeatherService';

export class WeatherServiceImpl implements WeatherService {
  private apiKey: string;
  private baseUrl: string;
  private subscriptions: Map<string, WeatherSubscription> = new Map();
  private cache: Map<string, CachedWeatherData> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.WEATHER_API_KEY || '';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    
    if (!this.apiKey) {
      console.warn('Weather API key not provided. Using mock data.');
    }
  }

  async getCurrentWeather(location?: Location): Promise<WeatherData> {
    try {
      const cacheKey = this.getCacheKey('current', location);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached as WeatherData;

      if (!this.apiKey) {
        return this.getMockWeatherData(location);
      }

      const coords = location ? `lat=${location.latitude}&lon=${location.longitude}` : 'q=New York';
      const response = await axios.get(`${this.baseUrl}/weather?${coords}&appid=${this.apiKey}&units=metric`);
      
      const weatherData = this.parseCurrentWeather(response.data, location);
      this.setCache(cacheKey, weatherData);
      
      return weatherData;
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return this.getMockWeatherData(location);
    }
  }

  async getForecast(days: number, location?: Location): Promise<WeatherForecast[]> {
    try {
      const cacheKey = this.getCacheKey(`forecast-${days}`, location);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached as WeatherForecast[];

      if (!this.apiKey) {
        return this.getMockForecast(days);
      }

      const coords = location ? `lat=${location.latitude}&lon=${location.longitude}` : 'q=New York';
      const response = await axios.get(`${this.baseUrl}/forecast?${coords}&appid=${this.apiKey}&units=metric&cnt=${days * 8}`);
      
      const forecast = this.parseForecast(response.data);
      this.setCache(cacheKey, forecast);
      
      return forecast;
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return this.getMockForecast(days);
    }
  }

  async getHourlyForecast(hours: number, location?: Location): Promise<WeatherData[]> {
    try {
      const coords = location ? `lat=${location.latitude}&lon=${location.longitude}` : 'q=New York';
      const response = await axios.get(`${this.baseUrl}/forecast?${coords}&appid=${this.apiKey}&units=metric&cnt=${hours}`);
      
      return this.parseHourlyForecast(response.data, location);
    } catch (error) {
      console.error('Error fetching hourly forecast:', error);
      return this.getMockHourlyForecast(hours, location);
    }
  }

  async getWeatherAlerts(location?: Location): Promise<WeatherAlert[]> {
    try {
      if (!this.apiKey) {
        return [];
      }

      const coords = location ? `lat=${location.latitude}&lon=${location.longitude}` : 'lat=40.7128&lon=-74.0060';
      const response = await axios.get(`${this.baseUrl}/onecall?${coords}&appid=${this.apiKey}&exclude=minutely,daily`);
      
      return this.parseWeatherAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  async analyzeEnergyImpact(forecast: WeatherForecast[], currentUsage: number): Promise<EnergyWeatherImpact> {
    const recommendations: WeatherRecommendation[] = [];
    let heatingCoolingLoad = 0;
    let solarGeneration = 0;
    let windGeneration = 0;
    let demandForecast = currentUsage;

    for (const day of forecast) {
      // Calculate heating/cooling load
      if (day.highTemp > 25) {
        heatingCoolingLoad += (day.highTemp - 25) * 0.1; // Simplified calculation
        recommendations.push({
          type: 'cooling',
          priority: 'medium',
          action: 'Pre-cool home during off-peak hours',
          description: `High temperature expected (${day.highTemp}°C). Consider pre-cooling to save on peak energy costs.`,
          energySavings: 15,
          validUntil: new Date(day.date.getTime() + 24 * 60 * 60 * 1000)
        });
      } else if (day.lowTemp < 15) {
        heatingCoolingLoad += (15 - day.lowTemp) * 0.08;
        recommendations.push({
          type: 'heating',
          priority: 'medium',
          action: 'Optimize heating schedule',
          description: `Low temperature expected (${day.lowTemp}°C). Adjust heating schedule for efficiency.`,
          energySavings: 12,
          validUntil: new Date(day.date.getTime() + 24 * 60 * 60 * 1000)
        });
      }

      // Estimate solar generation (simplified)
      if (day.conditions.includes('sunny') || day.conditions.includes('clear')) {
        solarGeneration += 8; // kWh per day for average system
      } else if (day.conditions.includes('partly')) {
        solarGeneration += 5;
      } else {
        solarGeneration += 2;
      }

      // Wind generation estimate
      windGeneration += Math.min(day.windSpeed * 0.5, 10);

      // Demand forecast adjustment
      if (day.highTemp > 30 || day.lowTemp < 10) {
        demandForecast *= 1.2; // 20% increase for extreme temperatures
      }
    }

    // Add general recommendations
    if (forecast.some(f => f.precipitationChance > 70)) {
      recommendations.push({
        type: 'general',
        priority: 'low',
        action: 'Check weather sealing',
        description: 'Heavy rain expected. Ensure windows and doors are properly sealed to maintain efficiency.',
        energySavings: 5,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    return {
      heatingCoolingLoad,
      solarGeneration,
      windGeneration,
      demandForecast,
      recommendations
    };
  }

  async getEnergyRecommendations(weather: WeatherData, deviceStates: Record<string, any>): Promise<WeatherRecommendation[]> {
    const recommendations: WeatherRecommendation[] = [];

    // Temperature-based recommendations
    if (weather.temperature > 25 && weather.humidity > 60) {
      recommendations.push({
        type: 'cooling',
        priority: 'high',
        action: 'Use dehumidifier with AC',
        description: 'High temperature and humidity detected. Using a dehumidifier can make AC more efficient.',
        energySavings: 20,
        validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000)
      });
    }

    // Wind-based recommendations
    if (weather.windSpeed > 15 && Math.abs(weather.temperature - 22) < 3) {
      recommendations.push({
        type: 'ventilation',
        priority: 'medium',
        action: 'Use natural ventilation',
        description: 'Strong winds and comfortable temperature. Consider opening windows instead of using HVAC.',
        energySavings: 30,
        validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });
    }

    // Solar recommendations
    if (weather.uvIndex > 6 && weather.cloudCover < 30) {
      recommendations.push({
        type: 'solar',
        priority: 'medium',
        action: 'Maximize solar usage',
        description: 'Excellent solar conditions. Run energy-intensive appliances during peak sun hours.',
        energySavings: 25,
        validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000)
      });
    }

    return recommendations;
  }

  async calculateDegreeDays(forecast: WeatherForecast[], baseTemp: number = 18): Promise<{ heating: number; cooling: number }> {
    let heatingDays = 0;
    let coolingDays = 0;

    for (const day of forecast) {
      const avgTemp = (day.highTemp + day.lowTemp) / 2;
      
      if (avgTemp < baseTemp) {
        heatingDays += baseTemp - avgTemp;
      } else if (avgTemp > baseTemp + 7) { // Cooling base is typically higher
        coolingDays += avgTemp - (baseTemp + 7);
      }
    }

    return { heating: heatingDays, cooling: coolingDays };
  }

  async predictSolarGeneration(forecast: WeatherForecast[], systemCapacity: number): Promise<number[]> {
    return forecast.map(day => {
      let efficiency = 0.8; // Base efficiency
      
      // Adjust for weather conditions
      if (day.conditions.includes('sunny') || day.conditions.includes('clear')) {
        efficiency = 0.9;
      } else if (day.conditions.includes('partly')) {
        efficiency = 0.7;
      } else if (day.conditions.includes('cloudy')) {
        efficiency = 0.4;
      } else if (day.conditions.includes('rain') || day.conditions.includes('storm')) {
        efficiency = 0.2;
      }

      // Adjust for temperature (solar panels are less efficient when hot)
      if (day.highTemp > 25) {
        efficiency *= (1 - (day.highTemp - 25) * 0.004);
      }

      // Assume 5 hours of effective sunlight
      return systemCapacity * efficiency * 5;
    });
  }

  async getVentilationRecommendations(indoor: WeatherData, outdoor: WeatherData): Promise<WeatherRecommendation[]> {
    const recommendations: WeatherRecommendation[] = [];

    // Temperature differential
    const tempDiff = Math.abs(indoor.temperature - outdoor.temperature);
    
    if (outdoor.temperature > indoor.temperature && outdoor.temperature < 26) {
      recommendations.push({
        type: 'ventilation',
        priority: 'high',
        action: 'Open windows for natural cooling',
        description: 'Outdoor temperature is cooler than indoor. Natural ventilation can reduce AC usage.',
        energySavings: 40,
        validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });
    }

    // Humidity considerations
    if (outdoor.humidity < indoor.humidity - 10 && outdoor.humidity < 60) {
      recommendations.push({
        type: 'ventilation',
        priority: 'medium',
        action: 'Ventilate to reduce humidity',
        description: 'Outdoor air is drier. Ventilation can help reduce indoor humidity naturally.',
        energySavings: 15,
        validUntil: new Date(Date.now() + 1 * 60 * 60 * 1000)
      });
    }

    return recommendations;
  }

  async subscribeToWeatherUpdates(callback: (weather: WeatherData) => void, location?: Location): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: WeatherSubscription = {
      id: subscriptionId,
      callback,
      location,
      interval: setInterval(async () => {
        try {
          const weather = await this.getCurrentWeather(location);
          callback(weather);
        } catch (error) {
          console.error('Error in weather subscription:', error);
        }
      }, 15 * 60 * 1000) // Update every 15 minutes
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  async unsubscribeFromWeatherUpdates(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      clearInterval(subscription.interval);
      this.subscriptions.delete(subscriptionId);
    }
  }

  private parseCurrentWeather(data: any, location?: Location): WeatherData {
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      conditions: data.weather[0].description,
      windSpeed: data.wind?.speed || 0,
      windDirection: data.wind?.deg || 0,
      pressure: data.main.pressure,
      uvIndex: data.uvi || 0,
      visibility: data.visibility || 10000,
      dewPoint: data.main.temp - ((100 - data.main.humidity) / 5), // Approximation
      feelsLike: data.main.feels_like,
      cloudCover: data.clouds?.all || 0,
      precipitationChance: 0, // Not available in current weather
      timestamp: new Date(),
      location: location || {
        latitude: data.coord.lat,
        longitude: data.coord.lon,
        city: data.name,
        region: '',
        country: data.sys.country,
        timezone: 'UTC'
      }
    };
  }

  private parseForecast(data: any): WeatherForecast[] {
    const dailyForecasts: Map<string, any> = new Map();

    // Group hourly forecasts by day
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();
      
      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, {
          date,
          temps: [],
          conditions: item.weather[0].description,
          precipitationChance: (item.pop || 0) * 100,
          windSpeed: item.wind?.speed || 0,
          humidity: item.main.humidity
        });
      }
      
      dailyForecasts.get(dateKey).temps.push(item.main.temp);
    });

    return Array.from(dailyForecasts.values()).map(day => ({
      date: day.date,
      highTemp: Math.max(...day.temps),
      lowTemp: Math.min(...day.temps),
      conditions: day.conditions,
      precipitationChance: day.precipitationChance,
      windSpeed: day.windSpeed,
      humidity: day.humidity,
      uvIndex: 5, // Default value
      sunrise: new Date(day.date.getTime() + 6 * 60 * 60 * 1000),
      sunset: new Date(day.date.getTime() + 18 * 60 * 60 * 1000),
      moonPhase: 'new'
    }));
  }

  private parseHourlyForecast(data: any, location?: Location): WeatherData[] {
    return data.list.map((item: any) => ({
      temperature: item.main.temp,
      humidity: item.main.humidity,
      conditions: item.weather[0].description,
      windSpeed: item.wind?.speed || 0,
      windDirection: item.wind?.deg || 0,
      pressure: item.main.pressure,
      uvIndex: 0,
      visibility: item.visibility || 10000,
      dewPoint: item.main.temp - ((100 - item.main.humidity) / 5),
      feelsLike: item.main.feels_like,
      cloudCover: item.clouds?.all || 0,
      precipitationChance: (item.pop || 0) * 100,
      precipitationType: item.rain ? 'rain' : item.snow ? 'snow' : undefined,
      timestamp: new Date(item.dt * 1000),
      location: location || { latitude: 0, longitude: 0, city: '', region: '', country: '', timezone: 'UTC' }
    }));
  }

  private parseWeatherAlerts(alerts: any[]): WeatherAlert[] {
    return alerts.map(alert => ({
      id: alert.event,
      type: 'warning',
      severity: 'moderate',
      title: alert.event,
      description: alert.description,
      startTime: new Date(alert.start * 1000),
      endTime: new Date(alert.end * 1000),
      areas: alert.tags || []
    }));
  }

  private getMockWeatherData(location?: Location): WeatherData {
    return {
      temperature: 22 + Math.random() * 10,
      humidity: 50 + Math.random() * 30,
      conditions: 'partly cloudy',
      windSpeed: Math.random() * 20,
      windDirection: Math.random() * 360,
      pressure: 1013 + Math.random() * 20,
      uvIndex: Math.random() * 10,
      visibility: 10000,
      dewPoint: 15,
      feelsLike: 23,
      cloudCover: Math.random() * 100,
      precipitationChance: Math.random() * 100,
      timestamp: new Date(),
      location: location || {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        region: 'NY',
        country: 'US',
        timezone: 'America/New_York'
      }
    };
  }

  private getMockForecast(days: number): WeatherForecast[] {
    const forecast: WeatherForecast[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date,
        highTemp: 20 + Math.random() * 15,
        lowTemp: 10 + Math.random() * 10,
        conditions: ['sunny', 'partly cloudy', 'cloudy', 'rainy'][Math.floor(Math.random() * 4)],
        precipitationChance: Math.random() * 100,
        windSpeed: Math.random() * 25,
        humidity: 40 + Math.random() * 40,
        uvIndex: Math.random() * 10,
        sunrise: new Date(date.getTime() + 6 * 60 * 60 * 1000),
        sunset: new Date(date.getTime() + 18 * 60 * 60 * 1000),
        moonPhase: 'waxing'
      });
    }
    
    return forecast;
  }

  private getMockHourlyForecast(hours: number, location?: Location): WeatherData[] {
    const forecast: WeatherData[] = [];
    
    for (let i = 0; i < hours; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() + i);
      
      forecast.push({
        ...this.getMockWeatherData(location),
        timestamp
      });
    }
    
    return forecast;
  }

  private getCacheKey(type: string, location?: Location): string {
    const locationKey = location ? `${location.latitude},${location.longitude}` : 'default';
    return `${type}_${locationKey}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

interface WeatherSubscription {
  id: string;
  callback: (weather: WeatherData) => void;
  location?: Location;
  interval: NodeJS.Timeout;
}

interface CachedWeatherData {
  data: any;
  timestamp: number;
}