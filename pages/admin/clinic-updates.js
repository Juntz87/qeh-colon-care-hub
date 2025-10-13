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
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '../../lib/firebaseClient'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function ClinicUpdatesAdmin() {
  const [updates, setUpdates] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('MDT')
  const [image, setImage] = useState(null)
  const [referred, setReferred] = useState(false)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('MDT')
  const [loading, setLoading] = useState(true)

  // 🔐 Authentication
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const token = await getIdTokenResult(u)
        setRole(token.claims?.role || 'public')
      } else {
        setRole('public')
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // 📦 Fetch all updates
  useEffect(() => {
    const fetchUpdates = async () => {
      const snap = await getDocs(collection(db, 'clinic_updates'))
      const data = snap.docs.map((d) => {
        const raw = d.data()
        const dateObj = raw.date?.seconds
          ? new Date(raw.date.seconds * 1000)
          : new Date()
        return {
          id: d.id,
          ...raw,
          date: dateObj,
          referred: typeof raw.referred === 'boolean' ? raw.referred : false,
        }
      })
      setUpdates(data.sort((a, b) => b.date - a.date))
    }
    fetchUpdates()
  }, [])

  const handleImageUpload = async (file) => {
    if (!file) return null
    const storageRef = ref(storage, `clinic-updates/${file.name}`)
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  }

  // 💾 Save entry
  const handleSave = async (e) => {
    e.preventDefault()
    const imageUrl = image ? await handleImageUpload(image) : null
    const data = {
      title,
      body,
      category,
      referred: category === 'Social Welfare' ? referred : false,
      imageUrl: imageUrl || null,
      date: serverTimestamp(),
    }

    if (editingId) await updateDoc(doc(db, 'clinic_updates', editingId), data)
    else await addDoc(collection(db, 'clinic_updates'), data)

    setTitle('')
    setBody('')
    setImage(null)
    setCategory('MDT')
    setReferred(false)
    setShowForm(false)
    setEditingId(null)

    const snap = await getDocs(collection(db, 'clinic_updates'))
    const dataList = snap.docs.map((d) => {
      const raw = d.data()
      const dateObj = raw.date?.seconds
        ? new Date(raw.date.seconds * 1000)
        : new Date()
      return {
        id: d.id,
        ...raw,
        date: dateObj,
        referred: typeof raw.referred === 'boolean' ? raw.referred : false,
      }
    })
    setUpdates(dataList.sort((a, b) => b.date - a.date))
  }

  const handleEdit = (u) => {
    setEditingId(u.id)
    setTitle(u.title || '')
    setBody(u.body || '')
    setCategory(u.category || 'MDT')
    setReferred(u.referred || false)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this update?')) return
    await deleteDoc(doc(db, 'clinic_updates', id))
    setUpdates(updates.filter((u) => u.id !== id))
  }

  const categories = ['MDT', 'Scan', 'Social Welfare', 'Case Discussion']

  if (loading) return <Layout>Loading...</Layout>
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
      <div className="p-8">
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
                setImage(null)
                setReferred(false)
              }
            }}
            className={`px-4 py-2 rounded text-white transition ${
              showForm
                ? 'bg-gray-500 hover:bg-gray-600'
                : 'bg-qehBlue hover:bg-qehNavy'
            }`}
          >
            {showForm ? 'Cancel' : 'New Update'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-8"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {category === 'Social Welfare' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={referred}
                  onChange={(e) => setReferred(e.target.checked)}
                />
                <span className="text-sm">Referred to Welfare</span>
              </label>
            )}

            <ReactQuill theme="snow" value={body} onChange={setBody} />
            <input
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
              accept="image/*"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded"
            >
              {editingId ? 'Update Entry' : 'Submit Update'}
            </button>
          </form>
        )}

        {/* Category Tabs */}
        <div className="flex gap-4 border-b mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveTab(c)}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === c
                  ? 'border-qehBlue text-qehBlue font-semibold'
                  : 'border-transparent text-gray-500 hover:text-qehBlue'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Updates under selected category */}
        <div className="space-y-4">
          {updates
            .filter((u) => u.category === activeTab)
            .map((u) => (
              <div
                key={u.id}
                className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-qehNavy dark:text-white flex items-center gap-2">
                      {u.title}
                      {u.category === 'Social Welfare' &&
                        (u.referred ? (
                          <span className="text-green-600">✅</span>
                        ) : (
                          <span className="text-yellow-500">⚠️ Pending</span>
                        ))}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {u.category} • {u.date?.toLocaleDateString?.()}
                    </div>
                    <div
                      className="mt-2 text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: u.body }}
                    />
                    {u.imageUrl && (
                      <img
                        src={u.imageUrl}
                        alt=""
                        className="mt-3 rounded-lg shadow w-48 cursor-pointer hover:opacity-80"
                        onClick={() => window.open(u.imageUrl, '_blank')}
                      />
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </Layout>
  )
}