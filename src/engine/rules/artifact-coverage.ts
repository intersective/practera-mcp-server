import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/** Every required artifact must appear in at least one activity's artifactIds list. */
export function artifactCoverageRule(design: ExperienceDesign): RuleResult {
  const findings = [];
  const allActivityArtifacts = new Set(design.activities.flatMap(a => a.artifactIds));

  for (const artifact of design.artifacts) {
    if (!allActivityArtifacts.has(artifact.id)) {
      findings.push(finding(
        'artifactCoverage',
        'high',
        `Artifact "${artifact.name}" is defined but not assigned to any activity. Learners have no context for producing it.`,
        {
          affectedIds: [artifact.id],
          suggestion: 'Assign this artifact to the activity where learners will create or submit it.',
        }
      ));
    }

    if (artifact.revisionRequired) {
      const activitiesWithArtifact = design.activities.filter(a => a.artifactIds.includes(artifact.id));
      if (activitiesWithArtifact.length < 2) {
        findings.push(finding(
          'artifactCoverage',
          'medium',
          `Artifact "${artifact.name}" is marked revision-required but only appears in one activity. There is no revision step.`,
          {
            affectedIds: [artifact.id],
            suggestion: 'Create a second activity for the revised submission after the feedback activity.',
          }
        ));
      }
    }
  }

  return { findings };
}
