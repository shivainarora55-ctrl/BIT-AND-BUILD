import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import { createRoundTwoSubmissionPayload } from '../../client/src/lib/roundTwoSubmission.js';
import { createApp } from '../src/app.js';

const teamId = '11111111-1111-4111-8111-111111111111';
const config = { nodeEnv: 'test', frontendOrigin: 'http://localhost:5173', sessionCookieName: 'bb_session', sessionTtlHours: 8, uploadDir: '/tmp/uploads' };

function participantApp() {
  const pool = { connect: vi.fn(), query: vi.fn(async (sql, values) => {
    if (sql.includes('FROM sessions')) return { rows: [{ id: 'participant-id', email: 'team@example.com', display_name: 'Team', role: 'participant', team_id: teamId, expires_at: new Date(Date.now() + 60_000) }] };
    if (sql.startsWith('INSERT INTO submissions')) return { rows: [{ id: 'submission-id', team_id: values[0], title: values[1], description: values[2], tech_stack: values[3], github_url: values[4], demo_url: values[5], status: values[6] }] };
    return { rows: [] };
  }) };
  return { app: createApp({ pool, config, logger: { error: vi.fn() } }), pool };
}

describe('Round 2 project-link submissions', () => {
  test('builds an outgoing payload with no problemStatementId and omits blank optional values', () => {
    const payload = createRoundTwoSubmissionPayload({ projectTitle: '  Link portal  ', description: '', techStack: null, repositoryUrl: 'https://github.com/example/portal', deployedUrl: '', status: 'submitted' });
    expect(payload).toEqual({ projectTitle: 'Link portal', repositoryUrl: 'https://github.com/example/portal', status: 'submitted' });
    expect(payload).not.toHaveProperty('problemStatementId');
  });

  test.each([
    ['GitHub-only', { repositoryUrl: 'https://github.com/example/project' }, 'https://github.com/example/project', null],
    ['demo-only', { deployedUrl: 'https://demo.example.com/project' }, null, 'https://demo.example.com/project'],
    ['both links', { repositoryUrl: 'https://github.com/example/project', deployedUrl: 'https://demo.example.com/project', description: 'A useful project', techStack: 'React' }, 'https://github.com/example/project', 'https://demo.example.com/project'],
    ['omitted optional fields', { description: null, techStack: null, repositoryUrl: null, deployedUrl: null }, null, null],
  ])('accepts %s without a problem statement', async (_label, fields, expectedRepository, expectedDemo) => {
    const { app, pool } = participantApp();
    const response = await request(app).post('/api/submissions').set('Cookie', 'bb_session=valid').send({ projectTitle: 'Round 2 Project', status: 'submitted', ...fields });
    expect(response.status).toBe(201);
    const insert = pool.query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO submissions'));
    expect(insert[0]).not.toContain('problem_statement_id');
    expect(insert[1]).toEqual([teamId, 'Round 2 Project', fields.description || '', fields.techStack || null, expectedRepository, expectedDemo, 'submitted']);
  });

  test('rejects an invalid project URL instead of storing a null-like string', async () => {
    const { app } = participantApp();
    const response = await request(app).post('/api/submissions').set('Cookie', 'bb_session=valid').send({ projectTitle: 'Round 2 Project', repositoryUrl: 'not-a-url' });
    expect(response.status).toBe(400);
  });

  test('returns submitted Round 2 links and metadata to a judge', async () => {
    const pool = { connect: vi.fn(), query: vi.fn(async (sql) => {
      if (sql.includes('FROM sessions')) return { rows: [{ id: 'judge-id', email: 'judge@example.com', display_name: 'Judge', role: 'judge', expires_at: new Date(Date.now() + 60_000) }] };
      if (sql.includes('FROM teams t LEFT JOIN submissions')) return { rows: [{ team_id: teamId, team_name: 'Team Link', leader_name: 'Leader', title: 'Round 2 Project', description: 'A useful project', tech_stack: 'React', repository_url: 'https://github.com/example/project', deployed_url: 'https://demo.example.com/project', submission_status: 'submitted', submitted_at: '2026-09-13T00:00:00.000Z', submission_created_at: '2026-09-12T00:00:00.000Z', submission_updated_at: '2026-09-13T00:00:00.000Z', original_filename: null, evaluations: [] }] };
      return { rows: [] };
    }) };
    const response = await request(createApp({ pool, config, logger: { error: vi.fn() } })).get('/api/judge/round-evaluations').set('Cookie', 'bb_session=valid');
    expect(response.status).toBe(200);
    expect(response.body.teams[0]).toMatchObject({ team_id: teamId, team_name: 'Team Link', repository_url: 'https://github.com/example/project', deployed_url: 'https://demo.example.com/project', description: 'A useful project', submission_status: 'submitted', submitted_at: '2026-09-13T00:00:00.000Z' });
  });
});
