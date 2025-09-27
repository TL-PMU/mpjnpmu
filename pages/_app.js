import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function App({ Component, pageProps }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simple session initialization
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        // Session is handled in individual components
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle auth state changes globally if needed
      if (event === 'SIGNED_IN') {
        // User signed in
      } else if (event === 'SIGNED_OUT') {
        // User signed out
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-50 to-ocean-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-water-500 to-ocean-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <h1 className="text-xl font-bold text-water-800 mb-2">MPJNPMU Portal</h1>
          <p className="text-water-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <Component {...pageProps} />
}