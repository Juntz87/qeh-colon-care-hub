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
  serverTimestamp
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
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)

  // 🧠 Auth + Role
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

  // 🔄 Load all updates (no filtering by date)
  useEffect(() => {
    const fetchUpdates = async () => {
      const snap = await getDocs(collection(db, 'clinic_updates'))
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.seconds
          ? new Date(d.data().date.seconds * 1000)
          : new Date()
      }))
      setUpdates(data.sort((a, b) => b.date - a.date)) // sort manually by date
    }
    fetchUpdates()
  }, [])

  // 🖼️ Image upload
  const handleImageUpload = async (file) => {
    if (!file) return null
    const storageRef = ref(storage, `clinic-updates/${file.name}`)
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  }

  // 💾 Add or Update
  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const imageUrl = image ? await handleImageUpload(image) : null

      if (editingId) {
        await updateDoc(doc(db, 'clinic_updates', editingId), {
          title,
          body,
          category,
          ...(imageUrl && { imageUrl })
        })
      } else {
        await addDoc(collection(db, 'clinic_updates'), {
          title,
          body,
          category,
          imageUrl,
          date: serverTimestamp()
        })
      }

      setTitle('')
      setBody('')
      setImage(null)
      setCategory('MDT')
      setShowForm(false)
      setEditingId(null)
      window.location.reload()
    } catch (err) {
      console.error('Error saving:', err)
    }
  }

  // ✏️ Edit
  const handleEdit = (u) => {
    setEditingId(u.id)
    setTitle(u.title || '')
    setBody(u.body || '')
    setCategory(u.category || 'MDT')
    setShowForm(true)
  }

  // ❌ Delete
  const handleDelete = async (id) => {
    if (!confirm('Delete this update?')) return
    await deleteDoc(doc(db, 'clinic_updates', id))
    setUpdates(updates.filter((u) => u.id !== id))
  }

  if (loading) return <Layout>Loading...</Layout>

  if (role === 'public') {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-600 dark:text-gray-300">
          Please sign in to access admin pages.
        </div>
      </Layout>
    )
  }

  if (!['master', 'officer'].includes(role)) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-600 dark:text-gray-300">
          Access denied.
        </div>
      </Layout>
    )
  }

  // ✅ UI
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
            className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow"
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
              <option>MDT</option>
              <option>SCAN</option>
              <option>SOCIAL WELFARE</option>
              <option>DISCUSSION</option>
            </select>
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

        {/* 🗂️ Display Updates */}
        <div className="space-y-4 mt-6">
          {updates.map((u) => (
            <div
              key={u.id}
              className="p-4 border rounded bg-gray-50 dark:bg-gray-700 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-qehNavy dark:text-white">
                    {u.title || 'Untitled'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {u.category || 'General'} •{' '}
                    {u.date?.toLocaleDateString?.() || 'No date'}
                  </div>
                  <div
                    className="mt-2 text-gray-700 dark:text-gray-200"
                    dangerouslySetInnerHTML={{ __html: u.body }}
                  />
                  {u.imageUrl && (
                    <img
                      src={u.imageUrl}
                      alt=""
                      className="w-24 h-24 mt-2 object-cover rounded"
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