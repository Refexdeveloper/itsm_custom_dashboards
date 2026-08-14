import { useMemo, useState, useEffect, useContext } from 'react';
import {
  MisDetailCard,
  MisResolutionHistoryPanel,
  MisTabbedExpandShell,
  visibleMisTiles,
} from '../../../components/it/mis/ITMisExpandPrimitives.jsx';
import { buildServiceOverviewTiles } from '../../../components/it/mis/misExpandContent.js';
import { buildRefexEmployeeDetailTiles } from './refexDetailTiles.js';
import {
  collectConversationEntries,
} from './buildRevisions.js';
import {
  collectAgentResolutionNotesFromProgress,
  collectReopenNotesFromProgress,
  collectRejectionNotesFromProgress,
  fetchRefexProcessProgressCached,
} from './progressApi.js';
import { isProcessCompleted } from './employeeStatus.js';
import RefexProgressWorkflowAside from './RefexProgressWorkflowAside.jsx';
import { KissflowSDKContext } from '../../../sdk/index.js';

export default function RefexEmployeeExpandPanel({
  row,
  user = null,
  displayStatus = null,
  onSubmitFeedback,
  onReopen,
  feedbackExpired = false,
  progressRefreshKey = 0,
}) {
  void displayStatus;
  void onSubmitFeedback;
  void onReopen;
  void feedbackExpired;

  const { kf: kfFromContext } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const instanceId = row?.id || '';
  const [progressReopenNotes, setProgressReopenNotes] = useState([]);
  const [progressAgentNotes, setProgressAgentNotes] = useState([]);
  const [progressRejectionNotes, setProgressRejectionNotes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadProgressNotes() {
      if (!instanceId || !kfInstance?.api) return;
      const progress = await fetchRefexProcessProgressCached(kfInstance, instanceId);
      if (cancelled || !progress) return;
      setProgressReopenNotes(collectReopenNotesFromProgress(progress, row));
      setProgressAgentNotes(collectAgentResolutionNotesFromProgress(progress, row));
      setProgressRejectionNotes(collectRejectionNotesFromProgress(progress, row));
    }
    loadProgressNotes();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kfInstance, instanceId, progressRefreshKey]);

  const enrichedRow = useMemo(() => {
    const fromProgress = (progressAgentNotes || []).map((entry) => ({
      resolution: entry.comment || entry.resolution,
      comment: entry.comment || entry.resolution,
      dateTime: entry.dateTime,
      agentName: entry.userName,
      recordId: entry.recordId,
      id: entry.recordId,
    }));
    return {
      ...row,
      solution: row?.latestAgentSolution || row?.solution || row?.itAgentSolution,
      latestAgentSolution: row?.latestAgentSolution || row?.solution || row?.itAgentSolution,
      agentSolutions: [
        ...(Array.isArray(row?.agentSolutions) ? row.agentSolutions : []),
        ...fromProgress,
      ],
      progressReopenNotes,
      progressRejectionNotes,
    };
  }, [row, progressReopenNotes, progressAgentNotes, progressRejectionNotes]);

  const conversationEntries = useMemo(
    () => collectConversationEntries(enrichedRow),
    [enrichedRow],
  );

  const overview = (
    <MisDetailCard
      tiles={visibleMisTiles([
        ...buildServiceOverviewTiles(enrichedRow, { includeSolution: true }),
        ...buildRefexEmployeeDetailTiles(enrichedRow),
      ])}
      attachments={enrichedRow.attachments}
    />
  );
  const resolutionHistory = (
    <MisResolutionHistoryPanel entries={conversationEntries} />
  );

  const workflowPanel = (
    <RefexProgressWorkflowAside
      row={row}
      user={user}
      showSlaInExpand
      progressRefreshKey={progressRefreshKey}
    />
  );

  if (isProcessCompleted(enrichedRow)) {
    enrichedRow.isProcessCompleted = true;
  }

  return (
    <div>
      <MisTabbedExpandShell
        persistKey={row?.id || ''}
        overview={overview}
        resolutionHistory={resolutionHistory}
        revisionCount={conversationEntries.length}
        workflow={workflowPanel}
      />
    </div>
  );
}
