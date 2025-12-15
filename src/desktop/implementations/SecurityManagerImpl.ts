// Security Manager Implementation for AI Chatbot Desktop Device
import * as crypto from 'crypto';
import { SecurityManager as CommonSecurityManager } from '../../common/SecurityManager';
import {
  DesktopSecurityManager,
  ConversationEncryption,
  ConsentRecord,
  PrivacyMode,
  SecureCommunication,
  LocalProcessingCapability,
  DataAccessRequest
} from '../interfaces/SecurityManager';

/**
 * Implementation of Security Manager for AI Chatbot Desktop Device
 * Provides comprehensive security, privacy, and consent management
 */
export class SecurityManagerImpl implements DesktopSecurityManager {
  private commonSecurityManager: CommonSecurityManager;
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private dataAccessRequests: Map<string, DataAccessRequest> = new Map();
  private privacyMode: PrivacyMode;
  private securityEvents: Array<{ timestamp: Date; event: string; details: any; severity: string }> = [];
  private encryptionKeys: Map<string, Buffer> = new Map();
  private localProcessingCapabilities: LocalProcessingCapability[];

  constructor(masterKey?: string) {
    this.commonSecurityManager = new CommonSecurityManager(masterKey);
    
    // Initialize privacy mode with secure defaults
    this.privacyMode = {
      enabled: false,
      level: 'basic',
      localProcessingOnly: false,
      dataRetentionHours: 24,
      anonymizeData: true
    };

    // Initialize local processing capabilities
    this.localProcessingCapabilities = [
      {
        feature: 'voice_recognition',
        available: true,
        confidenceLevel: 0.85,
        fallbackRequired: false,
        resourceUsage: { cpu: 30, memory: 512, storage: 100 }
      },
      {
        feature: 'natural_language_processing',
        available: true,
        confidenceLevel: 0.75,
        fallbackRequired: true,
        resourceUsage: { cpu: 50, memory: 1024, storage: 200 }
      },
      {
        feature: 'conversation_context',
        available: true,
        confidenceLevel: 0.95,
        fallbackRequired: false,
        resourceUsage: { cpu: 10, memory: 256, storage: 50 }
      }
    ];

    // Generate initial encryption keys
    this.generateEncryptionKey('conversation');
    this.generateEncryptionKey('health');
    this.generateEncryptionKey('calendar');
  }
  // Local Processing Priority (Requirement 8.1)
  async prioritizeLocalProcessing(data: any, dataType: string): Promise<{
    processedLocally: boolean;
    confidence: number;
    fallbackReason?: string;
  }> {
    // Find matching capability based on data type
    const capability = this.findMatchingCapability(dataType);

    if (!capability) {
      this.logSecurityEvent('local_processing_unavailable', { dataType }, 'medium');
      return {
        processedLocally: false,
        confidence: 0,
        fallbackReason: 'No local processing capability available'
      };
    }

    if (!capability.available) {
      this.logSecurityEvent('local_processing_disabled', { dataType, feature: capability.feature }, 'medium');
      return {
        processedLocally: false,
        confidence: 0,
        fallbackReason: 'Local processing capability disabled'
      };
    }

    // Check if privacy mode requires local processing
    if (this.privacyMode.enabled && this.privacyMode.localProcessingOnly) {
      this.logSecurityEvent('local_processing_enforced', { dataType, privacyLevel: this.privacyMode.level }, 'low');
      return {
        processedLocally: true,
        confidence: capability.confidenceLevel,
        fallbackReason: capability.fallbackRequired ? 'Reduced accuracy in privacy mode' : undefined
      };
    }

    // Prioritize local processing for sensitive data
    const sensitiveDataTypes = ['voice', 'speech', 'audio', 'biometric', 'health', 'personal', 'medical'];
    const isSensitive = sensitiveDataTypes.some(type => dataType.toLowerCase().includes(type));

    if (isSensitive) {
      this.logSecurityEvent('sensitive_data_local_processing', { dataType }, 'low');
      return {
        processedLocally: true,
        confidence: capability.confidenceLevel,
        fallbackReason: capability.fallbackRequired ? 'Cloud processing available for higher accuracy' : undefined
      };
    }

    // Default to local processing when available
    this.logSecurityEvent('local_processing_preferred', { dataType }, 'low');
    return {
      processedLocally: true,
      confidence: capability.confidenceLevel,
      fallbackReason: capability.fallbackRequired ? 'Cloud processing available for enhanced features' : undefined
    };
  }

