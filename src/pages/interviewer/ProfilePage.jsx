import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Briefcase, Award, Edit2, Save, Plus, X, Loader2, Search, ChevronDown, TrendingUp } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import profileAPI from '@/services/profileService';
import { normalizeImageUrl } from '@/lib/imageUrl';

const SKILL_CATEGORIES = [
  'Programming Language',
  'Framework',
  'Database',
  'Cloud Platform',
  'DevOps',
  'Testing',
  'Mobile',
  'Architecture',
  'Concept',
  'Methodology',
  'AI/ML',
  'Other'
];

const ProfilePage = () => {
  const { user, syncUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Other');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [filteredTechnologies, setFilteredTechnologies] = useState([]);
  const [profile, setProfile] = useState(null);
  const [technologies, setTechnologies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [interviewerTechs, setInterviewerTechs] = useState([]);
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);

  // ── FIX: dedicated state for tier selection so it doesn't depend on
  //         profile.currentDesignation (which gets nulled on tier change)
  const [selectedTierId, setSelectedTierId] = useState(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (newSkill.trim()) {
      const filtered = technologies.filter(tech =>
        tech.name.toLowerCase().includes(newSkill.toLowerCase()) &&
        !interviewerTechs.some(it => it.technology.id === tech.id)
      );
      setFilteredTechnologies(filtered);
      setShowSkillDropdown(filtered.length > 0 || newSkill.length > 0);
    } else {
      setFilteredTechnologies([]);
      setShowSkillDropdown(false);
    }
  }, [newSkill, technologies, interviewerTechs]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, techList, deptList, desList, tierList, interviewerTechList] = await Promise.all([
        profileAPI.getProfile(),
        profileAPI.getAllTechnologies(),
        profileAPI.getDepartments(),
        profileAPI.getDesignations(),
        profileAPI.getTiers(),
        profileAPI.getInterviewerTechnologies()
      ]);

      setProfile(profileData);
      setTechnologies(techList);
      setDepartments(deptList);
      setDesignations(desList);
      setTiers(tierList);
      setInterviewerTechs(interviewerTechList);

      syncUser?.({
        ...user,
        ...profileData,
        profilePicture: profileData.profilePictureUrl || profileData.profilePicture || user?.profilePicture || null,
        profilePictureUrl: profileData.profilePictureUrl || profileData.profilePicture || user?.profilePictureUrl || null,
      });

      // ── FIX: initialize selectedTierId from the loaded profile
      setSelectedTierId(profileData.currentDesignation?.tier?.id ?? null);

      if (profileData.department?.id) {
        await loadTiersForDepartment(profileData.department.id);
      }
      if (profileData.currentDesignation?.tier?.id) {
        await loadDesignationsForTier(profileData.currentDesignation.tier.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadTiersForDepartment = async (departmentId) => {
    try {
      const tiersData = await profileAPI.getTiersByDepartment(departmentId);
      setTiersForSelectedDept(tiersData.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (error) {
      console.error('Failed to load tiers:', error);
      setTiersForSelectedDept([]);
    }
  };

  const loadDesignationsForTier = async (tierId) => {
    try {
      const designationsData = await profileAPI.getDesignationsByTier(tierId);
      setDesignationsForSelectedTier(designationsData.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (error) {
      console.error('Failed to load designations:', error);
      setDesignationsForSelectedTier([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await profileAPI.updateProfile({
        phone: profile.phone,
        profilePictureUrl: profile.profilePictureUrl,
        departmentId: profile.department?.id,
        designationId: profile.currentDesignation?.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        bio: profile.bio,
        yearsOfExperience: profile.yearsOfExperience
      });

      setIsEditing(false);
      toast.success('Profile updated successfully!');
      await loadProfileData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleDepartmentChange = async (deptId) => {
    if (deptId === "NONE") {
      setProfile({ ...profile, department: null, currentDesignation: null });
      setSelectedTierId(null);         // ── FIX
      setTiersForSelectedDept([]);
      setDesignationsForSelectedTier([]);
      return;
    }

    const department = departments.find(d => d.id === parseInt(deptId));
    setProfile({ ...profile, department, currentDesignation: null });
    setSelectedTierId(null);           // ── FIX: reset tier when department changes
    setDesignationsForSelectedTier([]);

    if (deptId) {
      await loadTiersForDepartment(parseInt(deptId));
    } else {
      setTiersForSelectedDept([]);
    }
  };

  const handleTierChange = async (tierId) => {
    if (tierId === "NONE" || !tierId) {
      setSelectedTierId(null);         // ── FIX: clear dedicated tier state
      setProfile({ ...profile, currentDesignation: null });
      setDesignationsForSelectedTier([]);
      return;
    }

    const id = parseInt(tierId);
    setSelectedTierId(id);             // ── FIX: store tier independently, not inside profile

    await loadDesignationsForTier(id);

    // Only reset designation if switching to a different tier
    if (profile.currentDesignation?.tier?.id !== id) {
      setProfile({ ...profile, currentDesignation: null });
    }
  };

  const handleDesignationChange = (designationId) => {
    if (designationId === "NONE") {
      setProfile({ ...profile, currentDesignation: null });
      return;
    }
    const designation = designationsForSelectedTier.find(d => d.id === parseInt(designationId));
    setProfile({ ...profile, currentDesignation: designation });
  };

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();
  };

  const profileImage = normalizeImageUrl(
    profile?.profilePictureUrl ||
      profile?.profilePicture ||
      user?.profilePicture ||
      user?.profilePictureUrl ||
      null
  );

  const handleSelectFromDropdown = async (tech) => {
    setShowSkillDropdown(false);
    setNewSkill('');
    await addSkillById(tech.id);
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;

    setShowSkillDropdown(false);

    try {
      const exactMatch = technologies.find(
        t => t.name.toLowerCase() === newSkill.trim().toLowerCase()
      );

      if (exactMatch) {
        await addSkillById(exactMatch.id);
        setNewSkill('');
      } else {
        setShowNewSkillModal(true);
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error('Failed to add skill');
    }
  };

  const handleCreateAndAddSkill = async () => {
    if (!newSkill.trim()) return;

    try {
      const newTech = await profileAPI.createTechnology(newSkill.trim(), newSkillCategory);
      setTechnologies([...technologies, newTech]);
      await addSkillById(newTech.id);

      setNewSkill('');
      setNewSkillCategory('Other');
      setShowNewSkillModal(false);

      toast.success(`Created and added "${newTech.name}"`);
    } catch (error) {
      console.error('Error creating skill:', error);
      toast.error('Failed to create skill');
    }
  };

  const addSkillById = async (technologyId) => {
    try {
      if (interviewerTechs.some(it => it.technology.id === technologyId)) {
        toast.warning('This skill is already added');
        return;
      }

      const newInterviewerTech = await profileAPI.addInterviewerTechnology(technologyId, 0);
      setInterviewerTechs([...interviewerTechs, newInterviewerTech]);
      toast.success('Skill added');
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error(error.response?.data?.message || 'Failed to add skill');
    }
  };

  const handleRemoveSkill = async (interviewerTechId) => {
    try {
      await profileAPI.removeInterviewerTechnology(interviewerTechId);
      setInterviewerTechs(interviewerTechs.filter(it => it.id !== interviewerTechId));
      toast.success('Skill removed');
    } catch (error) {
      console.error('Error removing skill:', error);
      toast.error('Failed to remove skill');
    }
  };

  const handleShowAllSkills = () => {
    if (showSkillDropdown) {
      setShowSkillDropdown(false);
    } else {
      setFilteredTechnologies(
        technologies.filter(tech =>
          !interviewerTechs.some(it => it.technology.id === tech.id)
        )
      );
      setShowSkillDropdown(true);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center text-muted-foreground">Failed to load profile</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and interview preferences
            </p>
          </div>
          <Button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage
                    src={profileImage || undefined}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                  <AvatarFallback className="gradient-primary text-white text-3xl font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-muted-foreground">
                    {profile.currentDesignation?.name || 'No designation'}
                  </p>
                  {profile.currentDesignation?.tier && (
                    <p className="text-sm text-muted-foreground">
                      Tier {profile.currentDesignation.tier.tierOrder} - {profile.currentDesignation.tier.name}
                    </p>
                  )}
                  <Badge className="mt-2 bg-primary-light text-primary">
                    {profile.email}
                  </Badge>
                </div>

                <div className="w-full space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{profile.phone || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {profile.department?.name || 'No department'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {profile.yearsOfExperience || 0} years experience
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  {isEditing ? 'Update your personal details' : 'Your personal details'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName || ''}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName || ''}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ''}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Professional Details */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Professional Details</CardTitle>
                <CardDescription>Your role, department, tier, and designation information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Department */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Department
                  </Label>
                  {isEditing ? (
                    <Select
                      value={profile.department?.id?.toString() || "NONE"}
                      onValueChange={handleDepartmentChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={profile.department?.name || 'Not set'}
                      disabled
                      className="bg-muted"
                    />
                  )}
                </div>

                {/* Tier — only show when a department is selected */}
                {profile.department && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Tier
                      </Label>
                      {isEditing ? (
                        <Select
                          // ── FIX: read from dedicated selectedTierId, not from designation
                          value={selectedTierId?.toString() || "NONE"}
                          onValueChange={handleTierChange}
                          disabled={!profile.department?.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={profile.department?.id ? "Select tier" : "Select department first"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {tiersForSelectedDept.map((tier) => (
                              <SelectItem key={tier.id} value={tier.id.toString()}>
                                Tier {tier.tierOrder} - {tier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={profile.currentDesignation?.tier
                            ? `Tier ${profile.currentDesignation.tier.tierOrder} - ${profile.currentDesignation.tier.name}`
                            : 'Not set'}
                          disabled
                          className="bg-muted"
                        />
                      )}
                    </div>

                    {/* Designation — only show when a tier is selected */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Designation
                      </Label>
                      {isEditing ? (
                        <Select
                          value={profile.currentDesignation?.id?.toString() || "NONE"}
                          onValueChange={handleDesignationChange}
                          // ── FIX: gate on selectedTierId, not designation's tier
                          disabled={!selectedTierId || designationsForSelectedTier.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              selectedTierId
                                ? "Select designation"
                                : "Select tier first"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {designationsForSelectedTier.map((des) => (
                              <SelectItem key={des.id} value={des.id.toString()}>
                                Level {des.levelOrder} - {des.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={profile.currentDesignation?.name
                            ? `Level ${profile.currentDesignation.levelOrder} - ${profile.currentDesignation.name}`
                            : 'Not set'}
                          disabled
                          className="bg-muted"
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Years of Experience */}
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={profile.yearsOfExperience || 0}
                    onChange={(e) =>
                      handleChange('yearsOfExperience', parseInt(e.target.value) || 0)
                    }
                    disabled={!isEditing}
                    min={0}
                    max={50}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Technical Skills & Interview Preferences</CardTitle>
                <CardDescription>
                  Technologies you're proficient in and willing to conduct interviews for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Type to search or add new skill..."
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyPress={(e) => {
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
                          className="pr-10"
                        />
                        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />

                        <AnimatePresence>
                          {showSkillDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto"
                            >
                              {filteredTechnologies.length > 0 ? (
                                <div className="py-1">
                                  {filteredTechnologies.slice(0, 10).map((tech) => (
                                    <button
                                      key={tech.id}
                                      onClick={() => handleSelectFromDropdown(tech)}
                                      className="w-full px-4 py-2 text-left hover:bg-accent flex items-center justify-between group"
                                    >
                                      <span className="font-medium">{tech.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {tech.category}
                                      </span>
                                    </button>
                                  ))}
                                  {filteredTechnologies.length > 10 && (
                                    <div className="px-4 py-2 text-xs text-muted-foreground border-t">
                                      +{filteredTechnologies.length - 10} more...
                                    </div>
                                  )}
                                </div>
                              ) : newSkill.trim() && (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                  No matching skills found. Press Enter to create "{newSkill}"
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <Button
                        onClick={handleAddSkill}
                        size="sm"
                        className="shrink-0"
                        disabled={!newSkill.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={handleShowAllSkills}
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        title="Browse all skills"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Start typing to search, or click the dropdown icon to browse all available skills
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {interviewerTechs.map((it) => (
                    <motion.div
                      key={it.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <Badge
                        variant="outline"
                        className="text-sm gap-1 pr-1 bg-success-light text-success border-success/20"
                      >
                        <span>{it.technology.name}</span>
                        {it.technology.category && (
                          <span className="text-xs opacity-70">({it.technology.category})</span>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveSkill(it.id)}
                            className="ml-1 hover:text-destructive rounded-full hover:bg-destructive/10 p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    </motion.div>
                  ))}
                  {interviewerTechs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {isEditing
                        ? "No skills added yet. Start typing above to add your first skill."
                        : "No skills added yet. Click 'Edit Profile' to add skills."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Skill Modal */}
      <AnimatePresence>
        {showNewSkillModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setShowNewSkillModal(false);
                setNewSkill('');
                setNewSkillCategory('Other');
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <Card className="shadow-2xl">
                <CardHeader>
                  <CardTitle>Create New Skill</CardTitle>
                  <CardDescription>
                    "{newSkill}" doesn't exist yet. Let's create it!
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
                      value={newSkillCategory}
                      onValueChange={setNewSkillCategory}
                    >
                      <SelectTrigger id="skillCategory">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowNewSkillModal(false);
                        setNewSkill('');
                        setNewSkillCategory('Other');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCreateAndAddSkill}
                    >
                      Create & Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default ProfilePage;