/**
 * Refex service workflow rail — same progress API + UI as Employee Dashboard expand panel.
 */
import { useState, useEffect, useContext, useMemo } from 'react';
import { KissflowSDKContext } from '../../../sdk/index.js';
import { MisWorkflowPanel } from '../../../components/it/mis/ITMisExpandPrimitives.jsx';
import { ITCompactSlaStrip } from '../../../components/it/ITDashboardUI.jsx';
import { getSlaTiming, getCurrentStepValue } from '../../../lib/kfITServiceDashboard.js';
import {
  fetchRefexProcessProgressCached,
  mapWorkflowStepLabel,
  parseRefexProgress,
  isItsmBotName,
} from './progressApi.js';
import { getEmployeeDisplayStatus, isRejectedMisTicket } from './employeeStatus.js';
import { TICKET_STATUS } from './constants.js';
import { getRejectedByDisplay, getRejectionReasonDisplay } from '../../../components/it/mis/misExpandContent.js';
import RefexProgressWorkflowPanel from './RefexProgressWorkflowPanel.jsx';

function buildFallbackJourneyFromRow(row) {
  if (!row) return [];
  const journey = [{
    type: 'step',
    id: 'fallback-start',
    label: 'Started',
    subtitle: 'Ticket Raised',
    actorName: row?.requesterName || '',
    actedAt: row?.createdAtRaw || row?.requestedDateTimeRaw || null,
    expectedAt: null,
    status: 'Completed',
    isOverdue: false,
  }];

  const stepName = String(
    getCurrentStepValue(row) || row?.activeWorkflowStep || row?.currentStep || '',
  ).trim();
  const rejected = isRejectedMisTicket(row);

  if (rejected) {
    const rejectLabel = stepName ? mapWorkflowStepLabel(stepName) : 'Rejected';
    const note = getRejectionReasonDisplay(row) || '';
    journey.push({
      type: 'step',
      id: 'fallback-rejected',
      label: rejectLabel === 'Opened' ? 'Rejected' : rejectLabel,
      subtitle: '',
      actorName: getRejectedByDisplay(row) || '',
      actedAt: row?.closedAtRaw || row?.modifiedAtRaw || null,
      expectedAt: null,
      status: 'Rejected',
      note: note && note !== 'No rejection notes were captured on this ticket.' ? note : '',
      isRejected: true,
      isOverdue: false,
    });
    return journey;
  }

  if (stepName) {
    journey.push({
      type: 'step',
      id: 'fallback-current',
      label: mapWorkflowStepLabel(stepName),
      subtitle: '',
      actorName: (() => {
        const name = row?.assignedToDisplay || row?.assignedTo || '';
        return isItsmBotName(name) ? '' : name;
      })(),
      actedAt: null,
      expectedAt: null,
      status: row?.isProcessCompleted ? 'Completed' : 'InProgress',
      isOverdue: false,
    });
  }

  if (row?.isProcessCompleted) {
    journey.push({
      type: 'step',
      id: 'fallback-completed',
      label: 'Completed',
      subtitle: '',
      actorName: '',
      actedAt: row?.closedAtRaw || row?.modifiedAtRaw || null,
      expectedAt: null,
      status: 'Completed',
      isOverdue: false,
    });
  }

  return journey;
}

export default function RefexProgressWorkflowAside({
  row,
  user = null,
  showSlaInExpand = false,
  progressRefreshKey = 0,
}) {
  const { kf: kfFromContext } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const instanceId = row?.id || '';
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState('');
  const [progressRaw, setProgressRaw] = useState(row?.progressRaw || null);
  const ticketStatus = isRejectedMisTicket(row)
    ? TICKET_STATUS.Rejected
    : getEmployeeDisplayStatus(row, user);
  const [progressMeta, setProgressMeta] = useState(
    () => parseRefexProgress(row?.progressRaw, row, ticketStatus),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      if (!instanceId) {
        setLoadingProgress(false);
        return;
      }
      const silentRefresh = Boolean(progressRaw);
      if (!silentRefresh) {
        setLoadingProgress(true);
      }
      setProgressError('');
      const progress = await fetchRefexProcessProgressCached(kfInstance, instanceId, {
        force: progressRefreshKey > 0,
      });
      if (cancelled) return;
      const status = isRejectedMisTicket(row)
        ? TICKET_STATUS.Rejected
        : getEmployeeDisplayStatus(row, user);
      if (!progress) {
        setProgressRaw(null);
        setProgressMeta(parseRefexProgress(null, row, status));
        // Soft message only when we also lack a row fallback.
        setProgressError('');
      } else {
        setProgressRaw(progress);
        setProgressMeta(parseRefexProgress(progress, row, status));
      }
      setLoadingProgress(false);
    }

    loadProgress();
    return () => {
      cancelled = true;
    };
    // progressRaw intentionally omitted — silent refresh uses existing payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kfInstance, instanceId, user, progressRefreshKey]);

  const enrichedRow = useMemo(() => ({
    ...row,
    progressRaw,
    solution: row?.latestAgentSolution || row?.solution,
    isProcessCompleted: row?.isProcessCompleted || progressMeta.isCompleted,
  }), [row, progressMeta.isCompleted, progressRaw]);

  const journey = useMemo(() => {
    if (progressMeta.journey?.length) return progressMeta.journey;
    return buildFallbackJourneyFromRow(enrichedRow);
  }, [progressMeta.journey, enrichedRow]);

  const slaTiming = getSlaTiming(enrichedRow);
  const slaPanel = showSlaInExpand && slaTiming.hasSla
    ? <ITCompactSlaStrip row={enrichedRow} />
    : null;

  return (
    <MisWorkflowPanel
      workflow={(
        <RefexProgressWorkflowPanel
          journey={journey}
          loading={loadingProgress}
          error={progressError}
        />
      )}
      sla={slaPanel}
    />
  );
}