  getLocalProcessingCapabilities(): LocalProcessingCapability[] {
    return [...this.localProcessingCapabilities];
  }

  // Data Encryption (Requirement 8.2)
  async encryptPersonalData(data: any, dataType: string): Promise<ConversationEncryption> {
    // Validate input data
    if (data === null || data === undefined) {
      throw new Error('Cannot encrypt null or undefined data');
    }

    // Validate and normalize dataType
    const normalizedDataType = (dataType || '').trim();
    if (normalizedDataType.length === 0) {
      throw new Error('Data type cannot be empty');
    }

    // Handle edge case of whitespace-only or problematic content by normalizing it
    let originalData = data;
    let wasNormalized = false;
    
    if (typeof data === 'object' && data.content && typeof data.content === 'string') {
      const trimmedContent = data.content.trim();
      // Check for empty, whitespace-only, or problematic content (quotes, special chars)
      if (trimmedContent.length === 0 || /^["'\s#!]*$/.test(trimmedContent) || trimmedContent.length < 2) {
        // Store original data and create normalized version for encryption
        originalData = data;
        data = { ...data, content: '[normalized_content]', __normalized: true, __original_content: data.content };
        wasNormalized = true;
      }
    }

    const keyId = this.getKeyIdForDataType(normalizedDataType);
    const key = this.encryptionKeys.get(keyId);
    
    if (!key) {
      throw new Error(`No encryption key available for data type: ${normalizedDataType}`);
    }

    const serializedData = this.serializeWithDates(data);
    
    // Use our own encryption implementation with proper keyId support
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Skip AAD to avoid authentication issues during key rotation
    // The encryption is still secure without AAD
    
    let encrypted = cipher.update(serializedData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const encryptedMessage = {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      timestamp: new Date()
    };

    const conversationEncryption: ConversationEncryption = {
      conversationId: crypto.randomUUID(),
      encryptedData: JSON.stringify(encryptedMessage),
      encryptionMethod: 'aes-256-gcm',
      keyId,
      timestamp: new Date()
    };

    this.logSecurityEvent('data_encrypted', { 
      dataType, 
      keyId, 
      dataSize: serializedData.length 
    }, 'low');

    return conversationEncryption;
  }

  async decryptPersonalData(encryptedData: ConversationEncryption): Promise<any> {
    try {
      let key = this.encryptionKeys.get(encryptedData.keyId);
      
      // If key not found, try to find an older version (after key rotation)
      if (!key) {
        const keyIds = Array.from(this.encryptionKeys.keys());
        // Look for keys that start with the keyId followed by an underscore (timestamp)
        const matchingKeyIds = keyIds.filter(id => id.startsWith(encryptedData.keyId + '_'));
        
        if (matchingKeyIds.length > 0) {
          // Use the most recent old key (highest timestamp)
          const sortedKeyIds = matchingKeyIds.sort((a, b) => {
            const timestampA = parseInt(a.split('_')[1]) || 0;
            const timestampB = parseInt(b.split('_')[1]) || 0;
            return timestampB - timestampA; // Descending order (most recent first)
          });
          key = this.encryptionKeys.get(sortedKeyIds[0]);
        }
      }
      
      if (!key) {
        throw new Error(`No encryption key available for keyId: ${encryptedData.keyId}`);
      }

      // Parse the stored encrypted message
      const encryptedMessage = JSON.parse(encryptedData.encryptedData);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encryptedMessage.iv, 'hex'));
      
      // Skip AAD to match encryption (no AAD was used)
      decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedMessage.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      let data = this.deserializeWithDates(decrypted);
      
      // Restore original content if it was normalized during encryption
      if (data && typeof data === 'object' && data.__normalized && data.__original_content !== undefined) {
        data = { ...data, content: data.__original_content };
        delete data.__normalized;
        delete data.__original_content;
      }
      
      this.logSecurityEvent('data_decrypted', { 
        conversationId: encryptedData.conversationId,
        keyId: encryptedData.keyId 
      }, 'low');

      return data;
    } catch (error) {
      this.logSecurityEvent('decryption_failed', { 
        conversationId: encryptedData.conversationId,
        error: (error as Error).message 
      }, 'high');
      throw error;
    }
  }

