import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Settings, Users, Shield, UserCheck, UserX, Trash2, Edit3, Plus, AlertCircle, CheckCircle } from 'lucide-react'
import useSWR from 'swr'

const fetcher = async (query) => {
  const { data, error } = await supabase.from(query.table).select(query.select)
  if (error) throw error
  return data
}

export default function AdminPanel({ currentUser }) {
  const [activeSection, setActiveSection] = useState('users')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // Fetch data with SWR
  const { data: profiles, error: profilesError, mutate: mutateProfiles } = useSWR(
    { table: 'profiles', select: '*' }, 
    fetcher,
    { refreshInterval: 5000 }
  )

  const { data: tasks, mutate: mutateTasks } = useSWR(
    { table: 'tasks', select: '*' }, 
    fetcher
  )

  const userProfile = profiles?.find(p => p.id === currentUser?.id)
  const isAdmin = userProfile?.role === 'admin'

  const showMessage = (msg, success = true) => {
    setMessage(msg)
    setIsSuccess(success)
    setTimeout(() => {
      setMessage('')
      setIsSuccess(false)
    }, 3000)
  }

  const toggleUserRole = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'admin' ? 'collaborator' : 'admin'
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      showMessage(`User role updated to ${newRole}`)
      mutateProfiles()
    } catch (error) {
      showMessage(error.message, false)
    }
  }

  const deleteUser = async (userId) => {
    try {
      // Delete user's tasks first
      await supabase.from('tasks').delete().eq('assigned_to', userId)
      
      // Delete profile
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error

      showMessage('User deleted successfully')
      mutateProfiles()
      mutateTasks()
      setShowDeleteConfirm(null)
    } catch (error) {
      showMessage(error.message, false)
    }
  }

  const deleteTask = async (taskId) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error

      showMessage('Task deleted successfully')
      mutateTasks()
    } catch (error) {
      showMessage(error.message, false)
    }
  }

  if (!currentUser) {
    return (
      <div className="glass-card p-8 text-center">
        <Settings className="w-16 h-16 text-water-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-water-700 mb-2">Authentication Required</h3>
        <p className="text-water-600">Please sign in to access admin panel.</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="glass-card p-8 text-center">
        <Shield className="w-16 h-16 text-water-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-water-700 mb-2">Access Denied</h3>
        <p className="text-water-600">Only team leaders (admins) can access this panel.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="w-6 h-6 text-water-600" />
          <h2 className="text-2xl font-bold text-water-800">Admin Panel</h2>
          <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm rounded-full font-medium">
            Team Leader
          </span>
        </div>

        {/* Navigation */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSection('users')}
            className={activeSection === 'users' ? 'nav-tab-active' : 'nav-tab'}
          >
            <Users className="w-4 h-4 mr-2" />
            User Management
          </button>
          <button
            onClick={() => setActiveSection('tasks')}
            className={activeSection === 'tasks' ? 'nav-tab-active' : 'nav-tab'}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Task Management
          </button>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-lg flex items-center space-x-3 ${
            isSuccess 
              ? 'bg-green-100 text-green-800 border border-green-200' 
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
      </div>

      {/* User Management Section */}
      {activeSection === 'users' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-water-800">Manage Team Members</h3>
            <div className="text-sm text-water-600">
              Total: {profiles?.length || 0} members
            </div>
          </div>

          {profilesError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">Error loading users</p>
            </div>
          ) : !profiles ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-water-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile, index) => (
                <div 
                  key={profile.id} 
                  className="glass-card p-4 hover:scale-[1.02] transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-water-400 to-ocean-400 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-water-800">
                          {profile.full_name || profile.email || 'Unknown User'}
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-water-600">
                          <span>{profile.designation || 'No designation'}</span>
                          <span>•</span>
                          <span>{profile.phone || 'No phone'}</span>
                          <span>•</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            profile.present ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {profile.present ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        profile.role === 'admin' 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {profile.role === 'admin' ? 'Team Leader' : 'Collaborator'}
                      </span>

                      {profile.id !== currentUser.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleUserRole(profile.id, profile.role)}
                            className={`btn-secondary text-sm ${
                              profile.role === 'admin' 
                                ? 'hover:bg-red-50 hover:text-red-600' 
                                : 'hover:bg-yellow-50 hover:text-yellow-600'
                            }`}
                          >
                            {profile.role === 'admin' ? (
                              <>
                                <UserX className="w-4 h-4 mr-1" />
                                Revoke Admin
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setShowDeleteConfirm(profile)}
                            className="btn-secondary text-sm hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-water-500 border-t border-water-100 pt-2">
                    Last updated: {profile.updated_at 
                      ? new Date(profile.updated_at).toLocaleString() 
                      : 'Never'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Management Section */}
      {activeSection === 'tasks' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-water-800">Manage All Tasks</h3>
            <div className="text-sm text-water-600">
              Total: {tasks?.length || 0} tasks
            </div>
          </div>

          {!tasks ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-water-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <Edit3 className="w-16 h-16 text-water-300 mx-auto mb-4" />
              <p className="text-water-600">No tasks found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className="glass-card p-4 hover:scale-[1.02] transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-water-800 mb-2">
                        {task.title || 'Untitled Task'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-water-600">
                        <div>
                          <span className="font-medium">Assigned to:</span><br />
                          {task.assigned_to_name}
                        </div>
                        <div>
                          <span className="font-medium">Assigned by:</span><br />
                          {task.assigned_by_name}
                        </div>
                        <div>
                          <span className="font-medium">Due:</span><br />
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span><br />
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.current_status === 'Done' ? 'bg-green-100 text-green-800' :
                            task.current_status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            task.current_status === 'Blocked' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.current_status || 'Open'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="btn-secondary text-sm hover:bg-red-50 hover:text-red-600 ml-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md animate-slide-up">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-water-800 mb-2">Delete User</h3>
              <p className="text-water-600 mb-6">
                Are you sure you want to delete <strong>{showDeleteConfirm.full_name || showDeleteConfirm.email}</strong>? 
                This will also delete all their assigned tasks and cannot be undone.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(showDeleteConfirm.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}