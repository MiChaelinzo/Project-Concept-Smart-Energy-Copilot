/**
 * User Preferences Interface
 * Manages user configuration settings and preferences
 */

import { UserPreferences } from '../types';

export interface UserPreferencesManager {
  /**
   * Get user preferences by user ID
   * @param userId - The user identifier
   * @returns Promise resolving to user preferences or null if not found
   */
  getUserPreferences(userId: string): Promise<UserPreferences | null>;

  /**
   * Save or update user preferences
   * @param preferences - The user preferences to save
   * @returns Promise resolving when preferences are saved
   */
  saveUserPreferences(preferences: UserPreferences): Promise<void>;

  /**
   * Get default user preferences for a new user
   * @param userId - The user identifier
   * @returns Default user preferences
   */
  getDefaultPreferences(userId: string): UserPreferences;

  /**
   * Update specific preference settings
   * @param userId - The user identifier
   * @param updates - Partial preferences to update
   * @returns Promise resolving when preferences are updated
   */
  updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<void>;

  /**
   * Validate preference values
   * @param preferences - The preferences to validate
   * @returns True if valid, false otherwise
   */
  validatePreferences(preferences: Partial<UserPreferences>): boolean;

  /**
   * Check if a specific feature is enabled for a user
   * @param userId - The user identifier
   * @param feature - The feature to check
   * @returns Promise resolving to true if enabled, false otherwise
   */
  isFeatureEnabled(userId: string, feature: keyof UserPreferences): Promise<boolean>;
}