// Security Manager Interface for AI Chatbot Desktop Device

export interface ConversationEncryption {
  conversationId: string;
  encryptedData: string;
  encryptionMethod: 'aes-256-gcm' | 'chacha20-poly1305';
  keyId: string;
  timestamp: Date;
}

export interface ConsentRecord {
  userId: string;
  dataType: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
  revocable: boolean;
}

export interface PrivacyMode {
  enabled: boolean;
  level: 'basic' | 'enhanced' | 'maximum';
  localProcessingOnly: boolean;
  dataRetentionHours: number;
  anonymizeData: boolean;
}

export interface SecureCommunication {
  endpoint: string;
  protocol: 'https' | 'wss' | 'mqtt-tls';
  certificateValidated: boolean;
  encryptionStrength: number;
  lastVerified: Date;
}

export interface LocalProcessingCapability {
  feature: string;
  available: boolean;
  confidenceLevel: number;
  fallbackRequired: boolean;
  resourceUsage: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

export interface DataAccessRequest {
  requestId: string;
  requester: string;
  dataTypes: string[];
  purpose: string;
  timestamp: Date;
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

/**
 * Security Manager for AI Chatbot Desktop Device
 * Handles encryption, privacy, consent management, and secure communications
 */
export interface DesktopSecurityManager {
  // Local Processing Priority (Requirement 8.1)
  prioritizeLocalProcessing(data: any, dataType: string): Promise<{
    processedLocally: boolean;
    confidence: number;
    fallbackReason?: string;
  }>;

  getLocalProcessingCapabilities(): LocalProcessingCapability[];

  // Data Encryption (Requirement 8.2)
  encryptPersonalData(data: any, dataType: string): Promise<ConversationEncryption>;
  decryptPersonalData(encryptedData: ConversationEncryption): Promise<any>;
  rotateEncryptionKeys(): Promise<void>;
  validateEncryptionIntegrity(): Promise<boolean>;

  // Privacy Mode (Requirement 8.3)
  enablePrivacyMode(level: 'basic' | 'enhanced' | 'maximum'): Promise<void>;
  disablePrivacyMode(): Promise<void>;
  getPrivacyModeStatus(): PrivacyMode;
  isConversationSensitive(content: string): boolean;

  // Secure Communication (Requirement 8.4)
  establishSecureConnection(endpoint: string): Promise<SecureCommunication>;
  validateCertificate(endpoint: string): Promise<boolean>;
  encryptTransmission(data: any, endpoint: string): Promise<string>;
  decryptTransmission(encryptedData: string, endpoint: string): Promise<any>;

  // Consent Management (Requirement 8.5)
  requestConsent(userId: string, dataType: string, purpose: string): Promise<boolean>;
  revokeConsent(userId: string, dataType: string): Promise<void>;
  getConsentStatus(userId: string, dataType: string): ConsentRecord | null;
  getAllConsents(userId: string): ConsentRecord[];
  
  // Data Access Management
  requestDataAccess(requester: string, dataTypes: string[], purpose: string): Promise<string>;
  approveDataAccess(requestId: string, approvedBy: string): Promise<void>;
  denyDataAccess(requestId: string, deniedBy: string): Promise<void>;
  getPendingDataRequests(): DataAccessRequest[];

  // Security Monitoring
  logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high'): void;
  detectSecurityThreats(): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendedActions: string[];
  }>>;
  
  // Compliance and Audit
  generatePrivacyReport(): Promise<{
    dataProcessed: number;
    localProcessingRate: number;
    consentCompliance: number;
    encryptionCoverage: number;
  }>;
  
  auditDataAccess(timeframe: { start: Date; end: Date }): Promise<Array<{
    timestamp: Date;
    dataType: string;
    accessType: 'read' | 'write' | 'delete';
    user: string;
    authorized: boolean;
  }>>;
}