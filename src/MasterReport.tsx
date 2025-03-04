import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Users, UserCheck, ClipboardList, AlertTriangle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
  name: string | null;
  email: string;
  contact_number: string | null;
}

interface MemberData {
  id: string;
  name: string;
  admin_name: string;
  total_points: number;
  total_rewarded: number;
}

interface TaskData {
  id: string;
  title: string;
  member_name: string;
  admin_name: string;
  is_bonus: boolean;
  completed: boolean;
  created_at: string;
}

interface InactiveAdmin {
  id: string;
  name: string;
  last_activity: string;
  days_inactive: number;
}

function MasterReport() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [inactiveAdmins, setInactiveAdmins] = useState<InactiveAdmin[]>([]);
  const [activeTab, setActiveTab] = useState<'admins' | 'members' | 'tasks' | 'inactive'>('admins');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (!session) {
          toast.error('You must be logged in to view this page');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        fetchData();
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication error');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAdmins(),
        fetchMembers(),
        fetchTasks(),
        fetchInactiveAdmins()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdmins = async () => {
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*');
      
    if (adminError) {
      toast.error('Failed to fetch admins');
      return;
    }
    
    // Get user details for each admin
    const adminsWithDetails = await Promise.all(
      adminData.map(async (admin) => {
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('email, raw_user_meta_data')
          .eq('id', admin.user_id)
          .single();
          
        if (userError) {
          return {
            ...admin,
            email: 'Unknown',
            contact_number: null
          };
        }
        
        return {
          ...admin,
          email: userData?.email || 'Unknown',
          contact_number: userData?.raw_user_meta_data?.contact_number || null
        };
      })
    );
    
    setAdmins(adminsWithDetails);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select(`
        id,
        name,
        total_points,
        admins (
          id,
          name
        )
      `);
      
    if (error) {
      toast.error('Failed to fetch members');
      return;
    }
    
    // Get total rewarded points for each member
    const membersWithRewards = await Promise.all(
      data.map(async (member) => {
        const { data: rewardsData, error: rewardsError } = await supabase
          .from('rewards')
          .select('points')
          .eq('member_id', member.id);
          
        const totalRewarded = rewardsError ? 0 : 
          rewardsData.reduce((sum, reward) => sum + reward.points, 0);
          
        return {
          id: member.id,
          name: member.name,
          admin_name: member.admins?.name || 'Unknown',
          total_points: member.total_points,
          total_rewarded: totalRewarded
        };
      })
    );
    
    setMembers(membersWithRewards);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        is_bonus,
        completed,
        created_at,
        members (
          id,
          name,
          admins (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) {
      toast.error('Failed to fetch tasks');
      return;
    }
    
    const formattedTasks = data.map(task => ({
      id: task.id,
      title: task.title,
      member_name: task.members?.name || 'Unknown',
      admin_name: task.members?.admins?.name || 'Unknown',
      is_bonus: task.is_bonus,
      completed: task.completed,
      created_at: task.created_at
    }));
    
    setTasks(formattedTasks);
  };

  const fetchInactiveAdmins = async () => {
    // First get all admins
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, name, user_id');
      
    if (adminError) {
      toast.error('Failed to fetch inactive admins');
      return;
    }
    
    // For each admin, check their members' point history
    const inactiveAdminsList = await Promise.all(
      adminData.map(async (admin) => {
        // Get the latest task history for members of this admin
        const { data: historyData, error: historyError } = await supabase
          .from('task_history')
          .select(`
            task_date,
            members!inner (
              id,
              admin_id
            )
          `)
          .eq('members.admin_id', admin.id)
          .order('task_date', { ascending: false })
          .limit(1);
          
        if (historyError || !historyData || historyData.length === 0) {
          // No history found, admin might be inactive
          const daysInactive = 30; // Default to 30 days if no activity found
          
          return {
            id: admin.id,
            name: admin.name || 'Unknown',
            last_activity: 'No activity',
            days_inactive: daysInactive
          };
        }
        
        // Calculate days since last activity
        const lastActivity = new Date(historyData[0].task_date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastActivity.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Only include admins inactive for more than 15 days
        if (diffDays > 15) {
          return {
            id: admin.id,
            name: admin.name || 'Unknown',
            last_activity: historyData[0].task_date,
            days_inactive: diffDays
          };
        }
        
        return null;
      })
    );
    
    // Filter out null values and sort by days inactive
    const filteredInactiveAdmins = inactiveAdminsList
      .filter(admin => admin !== null) as InactiveAdmin[];
      
    setInactiveAdmins(filteredInactiveAdmins);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading master report data...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-white/70 mb-6">
            You must be logged in to view the master report. This page is restricted to authenticated users only.
          </p>
          <a 
            href="/"
            className="block w-full bg-pink-500 hover:bg-pink-600 text-white py-2 px-4 rounded-lg text-center transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-pink-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-pink-400 mr-3" />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">
                Master Report Dashboard
              </h1>
            </div>
            <a 
              href="/"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Return to App
            </a>
          </div>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'admins' 
                ? 'bg-pink-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Users className="h-5 w-5" />
            Admin Users
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'members' 
                ? 'bg-pink-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <UserCheck className="h-5 w-5" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'tasks' 
                ? 'bg-pink-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'inactive' 
                ? 'bg-pink-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
            Inactive Admins
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          {activeTab === 'admins' && (
            <div>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">Admin Users</h2>
                <p className="text-white/70 text-sm">List of all admin users in the system</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Admin Name</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Contact Number</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {admins.map(admin => (
                      <tr key={admin.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{admin.name || 'Unnamed Admin'}</td>
                        <td className="px-4 py-3 text-white/80">{admin.email}</td>
                        <td className="px-4 py-3 text-white/80">{admin.contact_number || 'Not provided'}</td>
                        <td className="px-4 py-3 text-white/80">
                          {new Date(admin.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                          No admin users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'members' && (
            <div>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">Members</h2>
                <p className="text-white/70 text-sm">List of all members and their point statistics</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Member Name</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Admin</th>
                      <th className="px-4 py-3 text-right text-white/90 font-medium">Total Points</th>
                      <th className="px-4 py-3 text-right text-white/90 font-medium">Total Rewarded</th>
                      <th className="px-4 py-3 text-right text-white/90 font-medium">Lifetime Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{member.name}</td>
                        <td className="px-4 py-3 text-white/80">{member.admin_name}</td>
                        <td className="px-4 py-3 text-white/80 text-right">{member.total_points}</td>
                        <td className="px-4 py-3 text-white/80 text-right">{member.total_rewarded}</td>
                        <td className="px-4 py-3 text-white/80 text-right font-medium">
                          {member.total_points + member.total_rewarded}
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                          No members found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'tasks' && (
            <div>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">Tasks</h2>
                <p className="text-white/70 text-sm">List of recent tasks (limited to 100)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Task Title</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Member</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Admin</th>
                      <th className="px-4 py-3 text-center text-white/90 font-medium">Type</th>
                      <th className="px-4 py-3 text-center text-white/90 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tasks.map(task => (
                      <tr key={task.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{task.title}</td>
                        <td className="px-4 py-3 text-white/80">{task.member_name}</td>
                        <td className="px-4 py-3 text-white/80">{task.admin_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.is_bonus ? 'bg-yellow-400/20 text-yellow-300' : 'bg-blue-400/20 text-blue-300'
                          }`}>
                            {task.is_bonus ? 'Bonus' : 'Regular'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.completed ? 'bg-green-400/20 text-green-300' : 'bg-gray-400/20 text-gray-300'
                          }`}>
                            {task.completed ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/80">
                          {new Date(task.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          No tasks found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'inactive' && (
            <div>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">Inactive Admins</h2>
                <p className="text-white/70 text-sm">Admins whose members haven't increased points in over 15 days</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Admin Name</th>
                      <th className="px-4 py-3 text-left text-white/90 font-medium">Last Activity</th>
                      <th className="px-4 py-3 text-right text-white/90 font-medium">Days Inactive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inactiveAdmins.map(admin => (
                      <tr key={admin.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{admin.name}</td>
                        <td className="px-4 py-3 text-white/80">
                          {admin.last_activity === 'No activity' ? 'No activity' : 
                            new Date(admin.last_activity).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          }
                        </td>
                        <td className="px-4 py-3 text-white/80 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admin.days_inactive > 30 ? 'bg-red-400/20 text-red-300' : 
                            admin.days_inactive > 20 ? 'bg-orange-400/20 text-orange-300' : 
                            'bg-yellow-400/20 text-yellow-300'
                          }`}>
                            {admin.days_inactive} days
                          </span>
                        </td>
                      </tr>
                    ))}
                    {inactiveAdmins.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-white/50">
                          No inactive admins found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MasterReport;
