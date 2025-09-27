import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckSquare, Plus, Calendar, User, Clock, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import useSWR from 'swr'

const fetcher = async (query) => {
  const { data, error } = await supabase.from(query.table).select(query.select).order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export default function TaskTracker({ currentUser, userProfile }) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    assigned_to: '',
    assigned_to_name: '',
    due_date: '',
    current_status: 'Open'
  })
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)

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
    const { data } = await supabase.from('profiles').select('id, full_name, email')
    setProfiles(data || [])
  }

  const canAddTasks = userProfile?.role === 'admin' || userProfile?.role === 'collaborator'
  const canEditAllTasks = userProfile?.role === 'admin'

  const addTask = async () => {
    if (!currentUser || !canAddTasks) return

    setLoading(true)
    try {
      const assignedProfile = profiles.find(p => p.id === newTask.assigned_to)
      
      const task = {
        title: newTask.title,
        assigned_to: newTask.assigned_to,
        assigned_to_name: assignedProfile?.full_name || assignedProfile?.email || 'Unknown',
        assigned_by: currentUser.id,
        assigned_by_name: userProfile?.full_name || currentUser.email,
        assigned_date: new Date().toISOString(),
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
        current_status: 'Open',
        expected_completion_date: null
      }

      const { error } = await supabase.from('tasks').insert([task])
      if (error) throw error

      setNewTask({ title: '', assigned_to: '', assigned_to_name: '', due_date: '', current_status: 'Open' })
      setShowAddTask(false)
      mutateTasks()
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId, status, expectedDate) => {
    try {
      const updates = {
        current_status: status,
        expected_completion_date: expectedDate ? new Date(expectedDate).toISOString() : null
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
      if (error) throw error

      mutateTasks()
    } catch (error) {
      alert(error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200'
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': return <CheckCircle className="w-4 h-4" />
      case 'in progress': return <Loader className="w-4 h-4" />
      case 'blocked': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-semibold text-water-800 mb-4">Add New Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-water-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-water-700 mb-2">
                  Assign To
                </label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select team member</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-water-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddTask(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={loading || !newTask.title || !newTask.assigned_to}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
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
                onStatusUpdate={updateTaskStatus}
                canEditAll={canEditAllTasks}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, currentUser, userProfile, onStatusUpdate, canEditAll, index }) {
  const [status, setStatus] = useState(task.current_status || 'Open')
  const [expectedDate, setExpectedDate] = useState(
    task.expected_completion_date ? task.expected_completion_date.split('T')[0] : ''
  )
  const [isEditing, setIsEditing] = useState(false)

  const isAssignedUser = currentUser.id === task.assigned_to
  const canEdit = isAssignedUser || canEditAll

  const handleSave = () => {
    onStatusUpdate(task.id, status, expectedDate)
    setIsEditing(false)
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.current_status !== 'Done'

  return (
    <div 
      className={`glass-card p-4 hover:scale-[1.02] transition-all duration-200 ${
        isOverdue ? 'border-l-4 border-red-400' : ''
      } animate-slide-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-water-800 text-lg">
            {task.title || 'Untitled Task'}
          </h4>
          <div className="flex items-center space-x-4 mt-2 text-sm text-water-600">
            <span className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>Assigned to: {task.assigned_to_name}</span>
            </span>
            <span className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>By: {task.assigned_by_name}</span>
            </span>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-1 ${
          task.current_status ? getStatusColor(task.current_status) : 'bg-gray-100 text-gray-800'
        }`}>
          {getStatusIcon(task.current_status)}
          <span>{task.current_status || 'Open'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
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

      {canEdit && (
        <div className="border-t border-water-100 pt-4">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-water-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-water-600 mb-1">Expected Completion</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              
              <div className="flex space-x-2">
                <button onClick={handleSave} className="btn-primary text-sm">
                  Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-sm"
            >
              {isAssignedUser ? 'Update Status' : 'Edit Task'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

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