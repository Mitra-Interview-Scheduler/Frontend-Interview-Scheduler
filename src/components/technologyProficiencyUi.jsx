import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTechnologyCategoryLabel, getSkillIsCore } from '@/lib/technologyHelpers';

export function TechnologyProficiencyBadge({ item, isEditing, onOpenCorePrompt, onRemove }) {
  return (
    <Badge
      variant="outline"
      role={isEditing ? 'button' : undefined}
      tabIndex={isEditing ? 0 : undefined}
      onClick={isEditing ? () => onOpenCorePrompt(item.technology, item) : undefined}
      onKeyDown={isEditing ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenCorePrompt(item.technology, item);
        }
      } : undefined}
      className={`gap-1 pr-1 text-sm ${
        isEditing ? 'cursor-pointer hover:shadow-sm' : ''
      } ${
        getSkillIsCore(item)
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-success/20 bg-success-light text-success'
      }`}
    >
      {getSkillIsCore(item) && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
      <span>{item.technology?.name}</span>
      {item.technology?.category && (
        <span className="text-xs opacity-70">
          ({getTechnologyCategoryLabel(item.technology)})
        </span>
      )}
      {isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item);
          }}
          className="rounded-full p-0.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

export function CoreTechnologyPrompt({
  open,
  technology,
  existingEntry = null,
  saving = false,
  onClose,
  onConfirm,
}) {
  if (!open || !technology) return null;

  const isUpdate = Boolean(existingEntry);
  const currentIsCore = getSkillIsCore(existingEntry);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          className="w-full max-w-sm rounded-xl border bg-white p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isUpdate ? 'Update technology' : 'Add technology'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{technology.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isUpdate
              ? 'Choose whether this is a core technology or can do.'
              : 'Is this a core technology, or can do?'}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant={currentIsCore ? 'default' : 'outline'}
              disabled={saving}
              className={currentIsCore ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => onConfirm(true)}
            >
              <Star className={`mr-2 h-4 w-4 ${currentIsCore ? 'fill-white' : ''}`} />
              Core Technology
            </Button>
            <Button
              type="button"
              variant={!currentIsCore && isUpdate ? 'default' : 'outline'}
              disabled={saving}
              onClick={() => onConfirm(false)}
            >
              Can Do
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
