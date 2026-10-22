import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, SquarePen, Trash2, FileText, Link2, Search, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';
import { documentTypeAPI, resourceTypeAPI } from '@/services/catalogTypeAPI';
import { LoadingState, LoadingSwap, useTabTransition } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ActiveStatusFilter } from '@/components/ui/active-status-filter';
import { DEFAULT_ACTIVE_STATUS, filterByActiveStatus, isRecordActive } from '@/lib/activeStatusFilter';

const TABS = [
  { value: 'documents', label: 'Document Types', icon: FileText },
  { value: 'resources', label: 'Resource Types', icon: Link2 },
];

const emptyForm = { label: '', code: '' };

const CatalogTypesPage = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const tabMotion = useTabTransition();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_ACTIVE_STATUS);
  // { action: 'deactivate' | 'reactivate', item }
  const [confirmTarget, setConfirmTarget] = useState(null);

  const api = activeTab === 'documents' ? documentTypeAPI : resourceTypeAPI;
  const singular = activeTab === 'documents' ? 'Document type' : 'Resource type';
  const typeNoun = activeTab === 'documents' ? 'Document' : 'Resource';

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load catalog types:', error);
      toast({
        title: 'Error',
        description: `Failed to load ${singular.toLowerCase()}s`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm('');
    setStatusFilter(DEFAULT_ACTIVE_STATUS);
    loadData();
  }, [activeTab]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditing(null);
  };

  const handleAdd = async () => {
    if (!formData.label?.trim()) {
      toast({ title: 'Validation', description: 'Label is required', variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      await api.create({
        label: formData.label.trim(),
        code: formData.code?.trim() || undefined,
      });
      toast({ title: 'Success', description: `${singular} created` });
      setIsAddOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to create ${singular.toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormData({
      label: item.label || '',
      code: item.code || '',
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editing || !formData.label?.trim()) return;
    setIsMutating(true);
    try {
      await api.update(editing.id, {
        label: formData.label.trim(),
        code: formData.code?.trim() || undefined,
        active: editing.active !== false,
      });
      toast({ title: 'Success', description: `${singular} updated` });
      setIsEditOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to update ${singular.toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirm = async () => {
    const item = confirmTarget?.item;
    if (!item) return;
    setIsMutating(true);
    try {
      if (confirmTarget.action === 'reactivate') {
        await api.update(item.id, {
          label: item.label,
          code: item.code || undefined,
          active: true,
        });
        toast({ title: 'Success', description: `${singular} reactivated` });
      } else {
        await api.delete(item.id);
        toast({ title: 'Success', description: `${singular} deactivated` });
      }
      setConfirmTarget(null);
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error.response?.data?.message
          || (confirmTarget.action === 'reactivate'
            ? `Failed to reactivate ${singular.toLowerCase()}`
            : `Failed to deactivate ${singular.toLowerCase()}`),
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const searched = !term
      ? items
      : items.filter((item) => (
        item.label?.toLowerCase().includes(term)
        || item.code?.toLowerCase().includes(term)
      ));
    return filterByActiveStatus(searched, statusFilter);
  }, [items, searchTerm, statusFilter]);

  const formFields = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Label *</Label>
        <Input
          value={formData.label}
          onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
          placeholder={activeTab === 'documents' ? 'e.g. Offer Letter' : 'e.g. Portfolio Drive'}
          disabled={isMutating}
        />
      </div>
      <div className="space-y-2">
        <Label>Code (optional)</Label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
          placeholder="Auto-generated from label if empty"
          disabled={isMutating}
        />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Document & Resource Types"
          description="Manage types available when uploading documents or attaching resource links"
          actions={
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add {singular}
            </Button>
          }
        />

        <AdminSectionTabs
          tabs={TABS.map((tab) => ({
            ...tab,
            count: tab.value === activeTab ? filteredItems.length : undefined,
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={activeTab} {...tabMotion}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {typeNoun} Types ({filteredItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`Search ${typeNoun.toLowerCase()} types...`}
                      className="pl-10"
                    />
                  </div>
                  <ActiveStatusFilter value={statusFilter} onValueChange={setStatusFilter} />
                </div>
                <LoadingSwap loading={loading && items.length === 0} fallback={<LoadingState />}>
                  {items.length === 0 ? (
                    <EmptyState
                      icon={activeTab === 'documents' ? FileText : Link2}
                      title="No types yet"
                      description="Create your first one."
                      compact
                    />
                  ) : filteredItems.length === 0 ? (
                    <EmptyState
                      icon={activeTab === 'documents' ? FileText : Link2}
                      title={searchTerm.trim() ? `No types match "${searchTerm.trim()}"` : 'No types for this status'}
                      compact
                    />
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((item) => {
                        const inactive = !isRecordActive(item);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${
                              inactive ? 'opacity-70' : 'hover:bg-muted/30'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium truncate">{item.label}</span>
                                {inactive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                              </div>
                              {item.code && (
                                <p className="text-xs text-muted-foreground mt-1">Code: {item.code}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              {inactive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmTarget({ action: 'reactivate', item })}
                                  disabled={isMutating}
                                  className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Reactivate"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reactivate
                                </Button>
                              ) : (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} disabled={isMutating}>
                                    <SquarePen className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmTarget({ action: 'deactivate', item })}
                                    disabled={isMutating}
                                    className="text-destructive hover:text-destructive"
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
                  )}
                </LoadingSwap>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <Dialog open={isAddOpen} onOpenChange={(open) => !isMutating && setIsAddOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {singular}</DialogTitle>
            <DialogDescription>
              New types appear in candidate document upload and resource link dialogs.
            </DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={isMutating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => !isMutating && setIsEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {singular}</DialogTitle>
            <DialogDescription>Update the label or code.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={isMutating}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => { if (!open && !isMutating) setConfirmTarget(null); }}
        title={
          confirmTarget?.action === 'reactivate'
            ? `Reactivate ${singular.toLowerCase()}?`
            : `Deactivate ${singular.toLowerCase()}?`
        }
        description={
          confirmTarget?.item
            ? confirmTarget.action === 'reactivate'
              ? `Reactivate "${confirmTarget.item.label}"? It will be available again.`
              : `Deactivate "${confirmTarget.item.label}"? It will be moved to inactive.`
            : undefined
        }
        confirmLabel={confirmTarget?.action === 'reactivate' ? 'Reactivate' : 'Deactivate'}
        destructive={confirmTarget?.action !== 'reactivate'}
        onConfirm={handleConfirm}
        loading={isMutating}
      />
    </Layout>
  );
};

export default CatalogTypesPage;
