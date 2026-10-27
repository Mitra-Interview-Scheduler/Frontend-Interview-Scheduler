import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const mockBroadcasts = [
  {
    id: 1,
    candidate: 'Alice Johnson',
    designation: 'Senior Software Engineer',
    skills: ['Java', 'React'],
    message: 'Urgent interview needed for key position',
    sentAt: '2024-01-20 10:30',
    deadline: '2024-01-22 17:00',
    responses: 5,
    status: 'ACTIVE'
  },
  {
    id: 2,
    candidate: 'Bob Smith',
    designation: 'Tech Lead',
    skills: ['Python', 'AWS'],
    message: 'High priority candidate needs immediate scheduling',
    sentAt: '2024-01-19 14:00',
    deadline: '2024-01-21 17:00',
    responses: 8,
    status: 'COMPLETED'
  },
];

const mockResponses = [
  { id: 1, interviewer: 'John Doe', response: 'AVAILABLE', date: '2024-01-22', time: '10:00-12:00', status: 'ACCEPTED' },
  { id: 2, interviewer: 'Jane Smith', response: 'AVAILABLE', date: '2024-01-22', time: '14:00-16:00', status: 'PENDING' },
  { id: 3, interviewer: 'Mike Johnson', response: 'NOT_AVAILABLE', notes: 'On leave', status: 'DECLINED' },
];

const UrgentRequestsPage = () => {
  const [broadcasts, setBroadcasts] = useState(mockBroadcasts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [candidateId, setCandidateId] = useState('');
  const [targetDept, setTargetDept] = useState('');
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState('');

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'bg-amber-100 text-amber-800',
      COMPLETED: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getResponseColor = (status) => {
    const colors = {
      PENDING: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Urgent Interview Requests</h1>
            <p className="text-muted-foreground">Broadcast urgent requests to available interviewers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Send className="w-4 h-4" />
                Send Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Urgent Interview Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Candidate</Label>
                  <Select value={candidateId} onValueChange={setCandidateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Alice Johnson</SelectItem>
                      <SelectItem value="2">Bob Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Department</Label>
                  <Select value={targetDept} onValueChange={setTargetDept}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="eng">Engineering</SelectItem>
                      <SelectItem value="qa">QA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Describe the urgency and requirements..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Response Deadline</Label>
                  <input
                    type="datetime-local"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    if (!candidateId || !targetDept || !message || !deadline) return;
                    const candidateName = candidateId === '1' ? 'Alice Johnson' : 'Bob Smith';
                    const newBroadcast = {
                      id: broadcasts.length + 1,
                      candidate: candidateName,
                      designation: 'Urgent Role',
                      skills: ['Java', 'React'],
                      message,
                      sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
                      deadline,
                      responses: 0,
                      status: 'ACTIVE',
                    };
                    setBroadcasts([newBroadcast, ...broadcasts]);
                    setIsDialogOpen(false);
                    setCandidateId('');
                    setTargetDept('');
                    setMessage('');
                    setDeadline('');
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send Broadcast
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {broadcasts.map((broadcast, index) => (
            <motion.div
              key={broadcast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        {broadcast.candidate} - {broadcast.designation}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{broadcast.message}</p>
                    </div>
                    <Badge className={getStatusColor(broadcast.status)}>
                      {broadcast.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {broadcast.skills.map(skill => (
                        <Badge key={skill} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sent:</span>
                        <p className="font-medium">{broadcast.sentAt}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deadline:</span>
                        <p className="font-medium">{broadcast.deadline}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Responses:</span>
                        <p className="font-medium">{broadcast.responses} received</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Interviewer Responses
                      </h4>
                      <div className="space-y-2">
                        {mockResponses.map(response => (
                          <div key={response.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              {response.response === 'AVAILABLE' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">{response.interviewer}</p>
                                {response.date && (
                                  <p className="text-sm text-muted-foreground">
                                    {response.date} • {response.time}
                                  </p>
                                )}
                                {response.notes && (
                                  <p className="text-sm text-muted-foreground">{response.notes}</p>
                                )}
                              </div>
                            </div>
                            <Badge className={getResponseColor(response.status)}>
                              {response.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default UrgentRequestsPage;
