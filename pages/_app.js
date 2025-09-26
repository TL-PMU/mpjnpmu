import '../styles/globals.css'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'


export default function App({ Component, pageProps }) {
// simple session sync could go here if needed
useEffect(() => {
const { data: sub } = supabase.auth.onAuthStateChange(() => {})
return () => sub?.unsubscribe()
}, [])
return <Component {...pageProps} />
}