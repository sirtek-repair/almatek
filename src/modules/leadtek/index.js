/**
 * LeadTek Module - Main Entry Point
 * Import and use this file to integrate LeadTek into your app
 */

// Export configuration
export { configureLeadTek, getLeadTekConfig } from './leadtekConfig';

// Export service functions
export {
  initializeLeadTek,
  createLead,
  updateLead,
  getLeads,
  getLeadById,
  addNote,
  markContacted,
  scheduleFollowUp,
  getUpcomingFollowUps
} from './leadtekService';

// Export types and constants
export {
  LEAD_STATUS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  createLeadObject,
  isValidStatusTransition
} from './leadtekTypes';

// Export components
export { default as LeadList } from './components/LeadList';
export { default as LeadDetail } from './components/LeadDetail';
