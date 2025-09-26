import { useState, useEffect } from 'react'
<div className="mx-auto container px-4">
<header className="flex items-center justify-between mb-6">
<h1 className="text-2xl font-semibold text-water-700">MPJNPMU Team Portal</h1>
<nav className="space-x-2">
<button onClick={() => setTab('home')} className="px-3 py-1 rounded-md bg-water-100">Home</button>
<button onClick={() => setTab('tasks')} className="px-3 py-1 rounded-md bg-water-100">Task Tracker</button>
<button onClick={() => setTab('profile')} className="px-3 py-1 rounded-md bg-water-100">User Profile</button>
</nav>
</header>


{tab === 'home' && (
<div>
<section className="mb-6">
<h2 className="text-xl font-medium mb-3">Team Members</h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{members?.map(m => (
<div key={m.id} className="p-4 rounded-lg shadow-sm bg-white">
<div className="flex items-center justify-between">
<div>
<div className="font-semibold">{m.full_name || m.email}</div>
<div className="text-sm text-gray-600">{m.designation || '—'}</div>
<div className="text-sm text-gray-600">{m.phone || '—'}</div>
</div>
<div>
<span className={`px-2 py-1 rounded-full text-sm ${m.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
{m.present ? 'Present' : 'Absent'}
</span>
</div>
</div>
<div className="mt-3 text-sm text-gray-500">Updated at: {m.updated_at ? new Date(m.updated_at).toLocaleString() : '—'}</div>
</div>
))}
</div>
</section>


<section>
<h3 className="text-lg font-medium mb-2">Admin Panel</h3>
<AdminPanel currentUser={user} />
</section>
</div>
)}


{tab === 'tasks' && (
<TaskTracker currentUser={user} />
)}


{tab === 'profile' && (
<UserProfile currentUser={user} />
)}


</div>
</div>
)
}