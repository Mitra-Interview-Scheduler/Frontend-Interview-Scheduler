import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, SquarePen, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const mockRules = [
  {
    id: 1,
    name: 'Intern Interview Exception',
    interviewerDesignation: 'Software Engineer',
    candidateDesignation: 'Intern',
    department: 'Engineering',
    technology: 'Java',
    allow: true,
    priority: 1,
    description: 'Allow SE to interview interns for Java positions',
    isActive: true
  },
  {
    id: 2,
    name: 'Cross-department Tech Lead',
    interviewerDesignation: 'Tech Lead',
    candidateDesignation: 'Senior Engineer',
    department: 'All Departments',
    technology: null,
    allow: true,
    priority: 2,
    description: 'Tech leads can interview across departments',
    isActive: true
  },
];

const RulesPage = () => {
  const [rules, setRules] = useState(mockRules);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [ruleName, setRuleName] = useState('');
  const [interviewerDesignation, setInterviewerDesignation] = useState('');
  const [candidateDesignation, setCandidateDesignation] = useState('');
  const [department, setDepartment] = useState('all');
  const [technology, setTechnology] = useState('all');
  const [allow, setAllow] = useState(true);
  const [priority, setPriority] = useState('5');
  const [description, setDescription] = useState('');

  const handleCreateRule = () => {
    if (!ruleName || !interviewerDesignation || !candidateDesignation) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const newRule = {
      id: rules.length + 1,
      name: ruleName,
      interviewerDesignation,
      candidateDesignation,
      department: department === 'all' ? 'All Departments' : department,
      technology: technology === 'all' ? null : technology,
      allow,
      priority: parseInt(priority),
      description,
      isActive: true
    };

    setRules([...rules, newRule]);
    
    // Reset form
    setRuleName('');
    setInterviewerDesignation('');
    setCandidateDesignation('');
    setDepartment('all');
    setTechnology('all');
    setAllow(true);
    setPriority('5');
    setDescription('');
    setIsAddDialogOpen(false);

    toast({
      title: "Rule Created",
      description: `${ruleName} has been successfully created`,
    });
  };

  const handleDeleteRule = (id) => {
    setRules(rules.filter(rule => rule.id !== id));
    toast({
      title: "Rule Deleted",
      description: "The rule has been removed",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Custom Interview Rules</h1>
            <p className="text-muted-foreground">Define custom eligibility rules for interviews</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Custom Interview Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Rule Name *</Label>
                  <Input 
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Intern Exception Rule" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Interviewer Designation *</Label>
                    <Select value={interviewerDesignation} onValueChange={setInterviewerDesignation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                        <SelectItem value="Senior Software Engineer">Senior Software Engineer</SelectItem>
                        <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                        <SelectItem value="Architect">Architect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Candidate Designation *</Label>
                    <Select value={candidateDesignation} onValueChange={setCandidateDesignation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                        <SelectItem value="Senior Software Engineer">Senior Software Engineer</SelectItem>
                        <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department (Optional)</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="QA">QA</SelectItem>
                        <SelectItem value="DevOps">DevOps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Technology (Optional)</Label>
                    <Select value={technology} onValueChange={setTechnology}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Technologies</SelectItem>
                        <SelectItem value="Java">Java</SelectItem>
                        <SelectItem value="React">React</SelectItem>
                        <SelectItem value="Python">Python</SelectItem>
                        <SelectItem value=".NET">.NET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Allow Interview</Label>
                    <p className="text-sm text-muted-foreground">Enable or restrict this combination</p>
                  </div>
                  <Switch checked={allow} onCheckedChange={setAllow} />
                </div>
                <div>
                  <Label>Priority (1-10)</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="Higher priority overrides default" 
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the purpose of this rule..." 
                    rows={3} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleCreateRule}>Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Rules ({rules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {rule.allow ? (
                            <CheckCircle className="w-5 h-5 text-success" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">{rule.name}</h3>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          </div>
                        </div>
                        <Badge variant={rule.allow ? "default" : "destructive"}>
                          {rule.allow ? 'ALLOW' : 'RESTRICT'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Interviewer:</span>
                          <p className="font-medium">{rule.interviewerDesignation}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Candidate:</span>
                          <p className="font-medium">{rule.candidateDesignation}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Department:</span>
                          <p className="font-medium">{rule.department || 'All'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Technology:</span>
                          <p className="font-medium">{rule.technology || 'All'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <SquarePen className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RulesPage;
