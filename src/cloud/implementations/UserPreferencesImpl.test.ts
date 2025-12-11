/**
 * Unit tests for UserPreferencesImpl
 */

import { UserPreferencesImpl } from './UserPreferencesImpl';
import { UserPreferences } from '../types';

describe('UserPreferencesImpl', () => {
  let userPreferences: UserPreferencesImpl;

  beforeEach(() => {
    userPreferences = new UserPreferencesImpl();
  });

  describe('default preference initialization', () => {
    it('should return default preferences for new user', () => {
      const userId = 'test-user-123';
      const defaults = userPreferences.getDefaultPreferences(userId);

      expect(defaults).toEqual({
        userId: 'test-user-123',
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
      });
    });

    it('should create and return default preferences when user has no existing preferences', async () => {
      const userId = 'new-user-456';
      const preferences = await userPreferences.getUserPreferences(userId);

      expect(preferences).toBeDefined();
      expect(preferences?.userId).toBe(userId);
      expect(preferences?.enableAdaptiveScheduling).toBe(true);
      expect(preferences?.enableOccupancyControl).toBe(true);
      expect(preferences?.enableVoiceControl).toBe(true);
      expect(preferences?.enableAnomalyDetection).toBe(true);
    });
  });

  describe('invalid preference value rejection', () => {
    it('should reject preferences with invalid userId', () => {
      const invalidPrefs = {
        userId: '',
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

      expect(userPreferences.validatePreferences(invalidPrefs)).toBe(false);
    });

    it('should reject preferences with non-boolean feature flags', () => {
      const invalidPrefs = {
        userId: 'test-user',
        enableAdaptiveScheduling: 'true' as any, // Invalid: string instead of boolean
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

      expect(userPreferences.validatePreferences(invalidPrefs)).toBe(false);
    });

    it('should reject preferences with invalid notification settings', () => {
      const invalidPrefs = {
        userId: 'test-user',
        enableAdaptiveScheduling: true,
        enableOccupancyControl: true,
        enableVoiceControl: true,
        enableAnomalyDetection: true,
        notificationSettings: {
          anomalies: 'yes' as any, // Invalid: string instead of boolean
          energySavings: true,
          scheduleChanges: false
        },
        privacySettings: {
          storeImages: false,
          storeVoiceRecordings: false
        }
      };

      expect(userPreferences.validatePreferences(invalidPrefs)).toBe(false);
    });

    it('should reject preferences with invalid privacy settings', () => {
      const invalidPrefs = {
        userId: 'test-user',
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
          storeImages: 1 as any, // Invalid: number instead of boolean
          storeVoiceRecordings: false
        }
      };

      expect(userPreferences.validatePreferences(invalidPrefs)).toBe(false);
    });

    it('should reject null or undefined preferences', () => {
      expect(userPreferences.validatePreferences(null as any)).toBe(false);
      expect(userPreferences.validatePreferences(undefined as any)).toBe(false);
    });

    it('should throw error when saving invalid preferences', async () => {
      const invalidPrefs = {
        userId: '',
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

      await expect(userPreferences.saveUserPreferences(invalidPrefs)).rejects.toThrow('Invalid preferences provided');
    });
  });

  describe('preference persistence', () => {
    it('should save and retrieve user preferences correctly', async () => {
      const testPrefs: UserPreferences = {
        userId: 'test-user-789',
        enableAdaptiveScheduling: false,
        enableOccupancyControl: true,
        enableVoiceControl: false,
        enableAnomalyDetection: true,
        notificationSettings: {
          anomalies: false,
          energySavings: true,
          scheduleChanges: true
        },
        privacySettings: {
          storeImages: true,
          storeVoiceRecordings: false
        }
      };

      await userPreferences.saveUserPreferences(testPrefs);
      const retrieved = await userPreferences.getUserPreferences('test-user-789');

      expect(retrieved).toEqual(testPrefs);
    });

    it('should update existing preferences correctly', async () => {
      const userId = 'test-user-update';
      
      // First, get default preferences (which will be saved)
      await userPreferences.getUserPreferences(userId);

      // Then update specific settings
      const updates = {
        enableAdaptiveScheduling: false,
        notificationSettings: {
          anomalies: false,
          energySavings: false,
          scheduleChanges: true
        }
      };

      await userPreferences.updatePreferences(userId, updates);
      const updated = await userPreferences.getUserPreferences(userId);

      expect(updated?.enableAdaptiveScheduling).toBe(false);
      expect(updated?.notificationSettings.anomalies).toBe(false);
      expect(updated?.notificationSettings.energySavings).toBe(false);
      expect(updated?.notificationSettings.scheduleChanges).toBe(true);
      // Other settings should remain as defaults
      expect(updated?.enableOccupancyControl).toBe(true);
      expect(updated?.privacySettings.storeImages).toBe(false);
    });

    it('should return null for invalid user ID', async () => {
      const result = await userPreferences.getUserPreferences('');
      expect(result).toBeNull();
    });

    it('should throw error when updating preferences for invalid user ID', async () => {
      await expect(userPreferences.updatePreferences('', { enableAdaptiveScheduling: false }))
        .rejects.toThrow('Invalid user ID');
    });

    it('should preserve userId when updating preferences', async () => {
      const userId = 'test-user-preserve';
      await userPreferences.getUserPreferences(userId); // Initialize with defaults

      const updates = {
        userId: 'different-user-id', // This should be ignored
        enableAdaptiveScheduling: false
      };

      await userPreferences.updatePreferences(userId, updates);
      const updated = await userPreferences.getUserPreferences(userId);

      expect(updated?.userId).toBe(userId); // Should remain original userId
      expect(updated?.enableAdaptiveScheduling).toBe(false);
    });
  });

  describe('feature checking', () => {
    it('should correctly check if features are enabled', async () => {
      const userId = 'test-feature-check';
      const testPrefs: UserPreferences = {
        userId,
        enableAdaptiveScheduling: true,
        enableOccupancyControl: false,
        enableVoiceControl: true,
        enableAnomalyDetection: false,
        notificationSettings: {
          anomalies: true,
          energySavings: false,
          scheduleChanges: true
        },
        privacySettings: {
          storeImages: false,
          storeVoiceRecordings: true
        }
      };

      await userPreferences.saveUserPreferences(testPrefs);

      expect(await userPreferences.isFeatureEnabled(userId, 'enableAdaptiveScheduling')).toBe(true);
      expect(await userPreferences.isFeatureEnabled(userId, 'enableOccupancyControl')).toBe(false);
      expect(await userPreferences.isFeatureEnabled(userId, 'enableVoiceControl')).toBe(true);
      expect(await userPreferences.isFeatureEnabled(userId, 'enableAnomalyDetection')).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await userPreferences.isFeatureEnabled('non-existent-user', 'enableAdaptiveScheduling');
      expect(result).toBe(false);
    });

    it('should return false for non-boolean feature values', async () => {
      const userId = 'test-non-boolean';
      await userPreferences.getUserPreferences(userId); // Initialize with defaults

      // This tests the edge case where feature might not be a boolean
      const result = await userPreferences.isFeatureEnabled(userId, 'userId' as any);
      expect(result).toBe(false);
    });
  });
});