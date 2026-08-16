CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lang VARCHAR(5) NOT NULL DEFAULT 'fr',
  unit_preference VARCHAR(3) NOT NULL DEFAULT 'kg',
  progression_style VARCHAR(15) NOT NULL DEFAULT 'modere',
  goal VARCHAR(15) NOT NULL DEFAULT 'maintien',
  target_body_weight NUMERIC(5,2),
  rest_timer_seconds INT NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name JSONB NOT NULL,
  muscle_group VARCHAR(50) NOT NULL,
  equipment VARCHAR(50) NOT NULL DEFAULT 'barbell',
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read global and own exercises" ON public.exercises FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own exercises" ON public.exercises FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own exercises" ON public.exercises FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_rest_day BOOLEAN NOT NULL DEFAULT FALSE,
  exercise_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.workout_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  duration_seconds INT,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workouts" ON public.workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout exercises" ON public.workout_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

CREATE TABLE public.sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  set_type VARCHAR(15) NOT NULL DEFAULT 'normal',
  weight NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  target_reps INT NOT NULL DEFAULT 8,
  rpe NUMERIC(3,1),
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sets TO authenticated;
GRANT ALL ON public.sets TO service_role;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets" ON public.sets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_exercises we JOIN public.workouts w ON w.id = we.workout_id WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_exercises we JOIN public.workouts w ON w.id = we.workout_id WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()));

CREATE TABLE public.body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, logged_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_weight_logs TO authenticated;
GRANT ALL ON public.body_weight_logs TO service_role;
ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own body logs" ON public.body_weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_grind_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
  VALUES (NEW.id, 'trialing', NOW() + INTERVAL '3 days') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_grind
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_grind_user();

