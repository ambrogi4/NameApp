import React from 'react';
import MergeReviewModal from './MergeReviewModal';

/**
 * Duplicate review modal for paste workflow.
 * Thin wrapper around MergeReviewModal with paste-specific labels.
 */
export default function DupeReviewModal({ dupes, onMerge, onSkip, onCreateAnyway, onClose }) {
  return (
    <MergeReviewModal
      items={dupes}
      title="Duplicate Review"
      existingLabel="Existing"
      incomingLabel="Incoming"
      mergeLabel="Apply Merge"
      createLabel="Create Anyway"
      skipLabel="Skip"
      showSkip={true}
      onMerge={(existingId, mergedFields) => onMerge(existingId, mergedFields)}
      onSkip={onSkip}
      onCreateAnyway={(incoming) => onCreateAnyway(incoming)}
      onClose={onClose}
    />
  );
}
