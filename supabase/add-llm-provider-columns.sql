-- Multi-provider LLM support: add provider, base_url, api_key columns to agent_settings
alter table public.agent_settings
  add column if not exists llm_provider text not null default 'openai',
  add column if not exists llm_base_url text,
  add column if not exists llm_api_key text;

comment on column public.agent_settings.llm_provider is 'LLM provider key: openai, ollama, lmstudio, groq, together, openrouter, custom';
comment on column public.agent_settings.llm_base_url is 'Override base URL (used for custom provider or non-default endpoints)';
comment on column public.agent_settings.llm_api_key is 'Provider API key (if not using env var)';
