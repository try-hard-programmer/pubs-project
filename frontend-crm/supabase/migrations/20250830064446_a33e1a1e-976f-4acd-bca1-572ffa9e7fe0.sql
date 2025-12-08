-- Add support for folder types in files table
ALTER TABLE public.files 
ADD COLUMN is_folder BOOLEAN DEFAULT FALSE;

-- Update existing files to ensure they're marked as files (not folders)
UPDATE public.files SET is_folder = FALSE WHERE is_folder IS NULL;

-- Add constraint to ensure folders don't have storage_path and size
ALTER TABLE public.files 
ADD CONSTRAINT check_folder_constraints 
CHECK (
  (is_folder = TRUE AND storage_path IS NULL AND size = 0) OR
  (is_folder = FALSE AND storage_path IS NOT NULL AND size > 0)
);

-- Allow storage_path to be null for folders
ALTER TABLE public.files ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE public.files ALTER COLUMN size DROP NOT NULL;

-- Create index for better folder queries
CREATE INDEX idx_files_folder_id ON public.files(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX idx_files_is_folder ON public.files(is_folder);

-- Update RLS policies to work with folders
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

-- Recreate policies with better names
CREATE POLICY "Users can view their own files and folders" 
ON public.files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files and folders" 
ON public.files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files and folders" 
ON public.files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files and folders" 
ON public.files 
FOR DELETE 
USING (auth.uid() = user_id);