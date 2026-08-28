import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, SquarePen, Trash2, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { technologyAPI } from '@/services/technologyAPI';
import { questionCategoryAPI } from '@/services/questionCategoryAPI';
import { toLookupCode } from '@/lib/technologyHelpers';
import { LoadingState } from '@/components/ui/loading';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ActiveStatusFilter } from '@/components/ui/active-status-filter';
import { DEFAULT_ACTIVE_STATUS, filterByActiveStatus, isRecordActive } from '@/lib/activeStatusFilter';

const emptyForm = {
  label: '',
};

const META = {
  technology: {
    title: 'Technology Categories',
    description: 'Group technologies by category labels.',
    load: () => technologyAPI.getTechnologyCategoriesIncludingInactive(),
    create: (payload) => technologyAPI.createCategory(payload),
    update: (id, payload) => technologyAPI.updateCategory(id, payload),
    remove: (id) => technologyAPI.deleteCategory(id),
  },
  question: {
    title: 'Question Categories',
    description: 'Organize feedback form questions by category.',
    load: () => questionCategoryAPI.getAllIncludingInactive(),
    create: (payload) => questionCategoryAPI.create(payload),
    update: (id, payload) => questionCategoryAPI.update(id, payload),
    remove: (id) => questionCategoryAPI.delete(id),
  },
};

const ITEMS_PER_PAGE = 10;

const CategoryManager = ({ type = 'technology', onCategoriesChange }) => {
  const config = META[type];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_ACTIVE_STATUS);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const searched = !term
      ? items
      : items.filter((item) => item.label?.toLowerCase().includes(term));
    return filterByActiveStatus(searched, statusFilter);
  }, [items, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadItems = useCallback(async () => {
    const config = META[type];
    try {
      setLoading(true);
      const data = await config.load();
      const list = data || [];
      setItems(list);
      onCategoriesChange?.(list.filter(isRecordActive));
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [type, onCategoriesChange]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    if (item.isSystem) {
      toast({
        title: 'Not editable',
        description: 'System categories cannot be modified.',
        variant: 'destructive',
      });
      return;
    }
    setEditingItem(item);
    setFormData({
      label: item.label || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label?.trim()) {
      toast({
        title: 'Validation error',
        description: 'Label is required',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      label: formData.label.trim(),
    };
    if (!editingItem) {
      payload.code = toLookupCode(formData.label);
    }

    setIsMutating(true);
    try {
      if (editingItem) {
        await config.update(editingItem.id, payload);
      } else {
        await config.create(payload);
      }
      await loadItems();
      setDialogOpen(false);
      toast({ title: 'Saved', description: 'Category saved successfully.' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error.response?.data?.message || error.message || 'Unable to save category',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const requestDelete = (item) => {
    if (item.isSystem) {
      toast({
        title: 'Not deletable',
        description: 'System categories cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }
    setConfirmTarget({ action: 'deactivate', item });
  };

  const handleConfirm = async () => {
    const item = confirmTarget?.item;
    if (!item) return;
    setIsMutating(true);
    try {
      if (confirmTarget.action === 'reactivate') {
        await config.update(item.id, { isActive: true });
        toast({ title: 'Reactivated', description: 'Category reactivated successfully.' });
      } else {
        await config.remove(item.id);
        toast({ title: 'Removed', description: 'Category deactivated successfully.' });
      }
      setConfirmTarget(null);
      await loadItems();
    } catch (error) {
      toast({
        title: confirmTarget.action === 'reactivate' ? 'Reactivate failed' : 'Delete failed',
        description: error.response?.data?.message || error.message || 'Unable to update category',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  if (loading) {
    return (
      <LoadingState className="min-h-48 rounded-xl border bg-card" minHeight="none" />
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <Button onClick={openCreateDialog} disabled={isMutating}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="pl-10"
                disabled={isMutating}
              />
            </div>
            <ActiveStatusFilter value={statusFilter} onValueChange={setStatusFilter} />
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No categories found</p>
          ) : filteredItems.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {searchTerm.trim()
                ? `No categories match "${searchTerm.trim()}"`
                : 'No categories for this status'}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedItems.map((item) => {
                  const inactive = !isRecordActive(item);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        inactive ? 'opacity-70' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.isSystem && <Badge variant="secondary">System</Badge>}
                          {inactive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {inactive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmTarget({ action: 'reactivate', item })}
                            disabled={isMutating || item.isSystem}
                            className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reactivate
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                              disabled={isMutating || item.isSystem}
                            >
                              <SquarePen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requestDelete(item)}
                              disabled={isMutating || item.isSystem}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} categor
                  {filteredItems.length === 1 ? 'y' : 'ies'}
                  {searchTerm.trim() ? ` (filtered from ${items.length})` : ''}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1 || isMutating}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          disabled={isMutating}
                          className="min-w-9"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages || isMutating}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              Enter a label for this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`${type}-category-label`}>Label *</Label>
              <Input
                id={`${type}-category-label`}
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g. Cloud Platform"
                disabled={isMutating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isMutating}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => { if (!open && !isMutating) setConfirmTarget(null); }}
        title={confirmTarget?.action === 'reactivate' ? 'Reactivate category?' : 'Deactivate category?'}
        description={
          confirmTarget?.item
            ? confirmTarget.action === 'reactivate'
              ? `Reactivate "${confirmTarget.item.label}"? It will be available again.`
              : `Deactivate category "${confirmTarget.item.label}"?`
            : undefined
        }
        confirmLabel={confirmTarget?.action === 'reactivate' ? 'Reactivate' : 'Deactivate'}
        destructive={confirmTarget?.action !== 'reactivate'}
        onConfirm={handleConfirm}
        loading={isMutating}
      />
    </>
  );
};

export default CategoryManager;
