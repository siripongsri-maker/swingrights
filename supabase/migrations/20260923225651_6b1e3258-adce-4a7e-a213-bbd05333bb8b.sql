DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE POLICY "no api access" ON private.settings FOR ALL USING (false) WITH CHECK (false);