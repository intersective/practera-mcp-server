interface Finding {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  message: string;
  affectedIds?: string[];
  suggestion?: string;
}

interface Dimension {
  dimension: string;
  score: number;
  grade: string;
  findings: Finding[];
}

interface WorkloadSummary {
  summary: string;
  status: string;
  totalHoursMid: number;
  budgetHours: number;
  utilizationPercent: number;
}

export interface QualityReportData {
  designId: string;
  concept: string;
  overallScore: number;
  passesMinimumThreshold: boolean;
  generatedAt: string;
  dimensions: Dimension[];
  workload: WorkloadSummary;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  infoCount: number;
}

const SEVERITY_CONFIG = {
  critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '🚫', label: 'Critical' },
  high:     { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', icon: '⚠', label: 'High' },
  medium:   { bg: '#fefce8', border: '#fde047', text: '#854d0e', icon: '⬤', label: 'Medium' },
  info:     { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e', icon: 'ℹ', label: 'Info' },
};

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  const color = score >= 75 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `3px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.26, fontWeight: 700, color, lineHeight: 1 }}>{grade}</span>
      <span style={{ fontSize: size * 0.18, color, lineHeight: 1 }}>{score}</span>
    </div>
  );
}

function DimensionCard({ dim }: { dim: Dimension }) {
  const criticalFindings = dim.findings.filter(f => f.severity === 'critical');
  const otherFindings = dim.findings.filter(f => f.severity !== 'critical');
  const borderColor = dim.score >= 75 ? '#86efac' : dim.score >= 60 ? '#fde047' : '#fca5a5';

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
    }}>
      <div style={{
        padding: '8px 12px',
        background: dim.score >= 75 ? '#f0fdf4' : dim.score >= 60 ? '#fefce8' : '#fff5f5',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <ScoreRing score={dim.score} size={40} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{dim.dimension}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            Grade {dim.grade} · {dim.findings.length === 0 ? 'No issues' : `${dim.findings.length} finding${dim.findings.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      {dim.findings.length > 0 && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...criticalFindings, ...otherFindings].map((f, idx) => {
            const cfg = SEVERITY_CONFIG[f.severity];
            return (
              <div key={idx} style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 6,
                padding: '6px 8px',
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, color: cfg.text, lineHeight: 1.4 }}>{f.message}</div>
                    {f.suggestion && (
                      <div style={{ fontSize: 11, color: '#374151', marginTop: 4, lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 600 }}>Fix: </span>{f.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {dim.findings.length === 0 && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: '#16a34a' }}>
          ✓ No issues found
        </div>
      )}
    </div>
  );
}

export function QualityReport({ data }: { data: QualityReportData }) {
  const workloadColor = data.workload.status === 'within_budget'
    ? '#16a34a'
    : data.workload.status === 'over_budget'
      ? '#dc2626'
      : '#d97706';

  return (
    <div style={{
      padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Overall header */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        marginBottom: 16,
        background: data.passesMinimumThreshold ? '#f0fdf4' : '#fff5f5',
        border: `1px solid ${data.passesMinimumThreshold ? '#86efac' : '#fca5a5'}`,
        borderRadius: 10,
        padding: '12px 16px',
      }}>
        <ScoreRing score={data.overallScore} size={58} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 2 }}>
            {data.concept}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: data.passesMinimumThreshold ? '#16a34a' : '#dc2626',
            marginBottom: 6,
          }}>
            {data.passesMinimumThreshold
              ? '✓ Passes minimum threshold'
              : `🚫 Blocked — ${data.criticalCount} critical finding${data.criticalCount > 1 ? 's' : ''} must be resolved`}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {data.criticalCount > 0 && (
              <span style={{ fontSize: 11, background: '#fef2f2', color: '#991b1b', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                {data.criticalCount} critical
              </span>
            )}
            {data.highCount > 0 && (
              <span style={{ fontSize: 11, background: '#fff7ed', color: '#9a3412', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                {data.highCount} high
              </span>
            )}
            {data.mediumCount > 0 && (
              <span style={{ fontSize: 11, background: '#fefce8', color: '#854d0e', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                {data.mediumCount} medium
              </span>
            )}
            {data.infoCount > 0 && (
              <span style={{ fontSize: 11, background: '#f0f9ff', color: '#0c4a6e', padding: '2px 6px', borderRadius: 4 }}>
                {data.infoCount} info
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Workload summary */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Workload</span>
        <span style={{ fontSize: 12, color: workloadColor, fontWeight: 600 }}>
          {data.workload.totalHoursMid}h estimated / {data.workload.budgetHours}h budget
          ({data.workload.utilizationPercent}%)
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{data.workload.summary}</span>
      </div>

      {/* Dimension grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 10,
      }}>
        {data.dimensions.map(dim => (
          <DimensionCard key={dim.dimension} dim={dim} />
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
        Generated {new Date(data.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
