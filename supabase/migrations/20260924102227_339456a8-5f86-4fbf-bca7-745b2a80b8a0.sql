CREATE OR REPLACE FUNCTION public.raise_case_alert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lvl text; brnch text;
BEGIN
  lvl := COALESCE(NEW.severity, (NEW.ai_result->>'riskLevel'));
  brnch := NEW.profile->>'branch';
  IF NEW.suicide_risk THEN
    INSERT INTO public.case_alerts (case_id, case_code, branch, level, kind)
    VALUES (NEW.id, NEW.case_code, brnch, COALESCE(lvl,'high'), 'suicide_risk');
  ELSIF lvl IN ('red', 'high') THEN
    INSERT INTO public.case_alerts (case_id, case_code, branch, level, kind)
    VALUES (NEW.id, NEW.case_code, brnch, lvl, 'high_risk');
  ELSE
    INSERT INTO public.case_alerts (case_id, case_code, branch, level, kind)
    VALUES (NEW.id, NEW.case_code, brnch, COALESCE(lvl,'new'), 'new_case');
  END IF;
  RETURN NEW;
END; $function$;