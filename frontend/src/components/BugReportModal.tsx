/**
 * Bug Report Modal
 * A floating bug-report button + modal that lets users file bug tickets
 * during testing or gameplay. Reports are stored via the backend API.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { BugReport, BugReportCategory, BugReportSeverity, BugReportStatus } from '../../../shared/types';
import './BugReportModal.css';

const CATEGORIES: { value: BugReportCategory; label: string }[] = [
  { value: 'gameplay', label: 'Gameplay' },
  { value: 'combat', label: 'Combat' },
  { value: 'character', label: 'Character / Builder' },
  { value: 'ui', label: 'UI / Layout' },
  { value: 'map', label: 'Map / Grid' },
  { value: 'ai', label: 'AI / GM Bot' },
  { value: 'rules', label: 'Rules Engine' },
  { value: 'performance', label: 'Performance' },
  { value: 'crash', label: 'Crash / Error' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: { value: BugReportSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface Props {
  /** Optional current page/context string to auto-fill */
  currentContext?: string;
  /** Optional active game ID */
  gameId?: string;
}

// ─── Main Component ──────────────────────────────────────

const BugReportModal: React.FC<Props> = ({ currentContext, gameId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'report' | 'list'>('report');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehaviour, setExpectedBehaviour] = useState('');
  const [actualBehaviour, setActualBehaviour] = useState('');
  const [category, setCategory] = useState<BugReportCategory>('gameplay');
  const [severity, setSeverity] = useState<BugReportSeverity>('medium');

  // List state
  const [reports, setReports] = useState<BugReport[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);

  // ─── Helpers ─────────────────────────────────────────

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setStepsToReproduce('');
    setExpectedBehaviour('');
    setActualBehaviour('');
    setCategory('gameplay');
    setSeverity('medium');
    setSubmitted(false);
  }, []);

  const loadReports = useCallback(async () => {
    setListLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await axios.get<BugReport[]>('/api/bugs', { params });
      setReports(data);
    } catch (err) {
      console.error('Failed to load bug reports:', err);
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    if (isOpen && tab === 'list') {
      loadReports();
    }
  }, [isOpen, tab, loadReports]);

  // ─── Submit ──────────────────────────────────────────

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('/api/bugs', {
        title: title.trim(),
        description: description.trim(),
        stepsToReproduce: stepsToReproduce.trim() || undefined,
        expectedBehaviour: expectedBehaviour.trim() || undefined,
        actualBehaviour: actualBehaviour.trim() || undefined,
        category,
        severity,
        context: currentContext,
        gameId,
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      });
      setSubmitted(true);
      setTimeout(() => {
        resetForm();
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit bug report:', err);
      alert('Failed to submit bug report. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Status Update ──────────────────────────────────

  const handleStatusChange = async (id: string, newStatus: BugReportStatus) => {
    try {
      const { data } = await axios.patch<BugReport>(`/api/bugs/${id}`, { status: newStatus });
      setSelectedReport(data);
      loadReports();
    } catch (err) {
      console.error('Failed to update bug status:', err);
    }
  };

  // ─── Keyboard shortcut (Ctrl+Shift+B) ───────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Render ──────────────────────────────────────────

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="bug-report-fab"
        onClick={() => { setIsOpen(true); setTab('report'); resetForm(); }}
        title="Report a Bug (Ctrl+Shift+B)"
        aria-label="Report a Bug"
      >
        🐛
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="bug-report-overlay" role="dialog" aria-modal="true" aria-label="Bug Reporter" onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
          <div className="bug-report-modal">
            {/* Header */}
            <div className="modal-header">
              <h2>🐛 Bug Reporter</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)} aria-label="Close">×</button>
            </div>

            {/* Tabs */}
            <div className="bug-report-tabs">
              <button className={tab === 'report' ? 'active' : ''} onClick={() => { setTab('report'); setSelectedReport(null); }}>
                Report Bug
              </button>
              <button className={tab === 'list' ? 'active' : ''} onClick={() => { setTab('list'); setSelectedReport(null); }}>
                View Reports
              </button>
            </div>

            {/* Body */}
            <div className="bug-report-body">
              {tab === 'report' && !submitted && (
                <ReportForm
                  title={title} setTitle={setTitle}
                  description={description} setDescription={setDescription}
                  stepsToReproduce={stepsToReproduce} setStepsToReproduce={setStepsToReproduce}
                  expectedBehaviour={expectedBehaviour} setExpectedBehaviour={setExpectedBehaviour}
                  actualBehaviour={actualBehaviour} setActualBehaviour={setActualBehaviour}
                  category={category} setCategory={setCategory}
                  severity={severity} setSeverity={setSeverity}
                />
              )}

              {tab === 'report' && submitted && (
                <div className="bug-success">
                  <span className="checkmark">✓</span>
                  <strong>Bug report submitted!</strong>
                  <p>Thanks for helping improve the game. This window will close automatically.</p>
                </div>
              )}

              {tab === 'list' && !selectedReport && (
                <ReportList
                  reports={reports}
                  loading={listLoading}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  onSelect={setSelectedReport}
                />
              )}

              {tab === 'list' && selectedReport && (
                <ReportDetail
                  report={selectedReport}
                  onBack={() => setSelectedReport(null)}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>

            {/* Footer (report tab only) */}
            {tab === 'report' && !submitted && (
              <div className="bug-report-footer">
                <button className="bug-cancel-btn" onClick={() => setIsOpen(false)}>Cancel</button>
                <button
                  className="bug-submit-btn"
                  disabled={!title.trim() || !description.trim() || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Submitting…' : 'Submit Bug Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BugReportModal;

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

/** Report creation form */
const ReportForm: React.FC<{
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  stepsToReproduce: string; setStepsToReproduce: (v: string) => void;
  expectedBehaviour: string; setExpectedBehaviour: (v: string) => void;
  actualBehaviour: string; setActualBehaviour: (v: string) => void;
  category: BugReportCategory; setCategory: (v: BugReportCategory) => void;
  severity: BugReportSeverity; setSeverity: (v: BugReportSeverity) => void;
}> = ({
  title, setTitle,
  description, setDescription,
  stepsToReproduce, setStepsToReproduce,
  expectedBehaviour, setExpectedBehaviour,
  actualBehaviour, setActualBehaviour,
  category, setCategory,
  severity, setSeverity,
}) => (
  <>
    <div className="bug-field">
      <label>Title <span className="required">*</span></label>
      <input
        type="text"
        placeholder="Brief summary of the bug…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />
    </div>

    <div className="bug-field">
      <label>Description <span className="required">*</span></label>
      <textarea
        placeholder="What happened? Describe the bug in detail…"
        rows={3}
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
    </div>

    <div className="bug-field-row">
      <div className="bug-field">
        <label>Category <span className="required">*</span></label>
        <select value={category} onChange={e => setCategory(e.target.value as BugReportCategory)}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="bug-field">
        <label>Severity <span className="required">*</span></label>
        <select value={severity} onChange={e => setSeverity(e.target.value as BugReportSeverity)}>
          {SEVERITIES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>

    <div className="bug-field">
      <label>Steps to Reproduce</label>
      <textarea
        placeholder="1. Go to…&#10;2. Click on…&#10;3. See error"
        rows={3}
        value={stepsToReproduce}
        onChange={e => setStepsToReproduce(e.target.value)}
      />
    </div>

    <div className="bug-field">
      <label>Expected Behaviour</label>
      <input
        type="text"
        placeholder="What should have happened?"
        value={expectedBehaviour}
        onChange={e => setExpectedBehaviour(e.target.value)}
      />
    </div>

    <div className="bug-field">
      <label>Actual Behaviour</label>
      <input
        type="text"
        placeholder="What actually happened?"
        value={actualBehaviour}
        onChange={e => setActualBehaviour(e.target.value)}
      />
    </div>
  </>
);

/** Report list with filters */
const ReportList: React.FC<{
  reports: BugReport[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  onSelect: (r: BugReport) => void;
}> = ({ reports, loading, statusFilter, setStatusFilter, categoryFilter, setCategoryFilter, onSelect }) => (
  <>
    <div className="bug-list-filters">
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="in-progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
        <option value="wont-fix">Won't Fix</option>
      </select>
      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
        <option value="">All Categories</option>
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>

    {loading && <div className="bug-list-empty">Loading…</div>}

    {!loading && reports.length === 0 && (
      <div className="bug-list-empty">No bug reports found.</div>
    )}

    <div className="bug-list">
      {reports.map(r => (
        <div key={r.id} className="bug-list-item" role="button" tabIndex={0} onClick={() => onSelect(r)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r); } }}>
          <div className="bug-list-item-header">
            <span className="bug-list-item-title">
              <span className={`severity-indicator severity-${r.severity}`} />
              {r.title}
            </span>
            <span className="bug-list-item-meta">
              <span className={`bug-status-badge bug-status-${r.status}`}>{r.status}</span>
            </span>
          </div>
          <div className="bug-list-item-desc">{r.description}</div>
          <div className="bug-list-item-date">
            {r.category} · {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  </>
);

/** Single report detail view */
const ReportDetail: React.FC<{
  report: BugReport;
  onBack: () => void;
  onStatusChange: (id: string, status: BugReportStatus) => void;
}> = ({ report, onBack, onStatusChange }) => (
  <div className="bug-detail">
    <button className="bug-detail-back" onClick={onBack}>← Back to list</button>

    <h3>
      <span className={`severity-indicator severity-${report.severity}`} />
      {report.title}
    </h3>

    <div className="bug-detail-info">
      <span className={`bug-status-badge bug-status-${report.status}`}>{report.status}</span>
      <span style={{ color: '#888', fontSize: '0.85em' }}>
        {report.category} · {report.severity} · {new Date(report.createdAt).toLocaleString()}
      </span>
    </div>

    <div className="bug-detail-section">
      <h4>Description</h4>
      <p>{report.description}</p>
    </div>

    {report.stepsToReproduce && (
      <div className="bug-detail-section">
        <h4>Steps to Reproduce</h4>
        <p>{report.stepsToReproduce}</p>
      </div>
    )}

    {report.expectedBehaviour && (
      <div className="bug-detail-section">
        <h4>Expected Behaviour</h4>
        <p>{report.expectedBehaviour}</p>
      </div>
    )}

    {report.actualBehaviour && (
      <div className="bug-detail-section">
        <h4>Actual Behaviour</h4>
        <p>{report.actualBehaviour}</p>
      </div>
    )}

    {report.context && (
      <div className="bug-detail-section">
        <h4>Context / Page</h4>
        <p>{report.context}</p>
      </div>
    )}

    {report.screenResolution && (
      <div className="bug-detail-section">
        <h4>Screen Resolution</h4>
        <p>{report.screenResolution}</p>
      </div>
    )}

    <div className="bug-detail-section">
      <h4>Update Status</h4>
      <select
        className="bug-detail-status-select"
        value={report.status}
        onChange={e => onStatusChange(report.id, e.target.value as BugReportStatus)}
      >
        <option value="open">Open</option>
        <option value="in-progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
        <option value="wont-fix">Won't Fix</option>
      </select>
    </div>
  </div>
);
