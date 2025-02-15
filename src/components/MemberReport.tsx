import React from 'react';
import { WeeklyReport, MonthlyReport } from '../types';
import { Trophy, Calendar, Star, CheckCircle, Target, AlertTriangle } from 'lucide-react';

interface MemberReportProps {
  weeklyReport?: WeeklyReport;
  monthlyReport?: MonthlyReport;
  showMonthly?: boolean;
}

function MemberReport({ weeklyReport, monthlyReport, showMonthly = false }: MemberReportProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const renderReport = (title: string, data: WeeklyReport | MonthlyReport, dateStart: string, dateEnd: string) => (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-pink-400" />
        {title}
      </h3>
      
      <div className="text-sm text-white/70 mb-4">
        {formatDate(dateStart)} - {formatDate(dateEnd)}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-pink-400" />
            <div>
              <div className="text-white/70">Points Earned</div>
              <div className="text-xl font-bold text-white">{data.points_earned}</div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <div className="text-white/70">Penalties</div>
                <div className="text-xl font-bold text-white">
                  {data.penalties_count} (-{data.penalty_points} pts)
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-400" />
            <div>
              <div className="text-white/70">Bonus Tasks</div>
              <div className="text-xl font-bold text-white">{data.bonus_tasks_completed}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <div className="text-white/70">Completed</div>
              <div className="text-xl font-bold text-white">
                {data.completed_tasks}/{data.total_tasks}
              </div>
            </div>
          </div>

          {'completion_rate' in data && (
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-white/70">Completion Rate</div>
                <div className="text-xl font-bold text-white">{data.completion_rate}%</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {weeklyReport && renderReport(
        'Weekly Report',
        weeklyReport,
        weeklyReport.week_start,
        weeklyReport.week_end
      )}
      
      {showMonthly && monthlyReport && renderReport(
        'Monthly Report',
        monthlyReport,
        monthlyReport.month_start,
        monthlyReport.month_end
      )}
    </div>
  );
}

export default MemberReport;