import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Globe2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { domainAPI } from '@/services/domainAPI';
import { toLookupCode } from '@/lib/technologyHelpers';

const DomainsPage = () => {
  const [domains, setDomains] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await domainAPI.getAllDomainsIncludingInactive();
      setDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast({
        title: 'Error',
        description: 'Failed to load domains',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingDomain(null);
  };

  const handleAdd = async () => {
    if (!formData.name?.trim()) {
      toast({ title: 'Validation', description: 'Domain name is required', variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      await domainAPI.createDomain({
        name: formData.name.trim(),
        code: toLookupCode(formData.name),
      });
      toast({ title: 'Success', description: 'Domain created successfully' });
      setIsAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create domain',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const openEdit = (domain) => {
    setEditingDomain(domain);
    setFormData({ name: domain.name || '' });
    setIsEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingDomain || !formData.name?.trim()) return;
    setIsMutating(true);
    try {
      await domainAPI.updateDomain(editingDomain.id, {
        name: formData.name.trim(),
        code: editingDomain.code || undefined,
        isActive: editingDomain.isActive !== false,
      });
      toast({ title: 'Success', description: 'Domain updated successfully' });
      setIsEditDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update domain',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async (domain) => {
    if (!window.confirm(`Deactivate domain "${domain.name}"?`)) return;
    setIsMutating(true);
    try {
      await domainAPI.deleteDomain(domain.id);
      toast({ title: 'Success', description: 'Domain deactivated' });
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to deactivate domain',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const activeDomains = domains.filter((d) => d.isActive !== false);
  const inactiveDomains = domains.filter((d) => d.isActive === false);

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Domains</h1>
            <p className="text-muted-foreground text-lg">
              Manage business domains for candidates and interviewers
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Domain
          </Button>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="w-5 h-5" /> Active Domains ({activeDomains.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeDomains.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No domains yet. Create your first domain.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDomains.map((domain) => (
                  <div
                    key={domain.id}
                    className="border rounded-lg p-2 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow"
                  >
                    <div>
                      <p className="font-semibold">{domain.name}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(domain)} disabled={isMutating}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(domain)}
                        disabled={isMutating}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {inactiveDomains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">Inactive Domains ({inactiveDomains.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {inactiveDomains.map((domain) => (
                  <Badge key={domain.id} variant="secondary">{domain.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>Create a new domain for candidates and interviewers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Healthcare, Finance"
                disabled={isMutating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isMutating}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isMutating}>
              {isMutating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>Update domain details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isMutating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isMutating}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isMutating}>
              {isMutating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DomainsPage;
