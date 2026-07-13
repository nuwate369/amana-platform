-- ============================================================
-- 0014_rating_questions.sql
-- منصة أمانة — نظام أسئلة التقييم المُدار من لوحة الإدارة
--
-- rating_questions: أسئلة يديرها المسؤول؛ لكل سؤال «وجهة»:
--   target='driver'    → سؤال لتقييم السائقة (يظهر في تطبيق الراكبة)
--   target='passenger' → سؤال لتقييم الراكبة (يظهر في تطبيق السائقة)
-- rating_answers: إجابة (نجوم ١–٥) لكل سؤال ضمن تقييم ratings موجود.
--
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) جدول الأسئلة
-- ------------------------------------------------------------
create table if not exists public.rating_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  target     text not null check (target in ('driver', 'passenger')),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- فريد على (السؤال + الوجهة) ليكون إدراج الافتراضيات idempotent
create unique index if not exists uq_rating_questions_question_target
  on public.rating_questions (question, target);

drop trigger if exists set_rating_questions_updated_at on public.rating_questions;
create trigger set_rating_questions_updated_at
  before update on public.rating_questions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) جدول الإجابات (إجابة لكل سؤال ضمن تقييم واحد)
-- ------------------------------------------------------------
create table if not exists public.rating_answers (
  id          uuid primary key default gen_random_uuid(),
  rating_id   uuid not null references public.ratings(id) on delete cascade,
  question_id uuid not null references public.rating_questions(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (rating_id, question_id)
);

create index if not exists idx_rating_answers_rating   on public.rating_answers (rating_id);
create index if not exists idx_rating_answers_question on public.rating_answers (question_id);

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
alter table public.rating_questions enable row level security;
alter table public.rating_answers   enable row level security;

-- الأسئلة: قراءة للجميع المسجّلين (التطبيقات تعرض الأسئلة النشطة)؛
-- الكتابة عبر service_role فقط (لوحة الإدارة).
drop policy if exists rating_questions_select_all on public.rating_questions;
create policy rating_questions_select_all on public.rating_questions
  for select using (true);

-- الإجابات: القراءة لأطراف التقييم والموظفين؛ الإدراج لصاحب التقييم فقط.
drop policy if exists rating_answers_select_involved on public.rating_answers;
create policy rating_answers_select_involved on public.rating_answers
  for select using (
    exists (
      select 1 from public.ratings r
      where r.id = rating_answers.rating_id
        and (r.rater_id = auth.uid() or r.ratee_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

drop policy if exists rating_answers_insert_rater on public.rating_answers;
create policy rating_answers_insert_rater on public.rating_answers
  for insert with check (
    exists (
      select 1 from public.ratings r
      where r.id = rating_answers.rating_id and r.rater_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4) الأسئلة الافتراضية (idempotent عبر القيد الفريد)
-- ------------------------------------------------------------
insert into public.rating_questions (question, target, sort_order) values
  ('نظافة المركبة',            'driver',    1),
  ('القيادة الآمنة',           'driver',    2),
  ('الالتزام بالموعد',         'driver',    3),
  ('حسن التعامل واللباقة',     'driver',    4),
  ('حسن التعامل',              'passenger', 1),
  ('الالتزام بموعد الانطلاق',  'passenger', 2),
  ('دقة موقع الالتقاط',        'passenger', 3)
on conflict (question, target) do nothing;

-- ============================================================
-- ملاحظات:
-- - التقييم الإجمالي يبقى في ratings.stars؛ الإجابات التفصيلية في rating_answers.
-- - إدارة الأسئلة من لوحة الإدارة (/ratings) عبر service_role + تسجيل audit_logs.
-- ============================================================
