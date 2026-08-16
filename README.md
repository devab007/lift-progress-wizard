# Progression Partner

# Specification & Prompt de Développement — Application "Grind"

## 1. Vision & Positionnement Produit
- **Nom de l'application :** Grind
- **Slogan :** Smart Progressive Overload Tracker.
- **Positionnement :** Outil sérieux, moderne, épuré et ultra-réactif pour pratiquants de musculation (débutants à confirmés). Aucune gamification enfantine (pas de mascottes ni confettis), mais un design vif avec des animations fluides de sport/performance.
- **Marche Cible & i18n :** Marché mondial. Support multilingue complet dès le départ : **Français (FR), Anglais (EN), Espagnol (ES)**.
- **Modèle économique :** Essai gratuit de 3 jours sans engagement, puis abonnement au choix :
  - **Mensuel :** 6,99 € / mois
  - **Annuel :** 49,00 € / an (~4,08 € / mois, réduction de >40%)

---

## 2. Design System & Style Visuel
- **Thème :** Dark Mode absolu (optimisé pour la lisibilité en salle de sport sous lumière vive ou sombre).
- **Palette de Couleurs :**
  - **Primary (Violet principal) :** `#8C56D4`
  - **Secondary (Lilas réactif) :** `#DC95FF`
  - **Soft (Rose pastel) :** `#FFBEFB`
  - **Accent (Jaune Néon / CTA principal) :** `#FFFF4B`
  - **Background (Fond) :** `#0F0E12`
  - **Surface (Cartes & Modales) :** `#1A1820`
  - **Success / Validated Set :** `#22C55E`
- **Typographie :**
  - Titres & Chiffres de PR/Performance : **Syne** (bold / extra-bold)
  - Textes d'interface & saisie : **DM Sans**
