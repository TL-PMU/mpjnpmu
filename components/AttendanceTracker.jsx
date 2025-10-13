import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, CheckCircle, XCircle, Clock, Download, Users, TrendingUp } from 'lucide-react'

export default function AttendanceTracker({ currentUser, userProfile }) {
  const [todayStatus, setTodayStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState([])

  const isAdmin = userProfile?.role === 'admin'

  useEffect(() => {
    if (currentUser) {
      loadTodayAttendance()
      loadAttendanceHistory()
      loadMonthlyStats()
    }
  }, [currentUser, selectedMonth, selectedYear])

  const loadTodayAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setTodayStatus(data?.status || 'Absent')
    } catch (error) {
      console.error('Error loading today attendance:', error)
      setTodayStatus('Absent')
    }
  }

  const loadAttendanceHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_attendance_history', {
        user_id_param: currentUser.id,
        days_back: 30
      })

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const loadMonthlyStats = async () => {
    try {
      if (isAdmin) {
        const { data, error } = await supabase.rpc('get_monthly_attendance_summary', {
          month_param: selectedMonth,
          year_param: selectedYear
        })

        if (error) throw error
        setMonthlyData(data || [])
      } else {
        // Calculate personal stats
        const startDate = new Date(selectedYear, selectedMonth - 1, 1)
        const endDate = new Date(selectedYear, selectedMonth, 0)

        const { data, error } = await supabase
          .from('daily_attendance')
          .select('status')
          .eq('user_id', currentUser.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])

        if (error) throw error

        const presentDays = data?.filter(d => d.status === 'Present' || d.status === 'WFH').length || 0
        const totalDays = data?.length || 0
        const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0

        setStats({
          total_days: totalDays,
          present_days: data?.filter(d => d.status === 'Present').length || 0,
          absent_days: data?.filter(d => d.status === 'Absent').length || 0,
          leave_days: data?.filter(d => d.status === 'Leave').length || 0,
          wfh_days: data?.filter(d => d.status === 'WFH').length || 0,
          attendance_percentage: percentage
        })
      }
    } catch (error) {
      console.error('Error loading monthly stats:', error)
    }
  }

  const markAttendance = async (status, remarks = '') => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('mark_attendance', {
        user_id_param: currentUser.id,
        user_name_param: userProfile?.full_name || currentUser.email,
        status_param: status,
        remarks_param: remarks || null
      })

      if (error) throw error

      setTodayStatus(status)
      loadAttendanceHistory()
      loadMonthlyStats()
    } catch (error) {
      alert('Error marking attendance: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadMonthlyReport = async () => {
    try {
      let dataToDownload = []

      if (isAdmin) {
        dataToDownload = monthlyData
      } else {
        const startDate = new Date(selectedYear, selectedMonth - 1, 1)
        const endDate = new Date(selectedYear, selectedMonth, 0)

        const { data, error } = await supabase
          .from('daily_attendance')
          .select('date, status, remarks')
          .eq('user_id', currentUser.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: false })

        if (error) throw error
        dataToDownload = data
      }

      // Convert to CSV
      const csv = convertToCSV(dataToDownload, isAdmin)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${selectedYear}_${selectedMonth}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Error downloading report: ' + error.message)
    }
  }

  const convertToCSV = (data, isAdminReport) => {
    if (isAdminReport) {
      const headers = ['User Name', 'Total Days', 'Present', 'Absent', 'Leave', 'WFH', 'Attendance %']
      const rows = data.map(d => [
        d.user_name,
        d.total_days,
        d.present_days,
        d.absent_days,
        d.leave_days,
        d.wfh_days,
        d.attendance_percentage
      ])
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    } else {
      const headers = ['Date', 'Status', 'Remarks']
      const rows = data.map(d => [
        d.date,
        d.status,
        d.remarks || ''
      ])
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 border-green-200'
      case 'Absent': return 'bg-red-100 text-red-800 border-red-200'
      case 'Leave': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'WFH': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Holiday': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckCircle className="w-4 h-4" />
      case 'Absent': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (!currentUser) {
    return (
      <div className="glass-card p-8 text-center">
        <Calendar className="w-16 h-16 text-water-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-water-700 mb-2">Authentication Required</h3>
        <p className="text-water-600">Please sign in to view attendance.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Today's Attendance Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-water-600" />
            <div>
              <h2 className="text-xl font-bold text-water-800">Today's Attendance</h2>
              <p className="text-sm text-water-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-lg font-medium border flex items-center space-x-2 ${getStatusColor(todayStatus)}`}>
            {getStatusIcon(todayStatus)}
            <span>{todayStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => markAttendance('Present')}
            disabled={loading}
            className={`btn-primary text-sm ${todayStatus === 'Present' ? 'opacity-100' : 'opacity-70'}`}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Present
          </button>
          <button
            onClick={() => markAttendance('WFH')}
            disabled={loading}
            className={`btn-secondary text-sm ${todayStatus === 'WFH' ? 'bg-blue-100' : ''}`}
          >
            🏠 WFH
          </button>
          <button
            onClick={() => markAttendance('Leave')}
            disabled={loading}
            className={`btn-secondary text-sm ${todayStatus === 'Leave' ? 'bg-yellow-100' : ''}`}
          >
            📅 Leave
          </button>
          <button
            onClick={() => markAttendance('Holiday')}
            disabled={loading}
            className={`btn-secondary text-sm ${todayStatus === 'Holiday' ? 'bg-purple-100' : ''}`}
          >
            🎉 Holiday
          </button>
          <button
            onClick={() => markAttendance('Absent')}
            disabled={loading}
            className={`btn-secondary text-sm ${todayStatus === 'Absent' ? 'bg-red-100' : ''}`}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Absent
          </button>
        </div>

        <p className="text-xs text-water-600 mt-3">
          💡 Mark your attendance daily. Status resets every day.
        </p>
      </div>

      {/* Monthly Stats */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-water-800">Monthly Statistics</h3>
          <div className="flex items-center space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input-field text-sm"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('en', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input-field text-sm"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={downloadMonthlyReport}
              className="btn-secondary text-sm"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isAdmin && stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-water-700">{stats.total_days}</div>
              <div className="text-xs text-water-600">Total Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.present_days}</div>
              <div className="text-xs text-water-600">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.absent_days}</div>
              <div className="text-xs text-water-600">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.leave_days}</div>
              <div className="text-xs text-water-600">Leave</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.wfh_days}</div>
              <div className="text-xs text-water-600">WFH</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.attendance_percentage}%</div>
              <div className="text-xs text-water-600">Attendance</div>
            </div>
          </div>
        )}

        {isAdmin && monthlyData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-water-200">
                  <th className="text-left p-2">Name</th>
                  <th className="text-center p-2">Total</th>
                  <th className="text-center p-2">Present</th>
                  <th className="text-center p-2">Absent</th>
                  <th className="text-center p-2">Leave</th>
                  <th className="text-center p-2">WFH</th>
                  <th className="text-center p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((user, idx) => (
                  <tr key={idx} className="border-b border-water-100">
                    <td className="p-2">{user.user_name}</td>
                    <td className="text-center p-2">{user.total_days}</td>
                    <td className="text-center p-2 text-green-600">{user.present_days}</td>
                    <td className="text-center p-2 text-red-600">{user.absent_days}</td>
                    <td className="text-center p-2 text-yellow-600">{user.leave_days}</td>
                    <td className="text-center p-2 text-blue-600">{user.wfh_days}</td>
                    <td className="text-center p-2 font-semibold">{user.attendance_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-water-800 mb-4">Attendance History (Last 30 Days)</h3>
        
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-water-300 mx-auto mb-2" />
            <p className="text-water-600">No attendance history yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((record, idx) => (
              <div key={idx} className="glass-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-water-800">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                </div>
                {record.marked_at && (
                  <p className="text-xs text-water-600">
                    Marked at: {new Date(record.marked_at).toLocaleTimeString()}
                  </p>
                )}
                {record.remarks && (
                  <p className="text-xs text-water-600 mt-1">
                    Note: {record.remarks}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}