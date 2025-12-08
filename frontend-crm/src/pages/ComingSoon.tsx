import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { Sidebar } from '@/components/FileManager/Sidebar';
import { FloatingAIButton } from '@/components/FloatingAIButton';

export const ComingSoon = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('coming-soon');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-border">
        <CardContent className="p-12">
          <div className="text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-foreground">
                Coming Soon
              </h1>
              <p className="text-lg text-muted-foreground">
                Fitur ini sedang dalam pengembangan
              </p>
            </div>

            {/* Description */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami sedang bekerja keras untuk menghadirkan fitur terbaik untuk Anda.
                <br />
                Fitur ini akan segera tersedia dalam waktu dekat.
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button
                onClick={() => navigate('/')}
                size="lg"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Button>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                Terima kasih atas kesabaran Anda
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
