import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initBridge, onToolResult, type McpToolResult } from './bridge.js';
import { ExperienceMap } from './views/ExperienceMap.js';
import { AlignmentMatrix } from './views/AlignmentMatrix.js';
import { QualityReport } from './views/QualityReport.js';
import { ProjectBriefs, type ProjectBriefsData } from './views/ProjectBriefs.js';
import './styles.css';

type View = 'project_briefs' | 'experience_map' | 'alignment_matrix' | 'quality_report' | 'idle';

function App() {
  const [view, setView] = useState<View>('idle');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    const applyResult = (result: McpToolResult) => {
      let nextData = result.structuredContent;
      if (!nextData && result.content?.[0]?.text) {
        try {
          nextData = JSON.parse(result.content[0].text);
        } catch {
          return;
        }
      }

      if (!nextData || typeof nextData !== 'object') return;
      const nextView = (nextData as { view?: View }).view;
      if (!nextView) return;
      setData(nextData);
      setView(nextView);
    };

    const cleanup = onToolResult(applyResult);
    void initBridge();
    return cleanup;
  }, []);

  if (view === 'project_briefs' && data) {
    return <ProjectBriefs data={data as ProjectBriefsData} />;
  }

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