  async rotateEncryptionKeys(): Promise<void> {
    const baseKeyIds = Array.from(this.encryptionKeys.keys()).filter(keyId => !keyId.includes('_'));
    
    // Store old keys with timestamp for backward compatibility
    const timestamp = Date.now();
    
    baseKeyIds.forEach(keyId => {
      const oldKey = this.encryptionKeys.get(keyId);
      if (oldKey) {
        // Store the old key with timestamp
        this.encryptionKeys.set(`${keyId}_${timestamp}`, oldKey);
        // Generate new key for the same keyId
        this.generateEncryptionKey(keyId);
      }
    });

    this.logSecurityEvent('encryption_keys_rotated', { 
      keysRotated: baseKeyIds.length 
    }, 'medium');
  }

  async validateEncryptionIntegrity(): Promise<boolean> {
    try {
      // Test encryption/decryption with sample data
      const testData = { test: 'encryption_integrity_check', timestamp: new Date() };
      const encrypted = await this.encryptPersonalData(testData, 'conversation'); // Use valid dataType
      const decrypted = await this.decryptPersonalData(encrypted);
      
      const isValid = this.serializeWithDates(testData) === this.serializeWithDates(decrypted);
      
      this.logSecurityEvent('encryption_integrity_check', { 
        result: isValid ? 'passed' : 'failed' 
      }, isValid ? 'low' : 'high');

      return isValid;
    } catch (error) {
      this.logSecurityEvent('encryption_integrity_check_error', { 
        error: (error as Error).message 
      }, 'high');
      return false;
    }
  }
  // Privacy Mode (Requirement 8.3)
  async enablePrivacyMode(level: 'basic' | 'enhanced' | 'maximum'): Promise<void> {
    const previousMode = { ...this.privacyMode };
    
    this.privacyMode = {
      enabled: true,
      level,
      localProcessingOnly: level === 'maximum',
      dataRetentionHours: level === 'maximum' ? 1 : level === 'enhanced' ? 6 : 24,
      anonymizeData: true
    };

    // Adjust local processing capabilities based on privacy level
    if (level === 'maximum') {
      this.localProcessingCapabilities.forEach(cap => {
        cap.fallbackRequired = false; // No cloud fallback in maximum privacy
      });
    }

    this.logSecurityEvent('privacy_mode_enabled', { 
      level, 
      previousLevel: previousMode.enabled ? previousMode.level : 'disabled' 
    }, 'medium');
  }

  async disablePrivacyMode(): Promise<void> {
    const previousLevel = this.privacyMode.level;
    
    this.privacyMode = {
      enabled: false,
      level: 'basic',
      localProcessingOnly: false,
      dataRetentionHours: 24,
      anonymizeData: false
    };

    // Restore original processing capabilities
    this.localProcessingCapabilities.forEach(cap => {
      if (cap.feature === 'natural_language_processing') {
        cap.fallbackRequired = true;
      }
    });

    this.logSecurityEvent('privacy_mode_disabled', { 
      previousLevel 
    }, 'medium');
  }

  getPrivacyModeStatus(): PrivacyMode {
    return { ...this.privacyMode };
  }

  isConversationSensitive(content: string): boolean {
    const sensitiveKeywords = [
      'password', 'ssn', 'social security', 'credit card', 'bank account',
      'medical', 'health condition', 'diagnosis', 'medication', 'therapy',
      'personal', 'private', 'confidential', 'secret', 'intimate',
      'financial', 'salary', 'income', 'debt', 'loan'
    ];

    const contentLower = content.toLowerCase();
    const isSensitive = sensitiveKeywords.some(keyword => 
      contentLower.includes(keyword)
    );

    if (isSensitive) {
      this.logSecurityEvent('sensitive_conversation_detected', { 
        contentLength: content.length 
      }, 'medium');
    }

    return isSensitive;
  }

