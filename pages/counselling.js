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
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
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

  const active = tabs.find(t => t.id === activeTab)

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <h1 className="text-2xl font-semibold mb-4">Counselling</h1>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : tabs.length === 0 ? (
          <div className="text-gray-500">No counselling materials available yet.</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    activeTab === tab.id
                      ? 'bg-qehBlue text-white border-qehBlue'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            {active && (
              <div className="mt-6">
                {active.imageUrl && (
                  <img
                    src={active.imageUrl}
                    alt={active.title}
                    className="w-full max-h-96 object-contain rounded-lg mb-4"
                  />
                )}
                <div
                  className="prose dark:prose-invert max-w-none"
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