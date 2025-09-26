import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-waterblue-light text-gray-900">
      <header className="p-4 bg-waterblue text-white">
        <h1 className="text-2xl font-bold">MPJNPMU Team Portal</h1>
        <nav className="mt-2 space-x-4">
          <Link href="/tasks">Task Tracker</Link>
          <Link href="/profile">User Profile</Link>
          <Link href="/admin">Admin Panel</Link>
        </nav>
      </header>
      <main className="p-6">
        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
        <p>✅ This is your landing page. It will show team member details, status, etc. (to be connected with Supabase).</p>
      </main>
    </div>
  )
}