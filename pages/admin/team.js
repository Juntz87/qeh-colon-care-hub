'use client'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { auth, db, storage } from '../../lib/firebaseClient'
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore'

export default function AdminTeam() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('Medical Officer')
  const [file, setFile] = useState(null)
  const provider = new GoogleAuthProvider()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoadingAuth(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (user) loadItems()
  }, [user])

  async function login() {
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      alert('Login failed: ' + e.message)
    }
  }

  async function logout() {
    await signOut(auth)
  }

  async function loadItems() {
    const snap = await getDocs(collection(db, 'team'))
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async function uploadAndCreate(e) {
    e.preventDefault()
    if (!name) return alert('Enter name')

    let imageUrl = '/team/placeholder.jpg'
    if (file) {
      const storageRef = ref(storage, `team/${Date.now()}-${file.name}`)
      const uploadTask = uploadBytesResumable(storageRef, file)
      await new Promise((res, rej) => {
        uploadTask.on('state_changed', null, (err) => rej(err), () => res())
      })
      imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
    }

    await addDoc(collection(db, 'team'), {
      name,
      role,
      photo: imageUrl,
    })

    setName('')
    setRole('Medical Officer')
    setFile(null)
    await loadItems()
  }

  async function removeItem(id) {
    if (!confirm('Delete this team member?')) return
    await deleteDoc(doc(db, 'team', id))
    await loadItems()
  }

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
          Admin — Team
        </h1>

        {loadingAuth ? (
          <p>Checking auth...</p>
        ) : user ? (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">
                Signed in as <strong>{user.email}</strong>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
              >
                Sign out
              </button>
            </div>

            <form onSubmit={uploadAndCreate} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 p-2 rounded border"
                />
              </div>

              <div>
                <label className="block text-sm">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 p-2 rounded border w-full"
                >
                  <option>Consultant (Visiting)</option>
                  <option>Specialist</option>
                  <option>Medical Officer</option>
                  <option>House Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm">Photo</label>
                <input
                  onChange={(e) => setFile(e.target.files[0])}
                  type="file"
                  accept="image/*"
                  className="mt-1"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-qehBlue text-white rounded"
              >
                Add Team Member
              </button>
            </form>

            <div className="mt-6">
              <h2 className="font-semibold mb-2">Existing members</h2>
              <div className="space-y-2">
                {items.map((i) => (
                  <div
                    key={i.id}
                    className="p-3 border rounded bg-gray-50 dark:bg-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={i.photo || '/team/placeholder.jpg'}
                        alt={i.name}
                        className="w-12 h-12 object-cover rounded-full"
                      />
                      <div>
                        <div className="font-semibold">{i.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {i.role}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(i.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-gray-600 dark:text-gray-300">
                    No members yet.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-gray-700 dark:text-gray-200">
              Please sign in with Google to manage team members.
            </p>
            <button
              onClick={login}
              className="mt-3 px-4 py-2 bg-qehBlue text-white rounded"
            >
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
