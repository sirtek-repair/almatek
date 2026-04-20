/**
 * LeadTek Data Models and Constants
 * Defines the core data structures for the lead management system
 */

// Status constants for better maintainability
export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  AWAITING_RESPONSE: 'awaiting_response',
  FOLLOW_UP_SCHEDULED: 'follow_up_scheduled',
  BOOKED: 'booked',
  CLOSED_LOST: 'closed_lost'
};

// Status display labels
export const LEAD_STATUS_LABELS = {
  [LEAD_STATUS.NEW]: 'New',
  [LEAD_STATUS.CONTACTED]: 'Contacted',
  [LEAD_STATUS.AWAITING_RESPONSE]: 'Awaiting Response',
  [LEAD_STATUS.FOLLOW_UP_SCHEDULED]: 'Follow-up Scheduled',
  [LEAD_STATUS.BOOKED]: 'Booked',
  [LEAD_STATUS.CLOSED_LOST]: 'Closed Lost'
};

// Status colors for visual indicators
export const LEAD_STATUS_COLORS = {
  [LEAD_STATUS.NEW]: '#3b82f6',
  [LEAD_STATUS.CONTACTED]: '#10b981',
  [LEAD_STATUS.AWAITING_RESPONSE]: '#f59e0b',
  [LEAD_STATUS.FOLLOW_UP_SCHEDULED]: '#8b5cf6',
  [LEAD_STATUS.BOOKED]: '#06b6d4',
  [LEAD_STATUS.CLOSED_LOST]: '#ef4444'
};

/**
 * Creates a new lead object with default values
 * @param {Object} data - Initial lead data
 * @param {string} userId - ID of the user creating the lead
 * @returns {Object} Complete lead object
 */
export const createLeadObject = (data = {}, userId) => {
  const now = new Date().toISOString();
  
  return {
    id: data.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    device: data.device || '',
    issue: data.issue || '',
    status: data.status || LEAD_STATUS.NEW,
    followUpAt: data.followUpAt || null,
    followUpNotes: data.followUpNotes || '',
    assignedTo: data.assignedTo || userId,
    createdBy: data.createdBy || userId,
    lastContactedAt: data.lastContactedAt || null,
    contactAttempts: data.contactAttempts || 0,
    bookedAt: data.bookedAt || null,
    closedAt: data.closedAt || null,
    notes: data.notes || [],
    createdAt: data.createdAt || now,
    updatedAt: now
  };
};

/**
 * Validates if a status transition is allowed
 * @param {string} currentStatus - Current lead status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} Whether the transition is valid
 */
export const isValidStatusTransition = (currentStatus, newStatus) => {
  const transitions = {
    [LEAD_STATUS.NEW]: [LEAD_STATUS.CONTACTED, LEAD_STATUS.CLOSED_LOST],
    [LEAD_STATUS.CONTACTED]: [LEAD_STATUS.AWAITING_RESPONSE, LEAD_STATUS.FOLLOW_UP_SCHEDULED, LEAD_STATUS.BOOKED, LEAD_STATUS.CLOSED_LOST],
    [LEAD_STATUS.AWAITING_RESPONSE]: [LEAD_STATUS.CONTACTED, LEAD_STATUS.FOLLOW_UP_SCHEDULED, LEAD_STATUS.BOOKED, LEAD_STATUS.CLOSED_LOST],
    [LEAD_STATUS.FOLLOW_UP_SCHEDULED]: [LEAD_STATUS.CONTACTED, LEAD_STATUS.AWAITING_RESPONSE, LEAD_STATUS.BOOKED, LEAD_STATUS.CLOSED_LOST],
    [LEAD_STATUS.BOOKED]: [LEAD_STATUS.CLOSED_LOST],
    [LEAD_STATUS.CLOSED_LOST]: []
  };
  
  return transitions[currentStatus]?.includes(newStatus) || false;
};
