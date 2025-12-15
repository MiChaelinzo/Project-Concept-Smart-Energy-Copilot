import { 
  Appointment, 
  Event, 
  ScheduleIntent, 
  TimeRange, 
  Conflict, 
  CalendarPreferences, 
  CalendarService,
  Reminder 
} from '../types';

/**
 * Calendar Manager Interface
 * 
 * Intelligent scheduling system with natural language processing for appointment management,
 * conflict detection, and integration with external calendar services.
 */
export interface CalendarManager {
  /**
   * Parse natural language scheduling requests into structured intents
   * @param naturalLanguage User's scheduling request in natural language
   * @returns Parsed schedule intent with extracted information
   */
  parseScheduleRequest(naturalLanguage: string): Promise<ScheduleIntent>;

  /**
   * Create a new appointment in the calendar
   * @param appointment Appointment details to create
   * @returns Promise resolving to true if successful, false otherwise
   */
  createAppointment(appointment: Appointment): Promise<boolean>;

  /**
   * Get upcoming events within specified timeframe
   * @param timeframe Time range to query for events
   * @returns Array of events in the specified timeframe
   */
  getUpcomingEvents(timeframe: TimeRange): Promise<Event[]>;

  /**
   * Check for scheduling conflicts with a new event
   * @param newEvent Event to check for conflicts
   * @returns Array of conflicts found
   */
  checkConflicts(newEvent: Event): Promise<Conflict[]>;

  /**
   * Synchronize with external calendar services
   * @returns Promise resolving when synchronization completes
   */
  syncExternalCalendars(): Promise<void>;

  /**
   * Initialize calendar manager with user preferences
   * @param config Calendar configuration and preferences
   */
  initialize(config: CalendarManagerConfig): Promise<void>;

  /**
   * Update an existing appointment
   * @param appointmentId ID of appointment to update
   * @param updates Partial appointment data with changes
   * @returns Promise resolving to true if successful
   */
  updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<boolean>;

  /**
   * Delete an appointment from the calendar
   * @param appointmentId ID of appointment to delete
   * @returns Promise resolving to true if successful
   */
  deleteAppointment(appointmentId: string): Promise<boolean>;

  /**
   * Search for appointments matching criteria
   * @param query Search query (text, date range, attendees, etc.)
   * @returns Array of matching appointments
   */
  searchAppointments(query: CalendarSearchQuery): Promise<Appointment[]>;

  /**
   * Get calendar availability for scheduling
   * @param timeRange Time range to check availability
   * @param duration Required duration in minutes
   * @returns Array of available time slots
   */
  getAvailability(timeRange: TimeRange, duration: number): Promise<TimeSlot[]>;

  /**
   * Set up proactive reminders for appointments
   * @param appointmentId ID of appointment
   * @param reminders Array of reminder configurations
   */
  setupReminders(appointmentId: string, reminders: Reminder[]): Promise<void>;

  /**
   * Process calendar-related voice commands and queries
   * @param query Natural language calendar query
   * @returns Calendar information response
   */
  processCalendarQuery(query: string): Promise<CalendarQueryResponse>;

  /**
   * Suggest optimal meeting times based on attendee availability
   * @param attendees List of attendee email addresses
   * @param duration Meeting duration in minutes
   * @param preferences Scheduling preferences
   * @returns Array of suggested time slots
   */
  suggestMeetingTimes(
    attendees: string[], 
    duration: number, 
    preferences: SchedulingPreferences
  ): Promise<TimeSlot[]>;

  /**
   * Handle recurring appointment creation and management
   * @param baseAppointment Base appointment template
   * @param recurrenceRule Rules for recurrence
   * @returns Array of created recurring appointments
   */
  createRecurringAppointment(
    baseAppointment: Appointment, 
    recurrenceRule: RecurrenceRule
  ): Promise<Appointment[]>;

  /**
   * Get calendar statistics and insights
   * @param timeRange Time range for analysis
   * @returns Calendar usage statistics and insights
   */
  getCalendarInsights(timeRange: TimeRange): Promise<CalendarInsights>;