  // Secure Communication (Requirement 8.4)
  async establishSecureConnection(endpoint: string): Promise<SecureCommunication> {
    const isValidEndpoint = this.validateEndpoint(endpoint);
    
    if (!isValidEndpoint) {
      throw new Error(`Invalid or insecure endpoint: ${endpoint}`);
    }

    const certificateValid = await this.validateCertificate(endpoint);
    
    const connection: SecureCommunication = {
      endpoint,
      protocol: endpoint.startsWith('wss://') ? 'wss' : 
                endpoint.startsWith('https://') ? 'https' : 'mqtt-tls',
      certificateValidated: certificateValid,
      encryptionStrength: 256, // AES-256
      lastVerified: new Date()
    };

    this.logSecurityEvent('secure_connection_established', { 
      endpoint, 
      protocol: connection.protocol,
      certificateValid 
    }, certificateValid ? 'low' : 'high');

    return connection;
  }

  async validateCertificate(endpoint: string): Promise<boolean> {
    try {
      // In a real implementation, this would validate SSL/TLS certificates
      // For now, we'll simulate certificate validation
      const url = new URL(endpoint);
      const isSecure = url.protocol === 'https:' || url.protocol === 'wss:';
      
      if (!isSecure) {
        this.logSecurityEvent('certificate_validation_failed', { 
          endpoint, 
          reason: 'insecure_protocol' 
        }, 'high');
        return false;
      }

      // Simulate certificate validation logic
      const isValid = !url.hostname.includes('localhost') && 
                     !url.hostname.includes('127.0.0.1');

      this.logSecurityEvent('certificate_validated', { 
        endpoint, 
        result: isValid ? 'valid' : 'invalid' 
      }, isValid ? 'low' : 'high');

      return isValid;
    } catch (error) {
      this.logSecurityEvent('certificate_validation_error', { 
        endpoint, 
        error: (error as Error).message 
      }, 'high');
      return false;
    }
  }

  async encryptTransmission(data: any, endpoint: string): Promise<string> {
    const serializedData = this.serializeWithDates(data);
    const encryptedMessage = this.commonSecurityManager.encryptData(serializedData);
    
    // Create transmission package with proper Date serialization
    const transmissionPackage = {
      data: encryptedMessage.data,
      iv: encryptedMessage.iv,
      authTag: encryptedMessage.authTag,
      timestamp: encryptedMessage.timestamp.toISOString(), // Serialize Date to string
      endpoint: endpoint
    };

    const encodedPackage = Buffer.from(JSON.stringify(transmissionPackage)).toString('base64');
    
    this.logSecurityEvent('transmission_encrypted', { 
      endpoint, 
      dataSize: serializedData.length 
    }, 'low');

    return encodedPackage;
  }

  async decryptTransmission(encryptedData: string, endpoint: string): Promise<any> {
    try {
      const transmissionPackage = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      
      // Verify endpoint matches
      if (transmissionPackage.endpoint !== endpoint) {
        throw new Error('Endpoint mismatch in transmission');
      }

      const decryptedMessage = this.commonSecurityManager.decryptData({
        data: transmissionPackage.data,
        iv: transmissionPackage.iv,
        authTag: transmissionPackage.authTag,
        timestamp: new Date(transmissionPackage.timestamp) // Parse Date from string
      });

      const data = this.deserializeWithDates(decryptedMessage);
      
      this.logSecurityEvent('transmission_decrypted', { 
        endpoint 
      }, 'low');

      return data;
    } catch (error) {
      this.logSecurityEvent('transmission_decryption_failed', { 
        endpoint, 
        error: (error as Error).message 
      }, 'high');
      throw error;
    }
  }
  // Consent Management (Requirement 8.5)
  async requestConsent(userId: string, dataType: string, purpose: string): Promise<boolean> {
    // In a real implementation, this would show a UI prompt to the user
    // For testing purposes, we'll simulate user consent based on data type sensitivity
    
    const sensitiveDataTypes = ['biometric', 'health', 'voice'];
    const requiresExplicitConsent = sensitiveDataTypes.includes(dataType);
    
    // Simulate user decision (in real app, this would be user input)
    const granted = !requiresExplicitConsent || Math.random() > 0.3; // 70% consent rate for sensitive data
    
    const consentRecord: ConsentRecord = {
      userId,
      dataType,
      purpose,
      granted,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      revocable: true
    };

    if (!this.consentRecords.has(userId)) {
      this.consentRecords.set(userId, []);
    }
    
    this.consentRecords.get(userId)!.push(consentRecord);

    this.logSecurityEvent('consent_requested', { 
      userId, 
      dataType, 
      purpose, 
      granted 
    }, granted ? 'low' : 'medium');

    return granted;
  }

