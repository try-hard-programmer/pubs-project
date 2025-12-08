import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
export const FolderInfoAlert = () => {
  return (
    <Alert className="mb-6 border-primary/30 bg-primary/5">
      <Info className="h-5 w-5 text-primary" />
      <AlertTitle className="font-semibold">Welcome to Your Drive</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        Create folders to organize your files or upload new files to get started. Your files are securely stored in the cloud.
      </AlertDescription>
    </Alert>
  );
};