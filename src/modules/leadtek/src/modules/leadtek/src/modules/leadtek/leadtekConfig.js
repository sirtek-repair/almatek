/**
 * LeadTek Configuration
 * Manages API keys and backend settings for Airtable/Google Sheets
 */

let config = {
  // Backend type: 'airtable', 'googleSheets', or 'mock'
  backend: 'mock',
  
  // Airtable configuration
  airtable: {
    apiKey: null,
    baseId: null,
    tableName: 'Leads'
  },
  
  // Google Sheets configuration  
  googleSheets: {
    apiKey: null,
    spreadsheetId: null,
    sheetName: 'Leads'
  },
  
  // Current user ID (from your auth system)
  currentUserId: null
};

/**
 * Configure LeadTek with your backend settings
 * @param {Object} options - Configuration options
 */
export const configureLeadTek = (options = {}) => {
  config = {
    ...config,
    ...options,
    airtable: { ...config.airtable, ...options.airtable },
    googleSheets: { ...config.googleSheets, ...options.googleSheets }
  };
  
  // Save to localStorage for persistence
  localStorage.setItem('leadtek_config', JSON.stringify(config));
  
  console.log('LeadTek configured:', config.backend);
};

/**
 * Get current configuration
 */
export const getLeadTekConfig = () => {
  // Try to load from localStorage if not set
  const saved = localStorage.getItem('leadtek_config');
  if (saved) {
    config = JSON.parse(saved);
  }
  return config;
};

/**
 * Set current user ID (call this after user logs in)
 */
export const setCurrentUser = (userId) => {
  config.currentUserId = userId;
  localStorage.setItem('leadtek_config', JSON.stringify(config));
};
