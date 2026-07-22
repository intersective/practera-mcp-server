import React from 'react';

interface ActivityNode {
  id: string;
  name: string;
  buildLoopPhase: string;
  buildLoopLabel: string;
  scaffoldLevel: string;
  kind: string;
  isTeam: boolean;
  feedbackSource?: string;
  estimatedMinutesMid?: number;
  artifactCount: number;
  assessmentCount: number;
  hasCurveball: boolean;
}

interface MilestoneNode {
  id: string;
  name: string;
  description?: string;
  buildLoopPhase: string;
  buildLoopLabel: string;
  order: number;
  estimatedHours?: number;
  activities: ActivityNode[];
}

export interface ExperienceMapData {
  designId: string;
  concept: string;
  audience: string;
  durationHours: number;
  teamSize: number;
  totalEstimatedHours: number;
  utilizationPercent: number;
  workloadStatus: 'within_budget' | 'over_budget' | 'under_budget';
  nodes: MilestoneNode[];
  challenge?: {
    title: string;
    constraints: string[];
    successCriteria: string[];
  } | null;
  outcomes: Array<{ id: string; text: string; level?: string }>;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  brief:     { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  unpack:    { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  implement: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  learn:     { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  develop:   { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
};

const SCAFFOLD_COLORS: Record<string, string> = {
  modelled:    '#7c3aed',
  guided:      '#2563eb',
  supported:   '#16a34a',
  independent: '#d97706',
  transferred: '#dc2626',
};

function ScaffoldDot({ level }: { level: string }) {
  return (
    <span
      title={level}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: SCAFFOLD_COLORS[level] ?? '#6b7280',
        flexShrink: 0,
      }}
    />
  );
}

function ActivityCard({ act }: { act: ActivityNode }) {
  const phase = PHASE_COLORS[act.buildLoopPhase] ?? PHASE_COLORS.brief;
  const mins = act.estimatedMinutesMid;
  const timeLabel = mins ? (mins >= 60 ? `${Math.round(mins / 6) / 10}h` : `${mins}m`) : null;

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${phase.border}`,
      borderLeft: `3px solid ${phase.text}`,
      borderRadius: 6,
      padding: '8px 10px',
      marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <ScaffoldDot level={act.scaffoldLevel} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#111', lineHeight: 1.3, marginBottom: 2 }}>
            {act.name}
            {act.hasCurveball && (
              <span title="Curveball" style={{ marginLeft: 4, fontSize: 10 }}>⚡</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 10,
              background: phase.bg,
              color: phase.text,
              padding: '1px 5px',
              borderRadius: 9999,
              fontWeight: 500,
            }}>
              {act.buildLoopLabel}
            </span>
            <span style={{ fontSize: 10, color: '#6b7280' }}>{act.kind.replace(/_/g, ' ')}</span>
            {act.isTeam && <span style={{ fontSize: 10, color: '#2563eb' }}>👥</span>}
            {act.feedbackSource && act.feedbackSource !== 'none' && (
              <span style={{ fontSize: 10, color: '#16a34a' }}>↩ {act.feedbackSource}</span>
            )}
            {timeLabel && <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>{timeLabel}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
            {act.artifactCount > 0 && (
              <span style={{ fontSize: 10, color: '#374151' }}>📄 {act.artifactCount}</span>
            )}
            {act.assessmentCount > 0 && (
              <span style={{ fontSize: 10, color: '#374151' }}>📋 {act.assessmentCount}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MilestoneColumn({ ms }: { ms: MilestoneNode }) {
  const phase = PHASE_COLORS[ms.buildLoopPhase] ?? PHASE_COLORS.brief;

  return (
    <div style={{
      minWidth: 200,
      maxWidth: 240,
      flexShrink: 0,
    }}>
      <div style={{
        background: phase.bg,
        border: `1px solid ${phase.border}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: phase.text,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {ms.order}. {ms.buildLoopLabel}
          </span>
          {ms.estimatedHours != null && (
            <span style={{ fontSize: 10, color: '#6b7280' }}>{ms.estimatedHours}h</span>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginTop: 2, lineHeight: 1.3 }}>
          {ms.name}
        </div>
        {ms.description && (
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4, lineHeight: 1.4 }}>
            {ms.description.slice(0, 120)}{ms.description.length > 120 ? '…' : ''}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
          {ms.activities.length} activit{ms.activities.length === 1 ? 'y' : 'ies'}
        </div>
      </div>
      <div>
        {ms.activities.map(act => (
          <ActivityCard key={act.id} act={act} />
        ))}
      </div>
    </div>
  );
}

export function ExperienceMap({ data }: { data: ExperienceMapData }) {
  const utilizationColor = data.workloadStatus === 'within_budget'
    ? '#16a34a'
    : data.workloadStatus === 'over_budget'
      ? '#dc2626'
      : '#d97706';

  return (
    <div style={{ padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4 }}>
          {data.concept}
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            👥 {data.audience}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            ⏱ {data.durationHours}h budget
          </span>
          <span style={{ fontSize: 12, color: utilizationColor, fontWeight: 600 }}>
            ~{data.totalEstimatedHours}h estimated ({data.utilizationPercent}%)
          </span>
          {data.teamSize > 1 && (
            <span style={{ fontSize: 12, color: '#2563eb' }}>Team of {data.teamSize}</span>
          )}
        </div>
      </div>

      {/* Challenge */}
      {data.challenge && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
        }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#0369a1', marginBottom: 4 }}>
            Authentic Challenge
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 6 }}>
            {data.challenge.title}
          </div>
          {data.challenge.constraints.length > 0 && (
            <div style={{ fontSize: 11, color: '#374151' }}>
              <span style={{ fontWeight: 600 }}>Constraints: </span>
              {data.challenge.constraints.join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Scaffold: </span>
        {['modelled', 'guided', 'supported', 'independent', 'transferred'].map(level => (
          <span key={level} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#374151' }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: SCAFFOLD_COLORS[level],
            }} />
            {level}
          </span>
        ))}
      </div>

      {/* Milestone columns */}
      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 8,
        alignItems: 'flex-start',
      }}>
        {data.nodes.map((ms, idx) => (
          <React.Fragment key={ms.id}>
            <MilestoneColumn ms={ms} />
            {idx < data.nodes.length - 1 && (
              <div style={{
                flexShrink: 0,
                alignSelf: 'flex-start',
                marginTop: 28,
                color: '#9ca3af',
                fontSize: 16,
              }}>
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Outcomes */}
      {data.outcomes.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Learning Outcomes ({data.outcomes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.outcomes.map((o, idx) => (
              <div key={o.id} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#374151' }}>
                <span style={{ color: '#9ca3af', flexShrink: 0 }}>{idx + 1}.</span>
                <span>{o.text}</span>
                {o.level && (
                  <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 4 }}>({o.level})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
