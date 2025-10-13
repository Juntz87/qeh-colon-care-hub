'use client'
import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import useSWR from 'swr'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

const fetcher = async () => {
  const q = query(collection(db, 'clinic_updates'), orderBy('date', 'desc'))
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data()
    let parsedDate

    if (data.date?.seconds) parsedDate = new Date(data.date.seconds * 1000)
    else if (typeof data.date === 'string') parsedDate = new Date(data.date)
    else parsedDate = new Date()

    return {
      id: d.id,
      ...data,
      date: parsedDate,
      category: data.category || 'Uncategorized',
      referred: typeof data.referred === 'boolean' ? data.referred : false
    }
  })
}

export default function ClinicUpdates() {
  const { data } = useSWR('clinic_updates', fetcher, { revalidateOnFocus: false })
  const updates = data || []

  const [activeCategory, setActiveCategory] = useState('MDT')
  const [activeDate, setActiveDate] = useState(null)

  // 🧠 Helper to normalize case
  const normalize = (s = '') => s.toLowerCase().trim()

  // Group by category
  const groupedByCategory = useMemo(() => {
    const catMap = {}
    for (const u of updates) {
      const cat = normalize(u.category || 'Uncategorized')
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(u)
    }
    return catMap
  }, [updates])

  // Group active category by date
  const groupedByDate = useMemo(() => {
    const list =
      groupedByCategory[normalize(activeCategory)] ||
      groupedByCategory[activeCategory] ||
      []
    const dateMap = {}
    for (const item of list) {
      const dateStr = item.date ? item.date.toLocaleDateString() : 'Undated'
      if (!dateMap[dateStr]) dateMap[dateStr] = []
      dateMap[dateStr].push(item)
    }
    return dateMap
  }, [groupedByCategory, activeCategory])

  const dateTabs = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b) - new Date(a)
  )
  const selectedDate = activeDate || dateTabs[0]

  // ✅ Status Badge
  const WelfareStatus = ({ referred }) =>
    referred ? (
      <span className="ml-2 text-green-600 text-sm">✅ Referred</span>
    ) : (
      <span className="ml-2 text-yellow-500 text-sm">⚠️ Pending</span>
    )

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
          Clinic Updates
        </h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Latest MDTs, upcoming scans, and welfare follow-ups.
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
                normalize(activeCategory) === normalize(cat)
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

        {/* Updates */}
        <div className="mt-4 space-y-4">
          {groupedByDate[selectedDate]?.length ? (
            groupedByDate[selectedDate].map((u) => (
              <div
                key={u.id}
                className="p-4 border rounded bg-white dark:bg-gray-800"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-qehNavy dark:text-white flex items-center">
                      {u.title}
                      {normalize(u.category) === 'social welfare' && (
                        <WelfareStatus referred={u.referred} />
                      )}
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
                  <div
                    className="mt-2 text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: u.body }}
                  />
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