-- One judge may evaluate each team once per round. Scores are final marks,
-- using the shared 100-point rubric in src/scoring.js.
CREATE TABLE round_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_identifier TEXT NOT NULL CHECK (round_identifier IN ('round_1', 'round_2', 'round_3')),
  completeness INTEGER NOT NULL CHECK (completeness BETWEEN 0 AND 20),
  technical_execution INTEGER NOT NULL CHECK (technical_execution BETWEEN 0 AND 20),
  innovation_creativity INTEGER NOT NULL CHECK (innovation_creativity BETWEEN 0 AND 15),
  applicability_scalability INTEGER NOT NULL CHECK (applicability_scalability BETWEEN 0 AND 15),
  ui_ux INTEGER NOT NULL CHECK (ui_ux BETWEEN 0 AND 10),
  bonus_features INTEGER NOT NULL CHECK (bonus_features BETWEEN 0 AND 10),
  presentation INTEGER NOT NULL CHECK (presentation BETWEEN 0 AND 5),
  work_distribution INTEGER NOT NULL CHECK (work_distribution BETWEEN 0 AND 5),
  weighted_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_score NUMERIC(5, 1) NOT NULL CHECK (final_score BETWEEN 0 AND 100),
  comments TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT round_evaluations_one_per_team_judge_round UNIQUE (team_id, judge_id, round_identifier)
);

CREATE INDEX round_evaluations_team_round_idx ON round_evaluations (team_id, round_identifier);
