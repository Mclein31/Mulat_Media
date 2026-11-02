-- Dedicated Mulat Media database only. Browser access is through the API.
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  is_eic boolean NOT NULL DEFAULT false,
  can_edit_acknowledgement boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.articles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category text NOT NULL,
  category_name text NOT NULL,
  tag text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  body text[] NOT NULL DEFAULT '{}',
  image text,
  read_time text,
  author_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  reviewed_at timestamptz,
  reviewed_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS articles_category_idx ON public.articles(category);
CREATE INDEX IF NOT EXISTS articles_author_id_idx ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS articles_status_idx ON public.articles(status);
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON public.articles(created_at DESC);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles, public.articles FROM PUBLIC;
-- No client Data API and no browser policies. Only the server owner connects.
