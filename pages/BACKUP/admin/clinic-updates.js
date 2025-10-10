'use client'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { auth, db, storage } from '../../lib/firebaseClient'
import {
  onAuthStateChanged,
  getIdTokenResult,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'

export default function ClinicUpdatesAdmin() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [updates, setUpdates] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('MDT')
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const provider = new GoogleAuthProvider()

  // 👤 Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const token = await getIdTokenResult(u)
        setIsAdmin(Boolean(token.claims?.admin))
      } else setIsAdmin(false)
    })
    return () => unsub()
  }, [])

  // 🔄 Fetch updates
  useEffect(() => {
    if (isAdmin) fetchUpdates()
  }, [isAdmin])

  async function fetchUpdates() {
    const q = query(collection(db, 'clinic_updates'), orderBy('date', 'desc'))
    const snap = await getDocs(q)
    setUpdates(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.seconds
          ? new Date(d.data().date.seconds * 1000)
          : new Date(),
      }))
    )
  }

  async function handleLogin() {
    try {
      await signInWithPopup(auth, provider)
      window.location.reload()
    } catch (e) {
      console.error('Login failed:', e)
      alert('Login failed — check console for details.')
    }
  }

  async function handleAdd() {
    if (!title.trim()) return alert('Please enter a title.')
    setLoading(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const imgRef = ref(storage, `clinic_updates/${Date.now()}-${imageFile.name}`)
        await uploadBytes(imgRef, imageFile)
        imageUrl = await getDownloadURL(imgRef)
      }

      await addDoc(collection(db, 'clinic_updates'), {
        title,
        body,
        category,
        date: serverTimestamp(),
        imageUrl,
      })

      setTitle('')
      setBody('')
      setImageFile(null)
      setCategory('MDT')
      fetchUpdates()
      alert('✅ Update added successfully!')
    } catch (e) {
      console.error('Error adding update:', e)
      alert('❌ Failed to add update — see console.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this update?')) return
    try {
      await deleteDoc(doc(db, 'clinic_updates', id))
      setUpdates(updates.filter((u) => u.id !== id))
    } catch (e) {
      console.error('Delete failed:', e)
      alert('Failed to delete — see console.')
    }
  }

  if (!user)
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-4">Please Sign In</h2>
          <button
            onClick={handleLogin}
            className="bg-qehBlue text-white px-4 py-2 rounded hover:bg-qehNavy transition"
          >
            Sign in with Google
          </button>
        </div>
      </Layout>
    )

  if (!isAdmin)
    return (
      <Layout>
        <div className="text-center py-16 text-red-500">
          You do not have permission to access this page.
        </div>
      </Layout>
    )

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white mb-4">
          Manage Clinic Updates
        </h1>

        {/* Add New Update */}
        <div className="grid gap-4 mb-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details..."
            rows="3"
            className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
          >
            <option>MDT</option>
            <option>Scan</option>
            <option>Social Welfare</option>
            <option>Case Discussion</option>
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="p-2 border rounded w-full"
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            className="bg-qehBlue text-white px-4 py-2 rounded hover:bg-qehNavy transition"
          >
            {loading ? 'Uploading...' : 'Add Update'}
          </button>
        </div>

        {/* Existing Updates */}
        <div className="space-y-4">
          {updates.map((u) => (
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
                    {u.category} • {u.date.toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
              {u.body && (
                <div className="mt-2 text-gray-700 dark:text-gray-200">
                  {u.body}
                </div>
              )}
              {u.imageUrl && (
                <img
                  src={u.imageUrl}
                  alt=""
                  className="w-24 h-24 mt-2 object-cover rounded"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}