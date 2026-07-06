import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Briefcase, Award, Edit2, Save, Loader2, TrendingUp } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import profileAPI from '@/services/profileService';
import { technologyAPI } from '@/services/technologyAPI';
import { normalizeImageUrl } from '@/lib/imageUrl';
import InterviewerTechnologiesPanel from '@/components/InterviewerTechnologiesPanel';



const ProfilePage = () => {
  const { user, syncUser } = useAuth();
  const userRoles = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles
    : (user?.role ? [user.role] : []);
  const isInterviewer = userRoles.includes('INTERVIEWER');
  const isAdmin = userRoles.includes('ADMIN');
  const canEditProfessionalDetails = isAdmin;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillCategories, setSkillCategories] = useState([]);
  const [profile, setProfile] = useState(null);
  const [technologies, setTechnologies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [interviewerTechs, setInterviewerTechs] = useState([]);
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);
  const [selectedTierId, setSelectedTierId] = useState(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, techList, deptList, desList, tierList, categoryList] = await Promise.all([
        profileAPI.getProfile(),
        profileAPI.getAllTechnologies(),
        profileAPI.getDepartments(),
        profileAPI.getDesignations(),
        profileAPI.getTiers(),
        technologyAPI.getAllCategories(),
      ]);

      setProfile(profileData);
      setTechnologies(techList);
      setDepartments(deptList);
      setDesignations(desList);
      setTiers(tierList);
      setSkillCategories(categoryList || []);

      if (isInterviewer) {
        try {
          const interviewerTechList = await profileAPI.getInterviewerTechnologies();
          setInterviewerTechs(interviewerTechList);
        } catch (skillsError) {
          console.error('Error loading interviewer technologies:', skillsError);
          setInterviewerTechs([]);
        }
      } else {
        setInterviewerTechs([]);
      }

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
        firstName: profile.firstName,
        lastName: profile.lastName,
        bio: profile.bio,
        ...(canEditProfessionalDetails
          ? {
              departmentId: profile.department?.id,
              designationId: profile.currentDesignation?.id,
              yearsOfExperience: profile.yearsOfExperience,
            }
          : {}),
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
                <CardDescription>
                  {canEditProfessionalDetails
                    ? 'Your role, department, tier, and designation information'
                    : 'Your role, department, tier, and designation are managed by an administrator'}
                  {canEditProfessionalDetails && isInterviewer && isEditing && (
                    <>
                      {' '}
                      — missing options?{' '}
                      <Link
                        to="/interviewer/designations"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Add departments, tiers, or designations
                      </Link>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Department */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Department
                  </Label>
                  {isEditing && canEditProfessionalDetails ? (
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
                      {isEditing && canEditProfessionalDetails ? (
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
                      {isEditing && canEditProfessionalDetails ? (
                        <Select
                          value={profile.currentDesignation?.id?.toString() || "NONE"}
                          onValueChange={handleDesignationChange}
                          // ── FIX: gate on selectedTierId, not designation's tier
                          disabled={!selectedTierId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              selectedTierId
                                ? (designationsForSelectedTier.length > 0
                                  ? 'Select designation'
                                  : 'No designations yet — add in Designations')
                                : 'Select tier first'
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
                    disabled={!isEditing || !canEditProfessionalDetails}
                    min={0}
                    max={50}
                  />
                </div>
              </CardContent>
            </Card>

            <InterviewerTechnologiesPanel
              isEditing={isEditing}
              technologies={technologies}
              skillCategories={skillCategories}
              interviewerTechs={interviewerTechs}
              onTechnologiesChange={setInterviewerTechs}
              onTechnologyCreated={(tech) => setTechnologies((prev) => [...prev, tech])}
            />

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;