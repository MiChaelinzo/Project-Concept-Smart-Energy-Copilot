/**
 * Manual override system for critical situations
 * Requirements: All (cross-cutting)
 */

export enum OverrideType {
  DEVICE_CONTROL = 'device_control',
  SCHEDULE_BYPASS = 'schedule_bypass',
  ANOMALY_IGNORE = 'anomaly_ignore',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  EMERGENCY_SHUTDOWN = 'emergency_shutdown'
}

export enum OverrideStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

export interface ManualOverride {
  id: string;
  type: OverrideType;
  deviceId?: string;
  userId: string;
  reason: string;
  createdAt: Date;
  expiresAt?: Date;
  status: OverrideStatus;
  metadata?: Record<string, any>;
}

export interface OverrideRequest {
  type: OverrideType;
  deviceId?: string;
  userId: string;
  reason: string;
  durationMinutes?: number;
  metadata?: Record<string, any>;
}

/**
 * Manual override manager for emergency and maintenance situations
 */
export class ManualOverrideManager {
  private overrides: Map<string, ManualOverride> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup timer to remove expired overrides
    // Skip in test environment to prevent Jest hanging
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanupTimer();
    }
  }

  /**
   * Create a new manual override
   */
  createOverride(request: OverrideRequest): ManualOverride {
    const override: ManualOverride = {
      id: this.generateOverrideId(),
      type: request.type,
      deviceId: request.deviceId,
      userId: request.userId,
      reason: request.reason,
      createdAt: new Date(),
      expiresAt: request.durationMinutes ? 
        new Date(Date.now() + request.durationMinutes * 60 * 1000) : undefined,
      status: OverrideStatus.ACTIVE,
      metadata: request.metadata
    };

    this.overrides.set(override.id, override);
    
    console.log(`Manual override created: ${override.type} for ${override.deviceId || 'system'} by ${override.userId}`);
    
    return override;
  }

  /**
   * Check if a specific override is active
   */
  isOverrideActive(type: OverrideType, deviceId?: string): boolean {
    for (const override of Array.from(this.overrides.values())) {
      if (override.status !== OverrideStatus.ACTIVE) {
        continue;
      }

      if (override.type !== type) {
        continue;
      }

      // If looking for device-specific override
      if (deviceId) {
        // Only match if override is for this specific device
        if (override.deviceId !== deviceId) {
          continue;
        }
      } else {
        // If looking for system-wide override, only match overrides without deviceId
        if (override.deviceId) {
          continue;
        }
      }

      // Check if override has expired
      if (override.expiresAt && new Date() > override.expiresAt) {
        this.expireOverride(override.id);
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Get active override for a specific type and device
   */
  getActiveOverride(type: OverrideType, deviceId?: string): ManualOverride | null {
    for (const override of Array.from(this.overrides.values())) {
      if (override.status !== OverrideStatus.ACTIVE) {
        continue;
      }

      if (override.type !== type) {
        continue;
      }

      // Check device-specific overrides
      if (deviceId && override.deviceId && override.deviceId !== deviceId) {
        continue;
      }

      // Check if override has expired
      if (override.expiresAt && new Date() > override.expiresAt) {
        this.expireOverride(override.id);
        continue;
      }

      return override;
    }

    return null;
  }

  /**
   * Revoke an active override
   */
  revokeOverride(overrideId: string, userId: string): boolean {
    const override = this.overrides.get(overrideId);
    
    if (!override) {
      return false;
    }

    // Only the creator or system admin can revoke
    if (override.userId !== userId && !this.isSystemAdmin(userId)) {
      throw new Error('Insufficient permissions to revoke override');
    }

    override.status = OverrideStatus.REVOKED;
    
    console.log(`Manual override revoked: ${override.id} by ${userId}`);
    
    return true;
  }

  /**
   * Get all active overrides
   */
  getActiveOverrides(): ManualOverride[] {
    return Array.from(this.overrides.values())
      .filter(override => {
        if (override.status !== OverrideStatus.ACTIVE) {
          return false;
        }

        // Check if expired
        if (override.expiresAt && new Date() > override.expiresAt) {
          this.expireOverride(override.id);
          return false;
        }

        return true;
      });
  }

  /**
   * Get override history for a device or user
   */
  getOverrideHistory(deviceId?: string, userId?: string): ManualOverride[] {
    return Array.from(this.overrides.values())
      .filter(override => {
        if (deviceId && override.deviceId !== deviceId) {
          return false;
        }
        if (userId && override.userId !== userId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Emergency shutdown override
   */
  createEmergencyShutdown(userId: string, reason: string, deviceIds?: string[]): ManualOverride[] {
    const overrides: ManualOverride[] = [];

    if (deviceIds && deviceIds.length > 0) {
      // Shutdown specific devices
      for (const deviceId of deviceIds) {
        const override = this.createOverride({
          type: OverrideType.EMERGENCY_SHUTDOWN,
          deviceId,
          userId,
          reason: `EMERGENCY: ${reason}`,
          durationMinutes: 60, // 1 hour default
          metadata: { emergency: true }
        });
        overrides.push(override);
      }
    } else {
      // System-wide emergency shutdown
      const override = this.createOverride({
        type: OverrideType.EMERGENCY_SHUTDOWN,
        userId,
        reason: `SYSTEM EMERGENCY: ${reason}`,
        durationMinutes: 60,
        metadata: { emergency: true, systemWide: true }
      });
      overrides.push(override);
    }

    return overrides;
  }

  /**
   * Device control override (bypass all automation)
   */
  createDeviceControlOverride(
    deviceId: string, 
    userId: string, 
    reason: string, 
    durationMinutes: number = 30
  ): ManualOverride {
    return this.createOverride({
      type: OverrideType.DEVICE_CONTROL,
      deviceId,
      userId,
      reason,
      durationMinutes,
      metadata: { manualControl: true }
    });
  }

  /**
   * Schedule bypass override
   */
  createScheduleBypassOverride(
    deviceId: string,
    userId: string,
    reason: string,
    durationMinutes: number = 120
  ): ManualOverride {
    return this.createOverride({
      type: OverrideType.SCHEDULE_BYPASS,
      deviceId,
      userId,
      reason,
      durationMinutes,
      metadata: { scheduleBypass: true }
    });
  }

  /**
   * Anomaly detection ignore override
   */
  createAnomalyIgnoreOverride(
    deviceId: string,
    userId: string,
    reason: string,
    durationMinutes: number = 60
  ): ManualOverride {
    return this.createOverride({
      type: OverrideType.ANOMALY_IGNORE,
      deviceId,
      userId,
      reason,
      durationMinutes,
      metadata: { anomalyIgnore: true }
    });
  }

  /**
   * Check if device control is overridden
   */
  isDeviceControlOverridden(deviceId: string): boolean {
    return this.isOverrideActive(OverrideType.DEVICE_CONTROL, deviceId) ||
           this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN, deviceId) ||
           this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN); // System-wide
  }

  /**
   * Check if schedule is bypassed
   */
  isScheduleBypassed(deviceId: string): boolean {
    return this.isOverrideActive(OverrideType.SCHEDULE_BYPASS, deviceId) ||
           this.isOverrideActive(OverrideType.DEVICE_CONTROL, deviceId) ||
           this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN, deviceId) ||
           this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN);
  }

  /**
   * Check if anomaly detection is ignored
   */
  isAnomalyDetectionIgnored(deviceId: string): boolean {
    return this.isOverrideActive(OverrideType.ANOMALY_IGNORE, deviceId);
  }

  /**
   * Check if system is in maintenance mode
   */
  isMaintenanceMode(): boolean {
    return this.isOverrideActive(OverrideType.SYSTEM_MAINTENANCE);
  }

  /**
   * Check if emergency shutdown is active
   */
  isEmergencyShutdown(deviceId?: string): boolean {
    if (deviceId) {
      // Check device-specific emergency shutdown first
      return this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN, deviceId) ||
             this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN); // System-wide affects all devices
    } else {
      // Check for system-wide emergency shutdown only
      return this.isOverrideActive(OverrideType.EMERGENCY_SHUTDOWN);
    }
  }

  /**
   * Get override statistics
   */
  getOverrideStatistics(): {
    totalOverrides: number;
    activeOverrides: number;
    overridesByType: Record<OverrideType, number>;
    recentOverrides: ManualOverride[];
  } {
    const overridesByType = {} as Record<OverrideType, number>;
    
    // Initialize counters
    Object.values(OverrideType).forEach(type => {
      overridesByType[type] = 0;
    });

    let activeCount = 0;
    
    // Count overrides
    for (const override of Array.from(this.overrides.values())) {
      overridesByType[override.type]++;
      
      if (override.status === OverrideStatus.ACTIVE) {
        // Check if not expired
        if (!override.expiresAt || new Date() <= override.expiresAt) {
          activeCount++;
        }
      }
    }

    // Get recent overrides (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOverrides = Array.from(this.overrides.values())
      .filter(override => override.createdAt > oneDayAgo)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      totalOverrides: this.overrides.size,
      activeOverrides: activeCount,
      overridesByType,
      recentOverrides
    };
  }

  /**
   * Clear all overrides (for testing/emergency)
   */
  clearAllOverrides(userId: string): void {
    if (!this.isSystemAdmin(userId)) {
      throw new Error('Insufficient permissions to clear all overrides');
    }

    this.overrides.clear();
    console.log(`All overrides cleared by ${userId}`);
  }

  /**
   * Cleanup expired overrides
   */
  private cleanupExpiredOverrides(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [id, override] of Array.from(this.overrides.entries())) {
      if (override.expiresAt && now > override.expiresAt && 
          override.status === OverrideStatus.ACTIVE) {
        this.expireOverride(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired overrides`);
    }
  }

  private expireOverride(overrideId: string): void {
    const override = this.overrides.get(overrideId);
    if (override) {
      override.status = OverrideStatus.EXPIRED;
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired overrides every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredOverrides();
    }, 5 * 60 * 1000);
  }

  private isSystemAdmin(userId: string): boolean {
    // In a real implementation, this would check user roles
    // For now, we'll use a simple check
    return userId === 'admin' || userId.startsWith('admin_');
  }

  private generateOverrideId(): string {
    return `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

/**
 * Global manual override manager instance
 */
export const globalOverrideManager = new ManualOverrideManager();