- **UX / Mobile-First Absolu :**
  - Utilisation à une main en salle : boutons de validation très larges (min 48px height), pavé numérique personnalisé grand format pour saisir rapidement poids et répétitions.
  - Micro-animations CSS/Lottie dynamiques (pulse lors de la validation d'un Set, barre de progression animée du timer de repos, feedback tactile/vibration sur mobile lors des PRs).

---

## 3. Architecture Technique & Choix Technologiques
- **Frontend :** Angular 17+ (ou version supérieure)
  - **Architecture :** Standalone Components exclusivement.
  - **Gestion d'état :** Angular **Signals** (`signal()`, `computed()`, `effect()`) pour une réactivité optimale sans zones.js excessifs.
  - **Contrôle de Flux :** Syntaxe moderne `@if`, `@for`, `@switch` (interdiction stricte d'utiliser `*ngIf` ou `*ngFor`).
  - **PWA & Offline-First :** Sauvegarde locale immédiate des séries durant la séance (`localStorage` / `IndexedDB`). File d'attente d'action (`OfflineQueueService`) synchronisée automatiquement dès le retour d'une connexion réseau (`window.online` + `document.visibilitychange`).
- **Backend & Base de données :** Supabase (PostgreSQL)
  - Supabase Auth (Email + Mot de passe & OAuth Google).
  - Row Level Security (RLS) activé sur 100% des tables.
  - API auto-générée Supabase JS Client v2.
- **Paiements & Abonnements :** Stripe Checkout via Supabase Edge Function (Deno) + Webhooks de synchronisation des statuts d'abonnement.
-utilise des icons ou lieux d'emojis

---

## 4. Fonctionnalités Détaillées (Par ordre de priorité MVP)

### F1. Authentification & Profil Utilisateur
- Connexion / Inscription rapide (Email + Mot de passe, Google OAuth).
- Choix de la langue (`fr`, `en`, `es`) et de l'unité de poids (`kg`, `lb`).
- Choix du style de surcharge progressive (`conservateur`, `modere`, `agressif`).

### F2. Bibliothèque d'Exercices & Création Personnalisée
- **Catalogue de base :** 70+ exercices de référence classés par groupe musculaire (Pectoraux, Dos, Quadriceps, Ischios, Épaules, Biceps, Triceps, Mollets, Abdos) avec traductions FR/EN/ES.
- **Exercices personnalisés :** L'utilisateur peut ajouter ses propres exercices (Nom, Groupe musculaire, Équipement : Barre, Haltères, Machine, Poulie, Poids du corps).

### F3. Planification de Programme (Split Hebdomadaire Personnalisé)
- **Semaine type :** L'utilisateur configure son emploi du temps (ex: Lundi = Push, Mardi = Pull, Mercredi = Repos, Jeudi = Legs, Vendredi = Upper, etc.).
- Chaque jour affiche la séance planifiée du jour avec raccourci pour démarrer en 1 clic.

### F4. Mode Séance / Saisie en Salle (Workout Execution - Cœur de l'App)
- **Pavé numérique tactile sur mesure :** Saisie ultra-rapide des poids et répétitions.
- **Types de séries supportés :** Série normale, Warm-up (Échauffement), Drop-set, Failure (Jusqu'à échec).
- **Timer de repos intelligent :** Déclenchement automatique au clic sur "Valider la série" (ex: 90s ou 120s configurable). Notification sonore/vibration à la fin du décompte.
- **Chrono de séance global :** Durée totale de la séance enregistrée.
- **Mode Hors-ligne :** Aucune interruption si la salle n'a pas de réseau.

### F5. Moteur de Surcharge Progressive (Fonctionnalité Signature)
- Avant de démarrer un exercice, l'app analyse le dernier passage sur cet exercice.
- **Règle de calcul transparente :**
  - *Si toutes les séries ont atteint ou dépassé l'objectif de répétitions :* L'app recommande de monter la charge (+2.5 kg ou +2.5% à +5% selon le profil réglé).
  - *Si l'objectif n'a pas été atteint :* L'app recommande de maintenir le même poids et d'ajouter 1 à 2 répétitions.
- Badge visuel néon (`#FFFF4B`) affichant la recommandation directement dans le champ de saisie (`ex: Reco : 80 kg × 8 reps`).

### F6. Suivi de Masse Corporelle & Mensurations
- Enregistrement quotidien/hebdomadaire du poids corporel (Masse en kg/lb).
- Graphique de courbe de masse avec ligne d'objectif (Objectif : Prise de masse / Sèche / Maintien).

### F7. Dashboard & Historique Analytics
- Graphique d'évolution du 1RM estimé (Formule d'Epley : $1RM = Poids \times (1 + \frac{Reps}{30})$).
- Graphique du volume total hebdo (Poids × Reps × Séries).
- Calendrier/Heatmap des séances réalisées dans le mois.
- Badges de records personnels (*PR : Max Weight, Max Volume, Max Reps*).

### F8. Monétisation Stripe & Paywall
- Essai gratuit de 3 jours à la création du compte.
- Écran des tarifs (`pricing`) proposant l'abonnement Mensuel (6,99 €) et Annuel (49,00 €).
- Edge Function Supabase `create-checkout-session` appelant Stripe Checkout.

---

## 5. Schéma de Base de Données PostgreSQL / Supabase Complete

```sql
-- 1. Configuration Utilisateur & Préférences
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lang VARCHAR(5) DEFAULT 'fr', -- 'fr', 'en', 'es'
  unit_preference VARCHAR(3) DEFAULT 'kg', -- 'kg', 'lb'
  progression_style VARCHAR(15) DEFAULT 'modere', -- 'conservateur', 'modere', 'agressif'
  target_body_weight NUMERIC(5,2),
  rest_timer_seconds INT DEFAULT 90,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bibliothèque d'Exercices
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL si exercice global
  name JSONB NOT NULL, -- {"fr": "Développé couché", "en": "Bench Press", "es": "Press de banca"}
  muscle_group VARCHAR(50) NOT NULL,
  equipment VARCHAR(50) DEFAULT 'barbell',
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Planification du Split Hebdomadaire
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL, -- 1=Lundi, 2=Mardi, ..., 7=Dimanche
  name VARCHAR(100) NOT NULL, -- ex: "Push A", "Legs Focus Quads", "Repos"
  is_rest_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Séances d'Entraînement Effectuées
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  duration_seconds INT,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Exercices Inclus dans une Séance
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL
);

-- 6. Séries / Sets
CREATE TABLE public.sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  set_type VARCHAR(15) DEFAULT 'normal', -- 'normal', 'warmup', 'drop', 'failure'
  weight NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  target_reps INT DEFAULT 8,
  rpe NUMERIC(3,1),
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Suivi du Poids Corporel (Masse)
CREATE TABLE public.body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL,
  logged_at DATE DEFAULT CURRENT_DATE
);

-- 8. Abonnements Stripe
CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'trialing', -- 'trialing', 'active', 'canceled', 'past_due'
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Exemples de Politiques RLS (User voit uniquement ses données)
CREATE POLICY "Users control own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view global and custom exercises" ON public.exercises FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users insert custom exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id);

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0ca98bc-35a8-4eaf-a109-79a6b61278fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
