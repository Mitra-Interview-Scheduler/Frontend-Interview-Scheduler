import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import profileAPI from '@/services/profileService';
import {
  filterTechnologiesByCategory,
  getTechnologyCategoryLabel,
  getSkillIsCore,
  normalizeSkillAssignment,
} from '@/lib/technologyHelpers';
import { CoreTechnologyPrompt, TechnologyProficiencyBadge } from '@/components/technologyProficiencyUi';

function InterviewerTechnologiesPanel({  isEditing = false,
  technologies = [],
  skillCategories = [],
  interviewerTechs = [],
  onTechnologiesChange,
  onTechnologyCreated,
}) {
  const [newSkill, setNewSkill] = useState('');
  const [newSkillCategoryId, setNewSkillCategoryId] = useState('');
  const [selectedBrowseCategory, setSelectedBrowseCategory] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [corePrompt, setCorePrompt] = useState(null);
  const [savingCoreChoice, setSavingCoreChoice] = useState(false);

  useEffect(() => {
    if (newSkillCategoryId || skillCategories.length === 0) return;
    const defaultCategory = skillCategories.find((c) => c.code === 'GENERAL') || skillCategories[0];
    setNewSkillCategoryId(defaultCategory ? String(defaultCategory.id) : '');
  }, [newSkillCategoryId, skillCategories]);

  const interviewerTechByTechnologyId = useMemo(
    () => new Map(interviewerTechs.map((item) => [item.technology.id, item])),
    [interviewerTechs],
  );

  const categoryTechnologies = useMemo(
    () => filterTechnologiesByCategory(technologies, selectedBrowseCategory),
    [technologies, selectedBrowseCategory],
  );

  const coreTechnologies = useMemo(
    () => interviewerTechs.filter((item) => getSkillIsCore(item)),
    [interviewerTechs],
  );

  const otherTechnologies = useMemo(
    () => interviewerTechs.filter((item) => !getSkillIsCore(item)),
    [interviewerTechs],
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

  const openTechnologyDropdown = () => {
    if (!canBrowseTechnologies) {
      toast.message('Select a category first');
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
        const updated = normalizeSkillAssignment(
          await profileAPI.updateInterviewerTechnology(existingEntry.id, { isCore }),
        );
        onTechnologiesChange?.(
          interviewerTechs.map((entry) => (entry.id === existingEntry.id ? updated : entry)),
        );
        toast.success(isCore ? 'Marked as core technology' : 'Moved to can do');
      } else {
        const created = normalizeSkillAssignment(
          await profileAPI.addInterviewerTechnology(technology.id, 0, isCore),
        );
        onTechnologiesChange?.([...interviewerTechs, created]);
        toast.success(isCore ? 'Core technology added' : 'Can do technology added');
      }

      setNewSkill('');
      setShowSkillDropdown(false);
      closeCorePrompt();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save technology');
    } finally {
      setSavingCoreChoice(false);
    }
  };

  const handleTechnologyPick = (tech) => {
    if (!canBrowseTechnologies) {
      toast.message('Select a category first');
      return;
    }

    setShowSkillDropdown(false);
    const existingEntry = interviewerTechByTechnologyId.get(tech.id) || null;
    openCorePrompt(tech, existingEntry);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!canBrowseTechnologies) {
      toast.message('Select a category first');
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

  const handleCreateTechnology = async () => {
    if (!newSkill.trim()) return;

    try {
      const createdTech = await profileAPI.createTechnology(newSkill.trim(), Number(newSkillCategoryId));
      onTechnologyCreated?.(createdTech);
      setShowNewSkillModal(false);
      openCorePrompt(createdTech, null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create skill');
    }
  };

  const handleRemoveSkill = async (interviewerTechId) => {
    try {
      await profileAPI.removeInterviewerTechnology(interviewerTechId);
      onTechnologiesChange?.(interviewerTechs.filter((item) => item.id !== interviewerTechId));
      toast.success('Skill removed');
    } catch {
      toast.error('Failed to remove skill');
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
                isEditing={isEditing}
                onOpenCorePrompt={openCorePrompt}
                onRemove={(entry) => handleRemoveSkill(entry.id)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );

  return (
    <>
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Technical Skills & Interview Preferences</CardTitle>
          <CardDescription>
            Pick a category, choose a technology, then mark it as Core Technology or Can Do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing && (
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
                  <SelectTrigger>
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
                    className="pr-10"
                    disabled={!canBrowseTechnologies || savingCoreChoice}
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />

                  <AnimatePresence>
                    {canBrowseTechnologies && showSkillDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg"
                      >
                        {dropdownTechnologies.length > 0 ? (
                          <div className="py-1">
                            {dropdownTechnologies.map((tech) => {
                              const existingEntry = interviewerTechByTechnologyId.get(tech.id);
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
          )}

          {interviewerTechs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? 'No skills added yet. Select a category and add your first technology.'
                : "No skills added yet. Click 'Edit Profile' to add skills."}
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
        </CardContent>
      </Card>

      <CoreTechnologyPrompt
        open={Boolean(corePrompt)}
        technology={corePrompt?.technology}
        existingEntry={corePrompt?.existingEntry}
        saving={savingCoreChoice}
        onClose={closeCorePrompt}
        onConfirm={handleCoreChoice}
      />

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
                <CardHeader>
                  <CardTitle>Create New Skill</CardTitle>
                  <CardDescription>
                    &quot;{newSkill}&quot; doesn&apos;t exist yet. You&apos;ll choose core status next.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="skillName">Skill Name</Label>
                    <Input
                      id="skillName"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="e.g., React Native"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skillCategory">Category</Label>
                    <Select
                      value={newSkillCategoryId}
                      onValueChange={setNewSkillCategoryId}
                    >
                      <SelectTrigger id="skillCategory">
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

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewSkillModal(false);
                        setNewSkill('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleCreateTechnology}>
                      Create
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default InterviewerTechnologiesPanel;
