import React, { useState, useEffect } from 'react';
import { 
  getLeadById, 
  addNote, 
  markContacted, 
  scheduleFollowUp 
} from '../leadtekService';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_STATUS } from '../leadtekTypes';

/**
 * LeadDetail Component
 * Displays detailed information about a single lead with action buttons
 */
const LeadDetail = ({ leadId, onClose, onLeadUpdated }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadLead();
    }
  }, [leadId]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const data = await getLeadById(leadId);
      setLead(data);
      setError(null);
    } catch (err) {
      setError('Failed to load lead details');
      console.error('Error loading lead:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setIsSubmitting(true);
      const updatedLead = await addNote(leadId, newNote);
      setLead(updatedLead);
      setNewNote('');
      onLeadUpdated && onLeadUpdated(updatedLead);
    } catch (err) {
      alert('Failed to add note');
      console.error('Error adding note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkContacted = async () => {
    try {
      setIsSubmitting(true);
      const updatedLead = await markContacted(leadId);
      setLead(updatedLead);
      onLeadUpdated && onLeadUpdated(updatedLead);
    } catch (err) {
      alert('Failed to update lead');
      console.error('Error marking contacted:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpDate) return;

    try {
      setIsSubmitting(true);
      const updatedLead = await scheduleFollowUp(leadId, followUpDate, followUpNote);
      setLead(updatedLead);
      setShowFollowUpInput(false);
      setFollowUpDate('');
      setFollowUpNote('');
      onLeadUpdated && onLeadUpdated(updatedLead);
    } catch (err) {
      alert('Failed to schedule follow-up');
      console.error('Error scheduling follow-up:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading lead details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ef4444', textAlign: 'center' }}>
        {error}
        <button onClick={loadLead} style={{ marginLeft: '10px', padding: '4px 12px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!lead) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Lead not found</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h2 style={{ margin: 0 }}>{lead.name || 'Unnamed Lead'}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: LEAD_STATUS_COLORS[lead.status] + '20',
            color: LEAD_STATUS_COLORS[lead.status]
          }}>
            {LEAD_STATUS_LABELS[lead.status]}
          </span>
          {onClose && (
            <button 
              onClick={onClose}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Contact Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Phone</label>
            <div style={{ fontSize: '14px' }}>{lead.phone || 'Not provided'}</div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Email</label>
            <div style={{ fontSize: '14px' }}>{lead.email || 'Not provided'}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Service Information</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Device</label>
          <div style={{ fontSize: '14px' }}>{lead.device || 'Not specified'}</div>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Issue</label>
          <div style={{ fontSize: '14px' }}>{lead.issue || 'Not specified'}</div>
        </div>
      </div>

      <div style={{ 
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Activity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Contact Attempts</label>
            <div style={{ fontSize: '14px' }}>{lead.contactAttempts}</div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Last Contacted</label>
            <div style={{ fontSize: '14px' }}>{formatDate(lead.lastContactedAt)}</div>
          </div>
          {lead.followUpAt && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Follow-up Scheduled</label>
              <div style={{ fontSize: '14px' }}>
                {formatDate(lead.followUpAt)}
                {lead.followUpNotes && (
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    Note: {lead.followUpNotes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        <button
          onClick={handleMarkContacted}
          disabled={isSubmitting || lead.status === LEAD_STATUS.CLOSED_LOST}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: lead.status === LEAD_STATUS.CLOSED_LOST ? 'not-allowed' : 'pointer',
            opacity: lead.status === LEAD_STATUS.CLOSED_LOST ? 0.5 : 1
          }}
        >
          Mark Contacted
        </button>
        
        <button
          onClick={() => setShowFollowUpInput(!showFollowUpInput)}
          disabled={isSubmitting || lead.status === LEAD_STATUS.CLOSED_LOST}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: lead.status === LEAD_STATUS.CLOSED_LOST ? 'not-allowed' : 'pointer',
            opacity: lead.status === LEAD_STATUS.CLOSED_LOST ? 0.5 : 1
          }}
        >
          Schedule Follow-up
        </button>
      </div>

      {showFollowUpInput && (
        <form onSubmit={handleScheduleFollowUp} style={{ 
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Schedule Follow-up</h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Follow-up Date & Time *
            </label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Notes (optional)
            </label>
            <textarea
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              rows="2"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Add any notes about this follow-up..."
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
            <button
              type="button"
              onClick={() => setShowFollowUpInput(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Notes History</h3>
        
        <form onSubmit={handleAddNote} style={{ marginBottom: '16px' }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows="2"
            placeholder="Add a note..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
              marginBottom: '8px'
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newNote.trim()}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: newNote.trim() ? 'pointer' : 'not-allowed',
              opacity: newNote.trim() ? 1 : 0.5
            }}
          >
            Add Note
          </button>
        </form>

        {lead.notes && lead.notes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...lead.notes].reverse().map((note, index) => (
              <div key={index} style={{
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  {note.text}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(note.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '4px'
          }}>
            No notes yet. Add your first note above.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetail;
