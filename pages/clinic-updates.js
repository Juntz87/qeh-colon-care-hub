// pages/clinic-updates.js
'use client'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import dynamic from 'next/dynamic'
import { collection, getDocs } from 'firebase/firestore'
import { db, auth } from '../lib/firebaseClient'
import { onAuthStateChanged } from 'firebase/auth'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function ClinicUpdatesPublic() {
  const [signedIn, setSignedIn] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [updates, setUpdates] = useState([])
  const [activeCategory, setActiveCategory] = useState('MDT')
  const [activeDateKey, setActiveDateKey] = useState(null)
  const categories = ['MDT', 'Scan', 'Social Welfare', 'Case Discussion']

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setSignedIn(Boolean(u))
      setLoadingAuth(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'clinic_updates'))
        const data = snap.docs.map((d) => {
          const raw = d.data()
          const dateObj = raw.date?.seconds ? new Date(raw.date.seconds * 1000) : raw.date ? new Date(raw.date) : new Date()
          return {
            id: d.id,
            ...raw,
            date: dateObj,
            // ensure referred is boolean (Social Welfare)
            referred: typeof raw.referred === 'boolean' ? raw.referred : false,
          }
        })
        // newest first
        const sorted = data.sort((a, b) => b.date - a.date)
        setUpdates(sorted)
        // set default dateKey for the default category
        const firstInCategory = sorted.find((u) => u.category === activeCategory)
        if (firstInCategory) {
          setActiveDateKey(dateKeyFromDate(firstInCategory.date))
        } else {
          setActiveDateKey(null)
        }
      } catch (e) {
        console.error('Load clinic updates error', e)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dateKeyFromDate = (d) => {
    if (!d) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const grouped = categories.reduce((acc, cat) => {
    const items = updates.filter((u) => u.category === cat)
    const byDate = items.reduce((b, item) => {
      const key = dateKeyFromDate(item.date)
      if (!b[key]) b[key] = []
      b[key].push(item)
      return b
    }, {})
    const dateGroups = Object.keys(byDate)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((k) => ({
        dateKey: k,
        dateObj: new Date(k + 'T00:00:00'),
        items: byDate[k].sort((a, b) => b.date - a.date),
      }))
    acc[cat] = dateGroups
    return acc
  }, {})

  useEffect(() => {
    const groups = grouped[activeCategory] || []
    if (groups.length > 0) {
      setActiveDateKey(groups[0].dateKey)
    } else {
      setActiveDateKey(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, updates])

  if (loadingAuth) return <Layout><div className="p-6">Checking sign-in...</div></Layout>
  if (!signedIn)
    return (
      <Layout>
        <div className="py-24 text-center text-gray-600 dark:text-gray-300">
          This page is private. Please sign in to view Clinic Updates.
        </div>
      </Layout>
    )

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white mb-6">Clinic Updates</h1>

        <div className="flex gap-3 mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeCategory === c ? 'bg-qehNavy text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(grouped[activeCategory] || []).map((g) => (
            <button
              key={g.dateKey}
              onClick={() => setActiveDateKey(g.dateKey)}
              className={`px-3 py-1 rounded text-sm transition ${
                activeDateKey === g.dateKey ? 'bg-qehBlue text-white' : 'bg-transparent text-gray-600 dark:text-gray-300'
              }`}
            >
              {g.dateObj.toLocaleDateString?.('en-MY', { dateStyle: 'medium' })}
            </button>
          ))}
          {(grouped[activeCategory] || []).length === 0 && (
            <div className="text-sm text-gray-500">No updates in this category.</div>
          )}
        </div>

        <div className="space-y-4">
          {((grouped[activeCategory] || []).find((g) => g.dateKey === activeDateKey) || { items: [] }).items.map((u) => {
            // title fallback logic: prefer title, then name, else 'Untitled'
            const displayTitle = u.title?.trim() ? u.title : (u.name?.trim() ? u.name : 'Untitled')
            return (
              <article key={u.id} className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-qehNavy dark:text-white">{displayTitle}</h2>
                      {u.category === 'Social Welfare' && (
                        u.referred ? <span className="text-green-600">✅</span> : <span className="text-yellow-500">⚠️ Pending</span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {u.category} • {u.date?.toLocaleString?.('en-MY', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>

                    {/* show the new fields if present */}
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {u.name && <><strong>Name:</strong> {u.name}</>} {u.ic && <>&nbsp; • &nbsp;<strong>IC:</strong> {u.ic}</>} <br />
                      {u.diagnosis && <><strong>Diagnosis:</strong> {u.diagnosis}</>} {u.listedBy && <>&nbsp; • &nbsp;<strong>Listed by:</strong> {u.listedBy}</>}
                    </div>

                    <div className="mt-2 text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: u.body || u.content || '' }} />

                    {u.imageUrl && (
                      <div className="mt-3">
                        <a href={u.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img className="w-48 h-36 object-cover rounded shadow hover:opacity-90 cursor-pointer" src={u.imageUrl} alt={displayTitle} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}