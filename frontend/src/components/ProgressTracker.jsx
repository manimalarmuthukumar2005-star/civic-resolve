import React from 'react';

const STEPS = [
  { key: 'Pending',     label: 'Submitted',   icon: '📝', sub: 'Complaint received' },
  { key: 'In Progress', label: 'In Progress',  icon: '🔧', sub: 'Department working on it' },
  { key: 'Completed',   label: 'Resolved',     icon: '✅', sub: 'Issue fixed' },
];

const ORDER = { 'Pending': 0, 'In Progress': 1, 'Completed': 2, 'Reopened': 1 };

export default function ProgressTracker({ status }) {
  const current = ORDER[status] ?? 0;
  const isReopened = status === 'Reopened';

  return (
    <div className="progress-tracker">
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current && !isReopened;
        const state  = done ? 'done' : active ? 'active' : 'pending';
        return (
          <React.Fragment key={step.key}>
            <div className={`pt-step pt-${state}`}>
              <div className="pt-circle">
                {done ? '✓' : step.icon}
              </div>
              <div className="pt-label">{step.label}</div>
              <div className="pt-sub">{step.sub}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`pt-line ${done ? 'pt-line-done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
      {isReopened && (
        <div className="pt-reopened-tag">🔁 Reopened — under review</div>
      )}
    </div>
  );
}
