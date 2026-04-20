import React, { useState, useEffect } from 'react';
import { getLeads } from '../leadtekService';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '../leadtekTypes';

/**
 * LeadList Component
 * Displays a list of leads with basic information
 */
const LeadList = ({ onLeadSelect }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load leads on component mount
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const fetchedLeads = await getLeads();
      setLeads(fetchedLeads);
      setError(null);
    } catch (err) {
      setError('Failed to load leads');
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone) return 'No phone';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  };

  // Get status badge style
  const getStatusStyle = (status) => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: LEAD_STATUS_COLORS[status] + '20',
    color: LEAD_STATUS_COLORS[status],
    border: `1px solid ${LEAD_STATUS_COLORS[status]}40`
  });

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading leads...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ef4444', textAlign: 'center' }}>
        {error}
        <button 
          onClick={loadLeads}
          style={{ 
            marginLeft: '10px', 
            padding: '4px 12px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        No leads found. Create your first lead to get started.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Leads ({leads.length})</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onLeadSelect && onLeadSelect(lead.id)}
            style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                  {lead.name || 'Unnamed Lead'}
                </h3>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  {formatPhone(lead.phone)}
                </div>
                {lead.email && (
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {lead.email}
                  </div>
                )}
              </div>
              
              <span style={getStatusStyle(lead.status)}>
                {LEAD_STATUS_LABELS[lead.status]}
              </span>
            </div>
            
            {lead.device && (
              <div style={{ 
                marginTop: '12px', 
                fontSize: '13px', 
                color: '#4b5563',
                paddingTop: '8px',
                borderTop: '1px solid #f3f4f6'
              }}>
                <strong>Device:</strong> {lead.device}
                {lead.issue && ` - ${lead.issue.substring(0, 50)}${lead.issue.length > 50 ? '...' : ''}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadList;
