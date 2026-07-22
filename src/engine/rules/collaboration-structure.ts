import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/** Team tasks must require genuine interdependence, not parallel solo work. */
export function collaborationStructureRule(design: ExperienceDesign): RuleResult {
  const findings: import("../schema/experience-design.js").QualityFinding[] = [];

  const teamSize = design.brief.teamSize ?? 1;
  if (teamSize <= 1) return { findings }; // Individual experience — skip

  const teamActivities = design.activities.filter(a => a.isTeam);
  const individualActivities = design.activities.filter(a => !a.isTeam);

  if (teamActivities.length === 0 && design.activities.length > 0) {
    findings.push(finding(
      'collaborationStructure',
      'high',
      `The brief specifies teams of ${teamSize} but no activities are marked as team tasks.`,
      { suggestion: 'Mark collaborative activities as isTeam and ensure they require genuine shared work.' }
    ));
  }

  // Team assessments should be evaluated at team (or both team and individual) level
  const teamAssessments = design.assessments.filter(a => a.isTeam);
  const hasIndividualAccountability = design.assessments.some(a => !a.isTeam);

  if (teamActivities.length > 0 && !hasIndividualAccountability) {
    findings.push(finding(
      'collaborationStructure',
      'medium',
      'All assessments are team-level. There is no individual accountability, which may enable free-riding.',
      { suggestion: 'Add at least one individual reflection or contribution assessment.' }
    ));
  }

  if (teamSize > 1 && individualActivities.length === 0) {
    findings.push(finding(
      'collaborationStructure',
      'info',
      'Every activity is a team task with no individual work. Consider adding individual reflection to surface personal learning.',
      { suggestion: 'Add individual reflection activities to complement team deliverables.' }
    ));
  }

  void teamAssessments; // Used for structural check above

  return { findings };
}
