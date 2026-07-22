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
import { Plus, Edit, Trash2, FileText, Link2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';
import { documentTypeAPI, resourceTypeAPI } from '@/services/catalogTypeAPI';

const TABS = [
  { value: 'documents', label: 'Document Types', icon: FileText },
  { value: 'resources', label: 'Resource Types', icon: Link2 },
];

const emptyForm = { label: '', code: '', displayOrder: '' };

const CatalogTypesPage = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const api = activeTab === 'documents' ? documentTypeAPI : resourceTypeAPI;
  const singular = activeTab === 'documents' ? 'Document type' : 'Resource type';

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
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder, 10) : undefined,
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
      displayOrder: item.displayOrder?.toString() || '',
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
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder, 10) : undefined,
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

  const handleDelete = async (item) => {
    if (!window.confirm(`Deactivate "${item.label}"?`)) return;
    setIsMutating(true);
    try {
      await api.delete(item.id);
      toast({ title: 'Success', description: `${singular} deactivated` });
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to deactivate ${singular.toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const activeItems = useMemo(() => items.filter((item) => item.active !== false), [items]);
  const inactiveItems = useMemo(() => items.filter((item) => item.active === false), [items]);

  const renderList = (list, inactive = false) => {
    if (list.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          {inactive ? 'No inactive types.' : 'No types yet. Create your first one.'}
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 flex items-start justify-between gap-3 ${
              inactive ? 'opacity-70' : 'hover:shadow-sm transition-shadow'
            }`}
          >
            <div className="min-w-0">
              <p className="font-semibold truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">Code: {item.code}</p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                Order {item.displayOrder ?? 0}
              </Badge>
            </div>
            {!inactive && (
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(item)} disabled={isMutating}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item)}
                  disabled={isMutating}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

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
      <div className="space-y-2">
        <Label>Display order (optional)</Label>
        <Input
          type="number"
          value={formData.displayOrder}
          onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: e.target.value }))}
          placeholder="Auto"
          disabled={isMutating}
        />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Document & Resource Types</h1>
            <p className="text-muted-foreground text-lg">
              Manage types available when uploading documents or attaching resource links
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            Add {singular}
          </Button>
        </motion.div>

        <AdminSectionTabs
          tabs={TABS.map((tab) => ({
            ...tab,
            count: tab.value === activeTab ? activeItems.length : undefined,
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <Card>
          <CardHeader>
            <CardTitle>
              Active {activeTab === 'documents' ? 'Document' : 'Resource'} Types ({activeItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              renderList(activeItems)
            )}
          </CardContent>
        </Card>

        {!loading && inactiveItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inactive ({inactiveItems.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderList(inactiveItems, true)}</CardContent>
          </Card>
        )}
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
            <Button onClick={handleAdd} disabled={isMutating}>
              {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => !isMutating && setIsEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {singular}</DialogTitle>
            <DialogDescription>Update the label, code, or display order.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isMutating}>
              {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CatalogTypesPage;
