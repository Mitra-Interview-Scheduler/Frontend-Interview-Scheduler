import React, { useMemo, useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, SquarePen, Trash2, Globe2, Search, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { domainAPI } from '@/services/domainAPI';
import { toLookupCode } from '@/lib/technologyHelpers';
import { LoadingState, LoadingSwap } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ActiveStatusFilter } from '@/components/ui/active-status-filter';
import { DEFAULT_ACTIVE_STATUS, filterByActiveStatus, isRecordActive } from '@/lib/activeStatusFilter';

const DomainsPage = () => {
  const [domains, setDomains] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_ACTIVE_STATUS);
  // { action: 'deactivate' | 'reactivate', domain }
  const [confirmTarget, setConfirmTarget] = useState(null);

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

  const handleConfirm = async () => {
    const domain = confirmTarget?.domain;
    if (!domain) return;
    setIsMutating(true);
    try {
      if (confirmTarget.action === 'reactivate') {
        await domainAPI.updateDomain(domain.id, {
          name: domain.name,
          code: domain.code || undefined,
          isActive: true,
        });
        toast({ title: 'Success', description: 'Domain reactivated' });
      } else {
        await domainAPI.deleteDomain(domain.id);
        toast({ title: 'Success', description: 'Domain deactivated' });
      }
      setConfirmTarget(null);
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error.response?.data?.message
          || (confirmTarget.action === 'reactivate'
            ? 'Failed to reactivate domain'
            : 'Failed to deactivate domain'),
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const filteredDomains = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const searched = !term
      ? domains
      : domains.filter((domain) => (
        domain.name?.toLowerCase().includes(term)
        || domain.code?.toLowerCase().includes(term)
      ));
    return filterByActiveStatus(searched, statusFilter);
  }, [domains, searchTerm, statusFilter]);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Domains"
          description="Manage business domains for candidates and interviewers"
          actions={
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Domain
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="w-5 h-5" /> Domains ({filteredDomains.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search domains..."
                  className="pl-10"
                />
              </div>
              <ActiveStatusFilter value={statusFilter} onValueChange={setStatusFilter} />
            </div>
            <LoadingSwap loading={loading && domains.length === 0} fallback={<LoadingState />}>
              {domains.length === 0 ? (
                <EmptyState
                  icon={Globe2}
                  title="No domains yet"
                  description="Create your first domain."
                  compact
                />
              ) : filteredDomains.length === 0 ? (
                <EmptyState
                  icon={Globe2}
                  title={searchTerm.trim() ? `No domains match "${searchTerm.trim()}"` : 'No domains for this status'}
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {filteredDomains.map((domain) => {
                    const inactive = !isRecordActive(domain);
                    return (
                      <div
                        key={domain.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${
                          inactive ? 'opacity-70' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{domain.name}</span>
                            {inactive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                          </div>
                          {domain.code && (
                            <p className="text-xs text-muted-foreground mt-1">Code: {domain.code}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {inactive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmTarget({ action: 'reactivate', domain })}
                              disabled={isMutating}
                              className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Reactivate"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reactivate
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(domain)} disabled={isMutating}>
                                <SquarePen className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmTarget({ action: 'deactivate', domain })}
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
            <Button onClick={handleAdd} loading={isMutating}>
              Create
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
            <Button onClick={handleEdit} loading={isMutating}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => { if (!open && !isMutating) setConfirmTarget(null); }}
        title={confirmTarget?.action === 'reactivate' ? 'Reactivate domain?' : 'Deactivate domain?'}
        description={
          confirmTarget?.domain
            ? confirmTarget.action === 'reactivate'
              ? `Reactivate "${confirmTarget.domain.name}"? It will be available again.`
              : `Deactivate "${confirmTarget.domain.name}"? It will be moved to inactive.`
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

export default DomainsPage;
