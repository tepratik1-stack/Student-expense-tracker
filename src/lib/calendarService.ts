import { Expense } from '../types';

/**
 * Service to interact with the Google Calendar API
 */

// Helper to get formatted category icon/text
const getCategoryIconDetails = (category: string): string => {
  switch (category) {
    case 'Food': return '🍔';
    case 'Travel': return '🚗';
    case 'Study': return '📚';
    case 'Recharge': return '⚡';
    default: return '🏷️';
  }
};

/**
 * Creates a Google Calendar event for an expense
 * @param token OAuth Access Token
 * @param expense The Expense item
 * @returns The created event ID from Google Calendar
 */
export const createCalendarEvent = async (token: string, expense: Expense): Promise<string> => {
  const emoji = getCategoryIconDetails(expense.category);
  const summary = `${emoji} [Kharcha] ${expense.description} (₹${expense.amount})`;
  
  const startTime = new Date(expense.timestamp);
  // Default end time to 30 minutes after start
  const endTime = new Date(expense.timestamp + 30 * 60 * 1000);

  const eventBody = {
    summary,
    description: `Student Expense Tracker Sync\n\nCategory: ${expense.category}\nAmount: ₹${expense.amount}\nSaved on: ${new Date(expense.timestamp).toLocaleString()}\n\nBachat karo! 😉`,
    start: {
      dateTime: startTime.toISOString(),
    },
    end: {
      dateTime: endTime.toISOString(),
    },
    reminders: {
      useDefault: true,
    },
    colorId: getCalendarColorId(expense.category),
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Calendar Event Creation Error:', errorData);
    throw new Error(errorData?.error?.message || 'Failed to sync event with Google Calendar.');
  }

  const result = await response.json();
  return result.id;
};

/**
 * Deletes an event from Google Calendar
 * @param token OAuth Access Token
 * @param eventId Calendar Event ID to delete
 */
export const deleteCalendarEvent = async (token: string, eventId: string): Promise<void> => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 410 && response.status !== 404) {
    // 410 Gone / 404 Not Found means it's already deleted, which can be fine
    const errorData = await response.json().catch(() => ({}));
    console.error('Calendar Event Deletion Error:', errorData);
    throw new Error(errorData?.error?.message || 'Failed to remove event from Google Calendar.');
  }
};

/**
 * Map our categories to Google Calendar Event Color IDs for visual categorization:
 * Colors: 1-Blue, 2-Green, 3-Purple, 4-Red, 5-Yellow, 6-Orange, 7-Turquoise, 8-Gray, 9-Bold Blue, 10-Bold Green, 11-Bold Red
 */
const getCalendarColorId = (category: string): string => {
  switch (category) {
    case 'Food': return '5'; // Banana (Yellow)
    case 'Travel': return '1'; // Lavender (Blue)
    case 'Study': return '2'; // Sage (Green)
    case 'Recharge': return '3'; // Grape (Purple)
    default: return '8'; // Graphite (Gray)
  }
};
