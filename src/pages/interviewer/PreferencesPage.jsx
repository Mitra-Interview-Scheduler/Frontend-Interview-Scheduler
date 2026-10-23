import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, Trash2, Star, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PreferencesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [preferences, setPreferences] = useState([
    {
      id: 1,
      name: 'Sarah Smith',
      department: 'Engineering',
      designation: 'Senior Tech Lead',
      preferenceOrder: 1,
      technologies: ['Java', 'React', 'AWS'],
    },
    {
      id: 2,
      name: 'Michael Brown',
      department: 'Engineering',
      designation: 'Tech Lead',
      preferenceOrder: 2,
      technologies: ['JavaScript', 'Node.js', 'MongoDB'],
    },
  ]);

  const [availableInterviewers] = useState([
    {
      id: 3,
      name: 'Emma Wilson',
      department: 'Engineering',
      designation: 'Senior Developer',
      technologies: ['Python', 'Django', 'PostgreSQL'],
    },
    {
      id: 4,
      name: 'James Miller',
      department: 'Engineering',
      designation: 'Lead Developer',
      technologies: ['React', 'TypeScript', 'GraphQL'],
    },
    {
      id: 5,
      name: 'Olivia Davis',
      department: 'Engineering',
      designation: 'Senior Engineer',
      technologies: ['Java', 'Spring', 'Kubernetes'],
    },
  ]);

  const handleAddPreference = (interviewer) => {
    const newPref = {
      ...interviewer,
      preferenceOrder: preferences.length + 1,
    };
    setPreferences([...preferences, newPref]);
    toast.success(`Added ${interviewer.name} to your panel preferences`);
  };

  const handleRemovePreference = (id) => {
    setPreferences(preferences.filter(p => p.id !== id));
    toast.success('Removed from panel preferences');
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newPrefs = [...preferences];
    [newPrefs[index - 1], newPrefs[index]] = [newPrefs[index], newPrefs[index - 1]];
    setPreferences(newPrefs.map((pref, i) => ({ ...pref, preferenceOrder: i + 1 })));
  };

  const handleMoveDown = (index) => {
    if (index === preferences.length - 1) return;
    const newPrefs = [...preferences];
    [newPrefs[index], newPrefs[index + 1]] = [newPrefs[index + 1], newPrefs[index]];
    setPreferences(newPrefs.map((pref, i) => ({ ...pref, preferenceOrder: i + 1 })));
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredInterviewers = availableInterviewers
    .filter(interviewer => !preferences.find(p => p.id === interviewer.id))
    .filter(interviewer => {
      const query = searchQuery.toLowerCase();
      return (
        interviewer.name.toLowerCase().includes(query) ||
        interviewer.designation.toLowerCase().includes(query) ||
        interviewer.department.toLowerCase().includes(query) ||
        interviewer.technologies.some(tech => tech.toLowerCase().includes(query))
      );
    });

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Panel Preferences</h1>
          <p className="text-muted-foreground">
            Select interviewers you prefer to conduct panel interviews with
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-warning" />
                My Panel Preferences
              </CardTitle>
              <CardDescription>
                Ordered by preference. HR will consider these when scheduling panel interviews.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferences.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No preferences set</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add interviewers from the available list
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {preferences.map((pref, index) => (
                    <motion.div
                      key={pref.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <Badge className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground">
                            {pref.preferenceOrder}
                          </Badge>
                          <div className="flex flex-col gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === preferences.length - 1}
                              className="h-6 w-6 p-0"
                            >
                              ↓
                            </Button>
                          </div>
                        </div>

                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="gradient-primary text-white font-semibold">
                            {getInitials(pref.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{pref.name}</h4>
                          <p className="text-sm text-muted-foreground">{pref.designation}</p>
                          <p className="text-xs text-muted-foreground mt-1">{pref.department}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pref.technologies.map((tech) => (
                              <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePreference(pref.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Available Interviewers
              </CardTitle>
              <CardDescription>
                Select interviewers to add to your panel preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search by name, role, or technology..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-3">
                {filteredInterviewers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No interviewers found</p>
                  </div>
                ) : (
                  filteredInterviewers.map((interviewer, index) => (
                    <motion.div
                      key={interviewer.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                            {getInitials(interviewer.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{interviewer.name}</h4>
                          <p className="text-sm text-muted-foreground">{interviewer.designation}</p>
                          <p className="text-xs text-muted-foreground mt-1">{interviewer.department}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {interviewer.technologies.map((tech) => (
                              <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddPreference(interviewer)}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Why Set Panel Preferences?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">Better Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Work with interviewers you're comfortable with for more effective panel interviews
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-lg bg-secondary-light flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-semibold">Efficient Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  HR can quickly find compatible panel members based on your preferences
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-lg bg-success-light flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold">Complementary Skills</h3>
                <p className="text-sm text-muted-foreground">
                  Choose co-interviewers with complementary technical expertise
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PreferencesPage;
