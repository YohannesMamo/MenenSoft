import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, GraduationCap, Phone, Briefcase, Heart, Save, 
  ChevronRight, ChevronLeft, Sparkles, CheckCircle, 
  Clock, AlertCircle, X, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

interface Grade {
  gradeId: string;
  gradeDescription: string;
}

interface StudentProfile {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phoneMobile: string;
  phoneResidence: string;
  webAddress: string;
  address: string;
  grade: string;
  interests: string[];
  goals: string;
  preferredStudyTime: string;
  parentName: string;
  parentPhone: string;
  medicalNotes: string;
}

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [availableGrades, setAvailableGrades] = useState<Grade[]>([]);
  
  const [profile, setProfile] = useState<StudentProfile>({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phoneMobile: '',
    phoneResidence: '',
    webAddress: '',
    address: '',
    grade: '',
    interests: [],
    goals: '',
    preferredStudyTime: '',
    parentName: '',
    parentPhone: '',
    medicalNotes: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  // Get student ID from user object or localStorage
  useEffect(() => {
    if (user) {
      const id = user.studentId || user.userId;
      if (id) {
        setStudentId(id);

      } else {
        console.error('No student ID found in user object:', user);
        setError('Unable to identify student. Please log in again.');
        setIsLoading(false);
      }
    } else if (isAuthenticated) {
      // Try to get studentId from localStorage directly
      const storedStudentId = localStorage.getItem('studentId');
      if (storedStudentId) {
        setStudentId(storedStudentId);
      } else {
        // If no studentId, try to use userId
        const userId = localStorage.getItem('userId');
        if (userId) {
          setStudentId(userId);
        } else {
          setError('Unable to identify student. Please log in again.');
          setIsLoading(false);
        }
      }
    }
  }, [user, isAuthenticated]);

  // Fetch grades from database
  useEffect(() => {
    const fetchGrades = async () => {
      const token = getToken();
      if (!token) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/grades`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const grades = await response.json();
          setAvailableGrades(grades);
        } else {
          // Fallback grades
          setAvailableGrades([
            {gradeId: 'HIG9A', gradeDescription: 'Grade 9'},
            {gradeId: 'HIG10A', gradeDescription: 'Grade 10'},
            {gradeId: 'HIG11A', gradeDescription: 'Grade 11'},
            {gradeId: 'HIG12A', gradeDescription: 'Grade 12'}
          ]);
        }
      } catch (error) {

        setAvailableGrades([
          {gradeId: 'HIG9A', gradeDescription: 'Grade 9'},
          {gradeId: 'HIG10A', gradeDescription: 'Grade 10'},
          {gradeId: 'HIG11A', gradeDescription: 'Grade 11'},
          {gradeId: 'HIG12A', gradeDescription: 'Grade 12'}
        ]);
      }
    };
      
    fetchGrades();
  }, []);

  // Fetch existing student data from backend using student ID
  useEffect(() => {
    const fetchStudentData = async () => {
      const token = getToken();
      
      if (!token || !studentId) {
        if (!studentId) {

          setIsLoading(false);
        }
        return;
      }
      
      try {
        setError(null);

        
        const response = await fetch(`${API_BASE_URL}/api/profile/${studentId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        

        
        if (response.ok) {
          const data = await response.json();

          
          setProfile(prev => ({
            ...prev,
            firstName: data.StuFirstName || '',
            middleName: data.StuMiddleName || '',
            lastName: data.StuLastName || '',
            dateOfBirth: data.StuDateOfBirth ? new Date(data.StuDateOfBirth).toISOString().split('T')[0] : '',
            grade: data.StuGrade || '',
            phoneMobile: data.StuPhoneMobile || '',
            phoneResidence: data.StuPhoneResidence || '',
            webAddress: data.StuWebAddress || '',
            address: data.StuAddress || '',
            gender: data.StuGender || ''
          }));
          
          // Mark sections as completed based on existing data
          const completed = new Set<string>();
          if (data.StuFirstName && data.StuLastName && data.StuDateOfBirth) {
            completed.add('personal');
          }
          if (data.StuGrade) {
            completed.add('academic');
          }
          if (data.StuPhoneMobile || data.StuPhoneResidence || data.StuAddress) {
            completed.add('contact');
          }
          setCompletedSections(completed);
          

        } else if (response.status === 404) {

          // Don't set error, just show empty form for new profile
        } else {
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
      } catch (error) {
        console.error('Could not fetch existing profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const sections = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: User,
      description: 'Edit your personal details',
      isRequired: true,
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'John', required: true },
        { name: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'William', required: false },
        { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe', required: true },
        { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', placeholder: '', required: true },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: false }
      ]
    },
    {
      id: 'contact',
      title: 'Contact Information',
      icon: Phone,
      description: 'Add your contact details',
      isRequired: false,
      fields: [
        { name: 'phoneMobile', label: 'Mobile Phone', type: 'tel', placeholder: '+251 912 345 678', required: false },
        { name: 'phoneResidence', label: 'Residence Phone', type: 'tel', placeholder: '+251 11 123 4567', required: false },
        { name: 'webAddress', label: 'Website/Portfolio', type: 'url', placeholder: 'https://yourportfolio.com', required: false },
        { name: 'address', label: 'Physical Address', type: 'text', placeholder: 'Addis Ababa, Ethiopia', required: false }
      ]
    },
    {
      id: 'academic',
      title: 'Academic Information',
      icon: GraduationCap,
      description: 'Update your academic details',
      isRequired: true,
      fields: [
        { name: 'grade', label: 'Current Grade/Level', type: 'select', options: availableGrades.map(g => g.gradeId), required: true }
      ]
    },
    {
      id: 'preferences',
      title: 'Learning Preferences',
      icon: Heart,
      description: 'Help us personalize your experience (Optional)',
      isRequired: false,
      fields: [
        { name: 'interests', label: 'Subjects of Interest', type: 'multiselect', options: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Literature', 'History', 'Computer Science', 'Art'], required: false },
        { name: 'goals', label: 'Academic Goals', type: 'textarea', placeholder: 'What do you want to achieve this year?', required: false },
        { name: 'preferredStudyTime', label: 'Preferred Study Time', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Late Night'], required: false }
      ]
    },
    {
      id: 'guardian',
      title: 'Guardian Information',
      icon: Briefcase,
      description: 'Emergency contact (Optional)',
      isRequired: false,
      fields: [
        { name: 'parentName', label: "Parent/Guardian Name", type: 'text', placeholder: 'Jane Doe', required: false },
        { name: 'parentPhone', label: "Parent/Guardian Phone", type: 'tel', placeholder: '+251 912 345 678', required: false },
        { name: 'medicalNotes', label: 'Medical Notes', type: 'textarea', placeholder: 'Allergies, conditions, etc.', required: false }
      ]
    }
  ];

  const updateField = (name: string, value: any) => {
    setProfile(prev => ({ ...prev, [name]: value }));
    
    const currentSection = sections[currentStep];
    const requiredFields = currentSection.fields.filter(f => f.required);
    
    if (requiredFields.length > 0) {
      const allRequiredFilled = requiredFields.every(f => {
        const fieldValue = name === f.name ? value : profile[f.name as keyof StudentProfile];
        return fieldValue && fieldValue.toString().trim() !== '';
      });
      
      if (allRequiredFilled && !completedSections.has(currentSection.id)) {
        setCompletedSections(prev => new Set([...prev, currentSection.id]));
      }
    }
  };

  const handleNext = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const token = getToken();
    
    if (!token) {
      setError('Authentication required. Please log in again.');
      return;
    }
    
    if (!studentId) {
      setError('Student ID not found. Please log in again.');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    const updateData: Record<string, any> = {};
    if (profile.firstName) updateData.firstName = profile.firstName;
    if (profile.middleName) updateData.middleName = profile.middleName;
    if (profile.lastName) updateData.lastName = profile.lastName;
    if (profile.dateOfBirth) updateData.dateOfBirth = profile.dateOfBirth;
    if (profile.phoneMobile) updateData.phoneMobile = profile.phoneMobile;
    if (profile.phoneResidence) updateData.phoneResidence = profile.phoneResidence;
    if (profile.webAddress) updateData.webAddress = profile.webAddress;
    if (profile.address) updateData.address = profile.address;
    if (profile.grade) updateData.grade = profile.grade;
    if (profile.gender) updateData.gender = profile.gender;
    

    
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        console.error('Save failed:', data);
        setError(data.message || 'Unable to save profile. Please try again.');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Network error. Please check your connection and try again.');
      setIsSaving(false);
    }
  };

  const progress = (completedSections.size / sections.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle size={20} />
            <span>Profile updated successfully! Redirecting...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Review and update your information to continue
          </p>
        </div>

        <div className="mb-8 bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex justify-between mb-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Profile Completion</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            {sections.map((section, idx) => (
              <div key={section.id} className="text-center flex-1">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all
                  ${idx === currentStep ? 'bg-blue-500 text-white ring-4 ring-blue-200' :
                    completedSections.has(section.id) ? 'bg-green-500 text-white' :
                    'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  {completedSections.has(section.id) ? <CheckCircle size={14} /> : idx + 1}
                </div>
                <div className="hidden sm:block text-xs">{section.title.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl text-white shadow-lg">
                {React.createElement(sections[currentStep].icon, { size: 24 })}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {sections[currentStep].title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {sections[currentStep].description}
                </p>
                {!sections[currentStep].isRequired && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    <Sparkles size={12} />
                    Optional
                  </span>
                )}
              </div>
              {completedSections.has(sections[currentStep].id) && (
                <div className="text-green-500">
                  <CheckCircle size={24} />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {sections[currentStep].fields.map((field) => (
              <div key={field.name} className="group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {field.name === 'grade' && (
          <span className="ml-2 text-xs text-gray-500 inline-flex items-center gap-1">
            <Lock size={12} />
            Grade is locked
          </span>
        )}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    value={profile[field.name as keyof StudentProfile] as string || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             transition-all duration-200"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={profile[field.name as keyof StudentProfile] as string || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             transition-all duration-200"
                  >
                    <option value="">Select an option</option>
                    {field.name === 'grade' ? (
                      availableGrades.map(grade => (
                        <option key={grade.gradeId} value={grade.gradeId}>
                          {grade.gradeDescription}
                        </option>
                      ))
                    ) : (
                      field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))
                    )}
                  </select>
                ) : field.type === 'multiselect' ? (
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const current = profile.interests || [];
                          const newInterests = current.includes(opt)
                            ? current.filter(i => i !== opt)
                            : [...current, opt];
                          updateField('interests', newInterests);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                          ${profile.interests?.includes(opt)
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type={field.type}
                      value={profile[field.name as keyof StudentProfile] as string || ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200"
                    />
                    {profile[field.name as keyof StudentProfile] && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        <CheckCircle size={18} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                       flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500
                       text-white font-medium hover:shadow-lg transform hover:scale-105
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                       flex items-center gap-2"
            >
              {currentStep === sections.length - 1 ? (
                <>
                  {isSaving ? 'Saving...' : 'Update Profile'}
                  <Save size={18} />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 
                     dark:hover:text-gray-200 transition-colors flex items-center gap-1 mx-auto"
          >
            <Clock size={14} />
            I'll complete this later
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Your existing information has been saved. You can update anytime.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CompleteProfile;