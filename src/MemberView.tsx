import React, { useState } from 'react';
import { Check, Trophy, Star, Settings, Gift, FileText, AlertTriangle, Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Member, Task, WeeklyReport, MonthlyReport, RewardHistory } from './types';
import toast, { Toaster } from 'react-hot-toast';
import ReportModal from './components/ReportModal';
import CelebrationEffects from './components/CelebrationEffects';
import { useEffect } from 'react';

interface MemberViewProps {
  onAdminClick: () => void;
  memberId?: string;
}

function MemberView({ onAdminClick, memberId }: MemberViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [weeklyReports, setWeeklyReports] = useState<Record<string, WeeklyReport>>({});
  const [monthlyReports, setMonthlyReports] = useState<Record<string, MonthlyReport>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [rewardHistories, setRewardHistories] = useState<Record<string, RewardHistory>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [celebration, setCelebration] = useState<{ x: number; y: number; isBonus: boolean } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [firstMemberId, setFirstMemberId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch admin name
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!adminError && adminData) {
          setAdminName(adminData.name || 'Admin');
        } else {
          setAdminName('Admin');
        }
        
        if (memberId) {
          await fetchSingleMember(memberId);
        } else {
          await fetchMembers(true);
        }
      } else {
        setMembers([]);
        setAdminName(null);
      }
    };
    
    initializeData();
  }, [memberId]);

  // Keep track of the first member's ID
  useEffect(() => {
    if (members.length > 0 && !firstMemberId) {
      setFirstMemberId(members[0].id);
    }
  }, [members]);

  const refreshTasks = async () => {
    if (!confirm('This will reset today\'s tasks and add their points to your total. Continue?')) {
      return;
    }
    
    setIsRefreshing(true);
    try {
      // Get current daily points before reset
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, daily_points');

      if (membersError) {
        throw membersError;
      }

      // Update total points with daily points for each member
      await Promise.all(membersData.map(async (member) => {
        if (member.daily_points > 0) {
          // First get current total points
          const { data: currentMember } = await supabase
            .from('members')
            .select('total_points')
            .eq('id', member.id)
            .single();

          // Then update with new total
          const { error: updateError } = await supabase
            .from('members')
            .update({
              total_points: (currentMember?.total_points || 0) + member.daily_points
            })
            .eq('id', member.id);

          if (updateError) throw updateError;
        }
      }));

      // Then trigger the task refresh
      const { error } = await supabase.rpc('trigger_task_refresh');
      
      if (error) {
        toast.error('Failed to refresh tasks');
        return;
      }
      
      toast.success('Daily tasks reset and points added to totals');

      // Wait a short moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refetch all data in parallel
      await Promise.all([
        fetchMembers(false),
        ...members.map(member => {
          return Promise.all([
            fetchMemberTasks(member.id),
            fetchWeeklyReport(member.id),
            fetchMonthlyReport(member.id),
            fetchRewardHistory(member.id)
          ]);
        })
      ]);

      toast.success('Tasks refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh tasks');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSingleMember = async (shareId: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('share_id', shareId)
      .single();

    if (error) {
      toast.error('Member not found');
      return;
    }

    setMembers([data]);
    fetchMemberTasks(data.id);
    fetchWeeklyReport(data.id);
    fetchMonthlyReport(data.id);
    fetchRewardHistory(data.id);
  };

  const fetchMembers = async (isInitialFetch: boolean) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }

    if (!user?.id) {
      console.error('No authenticated user');
      return;
    }

    const { data, error } = await supabase
      .from('members')
      .select('*, admins!inner(*)')
      .eq('admins.user_id', user?.id)
      .order('total_points', { ascending: false });

    if (error) {
      toast.error('Failed to fetch members');
      return;
    }

    setMembers(data);
    // If we have a firstMemberId and this is not the initial fetch,
    // ensure that member stays first
    if (firstMemberId && !isInitialFetch) {
      const firstMember = data.find(m => m.id === firstMemberId);
      const otherMembers = data.filter(m => m.id !== firstMemberId);
      setMembers(firstMember ? [firstMember, ...otherMembers] : data);
    } else {
      setMembers(data);
    }

    data.forEach(member => fetchMemberTasks(member.id));
    data.forEach(member => fetchWeeklyReport(member.id));
    data.forEach(member => {
      fetchMonthlyReport(member.id);
      fetchRewardHistory(member.id);
    });
  };

  const fetchRewardHistory = async (memberId: string) => {
    const { data, error } = await supabase
      .rpc('get_member_rewards_history', { member_id_param: memberId });

    if (error) {
      toast.error('Failed to fetch reward history');
      return;
    }

    if (data && data.length > 0) {
      setRewardHistories(prev => ({
        ...prev,
        [memberId]: data[0]
      }));
    }
  };

  const handleReward = async (member: Member) => {
    if (!confirm(`Are you sure you want to reward ${member.name}'s current points (${member.total_points})?`)) {
      return;
    }

    const { error: rewardError } = await supabase
      .from('rewards')
      .insert([{
        member_id: member.id,
        points: member.total_points
      }]);

    if (rewardError) {
      toast.error('Failed to create reward record');
      return;
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({ total_points: 0 })
      .eq('id', member.id);

    if (updateError) {
      toast.error('Failed to reset points');
      return;
    }

    toast.success(`Rewarded ${member.total_points} points to ${member.name}`);
    await Promise.all([
      fetchMembers(false),
      fetchRewardHistory(member.id)
    ]);
  };

  const fetchMonthlyReport = async (memberId: string) => {
    const { data, error } = await supabase
      .rpc('get_member_monthly_report', { member_id_param: memberId });

    if (error) {
      toast.error('Failed to fetch monthly report');
      return;
    }

    if (data && data.length > 0) {
      setMonthlyReports(prev => ({
        ...prev,
        [memberId]: data[0]
      }));
    }
  };

  const fetchWeeklyReport = async (memberId: string) => {
    const { data, error } = await supabase
      .rpc('get_member_weekly_report', { member_id_param: memberId });

    if (error) {
      toast.error('Failed to fetch weekly report');
      return;
    }

    if (data && data.length > 0) {
      setWeeklyReports(prev => ({
        ...prev,
        [memberId]: data[0]
      }));
    }
  };

  const fetchMemberTasks = async (memberId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('member_id', memberId)
      .order('position', { ascending: true });

    if (error) {
      toast.error('Failed to fetch tasks');
      return;
    }

    // Clear existing tasks first
    setTasks(prev => ({
      ...prev,
      [memberId]: []
    }));

    // Then set the new tasks
    setTasks(prev => ({
      ...prev,
      [memberId]: data
    }));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    // Reset any drag-related visual states if needed
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Add visual feedback for drag over if needed
  };

  const handleDragLeave = () => {
    // Reset drag over visual feedback if needed
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData('text/plain');
    
    if (draggedTaskId === targetTaskId) return;

    // Find the tasks and their current positions
    const memberId = Object.keys(tasks).find(key => 
      tasks[key].some(task => task.id === draggedTaskId)
    );

    if (!memberId) return;

    const tasksList = tasks[memberId];
    const draggedTask = tasksList.find(t => t.id === draggedTaskId);
    const targetTask = tasksList.find(t => t.id === targetTaskId);

    if (!draggedTask || !targetTask) return;

    // Update positions in the database
    const { error } = await supabase
      .from('tasks')
      .update({ position: targetTask.position })
      .eq('id', draggedTask.id);

    if (error) {
      toast.error('Failed to reorder tasks');
      return;
    }

    // Refetch tasks to get the updated order
    await fetchMemberTasks(memberId);
  };

  const toggleTaskCompletion = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to update task');
      return;
    }

    // Only show celebration when completing a task
    if (!task.completed) {
      const taskElement = document.getElementById(task.id);
      if (taskElement) {
        const rect = taskElement.getBoundingClientRect();
        setCelebration({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          isBonus: task.is_bonus
        });
        
        // Clear celebration after animation
        setTimeout(() => setCelebration(null), 2000);
      }
    }

    await fetchMemberTasks(task.member_id);
    await fetchMembers(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-pink-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center">
              <Trophy className="h-6 w-6 text-pink-400 mr-2" />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">
                  Task Champions
                </h1>
                {adminName && (
                  <p className="text-sm text-white/50">
                    {adminName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="text-white/70 text-sm">
                {currentTime.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
                <span className="mx-2">|</span>
                {currentTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshTasks}
                  disabled={isRefreshing}
                  className={`p-2 text-white/80 hover:text-white bg-white/10 rounded-lg hover:bg-white/20 transition-all ${
                    isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Refresh Tasks"
                >
                  <svg
                    className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={onAdminClick}
                  className="p-2 text-white/80 hover:text-white bg-white/10 rounded-lg hover:bg-white/20 transition-all"
                  title="Admin Panel"
                >
                  <Settings className="h-5 w-5" aria-label="Admin Panel" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-8">
            <Settings className="h-16 w-16 text-pink-400 mb-4 animate-pulse" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Members Found</h2>
            <p className="text-white/70 text-center">
              Please add members by clicking on the Settings icon in the top right corner
            </p>
          </div>
        ) : (
        <div className={`grid grid-cols-1 ${
          members.length === 2 ? 'md:grid-cols-2' : 
          members.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : ''
        } gap-6`}>
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              <div className="p-6">
                <div className="mb-6 relative">
                  <img
                    src={member.banner_image_url}
                    alt={`${member.name}'s banner`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg flex items-end">
                    <div className="flex flex-col p-4">
                      <span className="text-white text-xl font-bold">GOAL</span>
                      {member.target_points > 0 && (
                        <span className="text-white/90 text-sm">
                          TARGET - {member.target_points} points
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.profile_image_url}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                    />
                    <div>
                      <h2 className="text-xl font-semibold text-white">{member.name}</h2>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="text-sm">
                          <span className="text-white/70">Today's Earn:</span>
                          <span className="ml-1 text-white font-medium">
                            {member.daily_points || 0}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-white/70">Total Earn:</span>
                          <span className="ml-1 text-white font-medium">
                            {member.total_points}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (confirm('Apply penalty of 2 points?')) {
                          const { error } = await supabase
                            .from('penalties')
                            .insert([{ member_id: member.id }]);
                            
                          if (error) {
                            toast.error('Failed to apply penalty');
                          } else {
                            const { error: updateError } = await supabase
                              .from('members')
                              .update({ total_points: Math.max(0, member.total_points - 2) })
                              .eq('id', member.id);
                              
                            if (updateError) {
                              toast.error('Failed to update points');
                            } else {
                              toast.success('Penalty applied');
                              fetchMembers(false);
                              fetchWeeklyReport(member.id);
                              fetchMonthlyReport(member.id);
                            }
                          }
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      title="Apply Penalty"
                    >
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (confirm('Add bonus of 5 points?')) {
                          const { error: updateError } = await supabase
                            .from('members')
                            .update({ total_points: member.total_points + 5 })
                            .eq('id', member.id);
                            
                          if (updateError) {
                            toast.error('Failed to add bonus points');
                          } else {
                            toast.success('Bonus points added');
                            fetchMembers(false);
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setCelebration({
                              x: rect.left + rect.width / 2,
                              y: rect.top + rect.height / 2,
                              isBonus: true
                            });
                            setTimeout(() => setCelebration(null), 2000);
                          }
                        }
                      }}
                      className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                      title="Add Bonus Points"
                    >
                      <Star className="h-5 w-5 text-green-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleReward(member);
                      }}
                      className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
                      title="Give Reward"
                    >
                      <Gift className="h-5 w-5 text-yellow-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedMemberId(member.id);
                        setIsReportModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 transition-colors"
                      title="View Reports"
                    >
                      <FileText className="h-5 w-5 text-pink-400" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 mt-6">
                  {tasks[member.id]?.map((task) => (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                      key={task.id}
                      id={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                        task.completed
                          ? 'bg-green-900/20 border-green-500/20'
                          : 'hover:bg-white/5 border-white/10'
                      } border backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTaskCompletion(task)}
                          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                            task.completed
                              ? 'bg-green-500 border-green-500 text-black'
                              : 'border-white/30'
                          }`}
                        >
                          {task.completed && <Check className="h-4 w-4" />}
                        </button>
                        
                        <span className={`flex-grow ${task.completed ? 'line-through text-white/50' : 'text-white/90'}`}>
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {task.is_bonus && (
                          <Star className="h-4 w-4 text-pink-400 flex-shrink-0" />
                        )}
                        
                        <span className="text-sm font-medium text-white/70 flex-shrink-0">
                          {task.points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {(!tasks[member.id] || tasks[member.id].length === 0) && (
                    <p className="text-center text-white/50 py-4">
                      No tasks assigned yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </main>
      
      {selectedMemberId && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedMemberId(null);
          }}
          weeklyReport={weeklyReports[selectedMemberId]}
          monthlyReport={monthlyReports[selectedMemberId]}
          memberName={members.find(m => m.id === selectedMemberId)?.name || ''}
          rewardHistory={rewardHistories[selectedMemberId]}
        />
      )}
      
      {celebration && (
        <CelebrationEffects
          x={celebration.x}
          y={celebration.y}
          isBonus={celebration.isBonus}
        />
      )}
    </div>
  );
}

export default MemberView;