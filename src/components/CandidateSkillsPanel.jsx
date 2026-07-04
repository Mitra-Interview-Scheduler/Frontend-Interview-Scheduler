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
import { Code, Search, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import profileAPI from '@/services/profileService';
import { technologyAPI } from '@/services/technologyAPI';
import { getTechnologyCategoryLabel } from '@/lib/technologyHelpers';

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
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [filteredTechnologies, setFilteredTechnologies] = useState([]);

  const currentSkills = isPendingMode ? pendingSkills : candidateTechs;
  const canEdit = !readOnly && !disabled;

  const groupedSkills = useMemo(() => {
    const groups = new Map();
    currentSkills.forEach((item) => {
      const category = getTechnologyCategoryLabel(item.technology) || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(item);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({
        category,
        items: [...items].sort((a, b) =>
          (a.technology?.name || '').localeCompare(b.technology?.name || '', undefined, { sensitivity: 'base' }),
        ),
      }));
  }, [currentSkills]);

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
    setCandidateTechs(Array.isArray(skills) ? skills : []);
  }, [candidateId, skills]);

  useEffect(() => {
    if (newSkill.trim()) {
      const filtered = technologies.filter((tech) =>
        tech.name.toLowerCase().includes(newSkill.toLowerCase())
        && !currentSkills.some((item) => item.technology?.id === tech.id)
      );
      setFilteredTechnologies(filtered);
      setShowSkillDropdown(filtered.length > 0 || newSkill.length > 0);
    } else {
      setFilteredTechnologies([]);
      setShowSkillDropdown(false);
    }
  }, [newSkill, technologies, currentSkills]);

  const addPendingSkill = (technology) => {
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
      },
    ]);
  };

  const removePendingSkill = (technologyId) => {
    if (!onPendingSkillsChange) return;
    onPendingSkillsChange(pendingSkills.filter((item) => item.technology.id !== technologyId));
  };

  const addSkillById = async (technologyId) => {
    if (isPendingMode) {
      const technology = technologies.find((tech) => tech.id === technologyId);
      if (technology) addPendingSkill(technology);
      return;
    }

    try {
      if (candidateTechs.some((item) => item.technology.id === technologyId)) {
        toast({ title: 'Skill already added' });
        return;
      }
      const created = await candidateAPI.addCandidateTechnology(candidateId, technologyId);
      setCandidateTechs((prev) => [...prev, created]);
      onSkillsUpdated?.();
      toast({ title: 'Skill added' });
    } catch (error) {
      toast({
        title: 'Failed to add skill',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSelectFromDropdown = async (tech) => {
    setShowSkillDropdown(false);
    setNewSkill('');
    await addSkillById(tech.id);
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    setShowSkillDropdown(false);

    const exactMatch = technologies.find(
      (tech) => tech.name.toLowerCase() === newSkill.trim().toLowerCase()
    );

    if (exactMatch) {
      await addSkillById(exactMatch.id);
      setNewSkill('');
    } else {
      setShowNewSkillModal(true);
    }
  };

  const handleCreateAndAddSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      const createdTech = await profileAPI.createTechnology(
        newSkill.trim(),
        Number(newSkillCategoryId)
      );
      setTechnologies((prev) => [...prev, createdTech]);
      await addSkillById(createdTech.id);
      setNewSkill('');
      const defaultCategory = skillCategories.find((c) => c.code === 'GENERAL') || skillCategories[0];
      setNewSkillCategoryId(defaultCategory ? String(defaultCategory.id) : '');
      setShowNewSkillModal(false);
      toast({ title: 'Skill created and added' });
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

  const handleShowAllSkills = () => {
    if (showSkillDropdown) {
      setShowSkillDropdown(false);
    } else {
      setFilteredTechnologies(
        technologies.filter((tech) => !currentSkills.some((item) => item.technology?.id === tech.id))
      );
      setShowSkillDropdown(true);
    }
  };

  const skillSearch = canEdit && (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Type to search or add skill..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSkill();
              }
            }}
            onFocus={() => {
              if (newSkill.trim()) {
                setShowSkillDropdown(filteredTechnologies.length > 0);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowSkillDropdown(false), 200);
            }}
            className="h-9 pr-10"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />

          <AnimatePresence>
            {showSkillDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg"
              >
                {filteredTechnologies.length > 0 ? (
                  <div className="py-1">
                    {filteredTechnologies.slice(0, 10).map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => handleSelectFromDropdown(tech)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-accent"
                      >
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getTechnologyCategoryLabel(tech)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : newSkill.trim() && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No matching skills found. Press Enter to create &quot;{newSkill}&quot;
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="button"
          onClick={handleShowAllSkills}
          size="sm"
          variant="outline"
          className="h-9 shrink-0 px-2"
          title="Browse all skills"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const skillsList = (
    <>
      {currentSkills.length === 0 && (
        <p className="text-sm text-slate-500">
          {canEdit
            ? 'No skills added yet. Search above to add skills.'
            : 'No skills available.'}
        </p>
      )}
      {currentSkills.length > 0 && (
        <div className="space-y-4">
          {groupedSkills.map(({ category, items }) => (
            <div key={category}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {category}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-1.5 text-xs font-medium text-indigo-900 shadow-sm"
                  >
                    {item.technology?.name}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(item)}
                        className="rounded-full p-0.5 text-indigo-500 transition-colors hover:bg-indigo-100 hover:text-indigo-800"
                        title="Remove skill"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
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
                    &quot;{newSkill}&quot; doesn&apos;t exist yet. Create it for this candidate.
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
                    Create & Add
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
    </>
  );
}

export default CandidateSkillsPanel;
