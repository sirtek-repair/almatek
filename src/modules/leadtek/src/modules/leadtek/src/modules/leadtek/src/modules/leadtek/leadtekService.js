/**
 * LeadTek Service Layer
 * Supports Airtable, Google Sheets, and Mock storage
 */

import { createLeadObject, LEAD_STATUS } from './leadtekTypes';
import { getLeadTekConfig } from './leadtekConfig';

// In-memory storage for mock mode
let leadsStorage = [];

/**
 * Initialize the service with current user
 */
export const initializeLeadTek = (userId) => {
  const config = getLeadTekConfig();
  config.currentUserId = userId;
  
  // Load mock data from localStorage if in mock mode
  if (config.backend === 'mock') {
    const saved = localStorage.getItem('leadtek_mock_data');
    if (saved) {
      leadsStorage = JSON.parse(saved);
    } else {
      // Add some sample data for testing
      leadsStorage = [
        createLeadObject({
          name: 'John Smith',
          phone: '555-123-4567',
          email: 'john@example.com',
          device: 'iPhone 14 Pro',
          issue: 'Cracked screen, needs replacement',
          status: LEAD_STATUS.NEW
        }, userId),
        createLeadObject({
          name: 'Sarah Johnson',
          phone: '555-987-6543',
          email: 'sarah@example.com',
          device: 'MacBook Air M2',
          issue: 'Won\'t turn on, possible battery issue',
          status: LEAD_STATUS.CONTACTED,
          lastContactedAt: new Date().toISOString(),
          contactAttempts: 1
        }, userId),
        createLeadObject({
          name: 'Mike Williams',
          phone: '555-456-7890',
          device: 'Samsung Galaxy S23',
          issue: 'Water damage',
          status: LEAD_STATUS.FOLLOW_UP_SCHEDULED,
          followUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          followUpNotes: 'Customer waiting for insurance claim'
        }, userId)
      ];
      saveMockData();
    }
  }
};

/**
 * Save mock data to localStorage
 */
const saveMockData = () => {
  localStorage.setItem('leadtek_mock_data', JSON.stringify(leadsStorage));
};

/**
 * Airtable API wrapper
 */
const airtableRequest = async (endpoint, options = {}) => {
  const config = getLeadTekConfig();
  const { apiKey, baseId, tableName } = config.airtable;
  
  const url = `https://api.airtable.com/v0/${baseId}/${tableName}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`Airtable error: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Convert Airtable record to Lead format
 */
const fromAirtableRecord = (record) => {
  return {
    id: record.id,
    ...record.fields,
    notes: JSON.parse(record.fields.notes || '[]'),
    createdAt: record.createdTime,
    updatedAt: record.fields.updatedAt || record.createdTime
  };
};

/**
 * Convert Lead to Airtable format
 */
const toAirtableRecord = (lead) => {
  const { id, createdAt, updatedAt, ...fields } = lead;
  return {
    fields: {
      ...fields,
      notes: JSON.stringify(fields.notes || [])
    }
  };
};

/**
 * CRUD Operations - Auto-selects backend based on config
 */

export const createLead = async (leadData) => {
  const config = getLeadTekConfig();
  const newLead = createLeadObject(leadData, config.currentUserId);
  
  if (config.backend === 'airtable') {
    const record = await airtableRequest('', {
      method: 'POST',
      body: JSON.stringify(toAirtableRecord(newLead))
    });
    return fromAirtableRecord(record);
  }
  
  if (config.backend === 'googleSheets') {
    console.warn('Google Sheets not fully implemented, using mock');
  }
  
  // Mock storage
  return new Promise((resolve) => {
    setTimeout(() => {
      leadsStorage.push(newLead);
      saveMockData();
      resolve(newLead);
    }, 100);
  });
};

export const updateLead = async (leadId, updates) => {
  const config = getLeadTekConfig();
  
  if (config.backend === 'airtable') {
    const record = await airtableRequest(`/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        fields: { 
          ...updates, 
          updatedAt: new Date().toISOString() 
        } 
      })
    });
    return fromAirtableRecord(record);
  }
  
  // Mock storage
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = leadsStorage.findIndex(l => l.id === leadId);
      if (index === -1) {
        reject(new Error('Lead not found'));
        return;
      }
      
      leadsStorage[index] = {
        ...leadsStorage[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      saveMockData();
      resolve(leadsStorage[index]);
    }, 100);
  });
};

export const getLeads = async (filters = {}) => {
  const config = getLeadTekConfig();
  
  if (config.backend === 'airtable') {
    let filterFormula = '';
    if (filters.status) {
      filterFormula = `{status}="${filters.status}"`;
    }
    if (filters.assignedTo) {
      filterFormula = filterFormula 
        ? `AND(${filterFormula},{assignedTo}="${filters.assignedTo}")`
        : `{assignedTo}="${filters.assignedTo}"`;
    }
    
    const params = new URLSearchParams();
    if (filterFormula) {
      params.append('filterByFormula', filterFormula);
    }
    params.append('sort[0][field]', 'updatedAt');
    params.append('sort[0][direction]', 'desc');
    
    const data = await airtableRequest(`?${params.toString()}`);
    return data.records.map(fromAirtableRecord);
  }
  
  // Mock storage
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...leadsStorage];
      
      if (filters.status) {
        filtered = filtered.filter(l => l.status === filters.status);
      }
      if (filters.assignedTo) {
        filtered = filtered.filter(l => l.assignedTo === filters.assignedTo);
      }
      
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      resolve(filtered);
    }, 100);
  });
};

export const getLeadById = async (leadId) => {
  const config = getLeadTekConfig();
  
  if (config.backend === 'airtable') {
    const record = await airtableRequest(`/${leadId}`);
    return fromAirtableRecord(record);
  }
  
  // Mock storage
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const lead = leadsStorage.find(l => l.id === leadId);
      if (!lead) {
        reject(new Error('Lead not found'));
        return;
      }
      resolve(lead);
    }, 100);
  });
};

export const addNote = async (leadId, noteText) => {
  const config = getLeadTekConfig();
  const lead = await getLeadById(leadId);
  
  const newNote = {
    text: noteText,
    createdAt: new Date().toISOString(),
    createdBy: config.currentUserId
  };
  
  const updatedNotes = [...lead.notes, newNote];
  
  return updateLead(leadId, { notes: updatedNotes });
};

export const markContacted = async (leadId) => {
  const lead = await getLeadById(leadId);
  
  return updateLead(leadId, {
    status: LEAD_STATUS.CONTACTED,
    lastContactedAt: new Date().toISOString(),
    contactAttempts: lead.contactAttempts + 1
  });
};

export const scheduleFollowUp = async (leadId, followUpDate, notes = '') => {
  return updateLead(leadId, {
    status: LEAD_STATUS.FOLLOW_UP_SCHEDULED,
    followUpAt: followUpDate,
    followUpNotes: notes
  });
};

export const getUpcomingFollowUps = async (daysAhead = 7) => {
  const leads = await getLeads({ status: LEAD_STATUS.FOLLOW_UP_SCHEDULED });
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  return leads.filter(lead => {
    if (!lead.followUpAt) return false;
    const followUpDate = new Date(lead.followUpAt);
    return followUpDate >= now && followUpDate <= future;
  });
};

export const _getStorage = () => leadsStorage;
export const _clearStorage = () => { 
  leadsStorage = []; 
  saveMockData();
};
