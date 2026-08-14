import { MOCK_IT_REPORT } from './itServiceRequests.js';

/** Preview user — IT agent with tasks at IT Agent step */
export const MOCK_IT_AGENT_USER = {
  _id: 'UsCw2I27fXaf',
  Name: 'Karthikaa',
  Email: 'karthikaa@kissflow.com',
};

export const MOCK_IT_AGENT_TASKS = {
  Data: (MOCK_IT_REPORT.Data || []).filter((item) => {
    const step = String(item.Column_AAzsUJZUKJ || '').trim();
    const itemStatus = String(item.Column_h0m9vgD5Rp || '').trim();
    const lastStep = String(item.Column_1yQHmlT_Vg || '').trim();
    return step === 'IT Agent'
      || step === 'IT Agent Refex'
      || itemStatus === 'Resolved'
      || itemStatus === 'Completed'
      || itemStatus === 'Open'
      || itemStatus === 'In Progress'
      || itemStatus === 'On Hold'
      || lastStep === 'IT Agent'
      || lastStep === 'IT Agent Refex';
  }),
};
