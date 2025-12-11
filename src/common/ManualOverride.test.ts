import {
  ManualOverrideManager,
  OverrideType,
  OverrideStatus,
  OverrideRequest
} from './ManualOverride';

describe('ManualOverride Unit Tests', () => {
  let overrideManager: ManualOverrideManager;

  beforeEach(() => {
    overrideManager = new ManualOverrideManager();
  });

  afterEach(() => {
    overrideManager.destroy();
  });

  describe('Override Creation', () => {
    test('should create device control override', () => {
      const request: OverrideRequest = {
        type: OverrideType.DEVICE_CONTROL,
        deviceId: 'device-123',
        userId: 'user-456',
        reason: 'Manual testing',
        durationMinutes: 30
      };

      const override = overrideManager.createOverride(request);

      expect(override.type).toBe(OverrideType.DEVICE_CONTROL);
      expect(override.deviceId).toBe('device-123');
      expect(override.userId).toBe('user-456');
      expect(override.reason).toBe('Manual testing');
      expect(override.status).toBe(OverrideStatus.ACTIVE);
      expect(override.id).toBeDefined();
      expect(override.createdAt).toBeInstanceOf(Date);
      expect(override.expiresAt).toBeInstanceOf(Date);
    });

    test('should create permanent override without expiration', () => {
      const request: OverrideRequest = {
        type: OverrideType.SYSTEM_MAINTENANCE,
        userId: 'admin',
        reason: 'System maintenance'
        // No durationMinutes specified
      };

      const override = overrideManager.createOverride(request);

      expect(override.expiresAt).toBeUndefined();
      expect(override.status).toBe(OverrideStatus.ACTIVE);
    });

    test('should create emergency shutdown override', () => {
      const overrides = overrideManager.createEmergencyShutdown(
        'admin',
        'Gas leak detected',
        ['device-1', 'device-2']
      );

      expect(overrides).toHaveLength(2);
      expect(overrides[0].type).toBe(OverrideType.EMERGENCY_SHUTDOWN);
      expect(overrides[0].reason).toContain('EMERGENCY');
      expect(overrides[0].metadata?.emergency).toBe(true);
    });

    test('should create system-wide emergency shutdown', () => {
      const overrides = overrideManager.createEmergencyShutdown(
        'admin',
        'Fire alarm activated'
      );

      expect(overrides).toHaveLength(1);
      expect(overrides[0].type).toBe(OverrideType.EMERGENCY_SHUTDOWN);
      expect(overrides[0].deviceId).toBeUndefined();
      expect(overrides[0].metadata?.systemWide).toBe(true);
    });
  });

  describe('Override Status Checking', () => {
    test('should detect active device control override', () => {
      const override = overrideManager.createDeviceControlOverride(
        'device-123',
        'user-456',
        'Testing',
        30
      );

      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(true);
      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-456')).toBe(false);
      expect(overrideManager.isDeviceControlOverridden('device-123')).toBe(true);
    });

    test('should detect schedule bypass', () => {
      const override = overrideManager.createScheduleBypassOverride(
        'device-123',
        'user-456',
        'Manual control needed',
        60
      );

      expect(overrideManager.isScheduleBypassed('device-123')).toBe(true);
      expect(overrideManager.isScheduleBypassed('device-456')).toBe(false);
    });

    test('should detect anomaly detection ignore', () => {
      const override = overrideManager.createAnomalyIgnoreOverride(
        'device-123',
        'user-456',
        'Known issue, safe to ignore',
        30
      );

      expect(overrideManager.isAnomalyDetectionIgnored('device-123')).toBe(true);
      expect(overrideManager.isAnomalyDetectionIgnored('device-456')).toBe(false);
    });

    test('should detect emergency shutdown', () => {
      overrideManager.createEmergencyShutdown('admin', 'Emergency test');

      expect(overrideManager.isEmergencyShutdown()).toBe(true);
      expect(overrideManager.isEmergencyShutdown('any-device')).toBe(true);
    });

    test('should handle device-specific emergency shutdown', () => {
      overrideManager.createEmergencyShutdown('admin', 'Device malfunction', ['device-123']);

      expect(overrideManager.isEmergencyShutdown('device-123')).toBe(true);
      expect(overrideManager.isEmergencyShutdown('device-456')).toBe(false);
      expect(overrideManager.isEmergencyShutdown()).toBe(false); // No system-wide
    });
  });

  describe('Override Expiration', () => {
    test('should expire override after duration', (done) => {
      const override = overrideManager.createDeviceControlOverride(
        'device-123',
        'user-456',
        'Short test',
        0.01 // 0.01 minutes = 0.6 seconds
      );

      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(true);

      setTimeout(() => {
        expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(false);
        
        const retrievedOverride = overrideManager.getActiveOverride(OverrideType.DEVICE_CONTROL, 'device-123');
        expect(retrievedOverride).toBeNull();
        
        done();
      }, 1000); // Wait 1 second
    });

    test('should not expire permanent overrides', () => {
      const request: OverrideRequest = {
        type: OverrideType.SYSTEM_MAINTENANCE,
        userId: 'admin',
        reason: 'Permanent maintenance mode'
        // No duration specified
      };

      const override = overrideManager.createOverride(request);

      expect(override.expiresAt).toBeUndefined();
      expect(overrideManager.isOverrideActive(OverrideType.SYSTEM_MAINTENANCE)).toBe(true);
    });
  });

  describe('Override Revocation', () => {
    test('should allow creator to revoke override', () => {
      const override = overrideManager.createDeviceControlOverride(
        'device-123',
        'user-456',
        'Test override',
        30
      );

      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(true);

      const revoked = overrideManager.revokeOverride(override.id, 'user-456');
      expect(revoked).toBe(true);
      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(false);
    });

    test('should allow admin to revoke any override', () => {
      const override = overrideManager.createDeviceControlOverride(
        'device-123',
        'user-456',
        'Test override',
        30
      );

      const revoked = overrideManager.revokeOverride(override.id, 'admin');
      expect(revoked).toBe(true);
      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(false);
    });

    test('should prevent unauthorized revocation', () => {
      const override = overrideManager.createDeviceControlOverride(
        'device-123',
        'user-456',
        'Test override',
        30
      );

      expect(() => {
        overrideManager.revokeOverride(override.id, 'user-789');
      }).toThrow('Insufficient permissions');

      expect(overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123')).toBe(true);
    });

    test('should return false for non-existent override', () => {
      const revoked = overrideManager.revokeOverride('non-existent-id', 'admin');
      expect(revoked).toBe(false);
    });
  });

  describe('Override History and Statistics', () => {
    test('should track override history', () => {
      const override1 = overrideManager.createDeviceControlOverride(
        'device-123',
        'user-456',
        'First override',
        30
      );

      const override2 = overrideManager.createScheduleBypassOverride(
        'device-123',
        'user-456',
        'Second override',
        60
      );

      overrideManager.revokeOverride(override1.id, 'user-456');

      const history = overrideManager.getOverrideHistory('device-123');
      expect(history).toHaveLength(2);
      expect(history[0].createdAt.getTime()).toBeGreaterThanOrEqual(history[1].createdAt.getTime());
    });

    test('should filter history by user', () => {
      overrideManager.createDeviceControlOverride('device-123', 'user-456', 'User 456 override', 30);
      overrideManager.createDeviceControlOverride('device-456', 'user-789', 'User 789 override', 30);

      const user456History = overrideManager.getOverrideHistory(undefined, 'user-456');
      const user789History = overrideManager.getOverrideHistory(undefined, 'user-789');

      expect(user456History).toHaveLength(1);
      expect(user789History).toHaveLength(1);
      expect(user456History[0].userId).toBe('user-456');
      expect(user789History[0].userId).toBe('user-789');
    });

    test('should provide override statistics', () => {
      overrideManager.createDeviceControlOverride('device-1', 'user-1', 'Override 1', 30);
      overrideManager.createDeviceControlOverride('device-2', 'user-2', 'Override 2', 30);
      overrideManager.createScheduleBypassOverride('device-3', 'user-3', 'Override 3', 30);

      const stats = overrideManager.getOverrideStatistics();

      expect(stats.totalOverrides).toBe(3);
      expect(stats.activeOverrides).toBe(3);
      expect(stats.overridesByType[OverrideType.DEVICE_CONTROL]).toBe(2);
      expect(stats.overridesByType[OverrideType.SCHEDULE_BYPASS]).toBe(1);
      expect(stats.recentOverrides).toHaveLength(3);
    });

    test('should get active overrides', () => {
      const override1 = overrideManager.createDeviceControlOverride('device-1', 'user-1', 'Active', 30);
      const override2 = overrideManager.createDeviceControlOverride('device-2', 'user-2', 'To be revoked', 30);

      overrideManager.revokeOverride(override2.id, 'user-2');

      const activeOverrides = overrideManager.getActiveOverrides();
      expect(activeOverrides).toHaveLength(1);
      expect(activeOverrides[0].id).toBe(override1.id);
    });
  });

  describe('Complex Override Scenarios', () => {
    test('should handle multiple override types for same device', () => {
      overrideManager.createDeviceControlOverride('device-123', 'user-1', 'Control override', 30);
      overrideManager.createScheduleBypassOverride('device-123', 'user-2', 'Schedule override', 60);
      overrideManager.createAnomalyIgnoreOverride('device-123', 'user-3', 'Anomaly override', 45);

      expect(overrideManager.isDeviceControlOverridden('device-123')).toBe(true);
      expect(overrideManager.isScheduleBypassed('device-123')).toBe(true);
      expect(overrideManager.isAnomalyDetectionIgnored('device-123')).toBe(true);
    });

    test('should prioritize emergency shutdown over other overrides', () => {
      overrideManager.createDeviceControlOverride('device-123', 'user-1', 'Normal control', 30);
      overrideManager.createEmergencyShutdown('admin', 'Emergency!', ['device-123']);

      expect(overrideManager.isEmergencyShutdown('device-123')).toBe(true);
      expect(overrideManager.isDeviceControlOverridden('device-123')).toBe(true); // Both should be true
    });

    test('should handle system-wide vs device-specific overrides', () => {
      // Device-specific override
      overrideManager.createDeviceControlOverride('device-123', 'user-1', 'Device specific', 30);
      
      // System-wide emergency
      overrideManager.createEmergencyShutdown('admin', 'System emergency');

      expect(overrideManager.isDeviceControlOverridden('device-123')).toBe(true); // Device-specific
      expect(overrideManager.isDeviceControlOverridden('device-456')).toBe(true); // System-wide emergency
      expect(overrideManager.isEmergencyShutdown()).toBe(true); // System-wide
      expect(overrideManager.isEmergencyShutdown('any-device')).toBe(true); // System-wide affects all
    });
  });

  describe('Admin Functions', () => {
    test('should allow admin to clear all overrides', () => {
      overrideManager.createDeviceControlOverride('device-1', 'user-1', 'Override 1', 30);
      overrideManager.createDeviceControlOverride('device-2', 'user-2', 'Override 2', 30);
      overrideManager.createScheduleBypassOverride('device-3', 'user-3', 'Override 3', 30);

      expect(overrideManager.getActiveOverrides()).toHaveLength(3);

      overrideManager.clearAllOverrides('admin');

      expect(overrideManager.getActiveOverrides()).toHaveLength(0);
      expect(overrideManager.getOverrideStatistics().totalOverrides).toBe(0);
    });

    test('should prevent non-admin from clearing all overrides', () => {
      overrideManager.createDeviceControlOverride('device-1', 'user-1', 'Override 1', 30);

      expect(() => {
        overrideManager.clearAllOverrides('user-1');
      }).toThrow('Insufficient permissions');

      expect(overrideManager.getActiveOverrides()).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle getting active override for non-existent device', () => {
      const override = overrideManager.getActiveOverride(OverrideType.DEVICE_CONTROL, 'non-existent');
      expect(override).toBeNull();
    });

    test('should handle checking override status for non-existent type', () => {
      const isActive = overrideManager.isOverrideActive(OverrideType.DEVICE_CONTROL, 'device-123');
      expect(isActive).toBe(false);
    });

    test('should handle empty override history', () => {
      const history = overrideManager.getOverrideHistory('device-123');
      expect(history).toHaveLength(0);
    });

    test('should handle statistics with no overrides', () => {
      const stats = overrideManager.getOverrideStatistics();
      expect(stats.totalOverrides).toBe(0);
      expect(stats.activeOverrides).toBe(0);
      expect(stats.recentOverrides).toHaveLength(0);
    });
  });
});