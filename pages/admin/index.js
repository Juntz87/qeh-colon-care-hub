import { useRef } from "react";
import { scrollToForm } from "../../lib/scrollToForm";
// pages/admin/index.js
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { motion } from 'framer-motion'
import { auth } from '../../lib/firebaseClient'
import { onAuthStateChanged, getIdTokenResult, signOut } from 'firebase/auth'

export default function AdminDashboard() {
  const formRef = useRef(null);

  const [user, setUser] = useState(null)
  const [role, setRole] = useState('public')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null)
        setRole('public')
        setLoading(false)
        return
      }
      setUser(u)
      const token = await getIdTokenResult(u)
      const userRole = token.claims?.role?.toLowerCase() || 'public'
      setRole(userRole)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <p className="text-gray-600 dark:text-gray-300">Loading admin dashboard...</p>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <p className="text-gray-600 dark:text-gray-300">Please sign in to access the admin panel.</p>
        </div>
      </Layout>
    )
  }

  if (role !== 'master') {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <p className="text-red-600 dark:text-red-400 font-semibold">
            Access denied — Master role required.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md"
      >
        <h1 className="text-2xl font-bold text-center text-qehNavy dark:text-white mb-8">
          Admin Control Panel
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          Welcome, {user.displayName || 'Admin'} — manage your content below.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { href: '/admin/clinic-updates', label: 'Clinic Updates' },
            { href: '/admin/patients', label: 'Patient Education' },
            { href: '/admin/counselling', label: 'Counselling' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/team', label: 'Team' },
            { href: '/admin/officers-resources', label: 'Officers Resources' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="p-6 text-center bg-gradient-to-r from-qehBlue to-qehNavy text-white rounded-lg shadow hover:opacity-90 transition cursor-pointer">
                <h2 className="font-semibold">{item.label}</h2>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </Layout>
  )
}