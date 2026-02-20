'use client'
import { useRef } from "react";
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import dynamic from 'next/dynamic'
import { auth, db, storage } from '../../lib/firebaseClient'
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function SupportAdmin() {
  const formRef = useRef(null);

  const [user, setUser] = useState(null)
  const [role, setRole] = useState('')
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const COLLECTION = 'support_resources'

  // 👤 Auth & Role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) {
        setRole('')
        setItems([])
        return
      }
      try {
        const token = await getIdTokenResult(u)
        const userRole = token?.claims?.role?.toLowerCase() || ''
        setRole(userRole)
        if (['master', 'officer'].includes(userRole)) {
          await loadItems()
        } else setItems([])
      } catch (err) {
        console.error('Token claim error', err)
        setRole('')
      }
    })
    return () => unsub()
  }, [])

  // 🔄 Load Items
  async function loadItems() {
    try {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('Load items error', e)
    }
  }

  // 💾 Save / Update
  async function handleSave() {
    if (!title.trim()) return alert('Please enter a title.')
    setLoading(true)
    setUploadProgress(0)
    try {
      let imageUrl = ''
      if (file) {
        const storageRef = ref(storage, `${COLLECTION}/${Date.now()}_${file.name}`)
        const uploadTask = uploadBytesResumable(storageRef, file)

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snap) => {
              const progress = (snap.bytesTransferred / snap.totalBytes) * 100
              setUploadProgress(progress.toFixed(0))
            },
            (err) => reject(err),
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
              resolve()
            }
          )
        })
      }

      if (editingId) {
        await updateDoc(doc(db, COLLECTION, editingId), {
          title: title.trim(),
          link: link.trim() || '',
          description: desc.trim(),
          ...(imageUrl && { imageUrl }),
          updatedAt: serverTimestamp()
        })
      } else {
        await addDoc(collection(db, COLLECTION), {
          title: title.trim(),
          link: link.trim() || '',
          description: desc.trim(),
          imageUrl,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        })
      }

      // 🧹 Reset form
      setTitle('')
      setLink('')
      setDesc('')
      setFile(null)
      setEditingId(null)
      setShowForm(false)
      await loadItems()
    } catch (err) {
      console.error('Save failed', err)
      alert('Save failed — check console.')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  // ✏️ Edit
  function handleEdit(item) {
    setEditingId(item.id)
    setTitle(item.title)
    setLink(item.link)
    setDesc(item.description || '')
    setShowForm(true)
  }

  // ❌ Delete
  async function handleDelete(id) {
    if (!confirm('Delete this support item?')) return
    try {
      await deleteDoc(doc(db, COLLECTION, id))
      await loadItems()
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  // 🔒 Access Control
  if (!user)
    return (
      <Layout>
        <div className="text-center py-16 text-gray-700 dark:text-gray-300">
          Please sign in to access admin features.
        </div>
      </Layout>
    )

  if (!['master', 'officer'].includes(role))
    return (
      <Layout>
        <div className="text-center py-16 text-red-500">
          Access Denied — Master or Officer role required.
        </div>
      </Layout>
    )

  // ✅ UI
  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
            Support <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (showForm) {
                setEditingId(null)
                setTitle('')
                setLink('')
                setDesc('')
                setFile(null)
              }
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
              placeholder="Title"
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link (optional)"
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            <ReactQuill theme="snow" value={desc} onChange={setDesc} />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="p-2 border rounded w-full"
            />
            {uploadProgress > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Uploading image... {uploadProgress}%
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-qehBlue text-white px-4 py-2 rounded hover:bg-qehNavy transition"
            >
              {loading
                ? 'Saving...'
                : editingId
                ? 'Update Support Item'
                : 'Add New Support Item'}
            </button>
          </div>
        )}

        {/* 🖼 Display Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-qehNavy dark:text-white">
                    {item.title}
                  </div>
                  {item.link && (
                    <div className="text-blue-600 dark:text-blue-400">
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item.link}
                      </a>
                    </div>
                  )}

                  {/* 🖼 Auto-fit image + clickable */}
                  {item.imageUrl && (
                    <a
                      href={item.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="mt-3 w-full max-w-lg rounded-md shadow-md object-cover transition-transform hover:scale-[1.02]"
                        style={{ aspectRatio: '16/9' }}
                      />
                    </a>
                  )}

                  <div
                    className="text-sm text-gray-600 dark:text-gray-300 mt-2"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {item.createdAt?.toDate
                      ? item.createdAt.toDate().toLocaleString()
                      : ''}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
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