  /**
   * Export calendar data in various formats
   * @param format Export format (ics, json, csv)
   * @param timeRange Optional time range to export
   * @returns Exported calendar data
   */
  exportCalendar(format: 'ics' | 'json' | 'csv', timeRange?: TimeRange): Promise<string>;

  /**
   * Import calendar data from external sources
   * @param data Calendar data to import
   * @param format Format of the imported data
   * @returns Number of successfully imported events
   */
  importCalendar(data: string, format: 'ics' | 'json' | 'csv'): Promise<number>;

  /**
   * Shutdown calendar manager and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration interface for Calendar Manager
 */
export interface CalendarManagerConfig {
  // User preferences
  userId: string;
  timeZone: string;
  workingHours: WorkingHours;
  preferences: CalendarPreferences;

  // External service integration
  calendarServices: CalendarService[];
  enableAutoSync: boolean;
  syncIntervalMinutes: number;

  // Natural language processing
  enableNLPParsing: boolean;
  supportedLanguages: string[];
  confidenceThreshold: number;

  // Notification settings
  defaultReminderMinutes: number;
  enableProactiveReminders: boolean;
  reminderMethods: ('popup' | 'audio' | 'visual' | 'email')[];

  // Conflict resolution
  enableConflictDetection: boolean;
  autoResolveMinorConflicts: boolean;
  bufferTimeMinutes: number;

  // Privacy and security
  encryptCalendarData: boolean;
  shareAvailability: boolean;
  dataRetentionDays: number;
}

/**
 * Working hours configuration
 */
export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Daily schedule configuration
 */
export interface DaySchedule {
  isWorkingDay: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  breakTimes: BreakTime[];
}

/**
 * Break time configuration
 */
export interface BreakTime {
  name: string;
  startTime: string;
  endTime: string;
  isFlexible: boolean;
}

/**
 * Calendar search query parameters
 */
export interface CalendarSearchQuery {
  text?: string;
  dateRange?: TimeRange;
  attendees?: string[];
  location?: string;
  category?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Available time slot for scheduling
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  confidence: number; // 0-1 score for availability confidence
  conflicts: Conflict[];
  attendeeAvailability?: AttendeeAvailability[];
}

/**
 * Attendee availability information
 */
export interface AttendeeAvailability {
  email: string;
  name: string;
  isAvailable: boolean;
  conflictingEvents: Event[];
  preferredTimes: TimeRange[];
}

/**
 * Response to calendar-related queries
 */
export interface CalendarQueryResponse {
  answer: string;
  events?: Event[];
  appointments?: Appointment[];
  availability?: TimeSlot[];
  suggestions: string[];
  followUpQuestions: string[];
  confidence: number;
}

/**
 * Scheduling preferences for meeting suggestions
 */
export interface SchedulingPreferences {
  preferredTimeRanges: TimeRange[];
  avoidTimeRanges: TimeRange[];
  bufferTimeMinutes: number;
  maxDurationMinutes: number;
  preferredDays: string[]; // ['monday', 'tuesday', etc.]
  location?: string;
  meetingType: 'in-person' | 'virtual' | 'hybrid' | 'phone';
}

/**
 * Recurrence rule for repeating appointments
 */
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every N frequency units
  daysOfWeek?: string[]; // for weekly recurrence
  dayOfMonth?: number; // for monthly recurrence
  monthOfYear?: number; // for yearly recurrence
  endDate?: Date;
  occurrenceCount?: number;
  exceptions?: Date[]; // dates to skip
}

/**
 * Calendar usage insights and statistics
 */
export interface CalendarInsights {
  timeRange: TimeRange;
  totalAppointments: number;
  totalMeetingHours: number;
  averageMeetingDuration: number;
  busiestDays: string[];
  busiestHours: number[];
  meetingTypes: Record<string, number>;
  attendeeFrequency: Record<string, number>;
  conflictRate: number;
  utilizationRate: number; // percentage of working hours scheduled
  recommendations: CalendarRecommendation[];
}

/**
 * Calendar optimization recommendations
 */
export interface CalendarRecommendation {
  type: 'time_management' | 'conflict_reduction' | 'efficiency' | 'work_life_balance';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: string;
}