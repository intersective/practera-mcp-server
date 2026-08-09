export interface ProjectBriefCard {
  id: string;
  title: string;
  url: string;
  industry: string;
  projectType: string;
  durationWeeks: number;
  technicalSkills: string[];
  professionalSkills: string[];
  deliverables: string[];
}

export interface ProjectBriefsData {
  view: 'project_briefs';
  briefs: ProjectBriefCard[];
}

export function ProjectBriefs({ data }: { data: ProjectBriefsData }) {
  if (data.briefs.length === 0) {
    return (
      <div className="idle-state">
        <p className="idle-title">No project briefs found</p>
        <p className="idle-subtitle">Try a broader skill or capability.</p>
      </div>
    );
  }

  return (
    <main className="briefs-shell">
      <header className="briefs-header">
        <div>
          <p className="eyebrow">Practera project library</p>
          <h1>Experiential learning briefs</h1>
        </div>
        <span className="result-count">{data.briefs.length} result{data.briefs.length === 1 ? '' : 's'}</span>
      </header>

      <div className="brief-grid">
        {data.briefs.map((brief) => (
          <article className="brief-card" key={brief.id}>
            <div className="brief-meta">
              <span>{brief.industry}</span>
              <span>{brief.durationWeeks} weeks</span>
            </div>
            <h2>{brief.title}</h2>
            <p className="project-type">{brief.projectType}</p>

            <div className="skill-list" aria-label="Skills">
              {[...brief.technicalSkills, ...brief.professionalSkills].slice(0, 6).map((skill) => (
                <span className="skill-chip" key={skill}>{skill}</span>
              ))}
            </div>

            <div className="deliverables">
              <h3>Example deliverables</h3>
              <ul>
                {brief.deliverables.slice(0, 3).map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </div>

            <a href={brief.url} target="_blank" rel="noreferrer">View full brief →</a>
          </article>
        ))}
      </div>
    </main>
  );
}
