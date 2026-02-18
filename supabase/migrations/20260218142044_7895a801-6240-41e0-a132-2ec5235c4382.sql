
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  usn TEXT UNIQUE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  isbn TEXT,
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create book_issues table
CREATE TABLE public.book_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  return_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to auto-generate book codes
CREATE OR REPLACE FUNCTION public.generate_book_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(book_code FROM 4) AS INT)), 0) + 1
  INTO next_num
  FROM public.books
  WHERE book_code ~ '^LIB[0-9]+$';
  
  new_code := 'LIB' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$;

-- Trigger to update updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, department, usn, photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'usn',
    NEW.raw_user_meta_data->>'photo_url'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to decrement available_copies when book is issued
CREATE OR REPLACE FUNCTION public.handle_book_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'issued' AND (OLD IS NULL OR OLD.status != 'issued') THEN
    UPDATE public.books SET available_copies = available_copies - 1
    WHERE id = NEW.book_id AND available_copies > 0;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Book is not available for issue';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_book_issued
  AFTER INSERT ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.handle_book_issue();

-- Trigger to increment available_copies when book is returned
CREATE OR REPLACE FUNCTION public.handle_book_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'returned' AND OLD.status = 'issued' THEN
    UPDATE public.books SET available_copies = available_copies + 1
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_book_returned
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.handle_book_return();

-- RLS Policies: profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (true);

-- RLS Policies: books
CREATE POLICY "Anyone can view books" ON public.books
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert books" ON public.books
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update books" ON public.books
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete books" ON public.books
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: book_issues
CREATE POLICY "Users can view own issues, admins can view all" ON public.book_issues
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can issue books" ON public.book_issues
  FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own issue (return), admins can update all" ON public.book_issues
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete issues" ON public.book_issues
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for photo IDs
INSERT INTO storage.buckets (id, name, public) VALUES ('photo-ids', 'photo-ids', false);

CREATE POLICY "Users can upload own photo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photo-ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own photo" ON storage.objects
  FOR SELECT USING (bucket_id = 'photo-ids' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can update own photo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photo-ids' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert some sample books
INSERT INTO public.books (book_code, title, author, category, isbn, total_copies, available_copies, description) VALUES
  ('LIB001', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', '978-0262033848', 3, 3, 'A comprehensive guide to algorithms and data structures.'),
  ('LIB002', 'Clean Code', 'Robert C. Martin', 'Software Engineering', '978-0132350884', 2, 2, 'A handbook of agile software craftsmanship.'),
  ('LIB003', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Literature', '978-0743273565', 4, 4, 'A story of the Jazz Age and the American Dream.'),
  ('LIB004', 'Calculus: Early Transcendentals', 'James Stewart', 'Mathematics', '978-1285741550', 5, 5, 'Comprehensive calculus textbook for engineering students.'),
  ('LIB005', 'Operating System Concepts', 'Abraham Silberschatz', 'Computer Science', '978-1118063330', 2, 2, 'The classic OS textbook, also known as the Dinosaur Book.'),
  ('LIB006', 'Digital Electronics', 'Morris Mano', 'Electronics', '978-0131989245', 3, 3, 'Fundamentals of digital logic and computer design.'),
  ('LIB007', 'To Kill a Mockingbird', 'Harper Lee', 'Literature', '978-0061935466', 3, 3, 'A classic of modern American literature.'),
  ('LIB008', 'Physics for Scientists and Engineers', 'Serway & Jewett', 'Physics', '978-1337553278', 4, 4, 'Comprehensive physics for engineering students.');