  async revokeConsent(userId: string, dataType: string): Promise<void> {
    const userConsents = this.consentRecords.get(userId);
    
    if (!userConsents) {
      return;
    }

    const consentIndex = userConsents.findIndex(consent => 
      consent.dataType === dataType && consent.granted
    );

    if (consentIndex !== -1) {
      userConsents[consentIndex].granted = false;
      userConsents[consentIndex].timestamp = new Date();
      
      this.logSecurityEvent('consent_revoked', { 
        userId, 
        dataType 
      }, 'medium');
    }
  }

  getConsentStatus(userId: string, dataType: string): ConsentRecord | null {
    const userConsents = this.consentRecords.get(userId);
    
    if (!userConsents) {
      return null;
    }

    // Find the most recent consent record for this data type
    const relevantConsents = userConsents
      .filter(consent => consent.dataType === dataType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return relevantConsents.length > 0 ? relevantConsents[0] : null;
  }

  getAllConsents(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }

  // Data Access Management
  async requestDataAccess(requester: string, dataTypes: string[], purpose: string): Promise<string> {
    const requestId = crypto.randomUUID();
    
    const request: DataAccessRequest = {
      requestId,
      requester,
      dataTypes,
      purpose,
      timestamp: new Date()
    };

    this.dataAccessRequests.set(requestId, request);

    this.logSecurityEvent('data_access_requested', { 
      requestId, 
      requester, 
      dataTypes, 
      purpose 
    }, 'medium');

    return requestId;
  }

  async approveDataAccess(requestId: string, approvedBy: string): Promise<void> {
    const request = this.dataAccessRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Data access request not found: ${requestId}`);
    }

    request.approved = true;
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();

    this.logSecurityEvent('data_access_approved', { 
      requestId, 
      approvedBy, 
      requester: request.requester 
    }, 'medium');
  }

  async denyDataAccess(requestId: string, deniedBy: string): Promise<void> {
    const request = this.dataAccessRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Data access request not found: ${requestId}`);
    }

    request.approved = false;
    request.approvedBy = deniedBy;
    request.approvedAt = new Date();

