'use client'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { auth, db, storage } from '../../lib/firebaseClient'
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore'

export default function AdminTeam() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('Medical Officer')
  const [rank, setRank] = useState(3)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
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
      console.error(e)
    }
  }

  async function logout() {
    await signOut(auth)
  }

  async function loadItems() {
    try {
      const q = query(collection(db, 'team_members'), orderBy('rank', 'asc'))
      const snap = await getDocs(q)
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('Error loading items:', e)
    }
  }

  function handleFile(e) {
    const f = e.target.files[0]
    setFile(f)
    if (f) setPreview(URL.createObjectURL(f))
  }

  async function uploadAndCreate(e) {
    e.preventDefault()
    if (!name) return alert('Enter a name first')
    setUploading(true)

    try {
      let imageUrl = '/team/placeholder.jpg'

      if (file) {
        const storageRef = ref(storage, `team/${Date.now()}-${file.name}`)
        const uploadTask = uploadBytesResumable(storageRef, file)
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, resolve)
        })
        imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
      }

      await addDoc(collection(db, 'team_members'), {
        name,
        role,
        rank: Number(rank),
        photo: imageUrl,
        createdAt: new Date(),
      })

      alert('✅ Team member added successfully!')
      setName('')
      setRole('Medical Officer')
      setRank(3)
      setFile(null)
      setPreview(null)
      await loadItems()
    } catch (err) {
      console.error('Error adding team member:', err)
      alert('Error adding team member: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function updateRank(id, newRank) {
    try {
      await updateDoc(doc(db, 'team_members', id), { rank: Number(newRank) })
      await loadItems()
    } catch (err) {
      console.error('Error updating rank:', err)
    }
  }

  async function removeItem(id) {
    if (!confirm('Delete this team member?')) return
    try {
      await deleteDoc(doc(db, 'team_members', id))
      await loadItems()
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">Admin — Team</h1>

        {loadingAuth ? (
          <p>Checking auth...</p>
        ) : user ? (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">
                Signed in as <strong>{user.email}</strong>
              </div>
              <button onClick={logout} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
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
                  className="mt-1 p-2 rounded border"
                >
                  <option>Consultant (Visiting)</option>
                  <option>Specialist</option>
                  <option>Medical Officer</option>
                  <option>House Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm">Seniority Rank (1 = Most Senior)</label>
                <input
                  type="number"
                  value={rank}
                  min="1"
                  onChange={(e) => setRank(e.target.value)}
                  className="w-32 mt-1 p-2 rounded border"
                />
              </div>

              <div>
                <label className="block text-sm">Photo</label>
                <input onChange={handleFile} type="file" accept="image/*" className="mt-1" />
              </div>

              {preview && (
                <div className="mt-2">
                  <div className="text-sm mb-1">Preview</div>
                  <img src={preview} className="w-28 h-28 object-cover rounded-full border" alt="preview" />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className={`px-4 py-2 rounded text-white ${
                  uploading ? 'bg-gray-400' : 'bg-qehBlue hover:bg-qehNavy'
                }`}
              >
                {uploading ? 'Uploading...' : 'Add Team Member'}
              </button>
            </form>

            <div className="mt-6">
              <h2 className="font-semibold mb-2">Existing Members (sorted by seniority)</h2>
              {items.map((i) => (
                <div
                  key={i.id}
                  className="p-3 border rounded bg-gray-50 dark:bg-gray-700 flex items-center justify-between mb-2"
                >
                  <div className="flex items-center gap-3">
                    <img src={i.photo} alt="" className="w-12 h-12 object-cover rounded-full" />
                    <div>
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{i.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={i.rank || ''}
                      onChange={(e) => updateRank(i.id, e.target.value)}
                      className="w-16 border p-1 rounded text-center"
                    />
                    <button
                      onClick={() => removeItem(i.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-gray-600 dark:text-gray-300">No members yet.</div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-gray-700 dark:text-gray-200">Please sign in with Google to manage team members.</p>
            <button onClick={login} className="mt-3 px-4 py-2 bg-qehBlue text-white rounded">
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
