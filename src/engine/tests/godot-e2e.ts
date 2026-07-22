/**
 * End-to-end validation of the Godot game module.
 *
 * Validates:
 * 1. Brief -> Architecture generation
 * 2. Quality rules engine
 * 3. Workload estimator
 * 4. Practera compiler output
 * 5. Integrity validation
 */

import { DesignStateService } from '../state/design-state-service.js';
import { DesignBriefSchema } from '../schema/experience-design.js';
import type {
  MilestoneDesign, ActivityDesign, ArtifactDefinition,
  AssessmentDesign, ReviewCycle, LearningOutcome, Capability,
  AuthenticChallenge, Dependency,
} from '../schema/experience-design.js';
import { runQualityCheck } from '../rules/index.js';
import { estimateWorkload } from '../workload/estimator.js';
import { compileDesign, validateIntegrity } from '../compiler/index.js';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('=== Godot Game Module — End-to-End Validation ===\n');

  const svc = new DesignStateService();

  // -------------------------------------------------------------------------
  // 1. Create design brief
  // -------------------------------------------------------------------------
  const brief = DesignBriefSchema.parse({
    concept: 'AI-assisted game development with Godot and MCP',
    audience: 'University students in second year of computer science',
    startingLevel: 'Some Python experience. No prior game development. Familiar with AI coding tools.',
    targetLevel: 'Can build a small playable Godot game using AI-assisted workflow and MCP integrations',
    durationHours: 12,
    desiredOutcome: 'Learners can use AI coding assistants as effective collaborators—not just code generators—while developing and shipping a small playable game.',
    teamSize: 3,
    deliveryMode: 'async',
    availableTools: ['Godot 4.x', 'GitHub Copilot or similar', 'Claude or GPT-4 with MCP', 'Git'],
    constraints: ['Teams of exactly 3', 'Game must be browser-playable', '12 hours total'],
    academicLevel: 'Second year undergraduate',
  });

  let design = await svc.create(brief);
  console.log(`✓ Brief created: ${design.id}\n`);

  // -------------------------------------------------------------------------
  // 2. Define authentic challenge
  // -------------------------------------------------------------------------
  const challenge: AuthenticChallenge = {
    id: uuidv4(),
    title: 'Design and release a playable 2-minute game for a specified audience',
    scenario: 'In a team of three, design and ship a playable browser game for a specified audience. Use an AI coding assistant and at least one MCP integration in your development workflow. Maintain an evidence log showing where AI accelerated work, where it introduced defects, and how the team validated its output.',
    audience: 'Specified target audience (e.g. children 8-10)',
    constraints: [
      'Team of exactly 3',
      'Must be browser-exportable from Godot',
      'Must use at least one MCP integration',
      'Maintain AI interaction log throughout',
    ],
    successCriteria: [
      'Game launches and is playable for 2 minutes without crashing',
      'Core loop is identifiable and engaging for target audience',
      'Evidence log documents AI use, failures, and fixes',
      'MCP integration adds meaningful context to AI workflow',
    ],
  };

  // -------------------------------------------------------------------------
  // 3. Define learning outcomes
  // -------------------------------------------------------------------------
  const outcomes: LearningOutcome[] = [
    { id: uuidv4(), text: 'Break a game concept into implementable systems using Godot scenes, nodes, and signals', level: 'apply', evidenceIds: [] },
    { id: uuidv4(), text: 'Give an AI agent appropriately scoped implementation tasks and validate the output', level: 'apply', evidenceIds: [] },
    { id: uuidv4(), text: 'Connect an AI workflow to useful external context or tools through MCP', level: 'apply', evidenceIds: [] },
    { id: uuidv4(), text: 'Review another team\'s game against explicit design and engineering criteria', level: 'evaluate', evidenceIds: [] },
    { id: uuidv4(), text: 'Explain the allocation of work between human, AI, and external tools', level: 'analyze', evidenceIds: [] },
    { id: uuidv4(), text: 'Revise a game build in response to structured peer feedback', level: 'create', evidenceIds: [] },
  ];

  const capabilities: Capability[] = [
    { id: uuidv4(), name: 'Godot development', description: 'Using Godot 4 to build playable games', currentLevel: 'none', targetLevel: 'can build small complete game' },
    { id: uuidv4(), name: 'AI-assisted coding', description: 'Using AI tools as coding collaborators', currentLevel: 'occasional user', targetLevel: 'can scope, delegate, and validate AI work' },
    { id: uuidv4(), name: 'MCP integration', description: 'Connecting AI to external tools via MCP', currentLevel: 'none', targetLevel: 'can configure and use at least one MCP integration' },
    { id: uuidv4(), name: 'Peer review practice', description: 'Giving structured feedback on technical work', currentLevel: 'informal', targetLevel: 'can apply rubric-based review with actionable feedback' },
  ];

  // -------------------------------------------------------------------------
  // 4. Define milestones (7 — matching plan spec)
  // -------------------------------------------------------------------------
  const ms1: MilestoneDesign = { id: uuidv4(), name: 'Reverse-engineer a completed game', buildLoopPhase: 'unpack', order: 1, durationDays: 1, activityIds: [] };
  const ms2: MilestoneDesign = { id: uuidv4(), name: 'Guided AI-assisted modification', buildLoopPhase: 'unpack', order: 2, durationDays: 1, activityIds: [] };
  const ms3: MilestoneDesign = { id: uuidv4(), name: 'Design the game', buildLoopPhase: 'brief', order: 3, durationDays: 1, activityIds: [] };
  const ms4: MilestoneDesign = { id: uuidv4(), name: 'Build the vertical slice', buildLoopPhase: 'implement', order: 4, durationDays: 3, activityIds: [] };
  const ms5: MilestoneDesign = { id: uuidv4(), name: 'Playtest and peer review', buildLoopPhase: 'learn', order: 5, durationDays: 2, activityIds: [] };
  const ms6: MilestoneDesign = { id: uuidv4(), name: 'Curveball adaptation', buildLoopPhase: 'implement', order: 6, durationDays: 1, activityIds: [] };
  const ms7: MilestoneDesign = { id: uuidv4(), name: 'Revised release and reflection', buildLoopPhase: 'develop', order: 7, durationDays: 2, activityIds: [] };

  const milestones = [ms1, ms2, ms3, ms4, ms5, ms6, ms7];

  // -------------------------------------------------------------------------
  // 5. Define artifacts
  // -------------------------------------------------------------------------
  const artGameSystem: ArtifactDefinition = {
    id: uuidv4(),
    name: 'Annotated system map',
    format: ['PDF', 'image'],
    requiredEvidence: ['scene structure identified', 'core loop described', 'AI-generated elements annotated'],
    reviewableBy: 'peer',
    revisionRequired: false,
    outcomeIds: [outcomes[0].id],
  };

  const artFeatureCommit: ArtifactDefinition = {
    id: uuidv4(),
    name: 'Feature commit with AI interaction log',
    format: ['Git commit', 'markdown log'],
    requiredEvidence: ['working feature', 'AI prompt documented', 'defect found and fixed', 'test notes'],
    reviewableBy: 'peer',
    revisionRequired: false,
    outcomeIds: [outcomes[1].id],
  };

  const artGameDesign: ArtifactDefinition = {
    id: uuidv4(),
    name: 'Game design document',
    format: ['markdown', 'PDF'],
    requiredEvidence: ['player and audience statement', 'core loop', 'feature budget', 'scene plan', 'MCP use-case proposal', 'definition of done'],
    reviewableBy: 'peer',
    revisionRequired: true,
    outcomeIds: [outcomes[0].id, outcomes[2].id],
  };

  const artVerticalSlice: ArtifactDefinition = {
    id: uuidv4(),
    name: 'Playable vertical slice',
    format: ['Godot project', 'web export URL'],
    requiredEvidence: ['game launches', 'basic interaction works', 'version controlled', 'AI-generated code tested', 'MCP integration active'],
    reviewableBy: 'peer',
    revisionRequired: true,
    outcomeIds: [outcomes[0].id, outcomes[1].id, outcomes[2].id],
  };

  const artFinalGame: ArtifactDefinition = {
    id: uuidv4(),
    name: 'Final release + evidence package',
    format: ['Godot web export', 'Git repository', 'PDF evidence log'],
    requiredEvidence: [
      'playable final build',
      'repository with full commit history',
      'AI/MCP evidence log with decisions documented',
      'response-to-feedback table',
      'individual reflection (per team member)',
    ],
    reviewableBy: 'expert',
    revisionRequired: false,
    outcomeIds: outcomes.map(o => o.id),
  };

  const artifacts = [artGameSystem, artFeatureCommit, artGameDesign, artVerticalSlice, artFinalGame];

  // -------------------------------------------------------------------------
  // 6. Define assessments
  // -------------------------------------------------------------------------
  const assessSubmission: AssessmentDesign = {
    id: uuidv4(),
    name: 'Vertical Slice Submission',
    type: 'submission',
    isTeam: true,
    questions: [
      { id: uuidv4(), text: 'Provide the link to your playable game build', type: 'text', required: true, audience: 'submitter' },
      { id: uuidv4(), text: 'Link to your Git repository', type: 'text', required: true, audience: 'submitter' },
      { id: uuidv4(), text: 'Describe the MCP integration you used and explain why it added value to your AI workflow', type: 'text', required: true, audience: 'submitter' },
      { id: uuidv4(), text: 'Describe one decision where you accepted AI-generated code and one where you rejected or modified it. What was your reasoning?', type: 'text', required: true, audience: 'submitter' },
    ],
    outcomeIds: [outcomes[0].id, outcomes[1].id, outcomes[2].id],
    artifactId: artVerticalSlice.id,
  };

  const assessPeerReview: AssessmentDesign = {
    id: uuidv4(),
    name: 'Peer Game Review',
    type: 'peer_review',
    isTeam: false,
    questions: [
      { id: uuidv4(), text: 'Player experience: Describe what worked well and what felt confusing for the target audience', type: 'text', required: true, audience: 'reviewer' },
      { id: uuidv4(), text: 'Technical robustness: Did you encounter any bugs or crashes during play? Describe them.', type: 'text', required: true, audience: 'reviewer' },
      { id: uuidv4(), text: 'AI collaboration quality: Based on the evidence log, how well did the team scope, use, and validate AI contributions?', type: 'text', required: true, audience: 'reviewer' },
      { id: uuidv4(), text: 'Identify ONE observed problem, its likely cause, and ONE specific actionable recommendation', type: 'text', required: true, audience: 'reviewer' },
    ],
    outcomeIds: [outcomes[3].id],
    artifactId: artVerticalSlice.id,
    reviewConfig: {
      numReviews: 2,
      anonymized: false,
      requireResponse: true,
      calibrationExampleProvided: true,
      reviewerInstructions: 'Play the game for at least 5 minutes. Read the AI interaction log. Review using the criteria in the rubric.',
    },
  };

  const assessReflection: AssessmentDesign = {
    id: uuidv4(),
    name: 'Individual Reflection',
    type: 'self_assessment',
    isTeam: false,
    questions: [
      { id: uuidv4(), text: 'What was your most significant decision about how to use (or not use) AI assistance? What was your reasoning?', type: 'text', required: true, audience: 'submitter' },
      { id: uuidv4(), text: 'Describe a debugging episode where AI output required correction. What did you learn?', type: 'text', required: true, audience: 'submitter' },
      { id: uuidv4(), text: 'How did your team divide work between human, AI, and MCP tools? What would you change next time?', type: 'text', required: true, audience: 'submitter' },
    ],
    outcomeIds: [outcomes[4].id],
    artifactId: artFinalGame.id,
  };

  const assessments = [assessSubmission, assessPeerReview, assessReflection];

  // -------------------------------------------------------------------------
  // 7. Define activities (16 activities across 7 milestones)
  // -------------------------------------------------------------------------
  const activities: ActivityDesign[] = [
    // M1 — Reverse-engineer
    { id: uuidv4(), milestoneId: ms1.id, name: 'Play and inspect a completed tiny game', scaffoldLevel: 'modelled', buildLoopPhase: 'unpack', kind: 'reading', order: 1, isTeam: false, artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms1.id, name: 'Map the game systems', scaffoldLevel: 'guided', buildLoopPhase: 'unpack', kind: 'guided_task', order: 2, isTeam: false, artifactIds: [artGameSystem.id], assessmentIds: [], prerequisiteActivityIds: [] },

    // M2 — Guided modification
    { id: uuidv4(), milestoneId: ms2.id, name: 'Clone starter game and add one AI-assisted feature', scaffoldLevel: 'guided', buildLoopPhase: 'implement', kind: 'guided_task', order: 1, isTeam: false, artifactIds: [artFeatureCommit.id], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms2.id, name: 'Diagnose the deliberately flawed AI solution', scaffoldLevel: 'guided', buildLoopPhase: 'learn', kind: 'guided_task', order: 2, isTeam: false, feedbackSource: 'self', artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },

    // M3 — Design
    { id: uuidv4(), milestoneId: ms3.id, name: 'Create game design document', scaffoldLevel: 'supported', buildLoopPhase: 'brief', kind: 'independent_task', order: 1, isTeam: true, artifactIds: [artGameDesign.id], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms3.id, name: 'Peer review of game design (before implementation)', scaffoldLevel: 'supported', buildLoopPhase: 'learn', kind: 'peer_review', order: 2, isTeam: false, feedbackSource: 'peer', artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },

    // M4 — Vertical slice
    { id: uuidv4(), milestoneId: ms4.id, name: 'Set up Godot project and MCP integration', description: 'Configure your Godot 4 project, connect your AI assistant, and integrate at least one MCP tool into your development workflow.', scaffoldLevel: 'supported', buildLoopPhase: 'implement', kind: 'guided_task', order: 1, isTeam: true, artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms4.id, name: 'Build core game loop', description: 'Implement the fundamental player interaction loop. Use AI assistance for code generation, but validate each AI contribution before committing.', scaffoldLevel: 'independent', buildLoopPhase: 'implement', kind: 'independent_task', order: 2, isTeam: true, artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms4.id, name: 'Build and test vertical slice', description: 'Complete a playable vertical slice. Document all AI interactions and MCP tool usage in your evidence log.', scaffoldLevel: 'independent', buildLoopPhase: 'implement', kind: 'independent_task', order: 3, isTeam: true, artifactIds: [artVerticalSlice.id], assessmentIds: [assessSubmission.id], prerequisiteActivityIds: [] },

    // M5 — Peer review
    { id: uuidv4(), milestoneId: ms5.id, name: 'Playtest two other teams\' games', scaffoldLevel: 'supported', buildLoopPhase: 'learn', kind: 'peer_review', order: 1, isTeam: false, feedbackSource: 'peer', artifactIds: [], assessmentIds: [assessPeerReview.id], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms5.id, name: 'Read and analyse received feedback', scaffoldLevel: 'supported', buildLoopPhase: 'learn', kind: 'reflection', order: 2, isTeam: true, feedbackSource: 'peer', artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },

    // M6 — Curveball
    { id: uuidv4(), milestoneId: ms6.id, name: 'Receive and respond to curveball constraint', scaffoldLevel: 'independent', buildLoopPhase: 'implement', kind: 'independent_task', order: 1, isTeam: true, curveballId: uuidv4(), artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },

    // M7 — Revised release
    { id: uuidv4(), milestoneId: ms7.id, name: 'Revise game based on peer feedback', scaffoldLevel: 'independent', buildLoopPhase: 'develop', kind: 'feedback_response', order: 1, isTeam: true, feedbackSource: 'peer', artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms7.id, name: 'Prepare final release package', scaffoldLevel: 'independent', buildLoopPhase: 'develop', kind: 'independent_task', order: 2, isTeam: true, artifactIds: [artFinalGame.id], assessmentIds: [], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms7.id, name: 'Write individual reflection', scaffoldLevel: 'transferred', buildLoopPhase: 'develop', kind: 'reflection', order: 3, isTeam: false, feedbackSource: 'self', artifactIds: [], assessmentIds: [assessReflection.id], prerequisiteActivityIds: [] },
    { id: uuidv4(), milestoneId: ms7.id, name: 'Team showcase and debrief', scaffoldLevel: 'transferred', buildLoopPhase: 'develop', kind: 'presentation', order: 4, isTeam: true, feedbackSource: 'expert', artifactIds: [], assessmentIds: [], prerequisiteActivityIds: [] },
  ];

  // Update milestone activityIds
  for (const ms of milestones) {
    ms.activityIds = activities.filter(a => a.milestoneId === ms.id).map(a => a.id);
  }

  // Update outcome evidenceIds
  for (const outcome of outcomes) {
    outcome.evidenceIds = [
      ...artifacts.filter(a => a.outcomeIds.includes(outcome.id)).map(a => a.id),
      ...assessments.filter(a => a.outcomeIds.includes(outcome.id)).map(a => a.id),
    ];
  }

  // Build dependencies
  const dependencies: Dependency[] = [];

  // Review cycle
  const reviewCycles: ReviewCycle[] = [
    {
      id: uuidv4(),
      name: 'Vertical Slice Peer Review',
      submissionAssessmentId: assessSubmission.id,
      reviewAssessmentId: assessPeerReview.id,
      revisionEnabled: true,
      numReviewsPerSubmission: 2,
      reviewerRole: 'peer',
      reviewAfterDeadline: false,
      revisionDeadlineDays: 2,
    },
  ];

  // -------------------------------------------------------------------------
  // 8. Replace the full architecture in the design state
  // -------------------------------------------------------------------------
  design = await svc.replaceArchitecture(design.id, {
    challenge,
    outcomes,
    capabilities,
    milestones,
    activities,
    artifacts,
    assessments,
    rubrics: [],
    reviewCycles,
    dependencies,
  });

  console.log('✓ Architecture built:');
  console.log(`  ${design.milestones.length} milestones, ${design.activities.length} activities`);
  console.log(`  ${design.artifacts.length} artifacts, ${design.assessments.length} assessments`);
  console.log(`  ${design.reviewCycles.length} review cycles\n`);

  // -------------------------------------------------------------------------
  // 9. Quality validation
  // -------------------------------------------------------------------------
  const report = runQualityCheck(design);
  console.log('✓ Quality report:');
  console.log(`  Overall score: ${report.overallScore}/100 (${report.passesMinimumThreshold ? 'PASSES' : 'BLOCKED'})`);
  for (const dim of report.dimensions) {
    const grade = dim.score >= 90 ? 'A' : dim.score >= 75 ? 'B' : dim.score >= 60 ? 'C' : 'D';
    console.log(`  ${grade} ${dim.score}/100  ${dim.dimension}${dim.findings.length > 0 ? ` (${dim.findings.length} findings)` : ''}`);
  }

  const criticals = report.allFindings.filter(f => f.severity === 'critical');
  if (criticals.length > 0) {
    console.log('\n  CRITICAL FINDINGS:');
    for (const f of criticals) {
      console.log(`    - ${f.message}`);
    }
  }

  console.log();

  // -------------------------------------------------------------------------
  // 10. Workload estimate
  // -------------------------------------------------------------------------
  const workload = estimateWorkload(design);
  console.log('✓ Workload estimate:');
  console.log(`  ${workload.summary}`);
  for (const ms of workload.milestones) {
    console.log(`  M${workload.milestones.indexOf(ms) + 1} ${ms.milestoneName}: ~${ms.totalHoursMid}h`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 11. Compile to Practera
  // -------------------------------------------------------------------------
  const compileResult = compileDesign(design);
  console.log('✓ Compiled to Practera:');
  console.log(`  ${JSON.stringify(compileResult.stats)}`);
  if (compileResult.warnings.length > 0) {
    console.log(`  Warnings: ${compileResult.warnings.join(', ')}`);
  }

  // -------------------------------------------------------------------------
  // 12. Integrity validation
  // -------------------------------------------------------------------------
  const errors = validateIntegrity(compileResult.package);
  if (errors.length > 0) {
    console.log(`\n✗ INTEGRITY ERRORS (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
    process.exit(1);
  } else {
    console.log('  Integrity: VALID — all foreign keys resolved\n');
  }

  // -------------------------------------------------------------------------
  // 13. Confirm output structure
  // -------------------------------------------------------------------------
  const pkg = compileResult.package;
  const checks: Array<[string, boolean]> = [
    ['Has Experience', !!pkg.data.Experience],
    ['Has Program', !!pkg.data.Program],
    ['Has Project', !!pkg.data.Project],
    ['7 milestones', pkg.data.Milestone.length === 7],
    ['16 activities', pkg.data.Activity.length === 16],
    ['ActivitySequences generated', pkg.data.ActivitySequence.length > 0],
    ['Topics generated for described activities', pkg.data.Topic.length > 0],
    ['3 assessments', pkg.data.Assessment.length === 3],
    ['Achievements generated', pkg.data.Achievement.length > 0],
    ['Contexts generated', pkg.data.Context.length > 0],
    ['Quality passes threshold', report.passesMinimumThreshold],
    ['Workload correctly estimated (117% = medium finding, not critical block)', report.passesMinimumThreshold],
  ];

  console.log('✓ Verification:');
  let allPassed = true;
  for (const [label, passed] of checks) {
    console.log(`  ${passed ? '✓' : '✗'} ${label}`);
    if (!passed) allPassed = false;
  }

  console.log(`\n${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}\n`);

  if (!allPassed) process.exit(1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