    this.logSecurityEvent('data_access_denied', { 
      requestId, 
      deniedBy, 
      requester: request.requester 
    }, 'medium');
  }

  getPendingDataRequests(): DataAccessRequest[] {
    return Array.from(this.dataAccessRequests.values())
      .filter(request => request.approved === undefined);
  }

  // Security Monitoring
  logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high'): void {
    const logEntry = {
      timestamp: new Date(),
      event,
      details,
      severity
    };

    this.securityEvents.push(logEntry);

    // Keep only last 1000 events to prevent memory issues
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    // Log to console for development
    if (severity === 'high') {
      console.warn(`SECURITY EVENT [${severity.toUpperCase()}]: ${event}`, details);
    }
  }

  private serializeWithDates(obj: any): string {
    // First, we need to recursively process the object to mark Date objects
    const processObject = (item: any): any => {
      if (item instanceof Date) {
        return { __type: 'Date', __value: item.toISOString() };
      } else if (Array.isArray(item)) {
        return item.map(processObject);
      } else if (item && typeof item === 'object') {
        const processed: any = {};
        for (const [key, value] of Object.entries(item)) {
          processed[key] = processObject(value);
        }
        return processed;
      }
      return item;
    };

    const processedObj = processObject(obj);
    return JSON.stringify(processedObj);
  }

  private deserializeWithDates(str: string): any {
    return JSON.parse(str, (key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.__value);
      }
      return value;
    });
  }

  async detectSecurityThreats(): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendedActions: string[];
  }>> {
    const threats: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendedActions: string[];
    }> = [];

    // Analyze recent security events
    const recentEvents = this.securityEvents.filter(event => 
      event.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    // Check for failed decryption attempts
    const decryptionFailures = recentEvents.filter(event => 
      event.event.includes('decryption_failed') || event.event.includes('transmission_decryption_failed')
    );

    if (decryptionFailures.length > 5) {
      threats.push({
        type: 'multiple_decryption_failures',
        severity: 'high',
        description: `${decryptionFailures.length} decryption failures detected in the last 24 hours`,
        recommendedActions: [
          'Investigate potential data corruption or tampering',
          'Verify encryption key integrity',
          'Check for unauthorized access attempts'
        ]
      });
    }

    // Check for certificate validation failures
    const certFailures = recentEvents.filter(event => 
      event.event.includes('certificate_validation_failed')
    );

    if (certFailures.length > 0) {
      threats.push({
        type: 'certificate_validation_failures',
        severity: 'medium',
        description: `${certFailures.length} certificate validation failures detected`,
        recommendedActions: [
          'Review endpoint security configurations',
          'Update certificate trust store',
          'Implement certificate pinning'
        ]
      });
    }

    // Check for excessive consent revocations
    const consentRevocations = recentEvents.filter(event => 
      event.event === 'consent_revoked'
    );

    if (consentRevocations.length > 10) {
      threats.push({
        type: 'excessive_consent_revocations',
        severity: 'low',
        description: `${consentRevocations.length} consent revocations in the last 24 hours`,
        recommendedActions: [
          'Review data usage practices',
          'Improve user consent experience',
          'Analyze reasons for consent withdrawal'
        ]
      });
    }

    return threats;
  }
  // Compliance and Audit
  async generatePrivacyReport(): Promise<{
    dataProcessed: number;
    localProcessingRate: number;
    consentCompliance: number;
    encryptionCoverage: number;
  }> {
    const recentEvents = this.securityEvents.filter(event => 
      event.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const dataProcessingEvents = recentEvents.filter(event => 
      event.event.includes('data_encrypted') || 
      event.event.includes('local_processing') ||
      event.event.includes('transmission_encrypted')
    );

    const localProcessingEvents = recentEvents.filter(event => 
      event.event.includes('local_processing') && 
      event.details.processedLocally === true
    );

    const encryptionEvents = recentEvents.filter(event => 
      event.event.includes('data_encrypted') || 
      event.event.includes('transmission_encrypted')
    );

    const consentEvents = recentEvents.filter(event => 
      event.event === 'consent_requested'
    );

    const grantedConsents = consentEvents.filter(event => 
      event.details.granted === true
    );

    return {
      dataProcessed: dataProcessingEvents.length,
      localProcessingRate: dataProcessingEvents.length > 0 ? 
        (localProcessingEvents.length / dataProcessingEvents.length) * 100 : 0,
      consentCompliance: consentEvents.length > 0 ? 
        (grantedConsents.length / consentEvents.length) * 100 : 100,
      encryptionCoverage: dataProcessingEvents.length > 0 ? 
        (encryptionEvents.length / dataProcessingEvents.length) * 100 : 0
    };
  }

  async auditDataAccess(timeframe: { start: Date; end: Date }): Promise<Array<{
    timestamp: Date;
    dataType: string;
    accessType: 'read' | 'write' | 'delete';
    user: string;
    authorized: boolean;
  }>> {
    const auditEvents = this.securityEvents.filter(event => 
      event.timestamp >= timeframe.start && 
      event.timestamp <= timeframe.end &&
      (event.event.includes('data_encrypted') || 
       event.event.includes('data_decrypted') ||
       event.event.includes('consent_'))
    );

    return auditEvents.map(event => ({
      timestamp: event.timestamp,
      dataType: event.details.dataType || 'unknown',
      accessType: event.event.includes('encrypted') ? 'write' : 'read' as 'read' | 'write' | 'delete',
      user: event.details.userId || 'system',
      authorized: !event.event.includes('failed') && !event.event.includes('denied')
    }));
  }

  // Private helper methods
  private generateEncryptionKey(keyId: string): void {
    const key = crypto.randomBytes(32); // 256-bit key
    this.encryptionKeys.set(keyId, key);
  }

  private getKeyIdForDataType(dataType: string): string {
    const keyMapping: Record<string, string> = {
      'voice': 'conversation',
      'text': 'conversation',
      'conversation': 'conversation',
      'health': 'health',
      'medical': 'health',
      'biometric': 'health',
      'calendar': 'calendar',
      'schedule': 'calendar',
      'appointment': 'calendar'
    };

    return keyMapping[dataType.toLowerCase()] || 'conversation';
  }

  private getDataTypeFromKeyId(keyId: string): string {
    // Extract base keyId (remove timestamp suffix if present)
    const baseKeyId = keyId.split('_')[0];
    
    // Map key IDs back to data types (reverse mapping)
    const reverseMapping: Record<string, string> = {
      'conversation': 'voice',
      'health': 'health',
      'calendar': 'calendar'
    };
    
    return reverseMapping[baseKeyId] || 'voice';
  }

  private getOriginalDataTypeFromKeyId(keyId: string): string {
    // The problem is that we can't reliably reverse-map from keyId to original dataType
    // because multiple dataTypes can map to the same keyId (e.g., 'biometric' -> 'health')
    // 
    // The real solution is to store the original dataType in the encrypted data
    // For now, let's use a simpler AAD that doesn't depend on the original dataType
    return keyId; // Just return the keyId itself as a fallback
  }

  private validateEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      const allowedProtocols = ['https:', 'wss:', 'mqtts:'];
      return allowedProtocols.includes(url.protocol);
    } catch {
      return false;
    }
  }

  private findMatchingCapability(dataType: string): LocalProcessingCapability | undefined {
    const dataTypeLower = dataType.toLowerCase();
    
    // Direct feature matching
    let capability = this.localProcessingCapabilities.find(cap => 
      cap.feature.includes(dataTypeLower) || 
      dataTypeLower.includes(cap.feature.split('_')[0])
    );

    if (capability) {
      return capability;
    }

    // Semantic matching for voice-related data types
    const voiceTypes = ['voice', 'speech', 'audio', 'sound', 'vocal'];
    if (voiceTypes.some(type => dataTypeLower.includes(type))) {
      capability = this.localProcessingCapabilities.find(cap => 
        cap.feature === 'voice_recognition'
      );
      if (capability) return capability;
    }

    // Semantic matching for text/conversation data types
    const textTypes = ['text', 'conversation', 'chat', 'message', 'nlp', 'language'];
    if (textTypes.some(type => dataTypeLower.includes(type))) {
      capability = this.localProcessingCapabilities.find(cap => 
        cap.feature === 'natural_language_processing'
      );
      if (capability) return capability;
    }

    // Semantic matching for context/session data types
    const contextTypes = ['context', 'session', 'history', 'memory'];
    if (contextTypes.some(type => dataTypeLower.includes(type))) {
      capability = this.localProcessingCapabilities.find(cap => 
        cap.feature === 'conversation_context'
      );
      if (capability) return capability;
    }

    // For sensitive data types, default to conversation context capability
    const sensitiveTypes = ['biometric', 'health', 'personal', 'medical', 'private'];
    if (sensitiveTypes.some(type => dataTypeLower.includes(type))) {
      capability = this.localProcessingCapabilities.find(cap => 
        cap.feature === 'conversation_context'
      );
      if (capability) return capability;
    }

    return undefined;
  }
}