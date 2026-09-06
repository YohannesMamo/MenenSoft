import { resolveApiBase } from '../config/api';

export interface Grade {
  gradeId: string;
  gradeDescription: string;
}

export const studentsApi = {
  getGrades: async (): Promise<Grade[]> => {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/students/grades`);
    if (!response.ok) {
      throw new Error('Failed to fetch grades');
    }
    return response.json();
  },
};
