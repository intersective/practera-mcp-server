interface Column {
  id: string;
  type: 'activity' | 'assessment';
  name: string;
  milestoneName: string;
}

interface Cell {
  columnId: string;
  aligned: boolean;
  evidence: string[];
}

interface Row {
  outcomeId: string;
  outcomeText: string;
  level?: string;
  cells: Cell[];
  alignedCount: number;
  hasGap: boolean;
}

export interface AlignmentMatrixData {
  designId: string;
  rows: Row[];
  columns: Column[];
  outcomeCount: number;
  gapCount: number;
  status: string;
}

export function AlignmentMatrix({ data }: { data: AlignmentMatrixData }) {
  const { rows, columns, gapCount } = data;
  const maxNameLen = 24;

  function truncate(s: string, n = maxNameLen) {
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  return (
    <div style={{
      padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4 }}>
          Alignment Matrix
        </h2>
        <p style={{ fontSize: 12, color: gapCount > 0 ? '#dc2626' : '#16a34a' }}>
          {gapCount > 0
            ? `⚠ ${gapCount} outcome${gapCount > 1 ? 's' : ''} have no evidence`
            : '✓ All outcomes are evidenced'}
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          borderCollapse: 'collapse',
          fontSize: 12,
          minWidth: 400,
          width: '100%',
        }}>
          <thead>
            <tr>
              <th style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                padding: '6px 10px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#374151',
                whiteSpace: 'nowrap',
                minWidth: 160,
              }}>
                Learning Outcome
              </th>
              {columns.map(col => (
                <th key={col.id} style={{
                  background: col.type === 'assessment' ? '#f0f9ff' : '#f9fafb',
                  border: '1px solid #e5e7eb',
                  padding: '6px 8px',
                  textAlign: 'center',
                  fontWeight: 500,
                  color: col.type === 'assessment' ? '#0369a1' : '#374151',
                  maxWidth: 100,
                  minWidth: 60,
                }}>
                  <div title={col.name} style={{ fontSize: 11 }}>
                    {truncate(col.name, 18)}
                  </div>
                  {col.milestoneName && (
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                      {truncate(col.milestoneName, 14)}
                    </div>
                  )}
                  <div style={{
                    fontSize: 9,
                    color: col.type === 'assessment' ? '#0891b2' : '#6b7280',
                    marginTop: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {col.type}
                  </div>
                </th>
              ))}
              <th style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                padding: '6px 8px',
                textAlign: 'center',
                fontWeight: 600,
                color: '#374151',
                whiteSpace: 'nowrap',
              }}>
                Coverage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.outcomeId} style={{
                background: row.hasGap
                  ? '#fff5f5'
                  : rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb',
              }}>
                <td style={{
                  border: '1px solid #e5e7eb',
                  padding: '7px 10px',
                  color: row.hasGap ? '#dc2626' : '#111',
                  fontWeight: row.hasGap ? 600 : 400,
                }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    {row.hasGap && <span style={{ marginRight: 4 }}>⚠</span>}
                    {row.outcomeText}
                  </div>
                  {row.level && (
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                      {row.level}
                    </div>
                  )}
                </td>
                {row.cells.map(cell => (
                  <td key={cell.columnId} style={{
                    border: '1px solid #e5e7eb',
                    textAlign: 'center',
                    padding: '6px 4px',
                    background: cell.aligned ? '#f0fdf4' : undefined,
                  }}>
                    {cell.aligned ? (
                      <span
                        title={cell.evidence.join(', ')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#16a34a',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: 14 }}>·</span>
                    )}
                  </td>
                ))}
                <td style={{
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                  padding: '6px 8px',
                  fontWeight: 600,
                  fontSize: 12,
                  color: row.hasGap ? '#dc2626' : row.alignedCount >= 3 ? '#16a34a' : '#d97706',
                }}>
                  {row.alignedCount}/{columns.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 12,
        display: 'flex',
        gap: 16,
        fontSize: 11,
        color: '#6b7280',
        flexWrap: 'wrap',
      }}>
        <span>
          <span style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '1px 5px', borderRadius: 3 }}>
            Activity columns
          </span>
        </span>
        <span>
          <span style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', padding: '1px 5px', borderRadius: 3, color: '#0369a1' }}>
            Assessment columns
          </span>
        </span>
        <span>
          <span style={{ background: '#fff5f5', padding: '1px 5px', borderRadius: 3, color: '#dc2626' }}>
            Rows highlighted red = gap
          </span>
        </span>
      </div>
    </div>
  );
}
