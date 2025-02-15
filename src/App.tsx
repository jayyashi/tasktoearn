import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Plus, Trash2, Star, Check, Settings } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Member, Task, WeeklyReport, MonthlyReport } from './types';
import toast, { Toaster } from 'react-hot-toast';
import MemberReport from './components/MemberReport';
import MemberView from './MemberView';
import AuthForm from './components/AuthForm';

function App() {
  const location = useLocation();
  const memberId = location.pathname.substring(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isBonus, setIsBonus] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setIsAuthenticated(!!session);
      if (!session) setShowAuthForm(true);

    } catch (error) {
      console.error('Auth error:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setShowAuthForm(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setShowAuthForm(true);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        setShowAuthForm(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth]);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      fetchTasks(selectedMember.id);
      fetchMemberReports(selectedMember.id);
    }
  }, [selectedMember]);

  const fetchMemberReports = async (memberId: string) => {
    // Fetch weekly report
    const { data: weeklyData, error: weeklyError } = await supabase
      .rpc('get_member_weekly_report', { member_id_param: memberId });

    if (weeklyError) {
      toast.error('Failed to fetch weekly report');
    } else if (weeklyData && weeklyData.length > 0) {
      setWeeklyReport(weeklyData[0]);
    }

    // Fetch monthly report
    const { data: monthlyData, error: monthlyError } = await supabase
      .rpc('get_member_monthly_report', { member_id_param: memberId });

    if (monthlyError) {
      toast.error('Failed to fetch monthly report');
    } else if (monthlyData && monthlyData.length > 0) {
      setMonthlyReport(monthlyData[0]);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*, admins!inner(*)')
      .eq('admins.user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('total_points', { ascending: false });

    if (error) {
      toast.error('Failed to fetch members');
      return;
    }

    setMembers(data);
  };

  const fetchTasks = async (memberId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('member_id', memberId)
      .order('position', { ascending: true });

    if (error) {
      toast.error('Failed to fetch tasks');
      return;
    }

    setTasks(data);
  };

  const addMember = async () => {
    if (!newMemberName.trim()) return;

    // Get the admin id for the current user
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (adminError || !adminData) {
      toast.error('Failed to get admin information');
      return;
    }

    const { error } = await supabase
      .from('members')
      .insert([{ 
        name: newMemberName,
        admin_id: adminData.id
      }]);

    if (error) {
      toast.error('Failed to add member');
      return;
    }

    toast.success('Member added successfully');
    setNewMemberName('');
    fetchMembers();
  };

  const addTask = async () => {
    if (!selectedMember || !newTaskTitle.trim()) return;

    // Get the highest position for the member's tasks
    const { data: maxPositionData } = await supabase
      .from('tasks')
      .select('position')
      .eq('member_id', selectedMember.id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = maxPositionData && maxPositionData.length > 0
      ? maxPositionData[0].position + 1
      : 1;

    const { error } = await supabase
      .from('tasks')
      .insert([{
        member_id: selectedMember.id,
        title: newTaskTitle,
        is_bonus: isBonus,
        position: nextPosition
      }]);

    if (error) {
      toast.error('Failed to add task');
      return;
    }

    toast.success('Task added successfully');
    setNewTaskTitle('');
    setIsBonus(false);
    fetchTasks(selectedMember.id);
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

    fetchTasks(task.member_id);
    fetchMembers();
  };

  const deleteMember = async (memberId: string) => {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to delete member');
      return;
    }

    toast.success('Member deleted successfully');
    if (selectedMember?.id === memberId) {
      setSelectedMember(null);
      setTasks([]);
    }
    fetchMembers();
  };

  const uploadProfileImage = async (memberId: string, file: File) => {
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${memberId}-${Math.random()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('members')
        .update({ profile_image_url: publicUrl })
        .eq('id', memberId);

      if (updateError) {
        throw updateError;
      }

      toast.success('Profile image updated');
      fetchMembers();
    } catch (error) {
      toast.error('Error uploading image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const uploadBannerImage = async (memberId: string, file: File) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${memberId}-${Math.random()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('members')
        .update({ banner_image_url: publicUrl })
        .eq('id', memberId);

      if (updateError) {
        throw updateError;
      }

      toast.success('Banner image updated');
      fetchMembers();
    } catch (error) {
      toast.error('Error uploading banner image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const updateMemberName = async (memberId: string, newName: string) => {
    if (!newName.trim()) return;

    const { error } = await supabase
      .from('members')
      .update({ name: newName.trim() })
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to update member name');
      return;
    }

    toast.success('Member name updated');
    fetchMembers();
    setEditingMemberId(null);
  };

  const updateTaskTitle = async (task: Task, newTitle: string) => {
    if (!newTitle.trim()) return;

    const { error } = await supabase
      .from('tasks')
      .update({ title: newTitle.trim() })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to update task');
      return;
    }

    toast.success('Task updated');
    fetchTasks(task.member_id);
    setEditingTaskId(null);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-indigo-500');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-indigo-500');
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-indigo-500');

    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);

    if (!draggedTask || !targetTask) return;

    // Update positions in the database
    const { error } = await supabase
      .rpc('update_task_positions', {
        task_id1: draggedTaskId,
        position1: targetTask.position,
        task_id2: targetTaskId,
        position2: draggedTask.position
      });

    if (error) {
      toast.error('Failed to reorder tasks');
      console.error('Reorder error:', error);
      return;
    }

    // Refetch tasks to get the updated order
    if (selectedMember) {
      fetchTasks(selectedMember.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {isAdmin ? (
        <>
          {/* Admin Header */}
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-indigo-600 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-900">Task Manager Admin</h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAdmin(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
                    title="Switch to Member View"
                  >
                    <Settings className="h-5 w-5" />
                    Switch to Member View
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setIsAdmin(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Rest of the admin interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Members Panel */}
              <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Members</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="New member name"
                  className="px-3 py-1 border rounded"
                />
                <button
                  onClick={addMember}
                  className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-3 rounded cursor-pointer ${
                    selectedMember?.id === member.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'hover:bg-gray-50 border-gray-200'
                  } border`}
                  onClick={() => setSelectedMember(member)}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <img
                          src={member.profile_image_url}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fileInputRef.current) {
                              fileInputRef.current.click();
                              fileInputRef.current.setAttribute('data-member-id', member.id);
                            }
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <div>
                        {editingMemberId === member.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.querySelector('input');
                              if (input) {
                                updateMemberName(member.id, input.value);
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              defaultValue={member.name}
                              className="px-2 py-1 rounded border border-gray-300 text-gray-900"
                              autoFocus
                              onBlur={(e) => updateMemberName(member.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingMemberId(null);
                                }
                              }}
                            />
                          </form>
                        ) : (
                          <h3
                            className="font-medium cursor-pointer hover:text-indigo-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMemberId(member.id);
                            }}
                          >
                            {member.name}
                          </h3>
                        )}
                        <p className="text-sm text-gray-500">{member.total_points} points</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMember(member.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const memberId = e.target.getAttribute('data-member-id');
              if (file && memberId) {
                uploadProfileImage(memberId, file);
              }
            }}
          />

          {/* Tasks Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {selectedMember ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Tasks for {selectedMember.name}
                  </h2>
                </div>

                {/* Goal Banner Section */}
                <div className="relative group w-full">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">GOAL</h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TARGET POINTS
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter target points"
                        defaultValue={selectedMember.target_points || 0}
                        onChange={async (e) => {
                          const value = parseInt(e.target.value) || 0;
                          const { error } = await supabase
                            .from('members')
                            .update({ target_points: value })
                            .eq('id', selectedMember.id);
                          
                          if (error) {
                            toast.error('Failed to update target points');
                          } else {
                            fetchMembers();
                          }
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <img
                      src={selectedMember.banner_image_url}
                      alt={`${selectedMember.name}'s goal`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            uploadBannerImage(selectedMember.id, file);
                          }
                        };
                        input.click();
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="h-8 w-8 text-white" />
                    </button>
                  </div>
                </div>

                {/* Task Creation Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tasks</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="New task title"
                      className="px-3 py-1 border rounded"
                    />
                    <button
                      onClick={() => setIsBonus(!isBonus)}
                      className={`p-2 rounded ${
                        isBonus
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={addTask}
                      className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded border ${
                        task.completed
                          ? 'bg-green-50 border-green-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      } transition-all duration-200 cursor-move`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTaskCompletion(task)}
                          className={`p-1 rounded ${
                            task.completed
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        {editingTaskId === task.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.querySelector('input');
                              if (input) {
                                updateTaskTitle(task, input.value);
                              }
                            }}
                            className="flex-grow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              defaultValue={task.title}
                              className="w-full px-2 py-1 rounded border border-gray-300 text-gray-900"
                              autoFocus
                              onBlur={(e) => updateTaskTitle(task, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingTaskId(null);
                                }
                              }}
                            />
                          </form>
                        ) : (
                          <span
                            className={`flex-grow cursor-pointer hover:text-indigo-600 ${
                              task.completed ? 'line-through text-gray-500' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTaskId(task.id);
                            }}
                          >
                            {task.title}
                          </span>
                        )}
                        {task.is_bonus && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {task.points} points
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Select a member to view and manage their tasks
                </div>
              )}
              
              {selectedMember && weeklyReport && monthlyReport && (
                <div className="mt-8 space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Reports</h2>
                  <MemberReport
                    weeklyReport={weeklyReport}
                    monthlyReport={monthlyReport}
                    showMonthly={true}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
        </>
      ) : (
        <>
          <MemberView 
            memberId={memberId}
            onAdminClick={() => {
              if (isAuthenticated) {
                setIsAdmin(true);
              } else {
                setShowAuthForm(true);
              }
            }} 
          />
          
          {showAuthForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-navy-900 rounded-xl shadow-2xl p-8">
                <AuthForm
                  onSuccess={() => {
                    setShowAuthForm(false);
                    setIsAdmin(true);
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;