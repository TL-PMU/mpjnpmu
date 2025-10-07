import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, CheckSquare, User, LogOut, Settings, Menu, X, Bell } from 'lucide-react'
import useSWR from 'swr'

// Components
import AuthForm from '../components/AuthForm'
import TaskTracker from '../components/TaskTracker'
import UserProfile from '../components/UserProfile'
import AdminPanel from '../components/AdminPanel'
import Notices from '../components/Notices'

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

  // Fetch team members
  const { data: members, error: membersError, mutate: mutateMembers } = useSWR(
    { table: 'profiles', select: '*' }, 
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
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
    { id: 'profile', label: 'User Profile', icon: User },
    ...(userProfile?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Settings }] : [])
  ]

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
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-water-500 to-ocean-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-water-800 text-shadow">MPJNPMU</h1>
                <p className="text-sm text-water-600">Team Portal</p>
              </div>
            </div>

            {/* Desktop Navigation */}
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

            {/* User Actions */}
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
                  <button
                    onClick={handleSignOut}
                    className="btn-secondary"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn-primary"
                >
                  Sign In
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden btn-secondary p-2"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
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
                    <button
                      onClick={handleSignOut}
                      className="btn-secondary text-sm"
                    >
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
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
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
                  <p className="text-sm text-water-500 mt-1">
                    {user ? 'Be the first to update your profile!' : 'Sign in to see team members'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        )}

        {/* Task Tracker Tab */}
        {activeTab === 'tasks' && (
          <div className="animate-fade-in">
            <TaskTracker currentUser={user} userProfile={userProfile} />
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
    </div>
  )
}