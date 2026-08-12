-- Retry of 20260812120100: the course title is actually "COMMUNICABLES
-- DISEASES" (plural on both words), not "Communicable Disease" as
-- assumed — the previous migration's lookup found no match and safely
-- rolled back without inserting anything.
DO $$
DECLARE
  v_course_id uuid;
  v_eval_id uuid;
BEGIN
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE title ILIKE 'COMMUNICABLES DISEASES'
  ORDER BY created_at
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'No course titled "COMMUNICABLES DISEASES" was found — check the exact course title and adjust this migration before re-running.';
  END IF;

  INSERT INTO public.evaluations (course_id, title, description, mode, duration_minutes, total_points, single_attempt)
  VALUES (
    v_course_id,
    'What Defines a Communicable Disease?',
    'A 10-question quiz covering transmission modes, disease prevalence, zoonotic and vector-borne disease, virulence, and host susceptibility factors.',
    'individual',
    20,
    10,
    true
  )
  RETURNING id INTO v_eval_id;

  INSERT INTO public.questions (evaluation_id, kind, prompt, points, choices, correct, position) VALUES
  (v_eval_id, 'mcq_single',
   'What defines a communicable disease?',
   1,
   '[{"id":"a","label":"Diseases caused by genetic mutations"},{"id":"b","label":"Diseases caused by microorganisms that can spread between individuals"},{"id":"c","label":"Diseases resulting from environmental pollution only"},{"id":"d","label":"Non-infectious chronic conditions"}]',
   '["b"]', 0),

  (v_eval_id, 'mcq_single',
   'Which of the following is a mode of direct transmission for infectious diseases?',
   1,
   '[{"id":"a","label":"Contaminated food"},{"id":"b","label":"Mosquito bites"},{"id":"c","label":"Physical contact with an infected person"},{"id":"d","label":"Airborne particles from a sneeze"}]',
   '["c"]', 1),

  (v_eval_id, 'mcq_single',
   'What is the formula for calculating disease prevalence?',
   1,
   '[{"id":"a","label":"(New cases / Total population) × 100"},{"id":"b","label":"(Number of cases at a specific time / Total population) × 100"},{"id":"c","label":"(Deaths from disease / Total cases) × 100"},{"id":"d","label":"(Recovered cases / Total population) × 100"}]',
   '["b"]', 2),

  (v_eval_id, 'mcq_multi',
   'Which pathogen is transmitted via vertical transmission?',
   1,
   '[{"id":"a","label":"E. coli"},{"id":"b","label":"Plasmodium (malaria)"},{"id":"c","label":"HIV (mother-to-child)"},{"id":"d","label":"Clostridium botulinum"}]',
   '["b","c"]', 3),

  (v_eval_id, 'mcq_single',
   'What is a zoonotic disease?',
   1,
   '[{"id":"a","label":"A disease transmitted only between humans"},{"id":"b","label":"A disease spread by contaminated water"},{"id":"c","label":"A disease transmitted from animals to humans"},{"id":"d","label":"A fungal infection of the skin"}]',
   '["c"]', 4),

  (v_eval_id, 'mcq_multi',
   'Which of the following is an environmental reservoir for pathogens?',
   1,
   '[{"id":"a","label":"Hospital equipment"},{"id":"b","label":"Contaminated soil (e.g., hookworm)"},{"id":"c","label":"Blood transfusions"},{"id":"d","label":"Undercooked meat"}]',
   '["a","b"]', 5),

  (v_eval_id, 'mcq_single',
   'What does virulence refer to?',
   1,
   '[{"id":"a","label":"The ability of a pathogen to infect a host"},{"id":"b","label":"The severity of disease caused by a pathogen"},{"id":"c","label":"The speed of pathogen replication"},{"id":"d","label":"The resistance of a host to infection"}]',
   '["b"]', 6),

  (v_eval_id, 'mcq_single',
   'Which microorganism is obligate intracellular and requires a host cell to replicate?',
   1,
   '[{"id":"a","label":"Bacteria"},{"id":"b","label":"Fungi"},{"id":"c","label":"Viruses"},{"id":"d","label":"Protozoa"}]',
   '["c"]', 7),

  (v_eval_id, 'mcq_single',
   'What is the incubation period in infectious diseases?',
   1,
   '[{"id":"a","label":"Time from symptom onset to recovery"},{"id":"b","label":"Time from exposure to symptom appearance"},{"id":"c","label":"Time from diagnosis to treatment"},{"id":"d","label":"Duration of pathogen survival in the environment"}]',
   '["b"]', 8),

  (v_eval_id, 'mcq_single',
   'Which factor is not a host determinant of infectious disease susceptibility?',
   1,
   '[{"id":"a","label":"Genetic immunity"},{"id":"b","label":"Vaccination status"},{"id":"c","label":"Climate change"},{"id":"d","label":"Age and nutritional status"}]',
   '["c"]', 9);
END $$;
