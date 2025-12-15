import { 
  CalendarManager, 
  CalendarManagerConfig, 
  CalendarSearchQuery, 
  TimeSlot, 
  CalendarQueryResponse, 
  SchedulingPreferences, 
  RecurrenceRule, 
  CalendarInsights 
} from '../interfaces/CalendarManager';
import { 
  Appointment, 
  Event, 
  ScheduleIntent, 
  TimeRange, 
  Conflict, 
  Reminder 
} from '../types';

/**
 * Calendar Manager Implementation
 * 
 * Intelligent scheduling system with natural language processing for appointment management.
 * Provides appointment creation, retrieval, conflict detection, and external calendar integration.
 */
export class CalendarManagerImpl implements CalendarManager {
  private config?: CalendarManagerConfig;
  private initialized = false;
  private appointments: Map<string, Appointment> = new Map();
  private events: Map<string, Event> = new Map();
  private reminders: Map<string, NodeJS.Timeout> = new Map();

  async parseScheduleRequest(naturalLanguage: string): Promise<ScheduleIntent> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const input = naturalLanguage.toLowerCase().trim();
    
    // Simple natural language parsing patterns
    const createPatterns = [
      /schedule.*?(?:meeting|appointment|call)\s+(.+)/i,
      /book.*?(?:meeting|appointment)\s+(.+)/i,
      /create.*?(?:meeting|appointment)\s+(.+)/i,
      /(?:meeting|appointment)\s+(.+)/i
    ];

    const queryPatterns = [
      /what.*?(?:meetings|appointments|schedule).*?(?:today|tomorrow|this week)/i,
      /show.*?(?:meetings|appointments|schedule)/i,
      /when.*?(?:meeting|appointment|free|available)/i
    ];

    const deletePatterns = [
      /cancel.*?(?:meeting|appointment)/i,
      /delete.*?(?:meeting|appointment)/i,
      /remove.*?(?:meeting|appointment)/i
    ];

    // Check for create patterns
    for (const pattern of createPatterns) {
      const match = input.match(pattern);
      if (match) {
        const timeInfo = this.parseTimeFromText(match[1] || input);
        // Ensure endTime is after startTime
        const startTime = timeInfo.startTime;
        const endTime = timeInfo.endTime > timeInfo.startTime ? timeInfo.endTime : new Date(timeInfo.startTime.getTime() + 60 * 60 * 1000);
        
        return {
          action: 'create',
          appointment: {
            title: this.extractTitle(input),
            startTime,
            endTime,
            description: input,
            reminders: [{ type: 'popup', minutesBefore: this.config?.defaultReminderMinutes || 15 }],
            priority: 'medium'
          },
          confidence: 0.8
        };
      }
    }

    // Check for query patterns
    for (const pattern of queryPatterns) {
      if (pattern.test(input)) {
        const timeframe = this.parseTimeframeFromText(input);
        return {
          action: 'query',
          timeframe,
          query: input,
          confidence: 0.7
        };
      }
    }

    // Check for delete patterns
    for (const pattern of deletePatterns) {
      if (pattern.test(input)) {
        return {
          action: 'delete',
          query: input,
          confidence: 0.6
        };
      }
    }

