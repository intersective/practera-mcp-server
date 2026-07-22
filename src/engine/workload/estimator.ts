import { ExperienceDesign, ActivityDesign, MilestoneDesign } from '../schema/experience-design.js';
import { ACTIVITY_KIND_MINUTES } from '../schema/build-loop.js';

export interface ActivityWorkload {
  activityId: string;
  activityName: string;
  kind: string;
  scaffoldLevel: string;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  estimatedMinutesMid: number;
}

export interface MilestoneWorkload {
  milestoneId: string;
  milestoneName: string;
  activities: ActivityWorkload[];
  totalMinutesMin: number;
  totalMinutesMax: number;
  totalMinutesMid: number;
  totalHoursMin: number;
  totalHoursMax: number;
  totalHoursMid: number;
}

export interface WorkloadEstimate {
  budgetHours: number;
  budgetMinutes: number;
  milestones: MilestoneWorkload[];
  totalMinutesMin: number;
  totalMinutesMax: number;
  totalMinutesMid: number;
  totalHoursMin: number;
  totalHoursMax: number;
  totalHoursMid: number;
  utilizationPercent: number;
  status: 'within_budget' | 'over_budget' | 'under_budget';
  summary: string;
}

function minutesForActivity(activity: ActivityDesign): [number, number] {
  if (activity.estimatedMinutes) {
    return [activity.estimatedMinutes, activity.estimatedMinutes];
  }
  const [min, max] = ACTIVITY_KIND_MINUTES[activity.kind];

  // Scaffold level modifiers — higher scaffold = more time needed
  const scaffoldMultiplier: Record<string, number> = {
    modelled: 0.7,
    guided: 0.9,
    supported: 1.0,
    independent: 1.2,
    transferred: 1.3,
  };
  const mult = scaffoldMultiplier[activity.scaffoldLevel] ?? 1.0;
  return [Math.round(min * mult), Math.round(max * mult)];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function estimateWorkload(design: ExperienceDesign): WorkloadEstimate {
  const budgetHours = design.brief.durationHours;
  const budgetMinutes = budgetHours * 60;

  const sortedMilestones = [...design.milestones].sort((a, b) => a.order - b.order);

  const milestoneWorkloads: MilestoneWorkload[] = sortedMilestones.map((ms: MilestoneDesign) => {
    const msActivities = design.activities
      .filter(a => a.milestoneId === ms.id)
      .sort((a, b) => a.order - b.order);

    const activityWorkloads: ActivityWorkload[] = msActivities.map(act => {
      const [minM, maxM] = minutesForActivity(act);
      const mid = Math.round((minM + maxM) / 2);
      return {
        activityId: act.id,
        activityName: act.name,
        kind: act.kind,
        scaffoldLevel: act.scaffoldLevel,
        estimatedMinutesMin: minM,
        estimatedMinutesMax: maxM,
        estimatedMinutesMid: mid,
      };
    });

    const totalMin = activityWorkloads.reduce((s, a) => s + a.estimatedMinutesMin, 0);
    const totalMax = activityWorkloads.reduce((s, a) => s + a.estimatedMinutesMax, 0);
    const totalMid = activityWorkloads.reduce((s, a) => s + a.estimatedMinutesMid, 0);

    return {
      milestoneId: ms.id,
      milestoneName: ms.name,
      activities: activityWorkloads,
      totalMinutesMin: totalMin,
      totalMinutesMax: totalMax,
      totalMinutesMid: totalMid,
      totalHoursMin: round1(totalMin / 60),
      totalHoursMax: round1(totalMax / 60),
      totalHoursMid: round1(totalMid / 60),
    };
  });

  const totalMin = milestoneWorkloads.reduce((s, m) => s + m.totalMinutesMin, 0);
  const totalMax = milestoneWorkloads.reduce((s, m) => s + m.totalMinutesMax, 0);
  const totalMid = milestoneWorkloads.reduce((s, m) => s + m.totalMinutesMid, 0);

  const utilizationPercent = Math.round((totalMid / budgetMinutes) * 100);

  let status: WorkloadEstimate['status'];
  let summary: string;

  if (totalMid > budgetMinutes * 1.25) {
    status = 'over_budget';
    summary = `Estimated ~${round1(totalMid / 60)}h against a ${budgetHours}h budget (${utilizationPercent}%). The experience is significantly over budget — learners will not finish.`;
  } else if (totalMid > budgetMinutes) {
    status = 'over_budget';
    summary = `Estimated ~${round1(totalMid / 60)}h against a ${budgetHours}h budget (${utilizationPercent}%). Slightly over budget — the schedule is tight.`;
  } else if (totalMid < budgetMinutes * 0.5) {
    status = 'under_budget';
    summary = `Estimated ~${round1(totalMid / 60)}h against a ${budgetHours}h budget (${utilizationPercent}%). The experience uses less than half the available time — consider adding depth.`;
  } else {
    status = 'within_budget';
    summary = `Estimated ~${round1(totalMid / 60)}h against a ${budgetHours}h budget (${utilizationPercent}%). Workload is within budget.`;
  }

  return {
    budgetHours,
    budgetMinutes,
    milestones: milestoneWorkloads,
    totalMinutesMin: totalMin,
    totalMinutesMax: totalMax,
    totalMinutesMid: totalMid,
    totalHoursMin: round1(totalMin / 60),
    totalHoursMax: round1(totalMax / 60),
    totalHoursMid: round1(totalMid / 60),
    utilizationPercent,
    status,
    summary,
  };
}
