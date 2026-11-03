import { useEffect, useState } from 'react';
import { setRefexServiceComments } from '../../itsm/refex/employeedashboard/commentChannel.js';

/** Refex comment packs only (Agent Refex, IT Manager, IT Head, Common Refex). */
export function useRefexServiceComments() {
  useState(() => setRefexServiceComments(true));
  useEffect(() => {
    setRefexServiceComments(true);
    return () => setRefexServiceComments(false);
  }, []);
}
