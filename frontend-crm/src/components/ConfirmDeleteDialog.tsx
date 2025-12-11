import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemCount: number;
  isFolder?: boolean;
  isPermanent?: boolean;
  filesCount?: number;
  foldersCount?: number;
  filesInsideFolder?: number;
  folderInsideFolder?: number;
}

export const ConfirmDeleteDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemCount,
  isFolder = false,
  isPermanent = false,
  filesCount = 0,
  foldersCount = 0,
  filesInsideFolder = 0,
  folderInsideFolder = 0,
}: ConfirmDeleteDialogProps) => {
  const showBreakdown = filesCount > 0 || foldersCount > 0;
  const hasNestedItems =
    (filesInsideFolder > 0 || folderInsideFolder > 0) &&
    isPermanent &&
    isFolder;
  const totalNestedItems = filesInsideFolder + folderInsideFolder;
  const grandTotal = itemCount + totalNestedItems;

  const title = isPermanent
    ? showBreakdown
      ? `Permanently delete ${itemCount} item(s)?`
      : `Permanently delete ${itemCount} ${
          itemCount === 1
            ? isFolder
              ? "folder"
              : "file"
            : isFolder
            ? "folders"
            : "files"
        }?`
    : showBreakdown
    ? `Move ${itemCount} item(s) to trash?`
    : `Move ${itemCount} ${
        itemCount === 1
          ? isFolder
            ? "folder"
            : "file"
          : isFolder
          ? "folders"
          : "files"
      } to trash?`;

  const description = isPermanent
    ? "This action cannot be undone. All selected items will be permanently deleted."
    : "These item(s) will be moved to trash and can be recovered later.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>

          {hasNestedItems && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">
                  Folder contains nested items
                </p>
                <p>
                  This folder contains{" "}
                  {filesInsideFolder > 0 && (
                    <>
                      <span className="font-semibold">{filesInsideFolder}</span>{" "}
                      file(s)
                    </>
                  )}
                  {filesInsideFolder > 0 && folderInsideFolder > 0 && " and "}
                  {folderInsideFolder > 0 && (
                    <>
                      <span className="font-semibold">
                        {folderInsideFolder}
                      </span>{" "}
                      folder(s)
                    </>
                  )}
                  . All nested items will be permanently deleted as well.
                </p>
              </div>
            </div>
          )}

          {showBreakdown && (
            <div className="mt-4 p-3 bg-muted rounded-lg space-y-1 text-sm text-foreground">
              {/* Item yang dipilih */}
              {foldersCount > 0 && (
                <div className="flex justify-between">
                  <span>Folders selected:</span>
                  <span className="font-semibold">{foldersCount}</span>
                </div>
              )}
              {filesCount > 0 && (
                <div className="flex justify-between">
                  <span>Files selected:</span>
                  <span className="font-semibold">{filesCount}</span>
                </div>
              )}

              {/* Item di dalam folder (nested) */}
              {hasNestedItems && (
                <>
                  <div className="border-t border-border my-2"></div>
                  <div className="text-xs text-muted-foreground font-semibold mb-1">
                    Items inside folders:
                  </div>
                  {folderInsideFolder > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span className="pl-4">Nested folders:</span>
                      <span className="font-semibold">
                        {folderInsideFolder}
                      </span>
                    </div>
                  )}
                  {filesInsideFolder > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span className="pl-4">Nested files:</span>
                      <span className="font-semibold">{filesInsideFolder}</span>
                    </div>
                  )}
                </>
              )}

              {/* Total keseluruhan */}
              <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                <span>Grand Total:</span>
                <span>{grandTotal}</span>
              </div>
            </div>
          )}
        </AlertDialogHeader>

        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              isPermanent ? "bg-destructive hover:bg-destructive/90" : ""
            }
          >
            {isPermanent ? "Delete Permanently" : "Move to Trash"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
