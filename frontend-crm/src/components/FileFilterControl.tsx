import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";

interface FileFilterDropdownProps {
  sortBy: "name" | "size" | "created_at";
  sortOrder: "asc" | "desc";
  onFilterChange: (
    field: "name" | "size" | "created_at",
    order: "asc" | "desc"
  ) => void;
}

export const FileFilterDropdown = ({
  sortBy,
  sortOrder,
  onFilterChange,
}: FileFilterDropdownProps) => {
  // Tentukan label yang ditampilkan
  const getSortLabel = () => {
    const fieldLabels = {
      name: "Nama",
      size: "Ukuran",
      created_at: "Tanggal",
    };

    const orderLabel = sortOrder === "asc" ? "A → Z" : "Z → A";
    return `Sortir: ${fieldLabels[sortBy]} (${orderLabel})`;
  };

  return (
    <div className="mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full md:w-80 justify-between">
            <span>{getSortLabel()}</span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          {/* Sortir Nama */}
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              FILE NAME
            </p>
          </div>
          <DropdownMenuItem
            onClick={() => onFilterChange("name", "asc")}
            className={
              sortBy === "name" && sortOrder === "asc" ? "bg-accent" : ""
            }
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            <span>A → Z</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange("name", "desc")}
            className={
              sortBy === "name" && sortOrder === "desc" ? "bg-accent" : ""
            }
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            <span>Z → A</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Sortir Ukuran */}
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              FILE SIZE
            </p>
          </div>
          <DropdownMenuItem
            onClick={() => onFilterChange("size", "asc")}
            className={
              sortBy === "size" && sortOrder === "asc" ? "bg-accent" : ""
            }
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            <span>Smallest First</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange("size", "desc")}
            className={
              sortBy === "size" && sortOrder === "desc" ? "bg-accent" : ""
            }
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            <span>Largest First</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Sortir Tanggal */}
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              UPLOAD DATE
            </p>
          </div>
          <DropdownMenuItem
            onClick={() => onFilterChange("created_at", "asc")}
            className={
              sortBy === "created_at" && sortOrder === "asc" ? "bg-accent" : ""
            }
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            <span>Oldest First</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange("created_at", "desc")}
            className={
              sortBy === "created_at" && sortOrder === "desc" ? "bg-accent" : ""
            }
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            <span>Newest First</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
