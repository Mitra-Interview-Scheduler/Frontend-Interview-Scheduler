import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle ,DialogBody} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';

const getOptionLabel = (option) => {
  if (option == null) return '';
  if (typeof option === 'string') return option;
  return option.label ?? option.value ?? '';
};

const FeedbackFormPreview = ({
  open,
  onOpenChange,
  form,
  getDepartmentName = (id) => `Dept #${id}`,
  getDesignationName = (id) => `Desig #${id}`,
  showEdit = true,
}) => {
  const navigate = useNavigate();

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview - {form.name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 pr-2">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{form.description || 'No description provided.'}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.scopes?.departmentIds?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.scopes.departmentIds.map((deptId) => (
                    <Badge key={`dept-${deptId}`} variant="secondary">
                      {getDepartmentName(deptId)}
                    </Badge>
                  ))}
                </div>
              )}
              {form.scopes?.designationIds?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.scopes.designationIds.map((desigId) => (
                    <Badge key={`desig-${desigId}`} variant="outline">
                      {getDesignationName(desigId)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Questions ({form.questions?.length || 0})</h4>
            {form.questions?.map((question, index) => (
              <div key={question.id || `${question.label}-${index}`} className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <Label className="text-base font-medium">
                      {index + 1}. {question.label || 'Question'}
                    </Label>
                    {question.category && (
                      <Badge className="mt-1 ml-4 px-2.5 py-1 text-xs font-medium">
                        {question.category}
                      </Badge>
                    )}
                  </div>
                  {question.required && <Badge variant="outline">Required</Badge>}
                </div>

                {question.helpText && <p className="mb-3 text-xs text-muted-foreground">{question.helpText}</p>}

                {question.type === 'dropdown' ? (
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={question.placeholder || 'Select an option'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(question.options || []).map((option, optionIndex) => {
                        const label = getOptionLabel(option);
                        return label ? (
                          <SelectItem key={`${label}-${optionIndex}`} value={label}>
                            {label}
                          </SelectItem>
                        ) : null;
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder={question.placeholder || 'Type your response'} />
                )}

                {question.commentsEnabled && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-sm">Comments</Label>
                    <Textarea placeholder="Add optional comments..." rows={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {showEdit && form.id && (
            <Button
              onClick={() => {
                navigate(`/admin/feedback-questions?id=${form.id}`);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <Edit className="w-4 h-4" /> Edit Form
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackFormPreview;
