/**
 * Notification System Implementation
 * Manages alerts, notifications, and user preferences for system events
 */

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  createdAt: Date;
  expiresAt?: Date;
  read: boolean;
  readAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  delivered: boolean;
  deliveryChannels: DeliveryChannel[];
  deliveryStatus: DeliveryStatus[];
}

export type NotificationType = 
  | 'alert'
  | 'warning'
  | 'info'
  | 'success'
  | 'reminder'
  | 'recommendation'
  | 'report';

export type NotificationCategory = 
  | 'energy'
  | 'device'
  | 'security'
  | 'system'
  | 'maintenance'
  | 'cost'
  | 'automation'
  | 'environmental';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  params?: Record<string, any>;
  style?: 'primary' | 'secondary' | 'danger';
}

export type DeliveryChannel = 'push' | 'email' | 'sms' | 'dashboard' | 'voice';

export interface DeliveryStatus {
  channel: DeliveryChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp?: Date;
  error?: string;
}

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    dashboard: boolean;
    voice: boolean;
  };
  categories: Record<NotificationCategory, {
    enabled: boolean;
    channels: DeliveryChannel[];
    quietHours?: { start: string; end: string };
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    allowCritical: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;
  };
  thresholds: {
    energySpike: number;
    costAlert: number;
    deviceOffline: number;
  };
}

export interface NotificationFilter {
  userId?: string;
  type?: NotificationType[];
  category?: NotificationCategory[];
  priority?: NotificationPriority[];
  read?: boolean;
  dismissed?: boolean;
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
  recentActivity: {
    lastHour: number;
    last24Hours: number;
    lastWeek: number;
  };
}

export class NotificationSystemImpl {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private subscribers: Map<string, ((notification: Notification) => void)[]> = new Map();

