'use client'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import dynamic from 'next/dynamic'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage, auth } from '../../lib/firebaseClient'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function ClinicUpdatesAdmin() {
  const [updates, setUpdates] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('MDT')
  const [imageFile, setImageFile] = useState(null)
  const [imageUrlPreview, setImageUrlPreview] = useState(null)
  const [referred, setReferred] = useState(false)

  // new fields
  const [name, setName] = useState('')
  const [ic, setIC] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [listedBy, setListedBy] = useState('')

  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeCategory, setActiveCategory] = useState('MDT')
  const [activeDateKey, setActiveDateKey] = useState(null)
  const categories = ['MDT', 'Scan', 'Social Welfare', 'Case Discussion']

  // auth + role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const token = await getIdTokenResult(u)
        setRole(token.claims?.role || 'public')
      } else {
        setRole('public')
      }
    })
    return () => unsub()
  }, [])

  // load updates
  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'clinic_updates'), orderBy('date', 'desc'))
        const snap = await getDocs(q)
        const data = snap.docs.map((d) => {
          const raw = d.data()
          const dateObj = raw.date?.seconds ? new Date(raw.date.seconds * 1000) : new Date(raw.date || Date.now())
          return { id: d.id, ...raw, date: dateObj }
        })
        setUpdates(data)
        const first = data.find((u) => u.category === activeCategory)
        if (first) setActiveDateKey(dateKeyFromDate(first.date))
      } catch (e) {
        console.error('Load admin clinic updates error', e)
      }
    }
    load()
  }, [activeCategory])

  const dateKeyFromDate = (d) => {
    if (!d) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const uploadImageFile = async (file) => {
    if (!file) return null
    const storageRef = ref(storage, `clinic-updates/${file.name}-${Date.now()}`)
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      // upload image (if selected)
      const uploadedUrl = imageFile ? await uploadImageFile(imageFile) : imageUrlPreview || null

      // prepare base data (common fields)
      const baseData = {
        title,
        body,
        category,
        name,
        ic,
        diagnosis,
        listedBy,
        referred: category === 'Social Welfare' ? referred : false,
        imageUrl: uploadedUrl || null,
      }

      if (editingId) {
        // ------- EDITING: preserve original date, set updatedAt only -------
        await updateDoc(doc(db, 'clinic_updates', editingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        })
      } else {
        // ------- NEW ENTRY: set date on creation -------
        await addDoc(collection(db, 'clinic_updates'), {
          ...baseData,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
      }

      // reset form
      setTitle('')
      setBody('')
      setCategory('MDT')
      setImageFile(null)
      setImageUrlPreview(null)
      setReferred(false)
      setName('')
      setIC('')
      setDiagnosis('')
      setListedBy('')
      setEditingId(null)
      setShowForm(false)

      // reload list (keep ordering by date desc)
      const snap = await getDocs(query(collection(db, 'clinic_updates'), orderBy('date', 'desc')))
      const list = snap.docs.map((d) => {
        const raw = d.data()
        const dateObj = raw.date?.seconds ? new Date(raw.date.seconds * 1000) : new Date(raw.date || Date.now())
        return { id: d.id, ...raw, date: dateObj }
      })
      setUpdates(list)
    } catch (e) {
      console.error('Save clinic update error', e)
    }
  }

  const handleEdit = (u) => {
    setEditingId(u.id)
    setTitle(u.title || '')
    setBody(u.body || '')
    setCategory(u.category || 'MDT')
    setName(u.name || '')
    setIC(u.ic || '')
    setDiagnosis(u.diagnosis || '')
    setListedBy(u.listedBy || '')
    setReferred(Boolean(u.referred))
    setImageUrlPreview(u.imageUrl || null)
    setShowForm(true)
    // smooth scroll to top where the form is
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this update?')) return
    await deleteDoc(doc(db, 'clinic_updates', id))
    setUpdates(updates.filter((u) => u.id !== id))
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
      .map((k) => ({ dateKey: k, dateObj: new Date(k + 'T00:00:00'), items: byDate[k].sort((a, b) => b.date - a.date) }))
    acc[cat] = dateGroups
    return acc
  }, {})

  if (role === null) return <Layout><div className="p-6">Loading...</div></Layout>
  if (!['master', 'officer'].includes(role))
    return (
      <Layout>
        <div className="text-center py-24 text-gray-600 dark:text-gray-300">
          Access denied — master or officer role required.
        </div>
      </Layout>
    )

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
            Clinic Updates <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (showForm) {
                setEditingId(null)
                setTitle('')
                setBody('')
                setCategory('MDT')
                setImageFile(null)
                setImageUrlPreview(null)
                setReferred(false)
                setName('')
                setIC('')
                setDiagnosis('')
                setListedBy('')
              }
            }}
            className={`px-4 py-2 rounded text-white transition ${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-qehBlue hover:bg-qehNavy'}`}
          >
            {showForm ? 'Cancel' : 'New Update'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSave} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-8">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
            <input type="text" value={ic} onChange={(e) => setIC(e.target.value)} placeholder="IC" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
            <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
            <input type="text" value={listedBy} onChange={(e) => setListedBy(e.target.value)} placeholder="Listed By" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />

            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>

            {category === 'Social Welfare' && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={referred} onChange={(e) => setReferred(e.target.checked)} />
                <span className="text-sm">Referred to Welfare</span>
              </label>
            )}

            <ReactQuill theme="snow" value={body} onChange={setBody} />
            <input type="file" onChange={(e) => setImageFile(e.target.files[0])} accept="image/*" />

            {imageUrlPreview && (
              <div className="relative mt-2">
                <img src={imageUrlPreview} alt="" className="w-32 h-32 object-cover rounded" />
                <button type="button" onClick={() => { setImageUrlPreview(null); setImageFile(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full px-2 text-xs">✕</button>
              </div>
            )}

            <button type="submit" className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded">
              {editingId ? 'Update Entry' : 'Submit Update'}
            </button>
          </form>
        )}

        {/* Category Tabs */}
        <div className="flex gap-3 mb-4">
          {categories.map((c) => (
            <button key={c} onClick={() => { setActiveCategory(c); const first = grouped[c]?.[0]; setActiveDateKey(first?.dateKey || null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeCategory === c ? 'bg-qehNavy text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Date Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(grouped[activeCategory] || []).map((g) => (
            <button key={g.dateKey} onClick={() => setActiveDateKey(g.dateKey)} className={`px-3 py-1 rounded text-sm transition ${activeDateKey === g.dateKey ? 'bg-qehBlue text-white' : 'bg-transparent text-gray-600 dark:text-gray-300'}`}>
              {g.dateObj.toLocaleDateString?.('en-MY', { dateStyle: 'medium' })}
            </button>
          ))}
          {(grouped[activeCategory] || []).length === 0 && <div className="text-sm text-gray-500">No updates in this category.</div>}
        </div>

        {/* Items under selected date */}
        <div className="space-y-4">
          {((grouped[activeCategory] || []).find((g) => g.dateKey === activeDateKey) || { items: [] }).items.map((u) => (
            <div key={u.id} className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm flex justify-between">
              <div>
                <div className="font-semibold text-qehNavy dark:text-white flex items-center gap-2">
                  {u.title || (u.name ? u.name : 'Untitled')}
                  {u.category === 'Social Welfare' && (u.referred ? <span className="text-green-600">✅</span> : <span className="text-yellow-500">⚠️ Pending</span>)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{u.category} • {u.date?.toLocaleString?.()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {u.name && <>👤 {u.name}</>} {u.ic && <> • {u.ic}</>} <br />
                  {u.diagnosis && <>💊 {u.diagnosis}</>} {u.listedBy && <> • Listed by: {u.listedBy}</>}
                </div>
                <div className="mt-2 text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: u.body }} />
                {u.imageUrl && (
                  <a href={u.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={u.imageUrl} alt="" className="mt-3 rounded-lg shadow w-48 cursor-pointer hover:opacity-80" />
                  </a>
                )}
              </div>

              <div className="flex gap-2 items-start">
                <button onClick={() => handleEdit(u)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm">Edit</button>
                <button onClick={() => handleDelete(u.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}