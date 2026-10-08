import { useMemo, useState, useEffect, useContext, useRef } from 'react';
import {
  MisDetailCard,
  MisResolutionHistoryPanel,
  MisTabbedExpandShell,
  MisTicketAttachmentsLikeComments,
  visibleMisTiles,
} from '../../../components/it/mis/ITMisExpandPrimitives.jsx';
import { buildServiceOverviewTiles } from '../../../components/it/mis/misExpandContent.js';
import { buildRefexEmployeeDetailTiles } from './refexDetailTiles.js';
import {
  collectConversationEntries,
  getTableAgentSolutions,
  mergeAgentSolutionLists,
} from './buildRevisions.js';
import {
  collectAgentResolutionNotesFromProgress,
  collectReopenNotesFromProgress,
  collectRejectionNotesFromProgress,
  collectTechSupportActorsFromProgress,
  fetchRefexProcessProgressCached,
  clearProgressCacheForInstance,
} from './progressApi.js';
import { fetchTicketInstanceEnrichForRevisions, clearInstanceEnrichCacheForInstance } from '../techsupport/fetchRefexTechSupportTickets.js';
import { isProcessCompleted } from './employeeStatus.js';
import RefexProgressWorkflowAside from './RefexProgressWorkflowAside.jsx';
import { KissflowSDKContext } from '../../../sdk/index.js';
import {
  hydrateITRowAttachmentsOnly,
  isExtrovisServiceDashboardContext,
  isRefexServiceClosedTicket,
  pickServiceTicketAttachments,
} from '../../../lib/kfITServiceDashboard.js';
import {
  resolveCommentAuthorName,
  saveAgentSolutionComment,
  canComposeAgentTicketComment,
} from './agentSolutionCommentApi.js';
import { COMMENT_CHANNEL_USER, isEmployeeVisibleComment } from './commentChannel.js';

