-- Add Papiamentu settings columns to agent_settings
-- papiamentu_locale: 'pap-CW' (Curaçao, default) or 'pap-AW' (Aruba)
-- papiamentu_learning: whether to log corrections for self-learning

ALTER TABLE agent_settings
  ADD COLUMN IF NOT EXISTS papiamentu_locale VARCHAR(10) DEFAULT 'pap-CW',
  ADD COLUMN IF NOT EXISTS papiamentu_learning BOOLEAN DEFAULT false;

COMMENT ON COLUMN agent_settings.papiamentu_locale IS 'Papiamentu locale: pap-CW (Curaçao) or pap-AW (Aruba)';
COMMENT ON COLUMN agent_settings.papiamentu_learning IS 'Enable Papiamentu correction self-learning log';
