import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, CheckSquare, User, LogOut, Settings, Menu, X, Bell, Calendar, ChevronRight, Eye, Pin } from 'lucide-react'
import useSWR from 'swr'

// Components
import AuthForm from '../components/AuthForm'
import TaskTracker from '../components/TaskTracker'
import UserProfile from '../components/UserProfile'
import AdminPanel from '../components/AdminPanel'
import Notices from '../components/Notices'
import AttendanceTracker from '../components/AttendanceTracker'

const fetcher = async (query) => {
  const { data, error } = await supabase.from(query.table).select(query.select)
  if (error) throw error
  return data
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedNotice, setSelectedNotice] = useState(null)

  // Fetch team members
  const { data: members, error: membersError, mutate: mutateMembers } = useSWR(
    { table: 'profiles', select: '*' }, 
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch notices
  const { data: notices } = useSWR(
    { table: 'notices_view', select: '*' },
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch user's tasks
  const { data: allTasks } = useSWR(
    user ? { table: 'tasks', select: '*' } : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    setUserProfile(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setActiveTab('home')
    setMobileMenuOpen(false)
  }

  const tabs = [
    { id: 'home', label: 'Home', icon: Users },
    { id: 'tasks', label: 'Task Tracker', icon: CheckSquare },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'profile', label: 'User Profile', icon: User },
    ...(userProfile?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Settings }] : [])
  ]

  // Get latest notice (pinned first, then by date)
  const latestNotice = notices?.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.published_at) - new Date(a.published_at)
  })[0]

  // Get user's pending tasks
  const myPendingTasks = allTasks?.filter(task => {
    // Check if user is assigned to this task
    const isAssigned = task.assigned_to === user?.id
    // Check if task is not done
    const isPending = task.current_status !== 'Done'
    return isAssigned && isPending
  }) || []

  const incrementNoticeView = async (noticeId) => {
    try {
      await supabase.rpc('increment_notice_views', { notice_id_param: noticeId })
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const getVideoEmbedUrl = (url) => {
    if (!url) return null
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-water-200 border-t-water-600 mx-auto mb-4"></div>
          <p className="text-water-600 font-medium">Loading MPJNPMU Portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card m-4 mb-6 sticky top-4 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-water-500 to-ocean-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-water-800 text-shadow">MPJNPMU</h1>
                <p className="text-sm text-water-600">Team Portal</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={isActive ? 'nav-tab-active' : 'nav-tab'}
                  >
                    <Icon className="w-4 h-4 mr-2 inline" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center space-x-3">
              {user ? (
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-water-800">
                      {userProfile?.full_name || user.email}
                    </p>
                    <p className="text-xs text-water-600">
                      {userProfile?.role || 'Member'}
                    </p>
                  </div>
                  <button onClick={handleSignOut} className="btn-secondary">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAuth(true)} className="btn-primary">
                  Sign In
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden btn-secondary p-2"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-water-200 animate-slide-up">
              <div className="grid grid-cols-2 gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`${isActive ? 'nav-tab-active' : 'nav-tab'} text-sm`}
                    >
                      <Icon className="w-4 h-4 mr-2 inline" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              
              {user && (
                <div className="mt-4 pt-4 border-t border-water-200 sm:hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-water-800">
                        {userProfile?.full_name || user.email}
                      </p>
                      <p className="text-xs text-water-600">
                        {userProfile?.role || 'Member'}
                      </p>
                    </div>
                    <button onClick={handleSignOut} className="btn-secondary text-sm">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-4 pb-8">
        {/* Home Tab with Sidebars */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
            {/* Left Sidebar - Notices */}
            <div className="lg:col-span-1 space-y-6">
              {/* Notices List */}
              <div className="glass-card p-4 sticky top-24">
                <div className="flex items-center space-x-2 mb-4">
                  <Bell className="w-5 h-5 text-water-600" />
                  <h3 className="font-semibold text-water-800">Recent Notices</h3>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {notices?.slice(0, 10).map((notice) => (
                    <button
                      key={notice.id}
                      onClick={() => {
                        setSelectedNotice(notice)
                        incrementNoticeView(notice.id)
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-water-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {notice.is_pinned && (
                            <Pin className="w-3 h-3 text-yellow-600 inline mr-1" />
                          )}
                          <p className="text-sm font-medium text-water-800 line-clamp-2 group-hover:text-water-900">
                            {notice.title}
                          </p>
                          <p className="text-xs text-water-600 mt-1">
                            {new Date(notice.published_at).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-water-400 flex-shrink-0 ml-2 group-hover:text-water-600" />
                      </div>
                    </button>
                  ))}
                  {(!notices || notices.length === 0) && (
                    <p className="text-sm text-water-600 text-center py-4">No notices yet</p>
                  )}
                </div>
              </div>

              {/* My Pending Tasks */}
              {user && (
                <div className="glass-card p-4 sticky top-24">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckSquare className="w-5 h-5 text-water-600" />
                    <h3 className="font-semibold text-water-800">My Pending Tasks</h3>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {myPendingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-water-50/50 hover:bg-water-100/50 transition-colors cursor-pointer"
                        onClick={() => setActiveTab('tasks')}
                      >
                        <p className="text-sm font-medium text-water-800 line-clamp-2">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.current_status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            task.current_status === 'Blocked' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.current_status}
                          </span>
                          {task.due_date && (
                            <span className="text-xs text-water-600">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {myPendingTasks.length === 0 && (
                      <p className="text-sm text-water-600 text-center py-4">No pending tasks</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Center Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Latest Notice Display */}
              {latestNotice && (
                <div className="glass-card p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Bell className="w-5 h-5 text-water-600" />
                    <h3 className="font-semibold text-water-800">Latest Notice</h3>
                    {latestNotice.is_pinned && (
                      <Pin className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-water-800 mb-2">{latestNotice.title}</h2>
                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      {latestNotice.category_name && (
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: latestNotice.category_color }}
                        >
                          {latestNotice.category_icon} {latestNotice.category_name}
                        </span>
                      )}
                      {latestNotice.tags?.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-water-600 mb-4">
                      <span className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{latestNotice.view_count || 0} views</span>
                      </span>
                      <span>By {latestNotice.author_name}</span>
                      <span>{new Date(latestNotice.published_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="prose max-w-none">
                    <div
                      className="text-water-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: latestNotice.content }}
                    />
                  </div>

                  {latestNotice.image_url && (
                    <div className="mt-4">
                      <img
                        src={latestNotice.image_url}
                        alt={latestNotice.title}
                        className="w-full rounded-lg shadow-lg"
                      />
                    </div>
                  )}

                  {latestNotice.video_url && getVideoEmbedUrl(latestNotice.video_url) && (
                    <div className="mt-4">
                      <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                        <iframe
                          src={getVideoEmbedUrl(latestNotice.video_url)}
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Members Section */}
              <section className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-water-600" />
                    <h2 className="text-xl font-semibold text-water-800">Team Members</h2>
                  </div>
                  <button
                    onClick={() => mutateMembers()}
                    className="btn-secondary text-sm"
                  >
                    Refresh
                  </button>
                </div>

                {membersError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600">Error loading team members</p>
                  </div>
                ) : !members ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-water-100 rounded-lg"></div>
                      ))}
                    </div>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-water-300 mx-auto mb-4" />
                    <p className="text-water-600">No team members found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map((member, index) => (
                      <div
                        key={member.id}
                        className="glass-card p-4 hover:scale-105 transition-transform duration-200"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-water-800 text-lg">
                              {member.full_name || member.email || 'Unknown User'}
                            </h3>
                            <p className="text-water-600 text-sm">
                              {member.designation || 'No designation set'}
                            </p>
                            <p className="text-water-600 text-sm">
                              📞 {member.phone || 'No phone set'}
                            </p>
                            {member.role === 'admin' && (
                              <span className="inline-block mt-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full">
                                👑 Admin
                              </span>
                            )}
                            {member.role === 'collaborator' && (
                              <span className="inline-block mt-1 px-2 py-1 bg-gradient-to-r from-blue-400 to-blue-500 text-white text-xs rounded-full">
                                👥 Collaborator
                              </span>
                            )}
                            {member.role === 'member' && (
                              <span className="inline-block mt-1 px-2 py-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs rounded-full">
                                👤 Member
                              </span>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            member.present ? 'status-present' : 'status-absent'
                          }`}>
                            {member.present ? '✓ Present' : '✗ Absent'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-water-500 border-t border-water-100 pt-2">
                          Updated: {member.updated_at 
                            ? new Date(member.updated_at).toLocaleString() 
                            : 'Never'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Quick Stats */}
              <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-water-700">
                    {members?.length || 0}
                  </div>
                  <div className="text-sm text-water-600">Total Members</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-ocean-700">
                    {members?.filter(m => m.present).length || 0}
                  </div>
                  <div className="text-sm text-water-600">Present Today</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {members?.filter(m => m.role === 'admin').length || 0}
                  </div>
                  <div className="text-sm text-water-600">Admins</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {members?.filter(m => m.role === 'collaborator').length || 0}
                  </div>
                  <div className="text-sm text-water-600">Collaborators</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {members?.filter(m => m.role === 'member').length || 0}
                  </div>
                  <div className="text-sm text-water-600">Members</div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Task Tracker Tab */}
        {activeTab === 'tasks' && (
          <div className="animate-fade-in">
            <TaskTracker currentUser={user} userProfile={userProfile} />
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="animate-fade-in">
            <AttendanceTracker currentUser={user} userProfile={userProfile} />
          </div>
        )}

        {/* Notices Tab */}
        {activeTab === 'notices' && (
          <div className="animate-fade-in">
            <Notices currentUser={user} userProfile={userProfile} />
          </div>
        )}

        {/* User Profile Tab */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in">
            <UserProfile 
              currentUser={user} 
              userProfile={userProfile} 
              onProfileUpdate={loadUserProfile}
            />
          </div>
        )}

        {/* Admin Panel Tab */}
        {activeTab === 'admin' && userProfile?.role === 'admin' && (
          <div className="animate-fade-in">
            <AdminPanel currentUser={user} />
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuth && (
        <AuthForm onClose={() => setShowAuth(false)} />
      )}

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card p-6 w-full max-w-4xl animate-slide-up my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  {selectedNotice.is_pinned && (
                    <Pin className="w-5 h-5 text-yellow-600" />
                  )}
                  <h2 className="text-3xl font-bold text-water-800">{selectedNotice.title}</h2>
                </div>

                <div className="flex items-center flex-wrap gap-2 mb-4">
                  {selectedNotice.category_name && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: selectedNotice.category_color }}
                    >
                      {selectedNotice.category_icon} {selectedNotice.category_name}
                    </span>
                  )}
                  {selectedNotice.tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-4 text-sm text-water-600 mb-6">
                  <span className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{(selectedNotice.view_count || 0) + 1} views</span>
                  </span>
                  <span>By {selectedNotice.author_name}</span>
                  <span>{new Date(selectedNotice.published_at).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotice(null)}
                className="text-water-400 hover:text-water-600 text-2xl ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="prose max-w-none">
              <div
                className="text-water-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
              />
            </div>

            {selectedNotice.image_url && (
              <div className="mt-6">
                <img
                  src={selectedNotice.image_url}
                  alt={selectedNotice.title}
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            )}

            {selectedNotice.video_url && getVideoEmbedUrl(selectedNotice.video_url) && (
              <div className="mt-6">
                <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                  <iframe
                    src={getVideoEmbedUrl(selectedNotice.video_url)}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}