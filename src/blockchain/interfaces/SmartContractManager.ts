/**
 * Smart Contract Management Interface
 * Handles contract deployment, security auditing, gas optimization, and event management
 */

export interface SmartContractManager {
  /**
   * Deploy a smart contract with security verification
   */
  deployContract(contractCode: string, constructorArgs: any[], options: DeploymentOptions): Promise<DeployedContract>;

  /**
   * Verify contract code through security audits
   */
  auditContract(contractAddress: string): Promise<SecurityAuditResult>;

  /**
   * Estimate gas costs for contract operations
   */
  estimateGasCost(contractAddress: string, functionName: string, parameters: any[]): Promise<GasEstimate>;

  /**
   * Optimize gas usage for contract calls
   */
  optimizeGasUsage(contractAddress: string, functionName: string, parameters: any[]): Promise<OptimizedTransaction>;

  /**
   * Call contract function with gas optimization
   */
  callContractFunction(contractAddress: string, functionName: string, parameters: any[], options?: CallOptions): Promise<TransactionResult>;

  /**
   * Listen to contract events and update local state
   */
  subscribeToEvents(contractAddress: string, eventName: string, callback: EventCallback): Promise<EventSubscription>;

  /**
   * Unsubscribe from contract events
   */
  unsubscribeFromEvents(subscriptionId: string): Promise<boolean>;

  /**
   * Deploy proxy contract for upgradeable patterns
   */
  deployProxyContract(implementationAddress: string, initData: string, options: ProxyOptions): Promise<ProxyContract>;

  /**
   * Upgrade contract through proxy pattern
   */
  upgradeContract(proxyAddress: string, newImplementationAddress: string): Promise<UpgradeResult>;

  /**
   * Get contract security score and vulnerability assessment
   */
  getSecurityAssessment(contractAddress: string): Promise<SecurityAssessment>;

  /**
   * Validate contract against standards (ERC-20, ERC-721, ERC-1155)
   */
  validateContractStandard(contractAddress: string, standard: ContractStandard): Promise<StandardValidationResult>;

  /**
   * Get contract interaction history
   */
  getContractHistory(contractAddress: string, options?: HistoryOptions): Promise<ContractInteraction[]>;

  /**
   * Monitor contract for suspicious activity
   */
  monitorContract(contractAddress: string, alertThresholds: AlertThresholds): Promise<MonitoringSession>;

  /**
   * Generate contract documentation
   */
  generateContractDocs(contractAddress: string): Promise<ContractDocumentation>;
}

export interface DeploymentOptions {
  gasLimit?: number;
  gasPrice?: string;
  value?: string;
  network: string;
  verifySource?: boolean;
  optimizationRuns?: number;
}

export interface DeployedContract {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: number;
  deploymentCost: string;
  verified: boolean;
  securityScore: number;
  abi: any[];
  bytecode: string;
  sourceCode?: string;
}

export interface SecurityAuditResult {
  contractAddress: string;
  auditDate: Date;
  overallScore: number; // 0-100
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  gasOptimizations: GasOptimization[];
  complianceChecks: ComplianceCheck[];
  auditProvider: string;
  reportHash: string;
}

export interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  location: string;
  recommendation: string;
  cweId?: string;
  swcId?: string;
}

export interface GasOptimization {
  function: string;
  currentGas: number;
  optimizedGas: number;
  savings: number;
  technique: string;
  description: string;
}

export interface ComplianceCheck {
  standard: string;
  compliant: boolean;
  issues: string[];
  recommendations: string[];
}

export interface GasEstimate {
  estimatedGas: number;
  gasPrice: string;
  estimatedCost: string;
  confidence: number; // 0-100
  factors: GasFactor[];
}

export interface GasFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface OptimizedTransaction {
  originalGas: number;
  optimizedGas: number;
  savings: number;
  optimizations: string[];
  transactionData: string;
  recommendedGasPrice: string;
}

export interface CallOptions {
  gasLimit?: number;
  gasPrice?: string;
  value?: string;
  from?: string;
  nonce?: number;
}

export interface TransactionResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: number;
  gasPrice: string;
  status: 'success' | 'failed' | 'pending';
  logs: EventLog[];
  returnValue?: any;
  error?: string;
}

