import React, { useState } from 'react';
import { X, Gift } from 'lucide-react';
import { WeeklyReport, MonthlyReport } from '../types';
import MemberReport from './MemberReport';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyReport: WeeklyReport | null;
  monthlyReport: MonthlyReport | null;
  memberName: string;
  rewardHistory?: {
    total_rewards: number;
    total_points_rewarded: number;
    rewards_json: Array<{
      id: string;
      points: number;
      created_at: string;
    }>;
  };
}

function ReportModal({ isOpen, onClose, weeklyReport, monthlyReport, memberName, rewardHistory }: ReportModalProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'rewards'>('weekly');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-navy-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{memberName}'s Reports</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Weekly Report
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'monthly'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Monthly Report
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'rewards'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Rewards History
            </button>
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'weekly' && weeklyReport && (
              <MemberReport weeklyReport={weeklyReport} />
            )}
            {activeTab === 'monthly' && monthlyReport && (
              <MemberReport monthlyReport={monthlyReport} showMonthly />
            )}
            {activeTab === 'rewards' && rewardHistory && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                    <div className="text-white/70">Total Rewards</div>
                    <div className="text-2xl font-bold text-white">{rewardHistory.total_rewards}</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                    <div className="text-white/70">Total Points Rewarded</div>
                    <div className="text-2xl font-bold text-white">{rewardHistory.total_points_rewarded}</div>
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Reward History</h3>
                  </div>
                  <div className="divide-y divide-white/10">
                    {rewardHistory.rewards_json.map((reward) => (
                      <div key={reward.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Gift className="h-5 w-5 text-green-400" />
                          <div>
                            <div className="text-white font-medium">{reward.points} points rewarded</div>
                            <div className="text-sm text-white/70">
                              {new Date(reward.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {rewardHistory.rewards_json.length === 0 && (
                      <div className="p-4 text-center text-white/50">
                        No rewards history yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;