INSERT INTO public.exercises (name, muscle_group, equipment) VALUES
('{"fr":"Développé couché","en":"Bench Press","es":"Press de banca"}','chest','barbell'),
('{"fr":"Développé incliné barre","en":"Incline Bench Press","es":"Press inclinado con barra"}','chest','barbell'),
('{"fr":"Développé décliné barre","en":"Decline Bench Press","es":"Press declinado con barra"}','chest','barbell'),
('{"fr":"Développé couché haltères","en":"Dumbbell Bench Press","es":"Press de banca con mancuernas"}','chest','dumbbell'),
('{"fr":"Développé incliné haltères","en":"Incline Dumbbell Press","es":"Press inclinado con mancuernas"}','chest','dumbbell'),
('{"fr":"Écarté haltères","en":"Dumbbell Fly","es":"Aperturas con mancuernas"}','chest','dumbbell'),
('{"fr":"Écarté à la poulie","en":"Cable Crossover","es":"Cruce de poleas"}','chest','cable'),
('{"fr":"Pec deck","en":"Pec Deck","es":"Pec deck"}','chest','machine'),
('{"fr":"Pompes","en":"Push-up","es":"Flexiones"}','chest','bodyweight'),
('{"fr":"Dips pectoraux","en":"Chest Dips","es":"Fondos para pecho"}','chest','bodyweight'),
('{"fr":"Tractions pronation","en":"Pull-up","es":"Dominadas"}','back','bodyweight'),
('{"fr":"Tractions supination","en":"Chin-up","es":"Dominadas supinas"}','back','bodyweight'),
('{"fr":"Rowing barre","en":"Barbell Row","es":"Remo con barra"}','back','barbell'),
('{"fr":"Rowing haltère","en":"One-Arm Dumbbell Row","es":"Remo con mancuerna"}','back','dumbbell'),
('{"fr":"Rowing T-bar","en":"T-Bar Row","es":"Remo en T"}','back','barbell'),
('{"fr":"Tirage vertical","en":"Lat Pulldown","es":"Jalón al pecho"}','back','cable'),
('{"fr":"Tirage horizontal","en":"Seated Cable Row","es":"Remo sentado en polea"}','back','cable'),
('{"fr":"Soulevé de terre","en":"Deadlift","es":"Peso muerto"}','back','barbell'),
('{"fr":"Pull-over poulie","en":"Straight-Arm Pulldown","es":"Pull-over en polea"}','back','cable'),
('{"fr":"Shrug barre","en":"Barbell Shrug","es":"Encogimientos con barra"}','back','barbell'),
('{"fr":"Hyperextensions","en":"Back Extension","es":"Hiperextensiones"}','back','bodyweight'),
('{"fr":"Squat barre","en":"Back Squat","es":"Sentadilla con barra"}','quads','barbell'),
('{"fr":"Squat avant","en":"Front Squat","es":"Sentadilla frontal"}','quads','barbell'),
('{"fr":"Presse à cuisses","en":"Leg Press","es":"Prensa de piernas"}','quads','machine'),
('{"fr":"Hack squat","en":"Hack Squat","es":"Hack squat"}','quads','machine'),
('{"fr":"Fentes marchées","en":"Walking Lunge","es":"Zancadas caminando"}','quads','dumbbell'),
('{"fr":"Fentes bulgares","en":"Bulgarian Split Squat","es":"Sentadilla búlgara"}','quads','dumbbell'),
('{"fr":"Leg extension","en":"Leg Extension","es":"Extensión de piernas"}','quads','machine'),
('{"fr":"Goblet squat","en":"Goblet Squat","es":"Sentadilla goblet"}','quads','dumbbell'),
('{"fr":"Step-up","en":"Step-Up","es":"Subida al cajón"}','quads','dumbbell'),
('{"fr":"Soulevé de terre jambes tendues","en":"Romanian Deadlift","es":"Peso muerto rumano"}','hamstrings','barbell'),
('{"fr":"Leg curl allongé","en":"Lying Leg Curl","es":"Curl femoral tumbado"}','hamstrings','machine'),
('{"fr":"Leg curl assis","en":"Seated Leg Curl","es":"Curl femoral sentado"}','hamstrings','machine'),
('{"fr":"Good morning","en":"Good Morning","es":"Good morning"}','hamstrings','barbell'),
('{"fr":"Soulevé de terre sumo","en":"Sumo Deadlift","es":"Peso muerto sumo"}','hamstrings','barbell'),
('{"fr":"Hip thrust","en":"Hip Thrust","es":"Empuje de cadera"}','hamstrings','barbell'),
('{"fr":"Nordic curl","en":"Nordic Hamstring Curl","es":"Curl nórdico"}','hamstrings','bodyweight'),
('{"fr":"Développé militaire","en":"Overhead Press","es":"Press militar"}','shoulders','barbell'),
('{"fr":"Développé haltères assis","en":"Seated Dumbbell Press","es":"Press con mancuernas sentado"}','shoulders','dumbbell'),
('{"fr":"Élévations latérales","en":"Lateral Raise","es":"Elevaciones laterales"}','shoulders','dumbbell'),
('{"fr":"Élévations frontales","en":"Front Raise","es":"Elevaciones frontales"}','shoulders','dumbbell'),
('{"fr":"Oiseau haltères","en":"Rear Delt Fly","es":"Pájaros con mancuernas"}','shoulders','dumbbell'),
('{"fr":"Face pull","en":"Face Pull","es":"Face pull"}','shoulders','cable'),
('{"fr":"Développé Arnold","en":"Arnold Press","es":"Press Arnold"}','shoulders','dumbbell'),
('{"fr":"Élévations latérales poulie","en":"Cable Lateral Raise","es":"Elevación lateral en polea"}','shoulders','cable'),
('{"fr":"Rowing menton","en":"Upright Row","es":"Remo al mentón"}','shoulders','barbell'),
('{"fr":"Curl barre","en":"Barbell Curl","es":"Curl con barra"}','biceps','barbell'),
('{"fr":"Curl haltères","en":"Dumbbell Curl","es":"Curl con mancuernas"}','biceps','dumbbell'),
('{"fr":"Curl marteau","en":"Hammer Curl","es":"Curl martillo"}','biceps','dumbbell'),
('{"fr":"Curl incliné","en":"Incline Dumbbell Curl","es":"Curl inclinado"}','biceps','dumbbell'),
('{"fr":"Curl pupitre","en":"Preacher Curl","es":"Curl en banco Scott"}','biceps','barbell'),
('{"fr":"Curl poulie","en":"Cable Curl","es":"Curl en polea"}','biceps','cable'),
('{"fr":"Curl concentré","en":"Concentration Curl","es":"Curl concentrado"}','biceps','dumbbell'),
('{"fr":"Curl inversé","en":"Reverse Curl","es":"Curl inverso"}','biceps','barbell'),
('{"fr":"Dips triceps","en":"Triceps Dips","es":"Fondos de tríceps"}','triceps','bodyweight'),
('{"fr":"Extension poulie haute","en":"Triceps Pushdown","es":"Extensión en polea alta"}','triceps','cable'),
('{"fr":"Extension corde","en":"Rope Pushdown","es":"Extensión con cuerda"}','triceps','cable'),
('{"fr":"Barre au front","en":"Skull Crusher","es":"Rompecráneos"}','triceps','barbell'),
('{"fr":"Extension nuque haltère","en":"Overhead Dumbbell Extension","es":"Extensión sobre la cabeza"}','triceps','dumbbell'),
('{"fr":"Développé couché prise serrée","en":"Close-Grip Bench Press","es":"Press agarre cerrado"}','triceps','barbell'),
('{"fr":"Kickback","en":"Triceps Kickback","es":"Patada de tríceps"}','triceps','dumbbell'),
('{"fr":"Mollets debout","en":"Standing Calf Raise","es":"Elevación de gemelos de pie"}','calves','machine'),
('{"fr":"Mollets assis","en":"Seated Calf Raise","es":"Elevación de gemelos sentado"}','calves','machine'),
('{"fr":"Mollets à la presse","en":"Calf Press","es":"Gemelos en prensa"}','calves','machine'),
('{"fr":"Mollets haltères","en":"Dumbbell Calf Raise","es":"Gemelos con mancuernas"}','calves','dumbbell'),
('{"fr":"Mollets une jambe","en":"Single-Leg Calf Raise","es":"Gemelos a una pierna"}','calves','bodyweight'),
('{"fr":"Crunch","en":"Crunch","es":"Crunch"}','abs','bodyweight'),
('{"fr":"Relevé de jambes suspendu","en":"Hanging Leg Raise","es":"Elevación de piernas colgado"}','abs','bodyweight'),
('{"fr":"Planche","en":"Plank","es":"Plancha"}','abs','bodyweight'),
('{"fr":"Crunch à la poulie","en":"Cable Crunch","es":"Crunch en polea"}','abs','cable'),
('{"fr":"Russian twist","en":"Russian Twist","es":"Russian twist"}','abs','bodyweight'),
('{"fr":"Roulette abdominale","en":"Ab Wheel Rollout","es":"Rueda abdominal"}','abs','bodyweight'),
('{"fr":"Gainage latéral","en":"Side Plank","es":"Plancha lateral"}','abs','bodyweight');