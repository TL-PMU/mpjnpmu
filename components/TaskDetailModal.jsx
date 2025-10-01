import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Edit3, Save, User, Users, Calendar, Clock, AlertCircle, Trash2 } from 'lucide-react'

export default function TaskDetailModal({ task, currentUser, userProfile, profiles, onClose, onTaskUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    current_status: task.current_status || 'Open',
    expected_completion_date: task.expected_completion_date ? task.expected_completion_date.split('T')[0] : '',
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    primary_poc: task.primary_poc || task.assigned_to || ''
  })

  useEffect(() => {
    loadAssignments()
  }, [task.id])

  const loadAssignments = async () => {
    const { data } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('task_id', task.id)
      .order('is_primary_poc', { ascending: false })
    
    setAssignments(data || [])
  }

  const isAssigned = assignments.some(a => a.user_id === currentUser.id)
  const isPrimaryPOC = assignments.some(a => a.user_id === currentUser.id && a.is_primary_poc)
  const isAdmin = userProfile?.role === 'admin'
  const isCollaborator = userProfile?.role === 'collaborator'
  const isMember = userProfile?.role === 'member'

  // Determine edit permissions
  const canEditFull = isAdmin || (isCollaborator && isAssigned)
  const canEditStatusOnly = (isMember && isPrimaryPOC) || canEditFull
  const canDelete = isAdmin

  const handleSave = async () => {
    setLoading(true)
    try {
      const updates = {}

      if (canEditFull) {
        // Admin or Collaborator can edit everything
        updates.title = formData.title
        updates.description = formData.description
        updates.current_status = formData.current_status
        updates.expected_completion_date = formData.expected_completion_date ? new Date(formData.expected_completion_date).toISOString() : null
        updates.due_date = formData.due_date ? new Date(formData.due_date).toISOString() : null
        
        // If primary POC changed
        if (formData.primary_poc !== task.primary_poc) {
          const pocProfile = profiles.find(p => p.id === formData.primary_poc)
          updates.primary_poc = formData.primary_poc
          updates.primary_poc_name = pocProfile?.full_name || pocProfile?.email
          updates.assigned_to = formData.primary_poc
          updates.assigned_to_name = pocProfile?.full_name || pocProfile?.email
        }
      } else if (canEditStatusOnly) {
        // Member (Primary POC) can only edit status and expected date
        updates.current_status = formData.current_status
        updates.expected_completion_date = formData.expected_completion_date ? new Date(formData.expected_completion_date).toISOString() : null
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)

      if (error) throw error

      setIsEditing(false)
      onTaskUpdated()
      
      // Reload task data
      const { data: updatedTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task.id)
        .single()
      
      if (updatedTask) {
        Object.assign(task, updatedTask)
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (error) throw error

      onTaskUpdated()
      onClose()
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (userId) => {
    try {
      const profile = profiles.find(p => p.id === userId)
      const { error } = await supabase
        .from('task_assignments')
        .insert([{
          task_id: task.id,
          user_id: userId,
          user_name: profile?.full_name || profile?.email,
          is_primary_poc: false
        }])

      if (error) throw error
      loadAssignments()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleRemoveMember = async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
      loadAssignments()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleChangePrimaryPOC = async (newPocId) => {
    if (!isAdmin) return

    try {
      // Update all assignments for this task
      await supabase
        .from('task_assignments')
        .update({ is_primary_poc: false })
        .eq('task_id', task.id)

      // Set new primary POC
      await supabase
        .from('task_assignments')
        .update({ is_primary_poc: true })
        .eq('task_id', task.id)
        .eq('user_id', newPocId)

      // Update task primary_poc fields
      const pocProfile = profiles.find(p => p.id === newPocId)
      await supabase
        .from('tasks')
        .update({
          primary_poc: newPocId,
          primary_poc_name: pocProfile?.full_name || pocProfile?.email,
          assigned_to: newPocId,
          assigned_to_name: pocProfile?.full_name || pocProfile?.email
        })
        .eq('id', task.id)

      loadAssignments()
      onTaskUpdated()
    } catch (error) {
      alert(error.message)
    }
  }

  const unassignedProfiles = profiles.filter(
    p => !assignments.some(a => a.user_id === p.id)
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card p-6 w-full max-w-4xl animate-slide-up my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {isEditing && canEditFull ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field text-xl font-semibold"
                placeholder="Task title"
              />
            ) : (
              <h2 className="text-2xl font-bold text-water-800">{task.title}</h2>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {canEditStatusOnly && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="btn-secondary hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-water-400 hover:text-water-600 text-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-water-800 mb-2">Description</h3>
              {isEditing && canEditFull ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field min-h-[120px]"
                  placeholder="Enter task description..."
                  rows="6"
                />
              ) : (
                <p className="text-water-600 whitespace-pre-wrap">
                  {task.description || 'No description provided.'}
                </p>
              )}
            </div>

            {/* Task Details */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-water-800 mb-3">Task Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-water-700 mb-2">
                    Status
                  </label>
                  {isEditing && canEditStatusOnly ? (
                    <select
                      value={formData.current_status}
                      onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                      className="input-field"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Done">Done</option>
                    </select>
                  ) : (
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center space-x-2 ${getStatusColor(task.current_status)}`}>
                      {getStatusIcon(task.current_status)}
                      <span>{task.current_status || 'Open'}</span>
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-water-700 mb-2">
                    Due Date
                  </label>
                  {isEditing && canEditFull ? (
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    <div className="text-water-800">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    </div>
                  )}
                </div>

                {/* Expected Completion */}
                <div>
                  <label className="block text-sm font-medium text-water-700 mb-2">
                    Expected Completion
                  </label>
                  {isEditing && canEditStatusOnly ? (
                    <input
                      type="date"
                      value={formData.expected_completion_date}
                      onChange={(e) => setFormData({ ...formData, expected_completion_date: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    <div className="text-water-800">
                      {task.expected_completion_date 
                        ? new Date(task.expected_completion_date).toLocaleDateString() 
                        : 'Not set'}
                    </div>
                  )}
                </div>

                {/* Assigned Date */}
                <div>
                  <label className="block text-sm font-medium text-water-700 mb-2">
                    Assigned Date
                  </label>
                  <div className="text-water-800">
                    {task.assigned_date ? new Date(task.assigned_date).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-water-800 mb-2">Assignment Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-water-600">Assigned By:</span>
                  <span className="text-water-800 font-medium">{task.assigned_by_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-water-600">Created:</span>
                  <span className="text-water-800">
                    {task.created_at ? new Date(task.created_at).toLocaleString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-water-600">Last Updated:</span>
                  <span className="text-water-800">
                    {task.updated_at ? new Date(task.updated_at).toLocaleString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Team Members */}
          <div className="space-y-6">
            {/* Assigned Team Members */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-water-800 flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Assigned Team</span>
                </h3>
                <span className="text-sm text-water-600">{assignments.length} members</span>
              </div>

              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-water-50/50"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-water-600" />
                      <div>
                        <div className="text-sm font-medium text-water-800">
                          {assignment.user_name}
                        </div>
                        {assignment.is_primary_poc && (
                          <span className="text-xs text-blue-600 font-medium">Primary POC</span>
                        )}
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        {!assignment.is_primary_poc && (
                          <button
                            onClick={() => handleChangePrimaryPOC(assignment.user_id)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Make Primary POC"
                          >
                            Make POC
                          </button>
                        )}
                        {!assignment.is_primary_poc && (
                          <button
                            onClick={() => handleRemoveMember(assignment.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove member"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Member (Admin Only) */}
              {isAdmin && unassignedProfiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-water-200">
                  <label className="block text-sm font-medium text-water-700 mb-2">
                    Add Team Member
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddMember(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="input-field text-sm"
                  >
                    <option value="">Select member to add...</option>
                    {unassignedProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email} ({profile.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Permission Notice */}
            <div className="glass-card p-4 bg-blue-50/50">
              <h4 className="font-medium text-blue-800 mb-2">Your Permissions</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {isAdmin && (
                  <>
                    <li>✓ Edit all task details</li>
                    <li>✓ Change assignments</li>
                    <li>✓ Delete task</li>
                  </>
                )}
                {isCollaborator && isAssigned && (
                  <>
                    <li>✓ Edit all task details</li>
                    <li>✗ Cannot delete task</li>
                  </>
                )}
                {isMember && isPrimaryPOC && (
                  <>
                    <li>✓ Update status</li>
                    <li>✓ Update expected date</li>
                    <li>✗ Cannot edit other details</li>
                  </>
                )}
                {isMember && isAssigned && !isPrimaryPOC && (
                  <li className="text-gray-600">View only access</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'done': return 'bg-green-100 text-green-800 border border-green-200'
    case 'in progress': return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'blocked': return 'bg-red-100 text-red-800 border border-red-200'
    default: return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}

function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case 'done': return <span>✓</span>
    case 'in progress': return <span>⟳</span>
    case 'blocked': return <span>!</span>
    default: return <span>○</span>
  }
}