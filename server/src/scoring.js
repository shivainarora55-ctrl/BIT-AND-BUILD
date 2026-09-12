import { z } from 'zod';

export const RUBRIC = [
  { key: 'completeness', name: 'Completeness', maximum: 20 },
  { key: 'technical_execution', name: 'Technical Execution', maximum: 20 },
  { key: 'innovation_creativity', name: 'Innovation & Creativity', maximum: 15 },
  { key: 'applicability_scalability', name: 'Applicability & Scalability', maximum: 15 },
  { key: 'ui_ux', name: 'UI/UX', maximum: 10 },
  { key: 'bonus_features', name: 'Bonus Features', maximum: 10 },
  { key: 'presentation', name: 'Presentation', maximum: 5 },
  { key: 'work_distribution', name: 'Work Distribution', maximum: 5 },
];

export const EVALUATION_ROUNDS = ['round_1', 'round_2', 'round_3'];

export const scoreRequestSchema = z.object({
  team_id: z.string().uuid(),
  completeness: z.number().int().min(0).max(10),
  technical_execution: z.number().int().min(0).max(10),
  innovation_creativity: z.number().int().min(0).max(10),
  applicability_scalability: z.number().int().min(0).max(10),
  ui_ux: z.number().int().min(0).max(10),
  bonus_features: z.number().int().min(0).max(10),
  presentation: z.number().int().min(0).max(10).optional().default(0),
  work_distribution: z.number().int().min(0).max(10).optional().default(0),
  comments: z.string().max(5000).optional().default(''),
}).strict();

export function calculateScore(rawScores) {
  const weightedScores = Object.fromEntries(
    RUBRIC.map(({ key, maximum }) => [key, (rawScores[key] / 10) * maximum]),
  );
  const finalScore = RUBRIC.reduce((total, { key }) => total + weightedScores[key], 0);

  return { weightedScores, finalScore };
}

export function toDatabaseScore(payload) {
  const { weightedScores, finalScore } = calculateScore(payload);
  return {
    teamId: payload.team_id,
    completeness: payload.completeness,
    technicalExecution: payload.technical_execution,
    innovationCreativity: payload.innovation_creativity,
    applicabilityScalability: payload.applicability_scalability,
    uiUx: payload.ui_ux,
    bonusFeatures: payload.bonus_features,
    presentation: payload.presentation,
    workDistribution: payload.work_distribution,
    weightedScores,
    finalScore,
    comments: payload.comments,
  };
}

// Presentation reviews use the same eight Round 3 criteria.  Unlike project
// scoring's 0–10 raw inputs, these are entered as their final weighted marks.
export const presentationEvaluationSchema = z.object({
  completeness: z.number().int().min(0).max(20),
  technical_execution: z.number().int().min(0).max(20),
  innovation_creativity: z.number().int().min(0).max(15),
  applicability_scalability: z.number().int().min(0).max(15),
  ui_ux: z.number().int().min(0).max(10),
  bonus_features: z.number().int().min(0).max(10),
  presentation: z.number().int().min(0).max(5),
  work_distribution: z.number().int().min(0).max(5),
  comments: z.string().trim().max(5000).optional().default(''),
}).strict();

export const roundEvaluationSchema = presentationEvaluationSchema;

export function calculatePresentationEvaluation(scores) {
  const weightedScores = Object.fromEntries(RUBRIC.map(({ key }) => [key, scores[key]]));
  const finalScore = RUBRIC.reduce((total, { key }) => total + scores[key], 0);
  return { weightedScores, finalScore };
}
