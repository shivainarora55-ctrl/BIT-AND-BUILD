import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { EVALUATION_ROUNDS, RUBRIC } from '../src/scoring.js';

const config = { nodeEnv: 'test', frontendOrigin: 'http://localhost:5173', sessionCookieName: 'bb_session', sessionTtlHours: 8, uploadDir: '/tmp/uploads' };
const teamId = '11111111-1111-4111-8111-111111111111';
const evaluation = { completeness: 20, technical_execution: 20, innovation_creativity: 15, applicability_scalability: 15, ui_ux: 10, bonus_features: 10, presentation: 5, work_distribution: 5, comments: 'Complete review' };
function poolFor(role = 'judge') { return { connect: vi.fn(), query: vi.fn(async (sql) => {
  if (sql.includes('FROM sessions')) return { rows: [{ id: 'judge-id', email: 'judge@example.com', display_name: 'Judge', role, expires_at: new Date(Date.now() + 60000) }] };
  if (sql.startsWith('SELECT id FROM teams')) return { rows: [{ id: teamId }] };
  if (sql.startsWith('INSERT INTO round_evaluations')) return { rows: [{ ...evaluation, round_identifier: 'round_1', final_score: 100 }] };
  if (sql.includes('AVG(re.final_score)')) return { rows: [{ team_id: teamId, team_name: 'Team One', round_1_score: '80', round_2_score: '90', round_3_score: '100', completed_rounds: 3 }] };
  return { rows: [] };
}) }; }

describe('round evaluations', () => {
  test('uses the same eight criteria totalling 100 for all rounds', () => { expect(EVALUATION_ROUNDS).toEqual(['round_1', 'round_2', 'round_3']); expect(RUBRIC.reduce((sum, item) => sum + item.maximum, 0)).toBe(100); });
  test('saves a judge evaluation for each round and rejects invalid marks', async () => { for (const round of EVALUATION_ROUNDS) { const response = await request(createApp({ pool: poolFor(), config, logger: { error: vi.fn() } })).post(`/api/judge/round-evaluations/${round}/${teamId}`).set('Cookie', 'bb_session=valid').send(evaluation); expect(response.status).toBe(200); expect(response.body.evaluation.final_score).toBe(100); } const invalid = await request(createApp({ pool: poolFor(), config, logger: { error: vi.fn() } })).post(`/api/judge/round-evaluations/round_1/${teamId}`).set('Cookie', 'bb_session=valid').send({ ...evaluation, completeness: 21 }); expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe('INVALID_EVALUATION'); });
  test('keeps the save route restricted to judges', async () => { const response = await request(createApp({ pool: poolFor('participant'), config, logger: { error: vi.fn() } })).post(`/api/judge/round-evaluations/round_1/${teamId}`).set('Cookie', 'bb_session=valid').send(evaluation); expect(response.status).toBe(403); });
  test('calculates 10/20/70 final weighting without treating missing rounds as zero', async () => { const app = createApp({ pool: poolFor('organizer'), config, logger: { error: vi.fn() } }); const response = await request(app).get('/api/admin/final-scores').set('Cookie', 'bb_session=valid'); expect(response.status).toBe(200); expect(response.body.teams[0]).toMatchObject({ round1Weighted: 8, round2Weighted: 18, round3Weighted: 70, finalScore: 96, complete: true }); });
});
