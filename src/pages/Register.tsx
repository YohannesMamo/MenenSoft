import { useState, useEffect } from 'react';
import { authApi, type RegisterRequest } from '../api/auth';
import { studentsApi, type Grade } from '../api/students';

interface RegisterProps {
  setToken: (token: string) => void;
}

export default function Register({ setToken }: RegisterProps) {
  const [formData, setFormData] = useState({
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Email: '',
    Password: '',
    PhoneMobile: '',
    GradeId: '',
  });
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(true);

  // Fetch grades on mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const data = await studentsApi.getGrades();
        setGrades(data);
        // Default to first grade if available
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, GradeId: data[0].gradeId }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grades');
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: RegisterRequest = {
        Email: formData.Email,
        Password: formData.Password,
        FirstName: formData.FirstName || undefined,
        MiddleName: formData.MiddleName || undefined,
        LastName: formData.LastName || undefined,
        PhoneMobile: formData.PhoneMobile || undefined,
        GradeId: formData.GradeId || undefined,
      };
      const response = await authApi.register(data);
      setToken(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-[500px]">
        <h2 className="mb-6 text-center text-gray-800 dark:text-gray-100">Register - MERP Student Assistant</h2>
        {error && <div className="text-red-600 dark:text-red-400 mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-gray-600 dark:text-gray-400">First Name</label>
              <input type="text" name="FirstName" value={formData.FirstName} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
            </div>
            <div>
              <label className="block mb-2 text-gray-600 dark:text-gray-400">Middle Name</label>
              <input type="text" name="MiddleName" value={formData.MiddleName} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Last Name</label>
            <input type="text" name="LastName" value={formData.LastName} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Email *</label>
            <input type="email" name="Email" value={formData.Email} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Password *</label>
            <input type="password" name="Password" value={formData.Password} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Phone Mobile</label>
            <input type="tel" name="PhoneMobile" value={formData.PhoneMobile} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Grade *</label>
            {loadingGrades ? (
              <div className="p-3 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded">
                Loading grades...
              </div>
            ) : (
              <select
                name="GradeId"
                value={formData.GradeId}
                onChange={handleSelectChange}
                required
                className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
              >
                <option value="" disabled>
                  Select a grade
                </option>
                {grades.map(grade => (
                  <option key={grade.gradeId} value={grade.gradeId}>
                    {grade.gradeDescription}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || loadingGrades}
            className="w-full mt-6 p-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded text-base disabled:opacity-70"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-500 dark:text-gray-400">
          Already have an account? <a href="/login" className="text-green-600 dark:text-green-400">Login</a>
        </p>
      </div>
    </div>
  );
}