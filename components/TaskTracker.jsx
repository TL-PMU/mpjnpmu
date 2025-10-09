import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckSquare, Plus, Calendar, User, Clock, AlertCircle, CheckCircle, Loader, X, Users } from 'lucide-react'
import useSWR from 'swr'
import TaskDetailModal from './TaskDetailModal'

const fetcher = async (query) => {
  const { data, error } = await supabase.from(query.table).select(query.select).order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export default function TaskTracker({ currentUser, userProfile }) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [profiles, setProfiles] = useState([])

  // Fetch tasks with SWR
  const { data: tasks, error: tasksError, mutate: mutateTasks } = useSWR(
    { table: 'tasks', select: '*' }, 
    fetcher,
    { refreshInterval: 10000 }
  )

  // Load profiles for task assignment
  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role')
    setProfiles(data || [])
  }

  const canAddTasks = userProfile?.role === 'admin'
  const canEditAllTasks = userProfile?.role === 'admin'

  if (!currentUser) {
    return (
      <div className="glass-card p-8 text-center">
        <CheckSquare className="w-16 h-16 text-water-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-water-700 mb-2">Authentication Required</h3>
        <p className="text-water-600">Please sign in to view and manage tasks.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CheckSquare className="w-6 h-6 text-water-600" />
            <h2 className="text-2xl font-bold text-water-800">Task Tracker</h2>
          </div>
          
          {canAddTasks && (
            <button
              onClick={() => setShowAddTask(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </button>
          )}
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-water-700">
              {tasks?.length || 0}
            </div>
            <div className="text-sm text-water-600">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {tasks?.filter(t => t.current_status === 'In Progress').length || 0}
            </div>
            <div className="text-sm text-water-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {tasks?.filter(t => t.current_status === 'Done').length || 0}
            </div>
            <div className="text-sm text-water-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {tasks?.filter(t => t.current_status === 'Blocked').length || 0}
            </div>
            <div className="text-sm text-water-600">Blocked</div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal
          profiles={profiles}
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setShowAddTask(false)}
          onTaskAdded={mutateTasks}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          currentUser={currentUser}
          userProfile={userProfile}
          profiles={profiles}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={mutateTasks}
        />
      )}

      {/* Tasks List */}
      <div className="glass-card p-6">
        {tasksError ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">Error loading tasks</p>
          </div>
        ) : !tasks ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-water-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-water-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-water-700 mb-2">No Tasks Yet</h3>
            <p className="text-water-600">
              {canAddTasks ? 'Create your first task to get started!' : 'No tasks have been assigned yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={currentUser}
                userProfile={userProfile}
                onClick={() => setSelectedTask(task)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Add Task Modal Component
function AddTaskModal({ profiles, currentUser, userProfile, onClose, onTaskAdded }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    primary_poc: '',
    additional_members: [],
    due_date: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const primaryPocProfile = profiles.find(p => p.id === formData.primary_poc)
      
      // Step 1: Create task WITHOUT the trigger interfering
      // We'll manually create all assignments after
      const taskInsert = {
        title: formData.title,
        description: formData.description,
        assigned_to: formData.primary_poc,
        assigned_to_name: primaryPocProfile?.full_name || primaryPocProfile?.email,
        assigned_by: currentUser.id,
        assigned_by_name: userProfile?.full_name || currentUser.email,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        current_status: 'Open',
        primary_poc: formData.primary_poc,
        primary_poc_name: primaryPocProfile?.full_name || primaryPocProfile?.email
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([taskInsert])
        .select()
        .single()

      if (taskError) {
        console.error('Task creation error:', taskError)
        throw new Error('Failed to create task: ' + taskError.message)
      }

      if (!taskData || !taskData.id) {
        throw new Error('Task created but no ID returned')
      }

      console.log('Task created successfully:', taskData.id)

      // Step 2: Wait for trigger to complete (if it runs)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 3: Check if primary POC assignment already exists (from trigger)
      const { data: existingAssignments } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', taskData.id)

      const existingUserIds = existingAssignments?.map(a => a.user_id) || []
      console.log('Existing assignments:', existingUserIds)

      // Step 4: Build list of all members to assign (including primary POC if not already assigned)
      const allMembersToAssign = [formData.primary_poc, ...formData.additional_members]
      const uniqueMembers = [...new Set(allMembersToAssign)] // Remove duplicates

      // Step 5: Only insert members that don't already have assignments
      const membersToInsert = uniqueMembers.filter(userId => !existingUserIds.includes(userId))

      console.log('Members to insert:', membersToInsert)

      if (membersToInsert.length > 0) {
        const assignments = membersToInsert.map(userId => {
          const profile = profiles.find(p => p.id === userId)
          return {
            task_id: taskData.id,
            user_id: userId,
            user_name: profile?.full_name || profile?.email,
            is_primary_poc: userId === formData.primary_poc
          }
        })

        console.log('Inserting assignments:', assignments)

        const { error: assignError } = await supabase
          .from('task_assignments')
          .insert(assignments)

        if (assignError) {
          console.error('Assignment error:', assignError)
          // Don't throw error here - task is already created
          // Just log it and continue
          console.warn('Could not create some assignments, but task was created successfully')
        }
      }

      onTaskAdded()
      onClose()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (userId) => {
    if (formData.additional_members.includes(userId)) {
      setFormData({
        ...formData,
        additional_members: formData.additional_members.filter(id => id !== userId)
      })
    } else {
      setFormData({
        ...formData,
        additional_members: [...formData.additional_members, userId]
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card p-6 w-full max-w-2xl animate-slide-up my-8">
        <h3 className="text-lg font-semibold text-water-800 mb-4">Create New Task</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter detailed task description"
              className="input-field min-h-[100px]"
              rows="4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Primary Point of Contact *
            </label>
            <select
              value={formData.primary_poc}
              onChange={(e) => setFormData({ ...formData, primary_poc: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select primary POC</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email} ({profile.role})
                </option>
              ))}
            </select>
            <p className="text-xs text-water-600 mt-1">
              Primary POC can update task status and expected completion date
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Additional Team Members
            </label>
            <div className="glass-card p-3 max-h-48 overflow-y-auto">
              {profiles
                .filter(p => p.id !== formData.primary_poc)
                .map((profile) => (
                  <label key={profile.id} className="flex items-center space-x-2 py-2 cursor-pointer hover:bg-water-50 rounded px-2">
                    <input
                      type="checkbox"
                      checked={formData.additional_members.includes(profile.id)}
                      onChange={() => toggleMember(profile.id)}
                      className="w-4 h-4 text-water-500 border-water-300 rounded"
                    />
                    <span className="text-sm text-water-700">
                      {profile.full_name || profile.email} ({profile.role})
                    </span>
                  </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Task Card Component
function TaskCard({ task, currentUser, userProfile, onClick, index }) {
  const [assignments, setAssignments] = useState([])

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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.current_status !== 'Done'
  const isAssigned = assignments.some(a => a.user_id === currentUser?.id)
  const isPrimaryPOC = assignments.some(a => a.user_id === currentUser?.id && a.is_primary_poc)

  return (
    <div 
      className={`glass-card p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer ${
        isOverdue ? 'border-l-4 border-red-400' : ''
      } animate-slide-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-water-800 text-lg">
            {task.title || 'Untitled Task'}
          </h4>
          {task.description && (
            <p className="text-sm text-water-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="flex items-center space-x-1 text-sm text-water-600">
              <Users className="w-4 h-4" />
              <span>{assignments.length} assigned</span>
            </span>
            {isPrimaryPOC && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                Primary POC
              </span>
            )}
            {isAssigned && !isPrimaryPOC && (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                Team Member
              </span>
            )}
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-1 ${getStatusColor(task.current_status)}`}>
          {getStatusIcon(task.current_status)}
          <span>{task.current_status || 'Open'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-water-400" />
          <div>
            <div className="text-water-600">Assigned</div>
            <div className="text-water-800">
              {task.assigned_date ? new Date(task.assigned_date).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-water-400" />
          <div>
            <div className="text-water-600">Due Date</div>
            <div className={`text-water-800 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
              {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
              {isOverdue && <span className="ml-1">⚠️</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-water-400" />
          <div>
            <div className="text-water-600">Expected</div>
            <div className="text-water-800">
              {task.expected_completion_date 
                ? new Date(task.expected_completion_date).toLocaleDateString() 
                : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Task Detail Modal Component
// Imported from TaskDetailModal.jsx

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'done': return 'bg-green-100 text-green-800 border-green-200'
    case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'blocked': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case 'done': return <CheckCircle className="w-4 h-4" />
    case 'in progress': return <Loader className="w-4 h-4" />
    case 'blocked': return <AlertCircle className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}