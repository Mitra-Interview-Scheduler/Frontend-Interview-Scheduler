import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Code, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import profileAPI from '@/services/profileService';
import { technologyAPI } from '@/services/technologyAPI';
import {
  filterTechnologiesByCategory,
  getTechnologyCategoryLabel,
  getSkillIsCore,
  normalizeSkillAssignment,
} from '@/lib/technologyHelpers';
import { CoreTechnologyPrompt, TechnologyProficiencyBadge } from '@/components/technologyProficiencyUi';

function CandidateSkillsPanel({
  candidateId = null,
  skills = [],
  readOnly = false,
  disabled = false,
  pendingSkills = [],
  onPendingSkillsChange,
  onSkillsUpdated,
  variant = 'card',
  defaultExpanded = true,
}) {
  const isPendingMode = !candidateId;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [candidateTechs, setCandidateTechs] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [skillCategories, setSkillCategories] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [newSkillCategoryId, setNewSkillCategoryId] = useState('');
  const [selectedBrowseCategory, setSelectedBrowseCategory] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [corePrompt, setCorePrompt] = useState(null);
  const [savingCoreChoice, setSavingCoreChoice] = useState(false);

  const currentSkills = isPendingMode
    ? pendingSkills.map(normalizeSkillAssignment)
    : candidateTechs;
  const canEdit = !readOnly && !disabled;

  const skillByTechnologyId = useMemo(
    () => new Map(currentSkills.map((item) => [item.technology.id, item])),
    [currentSkills],
  );

  const categoryTechnologies = useMemo(
    () => filterTechnologiesByCategory(technologies, selectedBrowseCategory),
    [technologies, selectedBrowseCategory],
  );

  const coreTechnologies = useMemo(
    () => currentSkills.filter((item) => getSkillIsCore(item)),
    [currentSkills],
  );

  const otherTechnologies = useMemo(
    () => currentSkills.filter((item) => !getSkillIsCore(item)),
    [currentSkills],
  );

  const canBrowseTechnologies = Boolean(selectedBrowseCategory);

  const dropdownTechnologies = useMemo(() => {
    if (!canBrowseTechnologies) return [];

    const term = newSkill.trim().toLowerCase();
    if (!term) return categoryTechnologies;

    return categoryTechnologies.filter((tech) =>
      tech.name.toLowerCase().includes(term)
      || tech.code?.toLowerCase().includes(term),
    );
  }, [newSkill, categoryTechnologies, canBrowseTechnologies]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [techList, categoryList] = await Promise.all([
          profileAPI.getAllTechnologies(),
          technologyAPI.getAllCategories(),
        ]);
        setTechnologies(techList || []);
        setSkillCategories(categoryList || []);
        const defaultCategory = (categoryList || []).find((c) => c.code === 'GENERAL') || categoryList?.[0];
        setNewSkillCategoryId(defaultCategory ? String(defaultCategory.id) : '');
      } catch {
        setTechnologies([]);
        setSkillCategories([]);
      }
    };
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!candidateId) {
      setCandidateTechs([]);
      return;
    }
    setCandidateTechs(Array.isArray(skills) ? skills.map(normalizeSkillAssignment) : []);
  }, [candidateId, skills]);

  const openTechnologyDropdown = () => {
    if (!canBrowseTechnologies) {
      toast({ title: 'Select a category first' });
      return;
    }
    setShowSkillDropdown(true);
  };

  const openCorePrompt = (technology, existingEntry = null) => {
    setCorePrompt({ technology, existingEntry });
  };

  const closeCorePrompt = () => {
    setCorePrompt(null);
  };

  const addPendingSkill = (technology, isCore) => {
    if (!onPendingSkillsChange) return;
    if (pendingSkills.some((item) => item.technology.id === technology.id)) {
      toast({ title: 'Skill already added', variant: 'destructive' });
      return;
    }
    onPendingSkillsChange([
      ...pendingSkills,
      {
        id: `pending-${technology.id}`,
        technology,
        isActive: true,
        isCore,
      },
    ]);
  };

  const updatePendingSkill = (technologyId, isCore) => {
    if (!onPendingSkillsChange) return;
    onPendingSkillsChange(
      pendingSkills.map((item) =>
        (item.technology.id === technologyId ? { ...item, isCore } : item),
      ),
    );
  };

  const removePendingSkill = (technologyId) => {
    if (!onPendingSkillsChange) return;
    onPendingSkillsChange(pendingSkills.filter((item) => item.technology.id !== technologyId));
  };

  const handleCoreChoice = async (isCore) => {
    if (!corePrompt?.technology) return;

    const { technology, existingEntry } = corePrompt;
    setSavingCoreChoice(true);

    try {
      if (existingEntry) {
        if (getSkillIsCore(existingEntry) === isCore) {
          closeCorePrompt();
          return;
        }

        if (isPendingMode) {
          updatePendingSkill(technology.id, isCore);
        } else {
          const updated = normalizeSkillAssignment(await candidateAPI.updateCandidateTechnology(
            candidateId,
            existingEntry.id,
            { isCore },
          ));
          setCandidateTechs((prev) =>
            prev.map((entry) => (entry.id === existingEntry.id ? updated : entry)),
          );
          onSkillsUpdated?.();
        }

        toast({
          title: isCore ? 'Marked as core technology' : 'Moved to can do',
        });
      } else if (isPendingMode) {
        addPendingSkill(technology, isCore);
        toast({
          title: isCore ? 'Core technology added' : 'Can do technology added',
        });
      } else {
        const created = normalizeSkillAssignment(
          await candidateAPI.addCandidateTechnology(candidateId, technology.id, isCore),
        );
        setCandidateTechs((prev) => [...prev, created]);
        onSkillsUpdated?.();
        toast({
          title: isCore ? 'Core technology added' : 'Can do technology added',
        });
      }

      setNewSkill('');
      setShowSkillDropdown(false);
      closeCorePrompt();
    } catch (error) {
      toast({
        title: 'Failed to save skill',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingCoreChoice(false);
    }
  };

  const handleTechnologyPick = (tech) => {
    if (!canBrowseTechnologies) {
      toast({ title: 'Select a category first' });
      return;
    }

    setShowSkillDropdown(false);
    const existingEntry = skillByTechnologyId.get(tech.id) || null;
    openCorePrompt(tech, existingEntry);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!canBrowseTechnologies) {
      toast({ title: 'Select a category first' });
      return;
    }

    setShowSkillDropdown(false);

    const exactMatch = categoryTechnologies.find(
      (tech) => tech.name.toLowerCase() === newSkill.trim().toLowerCase(),
    );

    if (exactMatch) {
      handleTechnologyPick(exactMatch);
    } else {
      setShowNewSkillModal(true);
    }
  };

  const handleCreateAndAddSkill = async () => {
    if (!newSkill.trim()) return;

    try {
      const createdTech = await profileAPI.createTechnology(
        newSkill.trim(),
        Number(newSkillCategoryId),
      );
      setTechnologies((prev) => [...prev, createdTech]);
      setShowNewSkillModal(false);
      openCorePrompt(createdTech, null);
    } catch (error) {
      toast({
        title: 'Failed to create skill',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSkill = async (item) => {
    if (isPendingMode) {
      removePendingSkill(item.technology.id);
      return;
    }

    try {
      await candidateAPI.removeCandidateTechnology(candidateId, item.id);
      setCandidateTechs((prev) => prev.filter((tech) => tech.id !== item.id));
      onSkillsUpdated?.();
      toast({ title: 'Skill removed' });
    } catch (error) {
      toast({
        title: 'Failed to remove skill',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const renderTechnologyGroup = (title, items, emptyText) => (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <TechnologyProficiencyBadge
                item={item}
                isEditing={canEdit}
                onOpenCorePrompt={openCorePrompt}
                onRemove={handleRemoveSkill}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );

  const skillSearch = canEdit && (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Browse by category</Label>
        <Select
          value={selectedBrowseCategory || 'NONE'}
          onValueChange={(value) => {
            setSelectedBrowseCategory(value === 'NONE' ? '' : value);
            setShowSkillDropdown(false);
            setNewSkill('');
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Select a category</SelectItem>
            {skillCategories.map((category) => (
              <SelectItem key={category.id} value={category.code}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            placeholder={canBrowseTechnologies ? 'Search technologies in this category…' : 'Select a category first'}
            value={newSkill}
            onChange={(e) => {
              setNewSkill(e.target.value);
              if (canBrowseTechnologies) {
                setShowSkillDropdown(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSkill();
              }
            }}
            onFocus={openTechnologyDropdown}
            onClick={openTechnologyDropdown}
            onBlur={() => {
              setTimeout(() => setShowSkillDropdown(false), 200);
            }}
            className="h-9 pr-10"
            disabled={!canBrowseTechnologies || savingCoreChoice}
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />

          <AnimatePresence>
            {canBrowseTechnologies && showSkillDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg"
              >
                {dropdownTechnologies.length > 0 ? (
                  <div className="py-1">
                    {dropdownTechnologies.map((tech) => {
                      const existingEntry = skillByTechnologyId.get(tech.id);
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => handleTechnologyPick(tech)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left hover:bg-accent ${
                            existingEntry ? 'bg-slate-50' : ''
                          }`}
                        >
                          <span className="font-medium">{tech.name}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getTechnologyCategoryLabel(tech)}
                            {existingEntry && (
                              <Badge variant="secondary" className="text-[10px]">
                                {getSkillIsCore(existingEntry) ? 'Core' : 'Can Do'}
                              </Badge>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : newSkill.trim() ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No matching skills found. Press Enter to create &quot;{newSkill}&quot;
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No technologies available in this category.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-xs text-muted-foreground">
          Select a category, then click the search field to browse technologies.
          Type to filter, or pick one to set Core Technology or Can Do.
        </p>
      </div>
    </div>
  );

  const skillsList = (
    <>
      {currentSkills.length === 0 ? (
        <p className="text-sm text-slate-500">
          {canEdit
            ? 'No skills added yet. Select a category and add your first technology.'
            : 'No skills available.'}
        </p>
      ) : (
        <div className="space-y-4">
          {renderTechnologyGroup(
            'Core Technologies',
            coreTechnologies,
            'No core technologies marked yet.',
          )}
          {renderTechnologyGroup(
            'Can Do',
            otherTechnologies,
            'No can do technologies added.',
          )}
        </div>
      )}
    </>
  );

  const createSkillModal = (
    <AnimatePresence>
      {showNewSkillModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => {
              setShowNewSkillModal(false);
              setNewSkill('');
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <Card className="shadow-2xl">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-base font-semibold text-slate-900">Create New Skill</p>
                  <p className="mt-1 text-sm text-slate-500">
                    &quot;{newSkill}&quot; doesn&apos;t exist yet. You&apos;ll choose core status next.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateSkillName">Skill Name</Label>
                  <Input
                    id="candidateSkillName"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateSkillCategory">Category</Label>
                  <Select value={newSkillCategoryId} onValueChange={setNewSkillCategoryId}>
                    <SelectTrigger id="candidateSkillCategory">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillCategories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowNewSkillModal(false);
                      setNewSkill('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" className="flex-1" onClick={handleCreateAndAddSkill}>
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const sectionHeader = (
    <div className="flex items-center gap-2">
      <Code className="h-4 w-4 text-blue-600" />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Technical Skills</p>
    </div>
  );

  const sectionToolbar = (
    <div className="flex items-center gap-2 shrink-0">
      <Badge variant="outline" className="rounded-full text-[11px]">
        {currentSkills.length}
      </Badge>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse technical skills' : 'Expand technical skills'}
        onClick={() => setIsExpanded((value) => !value)}
        className="rounded p-1 hover:bg-slate-100"
      >
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

  const sectionBody = isExpanded && (
    <div className="space-y-4">
      {skillSearch}
      {skillsList}
    </div>
  );

  if (variant === 'embedded') {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="flex min-w-0 flex-1 items-center text-left"
            >
              {sectionHeader}
            </button>
            {sectionToolbar}
          </div>
          {sectionBody}
        </div>
        {createSkillModal}
        <CoreTechnologyPrompt
          open={Boolean(corePrompt)}
          technology={corePrompt?.technology}
          existingEntry={corePrompt?.existingEntry}
          saving={savingCoreChoice}
          onClose={closeCorePrompt}
          onConfirm={handleCoreChoice}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="flex min-w-0 flex-1 items-center text-left"
            >
              {sectionHeader}
            </button>
            {sectionToolbar}
          </div>
          {sectionBody}
        </CardContent>
      </Card>
      {createSkillModal}
      <CoreTechnologyPrompt
        open={Boolean(corePrompt)}
        technology={corePrompt?.technology}
        existingEntry={corePrompt?.existingEntry}
        saving={savingCoreChoice}
        onClose={closeCorePrompt}
        onConfirm={handleCoreChoice}
      />
    </>
  );
}

export default CandidateSkillsPanel;
