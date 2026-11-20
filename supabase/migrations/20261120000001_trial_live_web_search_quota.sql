-- Cogent Marketing Shield — Trial Plan Live Web Search Allocation (3 Paid Dual-Engine Searches)
-- Grants Evaluation Pilot (7-day trial) workspaces 3 Nigeria (NG) Live Web Searches
-- powered by the paid Dual-Engine (Exa + SerpAPI). After the 3 searches are consumed,
-- application logic gracefully falls back to standard Gemini Google Search grounding.

UPDATE public.subscription_plans
SET
    monthly_live_search_limit = 3,
    allowed_search_jurisdictions = ARRAY['NG']::TEXT[],
    features = COALESCE(features, '{}'::jsonb) || '{"live_web_search": true, "monthly_live_search_limit": 3}'::jsonb
WHERE slug = 'evaluation';
