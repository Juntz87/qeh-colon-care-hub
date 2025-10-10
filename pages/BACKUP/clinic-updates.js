'use client'
import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import useSWR from 'swr'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

const fetcher = async () => {
  const q = query(collection(db, 'clinic_updates'), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.seconds ? new Date(d.data().date.seconds * 1000) : new Date(),
  }))
}

export default function ClinicUpdates() {
  const { data } = useSWR('clinic_updates', fetcher, { revalidateOnFocus: false })
  const updates = data || []

  const [activeCategory, setActiveCategory] = useState('MDT')
  const [activeDate, setActiveDate] = useState(null)

  // 🧠 Group by category
  const groupedByCategory = useMemo(() => {
    const catMap = {}
    for (const u of updates) {
      const cat = u.category || 'Uncategorized'
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(u)
    }
    return catMap
  }, [updates])

  // 🧠 Group the active category updates by date
  const groupedByDate = useMemo(() => {
    const list = groupedByCategory[activeCategory] || []
    const dateMap = {}
    for (const item of list) {
      const dateStr = item.date.toLocaleDateString()
      if (!dateMap[dateStr]) dateMap[dateStr] = []
      dateMap[dateStr].push(item)
    }
    return dateMap
  }, [groupedByCategory, activeCategory])

  const dateTabs = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b) - new Date(a)
  )
  const selectedDate = activeDate || dateTabs[0]

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
          Clinic Updates
        </h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Latest MDTs, upcoming scans, and pending social welfare cases.
        </p>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['MDT', 'Scan', 'Social Welfare', 'Case Discussion'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setActiveDate(null)
              }}
              className={`px-4 py-2 rounded ${
                activeCategory === cat
                  ? 'bg-qehBlue text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Date Tabs */}
        {dateTabs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {dateTabs.map((date) => (
              <button
                key={date}
                onClick={() => setActiveDate(date)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedDate === date
                    ? 'bg-qehNavy text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {date}
              </button>
            ))}
          </div>
        )}

        {/* Updates for selected date */}
        <div className="mt-4 space-y-4">
          {groupedByDate[selectedDate]?.length ? (
            groupedByDate[selectedDate].map((u) => (
              <div
                key={u.id}
                className="p-4 border rounded bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-qehNavy dark:text-white">
                      {u.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {u.category} • {u.date.toLocaleTimeString()}
                    </div>
                  </div>
                  {u.imageUrl && (
                    <img
                      src={u.imageUrl}
                      alt=""
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                </div>
                {u.body && (
                  <div className="mt-2 text-gray-700 dark:text-gray-200">
                    {u.body}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-600 dark:text-gray-300 mt-4">
              No updates for this date.
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}