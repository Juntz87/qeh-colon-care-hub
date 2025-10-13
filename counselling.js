'use client'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import dynamic from 'next/dynamic'
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
  updateDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function AdminCounselling() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tabs, setTabs] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [order, setOrder] = useState(100)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const provider = new GoogleAuthProvider()
  const COLL = 'counselling_tabs'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const token = await getIdTokenResult(u)
        const role = token.claims?.role || 'public'
        setIsAdmin(role === 'master')
      } else setIsAdmin(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (isAdmin) fetchTabs()
  }, [isAdmin])

  async function fetchTabs() {
    const q = query(collection(db, COLL), orderBy('order', 'asc'))
    const snap = await getDocs(q)
    setTabs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async function handleSave() {
    if (!title.trim()) return alert('Please enter a title.')
    setLoading(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const imgRef = ref(storage, `counselling/${Date.now()}-${imageFile.name}`)
        await uploadBytes(imgRef, imageFile)
        imageUrl = await getDownloadURL(imgRef)
      }

      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), {
          title,
          content,
          order: Number(order) || 100,
          ...(imageUrl && { imageUrl }),
        })
        setEditingId(null)
      } else {
        await addDoc(collection(db, COLL), {
          title,
          content,
          order: Number(order) || 100,
          imageUrl,
          createdAt: serverTimestamp(),
        })
      }

      setTitle('')
      setContent('')
      setImageFile(null)
      setOrder(100)
      setShowForm(false)
      fetchTabs()
    } catch (e) {
      console.error('Save error:', e)
      alert('❌ Failed to save — check console.')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(tab) {
    setEditingId(tab.id)
    setTitle(tab.title)
    setContent(tab.content || '')
    setOrder(tab.order || 100)
    setShowForm(true)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this tab?')) return
    await deleteDoc(doc(db, COLL, id))
    fetchTabs()
  }

  async function handleLogin() {
    try {
      await signInWithPopup(auth, provider)
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert('Login failed')
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
            Counselling <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setTitle('')
              setContent('')
              setImageFile(null)
              setOrder(100)
            }}
            className={`px-4 py-2 rounded text-white transition ${
              showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-qehBlue hover:bg-qehNavy'
            }`}
          >
            {showForm ? 'Cancel' : 'New Update'}
          </button>
        </div>

        {showForm && (
          <div className="grid gap-4 mb-8 p-4 border rounded bg-white dark:bg-gray-800">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tab Title (e.g. Anterior Resection)"
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            <ReactQuill theme="snow" value={content} onChange={setContent} />
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="Order (e.g. 1, 2, 3)"
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="p-2 border rounded w-full"
            />
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-qehBlue text-white px-4 py-2 rounded hover:bg-qehNavy transition"
            >
              {loading
                ? 'Saving...'
                : editingId
                ? 'Update Counselling Tab'
                : 'Add New Counselling Tab'}
            </button>
          </div>
        )}

        <div className="space-y-4">
          {tabs.map((t) => (
            <div
              key={t.id}
              className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-qehNavy dark:text-white">
                    {t.title} <span className="text-gray-400">#{t.order}</span>
                  </div>
                  <div
                    className="text-sm text-gray-600 dark:text-gray-300 mt-1"
                    dangerouslySetInnerHTML={{ __html: t.content }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(t)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
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