import React from 'react';
import MergeReviewModal from './MergeReviewModal';

/**
 * Staging promote modal for reviewing merge decisions when promoting staged contacts.
 * Thin wrapper around MergeReviewModal with staging-specific labels.
 *
 * Props:
 * - staged: the staged contact being promoted
 * - matchedContact: the existing contact it matches
 * - onPromote: (stagedId, { merge: boolean, merge_fields?: object }) => void
 * - onClose: () => void
 */
export default function StagingPromoteModal({ staged, matchedContact, onPromote, onClose }) {
  // Convert to items array format expected by MergeReviewModal
  const items = [{
    incoming: staged,
    existing: matchedContact,
    matchType: 'name match'  // Staging always detects via name/LinkedIn
  }];

  const handleMerge = (existingId, mergedFields) => {
    onPromote(staged.id, { merge: true, merge_fields: mergedFields });
  };

  const handleCreateAnyway = () => {
    onPromote(staged.id, { merge: false });
  };

  const handleSkip = () => {
    // Skip in promote context = cancel/close
    onClose();
  };

  return (
    <MergeReviewModal
      items={items}
      title="Promote to Contact"
      existingLabel="Existing Contact"
      incomingLabel="Staged (Incoming)"
      mergeLabel="Merge into Contact"
      createLabel="Create New"
      skipLabel="Cancel"
      showSkip={true}
      onMerge={handleMerge}
      onSkip={handleSkip}
      onCreateAnyway={handleCreateAnyway}
      onClose={onClose}
    />
  );
}