export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  decoded?: DecodedEvent;
}

export interface DecodedEvent {
  name: string;
  signature: string;
  inputs: EventInput[];
}

export interface EventInput {
  name: string;
  type: string;
  value: any;
  indexed: boolean;
}

export interface EventCallback {
  (event: EventLog): void;
}

export interface EventSubscription {
  id: string;
  contractAddress: string;
  eventName: string;
  filter?: EventFilter;
  active: boolean;
  createdAt: Date;
}

export interface EventFilter {
  fromBlock?: number;
  toBlock?: number;
  topics?: string[];
}

export interface ProxyOptions {
  admin?: string;
  upgradeDelay?: number;
  initializeFunction?: string;
  proxyType: 'transparent' | 'uups' | 'beacon';
}

export interface ProxyContract {
  proxyAddress: string;
  implementationAddress: string;
  adminAddress: string;
  proxyType: string;
  transactionHash: string;
  blockNumber: number;
  upgradeable: boolean;
}

export interface UpgradeResult {
  proxyAddress: string;
  oldImplementation: string;
  newImplementation: string;
  transactionHash: string;
  blockNumber: number;
  success: boolean;
  gasUsed: number;
}

export interface SecurityAssessment {
  contractAddress: string;
  lastAssessment: Date;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: Vulnerability[];
  securityFeatures: SecurityFeature[];
  recommendations: string[];
  nextAssessmentDue: Date;
}

export interface SecurityFeature {
  feature: string;
  implemented: boolean;
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export type ContractStandard = 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-165' | 'ERC-2981';

export interface StandardValidationResult {
  standard: ContractStandard;
  compliant: boolean;
  implementedFunctions: string[];
  missingFunctions: string[];
  additionalFunctions: string[];
  issues: StandardIssue[];
  score: number; // 0-100
}

export interface StandardIssue {
  severity: 'error' | 'warning' | 'info';
  function: string;
  issue: string;
  recommendation: string;
}

export interface HistoryOptions {
  fromBlock?: number;
  toBlock?: number;
  limit?: number;
  offset?: number;
  functionName?: string;
}

export interface ContractInteraction {
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
  from: string;
  to: string;
  functionName: string;
  parameters: any[];
  gasUsed: number;
  gasPrice: string;
  value: string;
  status: 'success' | 'failed';
  logs: EventLog[];
}

export interface AlertThresholds {
  gasUsageSpike?: number; // Percentage increase
  unusualActivity?: number; // Transactions per hour
  largeValueTransfers?: string; // Wei amount
  failedTransactions?: number; // Count per hour
  newInteractors?: number; // New addresses per day
}

export interface MonitoringSession {
  id: string;
  contractAddress: string;
  startTime: Date;
  thresholds: AlertThresholds;
  alerts: ContractAlert[];
  active: boolean;
}

export interface ContractAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  transactionHash?: string;
  blockNumber?: number;
  resolved: boolean;
}

export interface ContractDocumentation {
  contractAddress: string;
  name: string;
  description: string;
  version: string;
  functions: FunctionDoc[];
  events: EventDoc[];
  stateVariables: StateVariableDoc[];
  inheritance: string[];
  dependencies: string[];
  securityNotes: string[];
  gasUsageNotes: string[];
  upgradeability: UpgradeabilityDoc;
}

export interface FunctionDoc {
  name: string;
  signature: string;
  visibility: string;
  stateMutability: string;
  parameters: ParameterDoc[];
  returns: ParameterDoc[];
  description: string;
  gasEstimate: number;
  securityNotes: string[];
}

export interface EventDoc {
  name: string;
  signature: string;
  parameters: ParameterDoc[];
  description: string;
}

export interface ParameterDoc {
  name: string;
  type: string;
  description: string;
  indexed?: boolean;
}

export interface StateVariableDoc {
  name: string;
  type: string;
  visibility: string;
  description: string;
  constant: boolean;
}

export interface UpgradeabilityDoc {
  upgradeable: boolean;
  proxyType?: string;
  upgradeProcess: string;
  risks: string[];
  recommendations: string[];
}