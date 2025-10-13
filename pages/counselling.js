'use client'

import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { motion } from 'framer-motion'
import { db } from '../lib/firebaseClient'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

export default function Counselling() {
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTabs() {
      try {
        const q = query(collection(db, 'counselling_tabs'), orderBy('order', 'asc'))
        const snap = await getDocs(q)
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setTabs(data)
        setActiveTab(data[0]?.id || null)
      } catch (err) {
        console.error('Error fetching counselling tabs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTabs()
  }, [])

  const active = tabs.find((t) => t.id === activeTab)

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 transition-colors duration-300"
      >
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white mb-4">
          Counselling
        </h1>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : tabs.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-400">
            No counselling materials available yet.
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md transition-all ${
                    activeTab === tab.id
                      ? 'bg-qehBlue text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            {active && (
              <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-6">
                {active.imageUrl && (
                  <a
                    href={active.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={active.imageUrl}
                      alt={active.title}
                      className="w-full max-h-96 object-contain rounded-lg mb-4 cursor-pointer hover:opacity-90"
                    />
                  </a>
                )}
                <div
                  className="prose max-w-none dark:prose-invert text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: active.content }}
                />
              </div>
            )}
          </>
        )}
      </motion.div>
    </Layout>
  )
}