  /**
   * Create and send a notification
   */
  async createNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'readAt' | 'dismissed' | 'dismissedAt' | 'delivered' | 'deliveryStatus'>
  ): Promise<Notification> {
    const userPrefs = this.preferences.get(notification.userId);
    
    // Check if notifications are enabled for this category
    if (userPrefs && !userPrefs.enabled) {
      throw new Error('Notifications disabled for user');
    }

    // Check quiet hours
    if (this.isQuietHours(notification.userId, notification.priority)) {
      // Queue for later delivery or skip non-critical
      if (notification.priority !== 'critical') {
        throw new Error('Quiet hours active');
      }
    }

    const fullNotification: Notification = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
      read: false,
      dismissed: false,
      delivered: false,
      deliveryStatus: notification.deliveryChannels.map(channel => ({
        channel,
        status: 'pending' as const
      }))
    };

    this.notifications.set(fullNotification.id, fullNotification);

    // Deliver notification
    await this.deliverNotification(fullNotification);

    // Notify subscribers
    this.notifySubscribers(notification.userId, fullNotification);

    return fullNotification;
  }

  /**
   * Send energy spike alert
   */
  async sendEnergySpikeAlert(
    userId: string,
    currentUsage: number,
    normalUsage: number,
    deviceId?: string
  ): Promise<Notification> {
    const percentageIncrease = ((currentUsage - normalUsage) / normalUsage) * 100;
    
    return this.createNotification({
      userId,
      type: 'alert',
      category: 'energy',
      priority: percentageIncrease > 100 ? 'high' : 'medium',
      title: 'Energy Spike Detected',
      message: `Energy usage is ${percentageIncrease.toFixed(0)}% above normal${deviceId ? ` on device ${deviceId}` : ''}.`,
      data: {
        currentUsage,
        normalUsage,
        percentageIncrease,
        deviceId
      },
      actions: [
        {
          id: 'view_details',
          label: 'View Details',
          action: 'navigate',
          params: { screen: 'energy_monitor' },
          style: 'primary'
        },
        {
          id: 'dismiss',
          label: 'Dismiss',
          action: 'dismiss',
          style: 'secondary'
        }
      ],
      deliveryChannels: ['push', 'dashboard']
    });
  }

  /**
   * Send device offline notification
   */
  async sendDeviceOfflineNotification(
    userId: string,
    deviceId: string,
    deviceName: string,
    lastSeen: Date
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'warning',
      category: 'device',
      priority: 'medium',
      title: 'Device Offline',
      message: `${deviceName} has gone offline. Last seen ${this.formatRelativeTime(lastSeen)}.`,
      data: {
        deviceId,
        deviceName,
        lastSeen
      },
      actions: [
        {
          id: 'troubleshoot',
          label: 'Troubleshoot',
          action: 'navigate',
          params: { screen: 'device_troubleshoot', deviceId },
          style: 'primary'
        },
        {
          id: 'ignore',
          label: 'Ignore',
          action: 'dismiss',
          style: 'secondary'
        }
      ],
      deliveryChannels: ['push', 'dashboard']
    });
  }

  /**
   * Send cost alert notification
   */
  async sendCostAlertNotification(
    userId: string,
    currentCost: number,
    budgetLimit: number,
    projectedCost: number
  ): Promise<Notification> {
    const percentageUsed = (currentCost / budgetLimit) * 100;
    const priority: NotificationPriority = percentageUsed > 90 ? 'high' : percentageUsed > 75 ? 'medium' : 'low';

    return this.createNotification({
      userId,
      type: 'warning',
      category: 'cost',
      priority,
      title: 'Budget Alert',
      message: `You've used ${percentageUsed.toFixed(0)}% of your energy budget. Projected monthly cost: $${projectedCost.toFixed(2)}.`,
      data: {
        currentCost,
        budgetLimit,
        projectedCost,
        percentageUsed
      },
      actions: [
        {
          id: 'view_tips',
          label: 'View Savings Tips',
          action: 'navigate',
          params: { screen: 'energy_tips' },
          style: 'primary'
        },
        {
          id: 'adjust_budget',
          label: 'Adjust Budget',
          action: 'navigate',
          params: { screen: 'settings', section: 'budget' },
          style: 'secondary'
        }
      ],
      deliveryChannels: ['push', 'email', 'dashboard']
    });
  }

  /**
   * Send automation completion notification
   */
  async sendAutomationNotification(
    userId: string,
    automationName: string,
    success: boolean,
    details?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: success ? 'success' : 'warning',
      category: 'automation',
      priority: success ? 'low' : 'medium',
      title: success ? 'Automation Completed' : 'Automation Issue',
      message: success 
        ? `"${automationName}" ran successfully.${details ? ` ${details}` : ''}`
        : `"${automationName}" encountered an issue.${details ? ` ${details}` : ''}`,
      data: {
        automationName,
        success,
        details
      },
      deliveryChannels: success ? ['dashboard'] : ['push', 'dashboard']
    });
  }

  /**
   * Send environmental achievement notification
   */
  async sendEnvironmentalAchievement(
    userId: string,
    achievement: string,
    description: string,
    impact: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'success',
      category: 'environmental',
      priority: 'low',
      title: '🎉 New Achievement Unlocked!',
      message: `${achievement} - ${description}`,
      data: {
        achievement,
        description,
        impact
      },
      actions: [
        {
          id: 'share',
          label: 'Share',
          action: 'share',
          params: { achievement },
          style: 'primary'
        },
        {
          id: 'view_all',
          label: 'View All Achievements',
          action: 'navigate',
          params: { screen: 'achievements' },
          style: 'secondary'
        }
      ],
      deliveryChannels: ['push', 'dashboard']
    });
  }

  /**
   * Send daily/weekly report notification
   */
  async sendReportNotification(
    userId: string,
    reportType: 'daily' | 'weekly' | 'monthly',
    reportId: string,
    highlights: string[]
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'report',
      category: 'energy',
      priority: 'low',
      title: `Your ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Energy Report`,
      message: highlights.slice(0, 2).join(' • '),
      data: {
        reportType,
        reportId,
        highlights
      },
      actions: [
        {
          id: 'view_report',
          label: 'View Full Report',
          action: 'navigate',
          params: { screen: 'reports', reportId },
          style: 'primary'
        }
      ],
      deliveryChannels: ['email', 'dashboard']
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
      this.notifications.set(notificationId, notification);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        this.notifications.set(id, notification);
      }
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.dismissed = true;
      notification.dismissedAt = new Date();
      this.notifications.set(notificationId, notification);
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(filter: NotificationFilter): Promise<Notification[]> {
    let results = Array.from(this.notifications.values());

    if (filter.userId) {
      results = results.filter(n => n.userId === filter.userId);
    }
    if (filter.type?.length) {
      results = results.filter(n => filter.type!.includes(n.type));
    }
    if (filter.category?.length) {
      results = results.filter(n => filter.category!.includes(n.category));
    }
    if (filter.priority?.length) {
      results = results.filter(n => filter.priority!.includes(n.priority));
    }
    if (filter.read !== undefined) {
      results = results.filter(n => n.read === filter.read);
    }
    if (filter.dismissed !== undefined) {
      results = results.filter(n => n.dismissed === filter.dismissed);
    }
    if (filter.dateRange) {
      results = results.filter(n => 
        n.createdAt >= filter.dateRange!.start && 
        n.createdAt <= filter.dateRange!.end
      );
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (filter.offset) {
      results = results.slice(filter.offset);
    }
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byType: Record<NotificationType, number> = {
      alert: 0, warning: 0, info: 0, success: 0, 
      reminder: 0, recommendation: 0, report: 0
    };
    const byCategory: Record<NotificationCategory, number> = {
      energy: 0, device: 0, security: 0, system: 0,
      maintenance: 0, cost: 0, automation: 0, environmental: 0
    };
    const byPriority: Record<NotificationPriority, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };

    userNotifications.forEach(n => {
      byType[n.type]++;
      byCategory[n.category]++;
      byPriority[n.priority]++;
    });

    return {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.read).length,
      byType,
      byCategory,
      byPriority,
      recentActivity: {
        lastHour: userNotifications.filter(n => n.createdAt >= oneHourAgo).length,
        last24Hours: userNotifications.filter(n => n.createdAt >= oneDayAgo).length,
        lastWeek: userNotifications.filter(n => n.createdAt >= oneWeekAgo).length
      }
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    this.preferences.set(preferences.userId, preferences);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    return this.preferences.get(userId) || null;
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribe(userId: string, callback: (notification: Notification) => void): () => void {
    const userSubscribers = this.subscribers.get(userId) || [];
    userSubscribers.push(callback);
    this.subscribers.set(userId, userSubscribers);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(userId) || [];
      const index = subs.indexOf(callback);
      if (index > -1) {
        subs.splice(index, 1);
        this.subscribers.set(userId, subs);
      }
    };
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deleted = 0;
    for (const [id, notification] of this.notifications) {
      if (notification.createdAt < cutoffDate && notification.dismissed) {
        this.notifications.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    for (let i = 0; i < notification.deliveryStatus.length; i++) {
      const status = notification.deliveryStatus[i];
      try {
        await this.deliverToChannel(notification, status.channel);
        status.status = 'delivered';
        status.timestamp = new Date();
      } catch (error: any) {
        status.status = 'failed';
        status.error = error.message;
        status.timestamp = new Date();
      }
    }

    notification.delivered = notification.deliveryStatus.some(s => s.status === 'delivered');
    this.notifications.set(notification.id, notification);
  }

  private async deliverToChannel(notification: Notification, channel: DeliveryChannel): Promise<void> {
    // In a real implementation, this would integrate with actual delivery services
    switch (channel) {
      case 'push':
        // Send push notification
        console.log(`[PUSH] ${notification.title}: ${notification.message}`);
        break;
      case 'email':
        // Send email
        console.log(`[EMAIL] ${notification.title}: ${notification.message}`);
        break;
      case 'sms':
        // Send SMS
        console.log(`[SMS] ${notification.title}: ${notification.message}`);
        break;
      case 'dashboard':
        // Already stored in notifications map
        break;
      case 'voice':
        // Send voice announcement
        console.log(`[VOICE] ${notification.title}: ${notification.message}`);
        break;
    }
  }

  private notifySubscribers(userId: string, notification: Notification): void {
    const subscribers = this.subscribers.get(userId) || [];
    subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  private isQuietHours(userId: string, priority: NotificationPriority): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs?.quietHours.enabled) return false;
    if (priority === 'critical' && prefs.quietHours.allowCritical) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= prefs.quietHours.start && currentTime <= prefs.quietHours.end;
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
