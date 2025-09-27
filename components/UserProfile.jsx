import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Phone, Briefcase, CheckCircle, XCircle, Save, AlertCircle } from 'lucide-react'

export default function UserProfile({ currentUser, userProfile, onProfileUpdate }) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    designation: '',
    present: false
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (userProfile) {
      setForm({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        designation: userProfile.designation || '',
        present: userProfile.present || false
      })
    }
  }, [userProfile])

  const handleSave = async () => {
    if (!currentUser) return

    setLoading(true)
    setMessage('')

    try {
      const updates = {
        id: currentUser.id,
        full_name: form.full_name,
        phone: form.phone,
        designation: form.designation,
        present: form.present,
        email: currentUser.email,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' })

      if (error) throw error

      setMessage('Profile updated successfully!')
      setIsSuccess(true)
      
      // Refresh user profile
      if (onProfileUpdate) {
        await onProfileUpdate(currentUser.id)
      }

      setTimeout(() => {
        setMessage('')
        setIsSuccess(false)
      }, 3000)

    } catch (error) {
      setMessage(error.message)
      setIsSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="glass-card p-8 text-center">
        <User className="w-16 h-16 text-water-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-water-700 mb-2">Authentication Required</h3>
        <p className="text-water-600">Please sign in to view and edit your profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-water-500 to-ocean-500 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-water-800">User Profile</h2>
            <p className="text-water-600">Manage your personal information and attendance status</p>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            isSuccess 
              ? 'bg-ocean-100 text-ocean-800 border border-ocean-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {isSuccess ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Profile Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-water-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Enter your full name"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-water-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Enter your phone number"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-water-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-2" />
                Designation
              </label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Enter your designation"
                className="input-field"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="glass-card p-4 bg-water-50/50">
              <h4 className="font-medium text-water-800 mb-3">Account Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-water-600">Email:</span>
                  <span className="text-water-800 font-medium">{currentUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-water-600">Role:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    userProfile?.role === 'admin' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {userProfile?.role === 'admin' ? 'Team Leader' : 'Collaborator'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-water-600">Member Since:</span>
                  <span className="text-water-800">
                    {new Date(currentUser.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Status */}
            <div className="glass-card p-4 bg-ocean-50/50">
              <h4 className="font-medium text-water-800 mb-3">Today's Attendance</h4>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.present}
                  onChange={(e) => setForm({ ...form, present: e.target.checked })}
                  className="w-5 h-5 text-ocean-500 border-2 border-ocean-300 rounded focus:ring-ocean-400"
                />
                <span className="flex items-center space-x-2">
                  {form.present ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-ocean-600" />
                      <span className="text-ocean-700 font-medium">Mark as Present</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Mark as Present</span>
                    </>
                  )}
                </span>
              </label>
              <p className="text-xs text-water-600 mt-2">
                This will update your status on the team dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-lg font-semibold text-water-700">
            {userProfile?.updated_at 
              ? new Date(userProfile.updated_at).toLocaleDateString()
              : 'Never'
            }
          </div>
          <div className="text-sm text-water-600">Last Updated</div>
        </div>

        <div className="glass-card p-4 text-center">
          <div className={`text-lg font-semibold ${
            form.present ? 'text-ocean-700' : 'text-gray-500'
          }`}>
            {form.present ? 'Present' : 'Absent'}
          </div>
          <div className="text-sm text-water-600">Current Status</div>
        </div>

        <div className="glass-card p-4 text-center">
          <div className="text-lg font-semibold text-water-700">
            {userProfile?.role === 'admin' ? 'Admin' : 'Member'}
          </div>
          <div className="text-sm text-water-600">Access Level</div>
        </div>
      </div>
    </div>
  )
}