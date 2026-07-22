import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initBridge, onToolResult } from './bridge.js';
import { ExperienceMap } from './views/ExperienceMap.js';
import { AlignmentMatrix } from './views/AlignmentMatrix.js';
import { QualityReport } from './views/QualityReport.js';
import './styles.css';

type View = 'experience_map' | 'alignment_matrix' | 'quality_report' | 'idle';

function App() {
  const [view, setView] = useState<View>('idle');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    initBridge();

    const tools = ['render_experience_map', 'render_alignment_matrix', 'render_quality_report'];
    const cleanups = tools.map(tool =>
      onToolResult(tool, (payload) => {
        const result = payload.result as { content?: Array<{ text: string }> };
        if (result?.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(result.content[0].text);
            setData(parsed);
            setView(parsed.view as View ?? 'idle');
          } catch {
            // ignore parse errors
          }
        }
      })
    );

    return () => cleanups.forEach(c => c());
  }, []);

  if (view === 'experience_map' && data) {
    return <ExperienceMap data={data as Parameters<typeof ExperienceMap>[0]['data']} />;
  }

  if (view === 'alignment_matrix' && data) {
    return <AlignmentMatrix data={data as Parameters<typeof AlignmentMatrix>[0]['data']} />;
  }

  if (view === 'quality_report' && data) {
    return <QualityReport data={data as Parameters<typeof QualityReport>[0]['data']} />;
  }

  return (
    <div className="idle-state">
      <div className="idle-logo">⬡</div>
      <p className="idle-title">Experiential Learning Architect</p>
      <p className="idle-subtitle">Ask ChatGPT to design a learning experience to get started.</p>
    </div>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
