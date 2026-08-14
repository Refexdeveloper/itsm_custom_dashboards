import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ITDashboardDialog,
  ITDialogFooter,
  ITMisSelectField,
  itBtnPrimary,
  itBtnSecondary,
  itFormInput,
  itFormLabel,
  itReadOnlyField,
} from './ITDashboardUI.jsx';
import { formatRequestId } from './ITDashboardShared.jsx';
import {
  fetchITServiceReassignees,
  reassignITAgentTicketToUser,
} from '../../lib/kfITServiceDashboard.js';

const NOTES_MAX = 250;

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className={`mb-1.5 block ${itFormLabel()}`}>{label}</label>
      <div className={itReadOnlyField()}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function ITServiceReassignDialog({
  open,
  onClose,
  row,
  kfInstance,
  onReassigned,
}) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    if (!row || !kfInstance?.api) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    setError('');
    try {
      const list = await fetchITServiceReassignees(kfInstance, row);
      setUsers(list);
    } catch (err) {
      setUsers([]);
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [kfInstance, row]);

  useEffect(() => {
    if (!open) {
      setSelectedUserId('');
      setNotes('');
      setError('');
      setUsers([]);
      return;
    }
    loadUsers();
  }, [open, loadUsers]);

  const selectedUser = users.find((u) => u._id === selectedUserId) || null;

  const handleSubmit = async () => {
    if (!row || !selectedUser) {
      setError('Select a user to reassign to.');
      return;
    }
    if (!notes.trim()) {
      setError('Notes are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await reassignITAgentTicketToUser(kfInstance, row, selectedUser, notes.trim());
      onReassigned?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Reassign failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ITDashboardDialog
      open={open}
      onClose={onClose}
      title="Reassign"
      subtitle={row ? `${formatRequestId(row)} · ${row.summary}` : ''}
      footer={(
        <ITDialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={itBtnSecondary()}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingUsers || !selectedUserId || !notes.trim()}
            className={`${itBtnPrimary()} min-w-[100px]`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reassign
          </button>
        </ITDialogFooter>
      )}
    >
      <div className="flex flex-col gap-4">
        <ReadOnlyField label="Current step" value={row?.currentStep} />
        <ReadOnlyField label="Currently assigned to" value={row?.assignedTo} />

        <ITMisSelectField
          label="Reassign to *"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          options={users.map((user) => ({
            value: user._id,
            label: `${user.Name}${user.Email ? ` (${user.Email})` : ''}`,
          }))}
          placeholder={loadingUsers ? 'Loading users...' : 'Select user'}
          disabled={loadingUsers || submitting || !users.length}
          allowClear
          variant="form"
          className="w-full max-w-none sm:max-w-none"
        />

        <div>
          <label className={`mb-1.5 block ${itFormLabel()}`}>
            Notes
            <span className="ml-0.5 text-[#E34935]">*</span>
          </label>
          <textarea
            rows={4}
            value={notes}
            maxLength={NOTES_MAX}
            onChange={(e) => setNotes(e.target.value)}
            className={`${itFormInput()} resize-none`}
            placeholder="Add reassignment notes"
            disabled={submitting}
          />
          <p className="mt-1 text-xs text-slate-500">
            {notes.length}
            {' '}
            of
            {' '}
            {NOTES_MAX}
            {' '}
            characters used.
          </p>
        </div>

        {error ? (
          <p className="text-sm font-medium text-[#E34935]">{error}</p>
        ) : null}
      </div>
    </ITDashboardDialog>
  );
}