export default function RefexEmployeeExpandPanel({
  row,
  user = null,
  displayStatus = null,
  onSubmitFeedback,
  onReopen,
  feedbackExpired = false,
  progressRefreshKey = 0,
  statusTab = 'Open',
}) {
  void displayStatus;
  void onSubmitFeedback;
  void onReopen;
  void feedbackExpired;

  const { kf: kfFromContext } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const instanceId = row?.id || '';
  const rowRef = useRef(row);
  rowRef.current = row;
  const [progressReopenNotes, setProgressReopenNotes] = useState([]);
  const [progressAgentNotes, setProgressAgentNotes] = useState([]);
  const [progressRejectionNotes, setProgressRejectionNotes] = useState([]);
  const [progressTechActors, setProgressTechActors] = useState([]);
  const [progressPayload, setProgressPayload] = useState(null);
  const [instanceSolutions, setInstanceSolutions] = useState([]);
  const [instanceLatestSolution, setInstanceLatestSolution] = useState('');
  const [instanceHydrated, setInstanceHydrated] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [refreshing, setRefreshing] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState('');
  const lastRefreshKeyRef = useRef(0);
  const [ticketFiles, setTicketFiles] = useState(() => pickServiceTicketAttachments(row?.raw || row));

  useEffect(() => {
    setProgressPayload(null);
    setInstanceSolutions([]);
    setInstanceLatestSolution('');
    setInstanceHydrated(false);
    setRefreshing(true);
    setLoadError('');
    setTicketFiles(pickServiceTicketAttachments(row?.raw || row));
  }, [instanceId]);

  useEffect(() => {
    const fromRow = pickServiceTicketAttachments(row?.raw || row);
    if (fromRow.length) {
      setTicketFiles(fromRow);
      return undefined;
    }
    if (!kfInstance?.api || !instanceId) return undefined;
    let cancelled = false;
    hydrateITRowAttachmentsOnly(kfInstance, row).then((hydrated) => {
      if (cancelled) return;
      if (Array.isArray(hydrated?.attachments) && hydrated.attachments.length) {
        setTicketFiles(hydrated.attachments);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [kfInstance, instanceId, row]);

  useEffect(() => {
    let cancelled = false;
    async function loadRevisionSources({ force = false, showError = false } = {}) {
      const liveRow = rowRef.current;
      const id = liveRow?.id || instanceId;
      if (!id || !kfInstance?.api) {
        setRefreshing(false);
        return;
      }
      if (force) setRefreshing(true);
      if (showError) setLoadError('');
      try {
        if (force) {
          clearProgressCacheForInstance(kfInstance, id);
          clearInstanceEnrichCacheForInstance(kfInstance, id);
        }
        const progress = await fetchRefexProcessProgressCached(kfInstance, id, { force });
        if (cancelled) return;
        if (progress) {
          setProgressPayload(progress);
          setProgressReopenNotes(collectReopenNotesFromProgress(progress, liveRow));
          setProgressAgentNotes(collectAgentResolutionNotesFromProgress(progress, liveRow));
          setProgressRejectionNotes(collectRejectionNotesFromProgress(progress, liveRow));
          setProgressTechActors(collectTechSupportActorsFromProgress(progress, liveRow));
        }
        const enrich = await fetchTicketInstanceEnrichForRevisions(kfInstance, liveRow, {
          force,
          progress,
        });
        if (cancelled) return;
        if (enrich) {
          setInstanceSolutions(Array.isArray(enrich.agentSolutions) ? enrich.agentSolutions : []);
          setInstanceLatestSolution(enrich.latestAgentSolution || '');
          setInstanceHydrated(true);
          if (showError) setLoadError('');
        } else {
          setInstanceHydrated(true);
          if (showError) setLoadError('Could not refresh comments. Try again.');
        }
      } catch (err) {
        if (!cancelled) {
          setInstanceHydrated(true);
          if (showError) setLoadError(err?.message || 'Could not refresh comments. Try again.');
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }
    const refreshKeyBumped = progressRefreshKey > lastRefreshKeyRef.current;
    if (refreshKeyBumped) lastRefreshKeyRef.current = progressRefreshKey;
    const userForced = loadTick > 0 || refreshKeyBumped;
    const needsInstanceTable = !instanceHydrated;
    loadRevisionSources({
      force: userForced || needsInstanceTable,
      showError: userForced,
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kfInstance, instanceId, progressRefreshKey, loadTick]);

  const enrichedRow = useMemo(() => {
    const rowTable = getTableAgentSolutions(row?.agentSolutions);
    const instanceTable = getTableAgentSolutions(instanceSolutions);
    const tableSolutions = mergeAgentSolutionLists(rowTable, instanceTable);
    const fromProgress = (progressAgentNotes || []).map((entry) => ({
      resolution: entry.comment || entry.resolution,
      comment: entry.comment || entry.resolution,
      dateTime: entry.dateTime,
      agentName: entry.userName,
      recordId: entry.recordId,
      id: entry.recordId,
    }));
    const textAndProgress = [
      ...(Array.isArray(row?.agentSolutions) ? row.agentSolutions : []),
      ...instanceSolutions,
      ...fromProgress,
    ].filter((entry) => {
      const id = String(entry?.recordId || entry?.id || '');
      return id === 'it-agent-solution-text'
        || id.startsWith('agent-solution-text')
        || id.startsWith('progress-agent-note');
    });
    return {
      ...row,
      solution: row?.latestAgentSolution || instanceLatestSolution || row?.solution || row?.itAgentSolution,
      latestAgentSolution: row?.latestAgentSolution || instanceLatestSolution || row?.solution || row?.itAgentSolution,
      agentSolutions: [...tableSolutions, ...textAndProgress],
      progressReopenNotes,
      progressRejectionNotes,
      progressTechActors,
    };
  }, [
    row,
    progressReopenNotes,
    progressAgentNotes,
    progressRejectionNotes,
    progressTechActors,
    instanceSolutions,
    instanceLatestSolution,
    instanceHydrated,
  ]);

  const conversationEntries = useMemo(
    () => {
      if (!instanceHydrated) return [];
      const all = collectConversationEntries({
        ...enrichedRow,
        latestAgentSolution: instanceLatestSolution || enrichedRow.latestAgentSolution || '',
        solution: instanceLatestSolution || enrichedRow.solution || '',
        itAgentSolution: instanceLatestSolution || enrichedRow.itAgentSolution || '',
      });
      if (!isExtrovisServiceDashboardContext()) return all;
      return all.filter((entry) => isEmployeeVisibleComment(entry));
    },
    [enrichedRow, instanceHydrated, instanceLatestSolution],
  );

  const overview = (
    <>
      <MisDetailCard
        tiles={visibleMisTiles([
          ...buildServiceOverviewTiles(enrichedRow, { includeSolution: true }),
          ...buildRefexEmployeeDetailTiles(enrichedRow),
        ])}
        attachments={[]}
      />
      <MisTicketAttachmentsLikeComments attachments={ticketFiles} />
    </>
  );

  const showCommentsTab = isExtrovisServiceDashboardContext();
  const canCompose = canComposeAgentTicketComment({
    extrovis: showCommentsTab,
    tabKey: statusTab,
    role: 'employee',
    row: enrichedRow,
    progress: progressPayload,
  })
    && !isProcessCompleted(enrichedRow)
    && !isRefexServiceClosedTicket(row);
  const handleSubmitComment = async (text, extras = {}) => {
    setComposeError('');
    setComposing(true);
    try {
      await saveAgentSolutionComment(kfInstance, rowRef.current, {
        comment: text,
        authorName: resolveCommentAuthorName(kfInstance?.user || user),
        commentsType: COMMENT_CHANNEL_USER,
        files: extras.files,
        role: 'employee',
        progress: progressPayload,
      });
      setLoadTick((n) => n + 1);
    } catch (err) {
      setComposeError(err?.message || 'Could not save comment');
      throw err;
    } finally {
      setComposing(false);
    }
  };

  const resolutionHistory = (
    <MisResolutionHistoryPanel
      entries={refreshing || !instanceHydrated ? [] : conversationEntries}
      ticket={row}
      refreshing={refreshing || !instanceHydrated}
      loadError={loadError}
      canCompose={canCompose}
      composing={composing}
      composeError={composeError}
      currentUserName={resolveCommentAuthorName(kfInstance?.user || user)}
      onSubmitComment={handleSubmitComment}
      onRefresh={() => setLoadTick((n) => n + 1)}
      splitCommentChannels={false}
      allowAttachments={showCommentsTab}
    />
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
        resolutionHistory={showCommentsTab ? resolutionHistory : null}
        revisionCount={showCommentsTab ? conversationEntries.length : null}
        workflow={workflowPanel}
        showCommentsTab={showCommentsTab}
      />
    </div>
  );
}
