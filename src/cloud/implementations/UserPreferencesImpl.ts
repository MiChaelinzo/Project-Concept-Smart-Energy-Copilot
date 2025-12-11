/**
 * User Preferences Implementation
 * Manages user configuration settings and preferences with local storage
 */

import { UserPreferencesManager } from '../interfaces/UserPreferences';
import { UserPreferences } from '../types';

export class UserPreferencesImpl implements UserPreferencesManager {
  private preferences: Map<string, UserPreferences> = new Map();

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    const existing = this.preferences.get(userId);
    if (existing) {
      return { ...existing };
    }

    // If no preferences exist, return default preferences
    const defaultPrefs = this.getDefaultPreferences(userId);
    await this.saveUserPreferences(defaultPrefs);
    return { ...defaultPrefs };
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    if (!this.validatePreferences(preferences)) {
      throw new Error('Invalid preferences provided');
    }

    // Create a deep copy to avoid reference issues
    const prefsCopy: UserPreferences = {
      ...preferences,
      notificationSettings: { ...preferences.notificationSettings },
      privacySettings: { ...preferences.privacySettings }
    };

    this.preferences.set(preferences.userId, prefsCopy);
  }

  getDefaultPreferences(userId: string): UserPreferences {
    return {
      userId,
      enableAdaptiveScheduling: true,
      enableOccupancyControl: true,
      enableVoiceControl: true,
      enableAnomalyDetection: true,
      notificationSettings: {
        anomalies: true,
        energySavings: true,
        scheduleChanges: false
      },
      privacySettings: {
        storeImages: false,
        storeVoiceRecordings: false
      }
    };
  }

  async updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    if (!this.validatePreferences(updates)) {
      throw new Error('Invalid preference updates');
    }

    const current = await this.getUserPreferences(userId);
    if (!current) {
      throw new Error('User preferences not found');
    }

    const updated: UserPreferences = {
      ...current,
      ...updates,
      userId, // Ensure userId cannot be changed
      notificationSettings: {
        ...current.notificationSettings,
        ...(updates.notificationSettings || {})
      },
      privacySettings: {
        ...current.privacySettings,
        ...(updates.privacySettings || {})
      }
    };

    await this.saveUserPreferences(updated);
  }

  validatePreferences(preferences: Partial<UserPreferences>): boolean {
    if (!preferences || typeof preferences !== 'object') {
      return false;
    }

    // Validate userId if provided
    if (preferences.userId !== undefined && 
        (typeof preferences.userId !== 'string' || preferences.userId.trim() === '')) {
      return false;
    }

    // Validate boolean fields
    const booleanFields: (keyof UserPreferences)[] = [
      'enableAdaptiveScheduling',
      'enableOccupancyControl', 
      'enableVoiceControl',
      'enableAnomalyDetection'
    ];

    for (const field of booleanFields) {
      if (preferences[field] !== undefined && typeof preferences[field] !== 'boolean') {
        return false;
      }
    }

    // Validate notification settings
    if (preferences.notificationSettings) {
      const notificationFields: (keyof UserPreferences['notificationSettings'])[] = [
        'anomalies',
        'energySavings',
        'scheduleChanges'
      ];

      for (const field of notificationFields) {
        if (preferences.notificationSettings[field] !== undefined && 
            typeof preferences.notificationSettings[field] !== 'boolean') {
          return false;
        }
      }
    }

    // Validate privacy settings
    if (preferences.privacySettings) {
      const privacyFields: (keyof UserPreferences['privacySettings'])[] = [
        'storeImages',
        'storeVoiceRecordings'
      ];

      for (const field of privacyFields) {
        if (preferences.privacySettings[field] !== undefined && 
            typeof preferences.privacySettings[field] !== 'boolean') {
          return false;
        }
      }
    }

    return true;
  }

  async isFeatureEnabled(userId: string, feature: keyof UserPreferences): Promise<boolean> {
    if (!userId || typeof userId !== 'string') {
      return false;
    }

    // Check if user already exists, don't create defaults for feature checking
    const existing = this.preferences.get(userId);
    if (!existing) {
      return false;
    }

    const value = existing[feature];
    return typeof value === 'boolean' ? value : false;
  }
}