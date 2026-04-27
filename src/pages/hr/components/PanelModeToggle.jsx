// src/pages/hr/components/PanelModeToggle.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Users, Send, X, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PanelModeToggle = ({
  panelMode,
  onToggle,
  panelSlots,
  panelTimeOptions,
  onSchedulePanel,
}) => {
  return (
    <Card className={panelMode ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/20' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Switch checked={panelMode} onCheckedChange={onToggle} />
            <div>
              <p className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" /> Panel Interview Mode
              </p>
              <p className="text-xs text-muted-foreground">
                {panelMode
                  ? 'Click AVAILABLE slots to add interviewers. Selected slots show a ✓ badge. Overlap window calculated automatically.'
                  : 'Enable to schedule one candidate with multiple interviewers at the same time.'}
              </p>
            </div>
          </div>

          {panelMode && (
            <div className="flex items-center gap-3 flex-wrap">
              {panelSlots.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {panelSlots.map((ps) => (
                    <Badge key={ps.slot.id} className="bg-sky-100 text-sky-800 border-sky-300 gap-1 pr-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {ps.slot.resource.interviewer}
                      <button 
                        onClick={() => {
                          // This will be handled by parent component
                        }}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {panelSlots.length > 0 ? (
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
                  disabled={panelTimeOptions.length === 0}
                  onClick={onSchedulePanel}>
                  <Send className="w-4 h-4" />
                  Schedule Panel ({panelSlots.length} interviewer{panelSlots.length !== 1 ? 's' : ''})
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground italic">Click calendar slots to add interviewers…</p>
              )}
              {panelSlots.length > 1 && panelTimeOptions.length === 0 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No overlapping time
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PanelModeToggle;
