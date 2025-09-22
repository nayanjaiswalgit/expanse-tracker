import { apiClient } from '../../../api';
import type { Period, MonthlyReport } from '../schemas';

export const monthlyAnalysisApi = {
  async getAvailablePeriods(): Promise<{ periods: Period[] }> {
    const res = await apiClient.get('/monthly-analysis/available_periods/');
    return (res as any).data;
  },
  async getReportHistory(): Promise<{ reports: Array<{ id: string; title: string; created_at: string; period: { year: number; month: number; month_name: string }; file_size: number; has_file: boolean }> }> {
    const res = await apiClient.get('/monthly-analysis/report_history/');
    return (res as any).data;
  },
  async getCurrentMonthSummary(): Promise<any> {
    const res = await apiClient.get('/monthly-analysis/current_month_summary/');
    return (res as any).data;
  },
  async generateReport(payload: { year: number; month: number }): Promise<MonthlyReport> {
    const res = await apiClient.post('/monthly-analysis/generate_report/', payload);
    return (res as any).data;
  },
  async getStoredReport(reportId: string): Promise<{ success: boolean; report: MonthlyReport }> {
    const res = await apiClient.get(`/monthly-analysis/${reportId}/get_report/`);
    return (res as any).data;
  },
};
