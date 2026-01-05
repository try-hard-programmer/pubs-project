import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brain } from "lucide-react";
import { AIChatModal } from "./AIChatModal";
import { useAuth } from "@/contexts/AuthContext";

export const FloatingAIButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed bottom-8 right-8 z-50">
              {/* Animated rings background */}
              <div className="absolute inset-0 animate-ping-slow">
                <div className="h-16 w-16 rounded-full bg-primary opacity-20"></div>
              </div>

              <Button
                size="icon"
                className="relative h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl hover:shadow-xl transition-all duration-500 hover:scale-110 group overflow-hidden"
                onClick={() => setIsModalOpen(true)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Gradient overlay animation */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Main icon with animation */}
                <div className="relative z-10">
                  <Brain
                    className={`w-8 h-8 transition-all duration-500 ${
                      isHovered ? "scale-125 rotate-6" : ""
                    }`}
                  />
                </div>

                {/* Pulse effect */}
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></span>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-4 font-semibold">
            <p className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isModalOpen && (
        <AIChatModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          userEmail={user.email}
        />
      )}
    </>
  );
};
