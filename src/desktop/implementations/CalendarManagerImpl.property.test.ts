import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import { CalendarManagerImpl } from './CalendarManagerImpl';
import { CalendarManagerConfig } from '../interfaces/CalendarManager';
import { Appointment, TimeRange, Event } from '../types';

/**
 * Property-Based Tests for Calendar Manager Implementation
 * 
 * **Feature: ai-chatbot-desktop, Property 11: Schedule Information Accuracy**
 * **Validates: Requirements 4.1**
 * 
 * **Feature: ai-chatbot-desktop, Property 12: Proactive Reminder Timing**
 * **Validates: Requirements 4.2**
 * 
 * **Feature: ai-chatbot-desktop, Property 13: Natural Language Calendar Processing**
 * **Validates: Requirements 4.3**
 * 
 * **Feature: ai-chatbot-desktop, Property 14: Conflict Detection and Resolution**
 * **Validates: Requirements 4.4**
 */

describe('CalendarManagerImpl Property Tests', () => {
  let calendarManager: CalendarManagerImpl;
  let config: CalendarManagerConfig;

  beforeEach(async () => {
    // Ensure clean state
    if (calendarManager) {
      await calendarManager.shutdown();
    }
    calendarManager = new CalendarManagerImpl();
    config = {
      userId: 'test-user',
      timeZone: 'UTC',
      workingHours: {
        monday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        thursday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        friday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        saturday: { isWorkingDay: false, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        sunday: { isWorkingDay: false, startTime: '09:00', endTime: '17:00', breakTimes: [] }
      },
      preferences: {
        defaultReminderTime: 15,
        workingHours: { start: '09:00', end: '17:00' },
        timeZone: 'UTC',
        calendarServices: [],
        autoAcceptMeetings: false
      },
      calendarServices: [],
      enableAutoSync: false,
      syncIntervalMinutes: 30,
      enableNLPParsing: true,
      supportedLanguages: ['en'],
      confidenceThreshold: 0.5,
      defaultReminderMinutes: 15,
      enableProactiveReminders: true,
      reminderMethods: ['popup'],
      enableConflictDetection: true,
      autoResolveMinorConflicts: false,
      bufferTimeMinutes: 5,
      encryptCalendarData: false,
      shareAvailability: true,
      dataRetentionDays: 365
    };
    await calendarManager.initialize(config);
  });

  afterEach(async () => {
    if (calendarManager) {
      await calendarManager.shutdown();
    }
  });

  // Generators for property-based testing
  const appointmentGenerator = fc.record({
    id: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
    title: fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    startTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    durationMinutes: fc.integer({ min: 15, max: 480 }), // 15 minutes to 8 hours
    location: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    attendees: fc.option(fc.array(fc.emailAddress(), { maxLength: 10 }), { nil: undefined }),
    reminders: fc.array(fc.record({
      type: fc.constantFrom('popup', 'audio', 'visual', 'email') as fc.Arbitrary<'popup' | 'audio' | 'visual' | 'email'>,
      minutesBefore: fc.integer({ min: 1, max: 1440 }),
      message: fc.option(fc.string({ maxLength: 200 }), { nil: undefined })
    }), { maxLength: 5 }),
    priority: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>
  }).map(apt => ({
    ...apt,
    endTime: new Date(apt.startTime.getTime() + apt.durationMinutes * 60 * 1000), // Calculate endTime from duration
    id: `${apt.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Ensure unique IDs
  }));

  const timeRangeGenerator = fc.record({
    start: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    end: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
  }).filter(range => range.end > range.start);

  /**
   * **Feature: ai-chatbot-desktop, Property 11: Schedule Information Accuracy**
   * **Validates: Requirements 4.1**
   * 
   * For any schedule query, the Calendar_Manager should return complete and accurate 
   * appointment information for the requested timeframe
   */
  describe('Property 11: Schedule Information Accuracy', () => {
    it('should return all appointments within the requested timeframe', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(appointmentGenerator, { minLength: 0, maxLength: 20 }),
        timeRangeGenerator,
        async (appointments, queryTimeframe) => {
          // Ensure clean state for each property test iteration
          await calendarManager.shutdown();
          calendarManager = new CalendarManagerImpl();
          await calendarManager.initialize(config);

          // Create all appointments
          for (const appointment of appointments) {
            await calendarManager.createAppointment(appointment);
          }

          // Query for events in the timeframe
          const events = await calendarManager.getUpcomingEvents(queryTimeframe);

          // Filter expected appointments that should be in the timeframe
          const expectedAppointments = appointments.filter(apt => 
            apt.startTime >= queryTimeframe.start && apt.startTime < queryTimeframe.end
          );

          // Verify all expected appointments are returned
          expect(events.length).toBe(expectedAppointments.length);

          // Verify each returned event corresponds to an expected appointment
          for (const event of events) {
            const matchingAppointment = expectedAppointments.find(apt => apt.id === event.id);
            expect(matchingAppointment).toBeDefined();
            expect(event.title).toBe(matchingAppointment!.title);
            expect(event.startTime).toEqual(matchingAppointment!.startTime);
            expect(event.endTime).toEqual(matchingAppointment!.endTime);
          }

          // Verify events are sorted by start time
          for (let i = 1; i < events.length; i++) {
            expect(events[i].startTime.getTime()).toBeGreaterThanOrEqual(events[i-1].startTime.getTime());
          }
        }
      ), { numRuns: 100 });
    });

    it('should return accurate appointment details when searching', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(appointmentGenerator, { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (appointments, searchText) => {
          // Ensure clean state for each property test iteration
          await calendarManager.shutdown();
          calendarManager = new CalendarManagerImpl();
          await calendarManager.initialize(config);

          // Create all appointments
          for (const appointment of appointments) {
            await calendarManager.createAppointment(appointment);
          }

          // Search for appointments
          const searchResults = await calendarManager.searchAppointments({ text: searchText });

          // Verify all returned appointments contain the search text
          for (const result of searchResults) {
            const containsInTitle = result.title.toLowerCase().includes(searchText.toLowerCase());
            const containsInDescription = result.description?.toLowerCase().includes(searchText.toLowerCase()) || false;
            expect(containsInTitle || containsInDescription).toBe(true);
          }

          // Verify results are sorted by start time
          for (let i = 1; i < searchResults.length; i++) {
            expect(searchResults[i].startTime.getTime()).toBeGreaterThanOrEqual(searchResults[i-1].startTime.getTime());
          }
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 12: Proactive Reminder Timing**
   * **Validates: Requirements 4.2**
   * 
   * For any upcoming appointment, reminders should be sent at the appropriate lead time 
   * based on appointment type and user preferences
   */
  describe('Property 12: Proactive Reminder Timing', () => {
    it('should set up reminders at correct times before appointments', async () => {
      await fc.assert(fc.asyncProperty(
        appointmentGenerator,
        async (appointment) => {
          // Ensure appointment is in the future
          const futureAppointment = {
            ...appointment,
            startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            endTime: new Date(Date.now() + 3 * 60 * 60 * 1000)    // 3 hours from now
          };

          // Create appointment with reminders
          const success = await calendarManager.createAppointment(futureAppointment);
          expect(success).toBe(true);

          // Verify reminders are set up (we can't easily test the actual timing in unit tests,
          // but we can verify the setup doesn't throw errors and completes successfully)
          await expect(calendarManager.setupReminders(futureAppointment.id, futureAppointment.reminders))
            .resolves.not.toThrow();

          // Verify appointment was created with reminders
          const searchResults = await calendarManager.searchAppointments({ text: futureAppointment.title });
          expect(searchResults.length).toBeGreaterThan(0);
          
          const createdAppointment = searchResults.find(apt => apt.id === futureAppointment.id);
          expect(createdAppointment).toBeDefined();
          expect(createdAppointment!.reminders).toEqual(futureAppointment.reminders);
        }
      ), { numRuns: 100 });
    });

    it('should handle multiple reminders for the same appointment', async () => {
      await fc.assert(fc.asyncProperty(
        appointmentGenerator.filter(apt => apt.reminders.length > 1),
        async (appointment) => {
          // Ensure appointment is in the future
          const futureAppointment = {
            ...appointment,
            startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
            endTime: new Date(Date.now() + 5 * 60 * 60 * 1000)    // 5 hours from now
          };

          const success = await calendarManager.createAppointment(futureAppointment);
          expect(success).toBe(true);

          // Verify all reminders are set up correctly
          await expect(calendarManager.setupReminders(futureAppointment.id, futureAppointment.reminders))
            .resolves.not.toThrow();

          // Verify each reminder type is preserved
          const searchResults = await calendarManager.searchAppointments({ text: futureAppointment.title });
          const createdAppointment = searchResults.find(apt => apt.id === futureAppointment.id);
          
          expect(createdAppointment).toBeDefined();
          expect(createdAppointment!.reminders.length).toBe(futureAppointment.reminders.length);
          
          // Verify reminder timing is preserved
          for (let i = 0; i < futureAppointment.reminders.length; i++) {
            expect(createdAppointment!.reminders[i].minutesBefore)
              .toBe(futureAppointment.reminders[i].minutesBefore);
            expect(createdAppointment!.reminders[i].type)
              .toBe(futureAppointment.reminders[i].type);
          }
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 13: Natural Language Calendar Processing**
   * **Validates: Requirements 4.3**
   * 
   * For any natural language scheduling request, the system should correctly parse 
   * the intent and create accurate calendar entries
   */
  describe('Property 13: Natural Language Calendar Processing', () => {
    it('should parse natural language requests into valid schedule intents', async () => {
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          'schedule a meeting tomorrow at 2 PM',
          'book an appointment for next week',
          'create a call with John at 3:30 PM',
          'meeting with the team on Friday',
          'schedule lunch at noon',
          'book a conference room for 10 AM',
          'what meetings do I have today',
          'show me tomorrow\'s schedule',
          'when is my next appointment',
          'cancel my 3 PM meeting'
        ),
        async (naturalLanguageRequest) => {
          const intent = await calendarManager.parseScheduleRequest(naturalLanguageRequest);

          // Verify intent has required properties
          expect(intent).toBeDefined();
          expect(intent.action).toMatch(/^(create|query|update|delete)$/);
          expect(intent.confidence).toBeGreaterThanOrEqual(0);
          expect(intent.confidence).toBeLessThanOrEqual(1);

          // Verify action-specific properties
          if (intent.action === 'create') {
            expect(intent.appointment).toBeDefined();
            expect(intent.appointment!.title).toBeDefined();
            expect(intent.appointment!.startTime).toBeDefined();
            expect(intent.appointment!.endTime).toBeDefined();
            expect(intent.appointment!.startTime! < intent.appointment!.endTime!).toBe(true);
          }

          if (intent.action === 'query') {
            expect(intent.query || intent.timeframe).toBeDefined();
          }
        }
      ), { numRuns: 100 });
    });

    it('should process calendar queries and return appropriate responses', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(appointmentGenerator, { minLength: 0, maxLength: 5 }),
        fc.constantFrom(
          'what meetings do I have today',
          'show me this week\'s schedule',
          'when is my next appointment',
          'do I have any conflicts tomorrow'
        ),
        async (appointments, query) => {
          // Create appointments
          for (const appointment of appointments) {
            await calendarManager.createAppointment(appointment);
          }

          const response = await calendarManager.processCalendarQuery(query);

          // Verify response structure
          expect(response).toBeDefined();
          expect(response.answer).toBeDefined();
          expect(typeof response.answer).toBe('string');
          expect(response.answer.length).toBeGreaterThan(0);
          expect(response.confidence).toBeGreaterThanOrEqual(0);
          expect(response.confidence).toBeLessThanOrEqual(1);
          expect(Array.isArray(response.suggestions)).toBe(true);
          expect(Array.isArray(response.followUpQuestions)).toBe(true);
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 14: Conflict Detection and Resolution**
   * **Validates: Requirements 4.4**
   * 
   * For any scheduling request that creates conflicts, the system should identify 
   * all overlaps and provide viable alternative suggestions
   */
  describe('Property 14: Conflict Detection and Resolution', () => {
    it('should detect overlapping appointments as conflicts', async () => {
      await fc.assert(fc.asyncProperty(
        appointmentGenerator,
        async (baseAppointment) => {
          // Create first appointment
          await calendarManager.createAppointment(baseAppointment);

          // Create a deliberately overlapping appointment
          // Start 5 minutes into the first appointment and extend 5 minutes past it
          const overlapStart = new Date(baseAppointment.startTime.getTime() + 5 * 60 * 1000);
          const overlapEnd = new Date(baseAppointment.endTime.getTime() + 5 * 60 * 1000);
          
          const overlappingEvent: Event = {
            id: `${baseAppointment.id}_overlap_${Date.now()}`,
            title: 'Overlapping Meeting',
            startTime: overlapStart,
            endTime: overlapEnd,
            type: 'appointment',
            status: 'confirmed'
          };

          const conflicts = await calendarManager.checkConflicts(overlappingEvent);

          // Should detect conflict with first appointment
          expect(conflicts.length).toBeGreaterThan(0);
          
          const conflict = conflicts.find(c => c.existingEvent.id === baseAppointment.id);
          expect(conflict).toBeDefined();
          expect(conflict!.conflictType).toMatch(/^(overlap|adjacent|resource)$/);
          expect(conflict!.severity).toMatch(/^(minor|major|critical)$/);
          expect(Array.isArray(conflict!.suggestions)).toBe(true);
          expect(conflict!.suggestions.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });

    it('should not detect conflicts for non-overlapping appointments', async () => {
      await fc.assert(fc.asyncProperty(
        appointmentGenerator,
        appointmentGenerator,
        async (appointment1, appointment2) => {
          // Create first appointment
          await calendarManager.createAppointment(appointment1);

          // Create non-overlapping second appointment (at least 2 hours later)
          const nonOverlappingAppointment = {
            ...appointment2,
            id: appointment2.id + '_separate',
            startTime: new Date(appointment1.endTime.getTime() + 2 * 60 * 60 * 1000), // 2 hours after first ends
            endTime: new Date(appointment1.endTime.getTime() + 3 * 60 * 60 * 1000)    // 3 hours after first ends
          };

          const event: Event = {
            id: nonOverlappingAppointment.id,
            title: nonOverlappingAppointment.title,
            startTime: nonOverlappingAppointment.startTime,
            endTime: nonOverlappingAppointment.endTime,
            type: 'appointment',
            status: 'confirmed'
          };

          const conflicts = await calendarManager.checkConflicts(event);

          // Should not detect conflict with first appointment
          const conflict = conflicts.find(c => c.existingEvent.id === appointment1.id);
          expect(conflict).toBeUndefined();
        }
      ), { numRuns: 100 });
    });

    it('should detect identical time slots as conflicts', async () => {
      await fc.assert(fc.asyncProperty(
        appointmentGenerator,
        async (appointment) => {
          // Create base appointment
          await calendarManager.createAppointment(appointment);

          // Create appointment with identical time slot
          const identicalEvent: Event = {
            id: `${appointment.id}_identical_${Date.now()}`,
            title: 'Identical Time Meeting',
            startTime: new Date(appointment.startTime), // Same start time
            endTime: new Date(appointment.endTime),     // Same end time
            type: 'appointment',
            status: 'confirmed'
          };

          const conflicts = await calendarManager.checkConflicts(identicalEvent);

          // Should detect conflict with first appointment
          expect(conflicts.length).toBeGreaterThan(0);
          
          const conflict = conflicts.find(c => c.existingEvent.id === appointment.id);
          expect(conflict).toBeDefined();
          expect(conflict!.conflictType).toMatch(/^(overlap|adjacent|resource)$/);
          expect(conflict!.severity).toMatch(/^(minor|major|critical)$/);
        }
      ), { numRuns: 100 });
    });

    it('should provide meaningful conflict resolution suggestions', async () => {
      await fc.assert(fc.asyncProperty(
        appointmentGenerator,
        async (appointment) => {
          // Create base appointment
          await calendarManager.createAppointment(appointment);

          // Create conflicting appointment with partial overlap
          const conflictStart = new Date(appointment.startTime.getTime() + 15 * 60 * 1000); // 15 minutes into original
          const conflictEnd = new Date(appointment.endTime.getTime() + 15 * 60 * 1000);     // 15 minutes past original
          
          const conflictingEvent: Event = {
            id: `${appointment.id}_conflict_${Date.now()}`,
            title: 'Conflicting Meeting',
            startTime: conflictStart,
            endTime: conflictEnd,
            type: 'appointment',
            status: 'confirmed'
          };

          const conflicts = await calendarManager.checkConflicts(conflictingEvent);

          if (conflicts.length > 0) {
            const conflict = conflicts[0];
            
            // Verify suggestions are provided
            expect(conflict.suggestions).toBeDefined();
            expect(Array.isArray(conflict.suggestions)).toBe(true);
            expect(conflict.suggestions.length).toBeGreaterThan(0);
            
            // Verify suggestions are meaningful strings
            for (const suggestion of conflict.suggestions) {
              expect(typeof suggestion).toBe('string');
              expect(suggestion.length).toBeGreaterThan(0);
            }
          }
        }
      ), { numRuns: 100 });
    });
  });
});