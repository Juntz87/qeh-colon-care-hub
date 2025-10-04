'use client'
import {useEffect, useState} from 'react'
import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'
export default function NavBar(){
  const [theme, setTheme] = useState('light')
  useEffect(() => {
    const saved = localStorage.getItem('qeh_theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const init = saved || (prefersDark ? 'dark' : 'light')
    setTheme(init)
    document.documentElement.classList.toggle('dark', init === 'dark')
  },[])
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('qeh_theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }
  return (
    <header className="bg-gradient-to-r from-qehNavy to-qehBlue text-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/"><span className="font-semibold text-lg">Colon Care Hub</span></Link>
          <nav className="hidden md:flex gap-4 ml-6 items-center">
            <Link href="/medical-officers"><span className="hover:underline">Medical Officers</span></Link>
            <Link href="/patients"><span className="hover:underline">Patient Education</span></Link>
            <Link href="/counselling"><span className="hover:underline">Counselling</span></Link>
            <Link href="/support"><span className="hover:underline">Support</span></Link>
            <Link href="/contact"><span className="hover:underline">Contact</span></Link>
            <Link href="/team"><span className="hover:underline">Meet Our Team</span></Link>
            <Link href="/clinic-updates"><span className="hover:underline">Clinic Updates</span></Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} aria-label="Toggle theme" className="p-2 rounded-md hover:bg-white/10">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
