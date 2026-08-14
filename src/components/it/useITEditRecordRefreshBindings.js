import { useCallback, useMemo } from 'react';
import {
  openITEditChangeRequestPage,
  openITEditServiceRecordPage,
} from '../../lib/kfITServiceDashboard.js';
import { useITDashboardEditReturnRefresh } from './useITDashboardEditReturnRefresh.js';

/** Shared Edit-icon refresh + page navigation bindings for IT dashboards. */
export function useITEditRecordRefreshBindings(kfInstance, requestRefresh) {
  const {
    onBeforeEdit,
    onAfterEditComplete,
    onEditOpenFailed,
  } = useITDashboardEditReturnRefresh(kfInstance, requestRefresh);

  const openRecordEdit = useCallback((kf, row, queueType) => (
    queueType === 'cr'
      ? openITEditChangeRequestPage(kf, row)
      : openITEditServiceRecordPage(kf, row)
  ), []);

  const getEditRecordCellProps = useCallback((queueType) => ({
    openRecord: (kf, row) => openRecordEdit(kf, row, queueType),
    onBeforeEdit,
    onAfterEditComplete,
    onEditOpenFailed,
  }), [openRecordEdit, onBeforeEdit, onAfterEditComplete, onEditOpenFailed]);

  return useMemo(() => ({
    getEditRecordCellProps,
  }), [getEditRecordCellProps]);
}