    // Default to query if no specific pattern matches
    return {
      action: 'query',
      query: input,
      confidence: 0.3
    };
  }

  async createAppointment(appointment: Appointment): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    try {
      // Generate ID if not provided
      if (!appointment.id) {
        appointment.id = this.generateId();
      }

      // Validate appointment data
      if (!appointment.title || !appointment.startTime || !appointment.endTime) {
        return false;
      }

      // Check for conflicts
      const conflicts = await this.checkConflicts({
        id: appointment.id,
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        type: 'appointment',
        status: 'confirmed'
      });

      // Store appointment
      this.appointments.set(appointment.id, appointment);

      // Create corresponding event
      const event: Event = {
        id: appointment.id,
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        type: 'appointment',
        status: 'confirmed'
      };
      this.events.set(event.id, event);

      // Setup reminders
      if (appointment.reminders && appointment.reminders.length > 0) {
        await this.setupReminders(appointment.id, appointment.reminders);
      }

      return true;
    } catch (error) {
      console.error('Error creating appointment:', error);
      return false;
    }
  }

  async getUpcomingEvents(timeframe: TimeRange): Promise<Event[]> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const upcomingEvents: Event[] = [];
    
    for (const event of this.events.values()) {
      // Check if event starts within the timeframe (matching test expectation)
      if (event.startTime >= timeframe.start && event.startTime < timeframe.end) {
        upcomingEvents.push(event);
      }
    }

    // Sort by start time
    upcomingEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    return upcomingEvents;
  }

  async checkConflicts(newEvent: Event): Promise<Conflict[]> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const conflicts: Conflict[] = [];
    const bufferTime = this.config?.bufferTimeMinutes || 0;
    
    for (const existingEvent of this.events.values()) {
      if (existingEvent.id === newEvent.id) continue;
      
      const newStart = newEvent.startTime.getTime();
      const newEnd = newEvent.endTime.getTime();
      const existingStart = existingEvent.startTime.getTime();
      const existingEnd = existingEvent.endTime.getTime();
      
      // Check for overlaps: events overlap if new starts before existing ends AND new ends after existing starts
      // Also handle edge case where times are identical (>= and <= for inclusive overlap detection)
      if (newStart < existingEnd && newEnd > existingStart) {
        const conflictType = this.determineConflictType(newEvent, existingEvent, bufferTime);
        const severity = this.determineConflictSeverity(newEvent, existingEvent);
        
        conflicts.push({
          existingEvent,
          conflictType,
          severity,
          suggestions: this.generateConflictSuggestions(newEvent, existingEvent)
        });
      }
      // Special case: check for identical time slots (both start and end times are the same)
      else if (newStart === existingStart && newEnd === existingEnd) {
        conflicts.push({
          existingEvent,
          conflictType: 'overlap',
          severity: 'critical',
          suggestions: this.generateConflictSuggestions(newEvent, existingEvent)
        });
      }
    }
    
    return conflicts;
  }

  async syncExternalCalendars(): Promise<void> {
    if (!this.initialized || !this.config?.calendarServices) {
      return;
    }

    // Simulate external calendar sync
    // In a real implementation, this would integrate with Google Calendar, Outlook, etc.
    for (const service of this.config.calendarServices) {
      if (service.enabled) {
        console.log(`Syncing with ${service.type} calendar service`);
        // Simulate sync delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async initialize(config: CalendarManagerConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    
    // Initialize storage
    this.appointments.clear();
    this.events.clear();
    this.reminders.clear();
    
    // Sync external calendars if enabled
    if (config.enableAutoSync) {
      await this.syncExternalCalendars();
    }
  }

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      return false;
    }

    // Update appointment
    const updatedAppointment = { ...appointment, ...updates };
    this.appointments.set(appointmentId, updatedAppointment);

    // Update corresponding event
    const event = this.events.get(appointmentId);
    if (event) {
      const updatedEvent: Event = {
        ...event,
        title: updatedAppointment.title,
        startTime: updatedAppointment.startTime,
        endTime: updatedAppointment.endTime
      };
      this.events.set(appointmentId, updatedEvent);
    }

    return true;
  }

  async deleteAppointment(appointmentId: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const deleted = this.appointments.delete(appointmentId);
    this.events.delete(appointmentId);
    
    // Clear any active reminders
    const reminder = this.reminders.get(appointmentId);
    if (reminder) {
      clearTimeout(reminder);
      this.reminders.delete(appointmentId);
    }

    return deleted;
  }

  async searchAppointments(query: CalendarSearchQuery): Promise<Appointment[]> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const results: Appointment[] = [];
    
    for (const appointment of this.appointments.values()) {
      let matches = true;
      
      if (query.text) {
        const searchText = query.text.toLowerCase();
        matches = matches && (
          appointment.title.toLowerCase().includes(searchText) ||
          (appointment.description?.toLowerCase().includes(searchText) ?? false)
        );
      }
      
      if (query.dateRange) {
        matches = matches && (
          appointment.startTime >= query.dateRange.start &&
          appointment.startTime <= query.dateRange.end
        );
      }
      
      if (query.attendees && query.attendees.length > 0) {
        matches = matches && (appointment.attendees?.some(attendee => 
          query.attendees!.includes(attendee)
        ) ?? false);
      }
      
      if (query.location) {
        matches = matches && (appointment.location?.toLowerCase().includes(query.location.toLowerCase()) ?? false);
      }
      
      if (query.priority) {
        matches = matches && appointment.priority === query.priority;
      }
      
      if (matches) {
        results.push(appointment);
      }
    }
    
    return results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getAvailability(timeRange: TimeRange, duration: number): Promise<TimeSlot[]> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const availableSlots: TimeSlot[] = [];
    const workingHours = this.config?.workingHours;
    const bufferTime = this.config?.bufferTimeMinutes || 0;
    
    // Get all events in the timeframe
    const events = await this.getUpcomingEvents(timeRange);
    
    // Generate potential time slots
    const slotDuration = duration + bufferTime;
    let currentTime = new Date(timeRange.start);
    
    while (currentTime.getTime() + slotDuration * 60000 <= timeRange.end.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      // Check if this slot conflicts with any existing events
      const conflicts = events.filter(event => 
        currentTime < event.endTime && slotEnd > event.startTime
      );
      
      if (conflicts.length === 0) {
        availableSlots.push({
          startTime: new Date(currentTime),
          endTime: slotEnd,
          duration,
          confidence: 1.0,
          conflicts: []
        });
      }
      
      // Move to next potential slot (15-minute increments)
      currentTime = new Date(currentTime.getTime() + 15 * 60000);
    }
    
    return availableSlots;
  }

  async setupReminders(appointmentId: string, reminders: Reminder[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      return;
    }

    // Clear existing reminders for this appointment
    const existingReminder = this.reminders.get(appointmentId);
    if (existingReminder) {
      clearTimeout(existingReminder);
    }

    // Set up new reminders
    for (const reminder of reminders) {
      const reminderTime = new Date(appointment.startTime.getTime() - reminder.minutesBefore * 60000);
      const now = new Date();
      
      if (reminderTime > now) {
        const timeout = setTimeout(() => {
          this.triggerReminder(appointment, reminder);
        }, reminderTime.getTime() - now.getTime());
        
        this.reminders.set(`${appointmentId}-${reminder.minutesBefore}`, timeout);
      }
    }
  }

  async processCalendarQuery(query: string): Promise<CalendarQueryResponse> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const intent = await this.parseScheduleRequest(query);
    
    let events: Event[] = [];
    let appointments: Appointment[] = [];
    let availability: TimeSlot[] = [];
    let answer = '';
    
    switch (intent.action) {
      case 'query':
        if (intent.timeframe) {
          events = await this.getUpcomingEvents(intent.timeframe);
          answer = `Found ${events.length} events in the specified timeframe.`;
        } else {
          // Default to today's events
          const today = new Date();
          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          events = await this.getUpcomingEvents({ start: today, end: tomorrow });
          answer = `You have ${events.length} events today.`;
        }
        break;
        
      case 'create':
        if (intent.appointment) {
          const success = await this.createAppointment(intent.appointment as Appointment);
          answer = success ? 'Appointment created successfully.' : 'Failed to create appointment.';
        }
        break;
        
      default:
        answer = 'I can help you with calendar queries, creating appointments, or checking your schedule.';
    }
    
    return {
      answer,
      events,
      appointments,
      availability,
      suggestions: this.generateQuerySuggestions(query),
      followUpQuestions: this.generateFollowUpQuestions(intent),
      confidence: intent.confidence
    };
  }

  async suggestMeetingTimes(
    attendees: string[], 
    duration: number, 
    preferences: SchedulingPreferences
  ): Promise<TimeSlot[]> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    // For this implementation, we'll suggest times based on preferences
    const suggestions: TimeSlot[] = [];
    
    for (const timeRange of preferences.preferredTimeRanges) {
      const availability = await this.getAvailability(timeRange, duration);
      suggestions.push(...availability.slice(0, 3)); // Top 3 suggestions per range
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  async createRecurringAppointment(
    baseAppointment: Appointment, 
    recurrenceRule: RecurrenceRule
  ): Promise<Appointment[]> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const recurringAppointments: Appointment[] = [];
    let currentDate = new Date(baseAppointment.startTime);
    const endDate = recurrenceRule.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default
    
    let count = 0;
    const maxCount = recurrenceRule.occurrenceCount || 100;
    
    while (currentDate <= endDate && count < maxCount) {
      const appointment: Appointment = {
        ...baseAppointment,
        id: `${baseAppointment.id}-${count}`,
        startTime: new Date(currentDate),
        endTime: new Date(currentDate.getTime() + (baseAppointment.endTime.getTime() - baseAppointment.startTime.getTime())),
        recurrence: recurrenceRule
      };
      
      await this.createAppointment(appointment);
      recurringAppointments.push(appointment);
      
      // Calculate next occurrence
      switch (recurrenceRule.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + recurrenceRule.interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * recurrenceRule.interval));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + recurrenceRule.interval);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + recurrenceRule.interval);
          break;
      }
      
      count++;
    }
    
    return recurringAppointments;
  }

  async getCalendarInsights(timeRange: TimeRange): Promise<CalendarInsights> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    const events = await this.getUpcomingEvents(timeRange);
    const appointments = Array.from(this.appointments.values()).filter(apt => 
      apt.startTime >= timeRange.start && apt.startTime <= timeRange.end
    );
    
    const totalMeetingHours = appointments.reduce((total, apt) => {
      return total + (apt.endTime.getTime() - apt.startTime.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return {
      timeRange,
      totalAppointments: appointments.length,
      totalMeetingHours,
      averageMeetingDuration: appointments.length > 0 ? totalMeetingHours / appointments.length * 60 : 0,
      busiestDays: this.calculateBusiestDays(appointments),
      busiestHours: this.calculateBusiestHours(appointments),
      meetingTypes: this.calculateMeetingTypes(events),
      attendeeFrequency: this.calculateAttendeeFrequency(appointments),
      conflictRate: 0, // Would be calculated based on actual conflicts
      utilizationRate: this.calculateUtilizationRate(appointments, timeRange),
      recommendations: this.generateRecommendations(appointments)
    };
  }

  async exportCalendar(format: 'ics' | 'json' | 'csv', timeRange?: TimeRange): Promise<string> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    let appointments = Array.from(this.appointments.values());
    
    if (timeRange) {
      appointments = appointments.filter(apt => 
        apt.startTime >= timeRange.start && apt.startTime <= timeRange.end
      );
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(appointments, null, 2);
      case 'csv':
        return this.exportToCsv(appointments);
      case 'ics':
        return this.exportToIcs(appointments);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async importCalendar(data: string, format: 'ics' | 'json' | 'csv'): Promise<number> {
    if (!this.initialized) {
      throw new Error('Calendar Manager not initialized');
    }

    let importedCount = 0;
    
    try {
      switch (format) {
        case 'json':
          const appointments = JSON.parse(data) as Appointment[];
          for (const appointment of appointments) {
            if (await this.createAppointment(appointment)) {
              importedCount++;
            }
          }
          break;
        case 'csv':
          importedCount = await this.importFromCsv(data);
          break;
        case 'ics':
          importedCount = await this.importFromIcs(data);
          break;
      }
    } catch (error) {
      console.error('Error importing calendar data:', error);
    }
    
    return importedCount;
  }

  async shutdown(): Promise<void> {
    // Clear all reminders
    for (const timeout of this.reminders.values()) {
      clearTimeout(timeout);
    }
    
    this.reminders.clear();
    this.appointments.clear();
    this.events.clear();
    this.initialized = false;
  }

  // Helper methods
  private generateId(): string {
    return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseTimeFromText(text: string): { startTime: Date; endTime: Date } {
    const now = new Date();
    let startTime = new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour from now
    let endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

    // Check for "tomorrow" first
    if (text.toLowerCase().includes('tomorrow')) {
      // Look for specific time
      const timeMatch = text.match(/(\d{1,2})\s*(am|pm)/i);
      
      let hour = 14; // Default to 2 PM
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        const isPM = timeMatch[2]?.toLowerCase() === 'pm';
        
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
      }
      
      // Create a new date for tomorrow with the specified hour
      // Always use tomorrow's date (current date + 1)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      startTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hour, 0, 0, 0);
      
      // Calculate endTime as 1 hour after startTime
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      
      return { startTime, endTime };
    }

    // Simple time parsing patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(today|next week)/i,
      /(\d{1,2})\/(\d{1,2})/
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Basic time parsing - in a real implementation, use a proper date parsing library
        if (match[3] || match[2]) { // Has am/pm
          let hour = parseInt(match[1]);
          const minute = parseInt(match[2] || '0');
          const isPM = (match[3] || match[2])?.toLowerCase() === 'pm';
          
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          
          startTime = new Date(now);
          startTime.setHours(hour, minute, 0, 0);
          
          // If the time is in the past, assume tomorrow
          if (startTime <= now) {
            startTime.setDate(startTime.getDate() + 1);
          }
          
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        }
        break;
      }
    }

    // Final safety check: ensure endTime is always after startTime
    if (endTime <= startTime) {
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }

    return { startTime, endTime };
  }

  private parseTimeframeFromText(text: string): TimeRange {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (text.includes('tomorrow')) {
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
    } else if (text.includes('this week')) {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    } else if (text.includes('next week')) {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 7);
      end.setDate(start.getDate() + 6);
    }

    return { start, end };
  }

  private extractTitle(input: string): string {
    // Extract meaningful title from natural language input
    const words = input.split(' ');
    const stopWords = ['schedule', 'book', 'create', 'meeting', 'appointment', 'with', 'at', 'on', 'for'];
    const titleWords = words.filter(word => !stopWords.includes(word.toLowerCase()));
    
    return titleWords.slice(0, 5).join(' ') || 'New Appointment';
  }

  private determineConflictType(newEvent: Event, existingEvent: Event, bufferTime: number): 'overlap' | 'adjacent' | 'resource' {
    const newStart = newEvent.startTime.getTime();
    const newEnd = newEvent.endTime.getTime();
    const existingStart = existingEvent.startTime.getTime();
    const existingEnd = existingEvent.endTime.getTime();
    
    // Check for direct overlap (including identical times)
    if ((newStart < existingEnd && newEnd > existingStart) || 
        (newStart === existingStart && newEnd === existingEnd)) {
      return 'overlap';
    }
    
    // Check for adjacent with buffer time
    const bufferMs = bufferTime * 60 * 1000;
    if (Math.abs(newStart - existingEnd) <= bufferMs || Math.abs(newEnd - existingStart) <= bufferMs) {
      return 'adjacent';
    }
    
    return 'resource';
  }

  private determineConflictSeverity(newEvent: Event, existingEvent: Event): 'minor' | 'major' | 'critical' {
    const overlapDuration = Math.min(newEvent.endTime.getTime(), existingEvent.endTime.getTime()) - 
                           Math.max(newEvent.startTime.getTime(), existingEvent.startTime.getTime());
    
    if (overlapDuration <= 15 * 60 * 1000) return 'minor'; // 15 minutes or less
    if (overlapDuration <= 60 * 60 * 1000) return 'major'; // 1 hour or less
    return 'critical';
  }

  private generateConflictSuggestions(newEvent: Event, existingEvent: Event): string[] {
    const suggestions = [];
    
    // Suggest moving the new event before or after the existing one
    const beforeTime = new Date(existingEvent.startTime.getTime() - (newEvent.endTime.getTime() - newEvent.startTime.getTime()));
    const afterTime = new Date(existingEvent.endTime.getTime());
    
    suggestions.push(`Move to ${beforeTime.toLocaleTimeString()}`);
    suggestions.push(`Move to ${afterTime.toLocaleTimeString()}`);
    suggestions.push('Shorten the duration');
    suggestions.push('Schedule for a different day');
    
    return suggestions;
  }

  private triggerReminder(appointment: Appointment, reminder: Reminder): void {
    const message = reminder.message || `Reminder: ${appointment.title} starts in ${reminder.minutesBefore} minutes`;
    
    switch (reminder.type) {
      case 'popup':
        console.log(`POPUP REMINDER: ${message}`);
        break;
      case 'audio':
        console.log(`AUDIO REMINDER: ${message}`);
        break;
      case 'visual':
        console.log(`VISUAL REMINDER: ${message}`);
        break;
      case 'email':
        console.log(`EMAIL REMINDER: ${message}`);
        break;
    }
  }

  private generateQuerySuggestions(query: string): string[] {
    return [
      'Show me today\'s schedule',
      'What meetings do I have tomorrow?',
      'Schedule a meeting for next week',
      'Check my availability this afternoon',
      'Cancel my 3 PM meeting'
    ];
  }

  private generateFollowUpQuestions(intent: ScheduleIntent): string[] {
    const questions = [];
    
    switch (intent.action) {
      case 'create':
        questions.push('Would you like to add attendees?');
        questions.push('Should I set up reminders?');
        break;
      case 'query':
        questions.push('Would you like to see more details?');
        questions.push('Do you want to modify any appointments?');
        break;
    }
    
    return questions;
  }

  private calculateBusiestDays(appointments: Appointment[]): string[] {
    const dayCount: Record<string, number> = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    appointments.forEach(apt => {
      const dayName = days[apt.startTime.getDay()];
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });
    
    return Object.entries(dayCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);
  }

  private calculateBusiestHours(appointments: Appointment[]): number[] {
    const hourCount: Record<number, number> = {};
    
    appointments.forEach(apt => {
      const hour = apt.startTime.getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });
    
    return Object.entries(hourCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private calculateMeetingTypes(events: Event[]): Record<string, number> {
    const typeCount: Record<string, number> = {};
    
    events.forEach(event => {
      typeCount[event.type] = (typeCount[event.type] || 0) + 1;
    });
    
    return typeCount;
  }

  private calculateAttendeeFrequency(appointments: Appointment[]): Record<string, number> {
    const attendeeCount: Record<string, number> = {};
    
    appointments.forEach(apt => {
      apt.attendees?.forEach(attendee => {
        attendeeCount[attendee] = (attendeeCount[attendee] || 0) + 1;
      });
    });
    
    return attendeeCount;
  }

  private calculateUtilizationRate(appointments: Appointment[], timeRange: TimeRange): number {
    const totalTime = timeRange.end.getTime() - timeRange.start.getTime();
    const scheduledTime = appointments.reduce((total, apt) => {
      return total + (apt.endTime.getTime() - apt.startTime.getTime());
    }, 0);
    
    return totalTime > 0 ? (scheduledTime / totalTime) * 100 : 0;
  }

  private generateRecommendations(appointments: Appointment[]): any[] {
    const recommendations = [];
    
    if (appointments.length > 10) {
      recommendations.push({
        type: 'time_management',
        priority: 'medium',
        title: 'Consider reducing meeting load',
        description: 'You have a high number of meetings scheduled',
        actionItems: ['Review meeting necessity', 'Delegate where possible'],
        estimatedImpact: 'Could save 2-3 hours per week'
      });
    }
    
    return recommendations;
  }

  private exportToCsv(appointments: Appointment[]): string {
    const headers = ['Title', 'Start Time', 'End Time', 'Location', 'Description'];
    const rows = appointments.map(apt => [
      apt.title,
      apt.startTime.toISOString(),
      apt.endTime.toISOString(),
      apt.location || '',
      apt.description || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToIcs(appointments: Appointment[]): string {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Calendar Manager//EN\n';
    
    appointments.forEach(apt => {
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${apt.id}\n`;
      ics += `DTSTART:${apt.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      ics += `DTEND:${apt.endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      ics += `SUMMARY:${apt.title}\n`;
      if (apt.description) ics += `DESCRIPTION:${apt.description}\n`;
      if (apt.location) ics += `LOCATION:${apt.location}\n`;
      ics += 'END:VEVENT\n';
    });
    
    ics += 'END:VCALENDAR';
    return ics;
  }

  private async importFromCsv(data: string): Promise<number> {
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 3) {
        const appointment: Appointment = {
          id: this.generateId(),
          title: values[0],
          startTime: new Date(values[1]),
          endTime: new Date(values[2]),
          location: values[3] || undefined,
          description: values[4] || undefined,
          reminders: [],
          priority: 'medium'
        };
        
        if (await this.createAppointment(appointment)) {
          importedCount++;
        }
      }
    }
    
    return importedCount;
  }

  private async importFromIcs(data: string): Promise<number> {
    // Basic ICS parsing - in a real implementation, use a proper ICS parser
    const events = data.split('BEGIN:VEVENT');
    let importedCount = 0;
    
    for (let i = 1; i < events.length; i++) {
      const eventData = events[i];
      const title = this.extractIcsField(eventData, 'SUMMARY');
      const startTime = this.extractIcsField(eventData, 'DTSTART');
      const endTime = this.extractIcsField(eventData, 'DTEND');
      
      if (title && startTime && endTime) {
        const appointment: Appointment = {
          id: this.generateId(),
          title,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          description: this.extractIcsField(eventData, 'DESCRIPTION'),
          location: this.extractIcsField(eventData, 'LOCATION'),
          reminders: [],
          priority: 'medium'
        };
        
        if (await this.createAppointment(appointment)) {
          importedCount++;
        }
      }
    }
    
    return importedCount;
  }

  private extractIcsField(eventData: string, fieldName: string): string | undefined {
    const regex = new RegExp(`${fieldName}:(.+)`, 'i');
    const match = eventData.match(regex);
    return match ? match[1].trim() : undefined;
  }
}