'use client'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { auth, db } from '../../lib/firebaseClient'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore'

export default function AdminClinicUpdates(){
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('MDT')
  const [body, setBody] = useState('')
  const [items, setItems] = useState([])
  const provider = new GoogleAuthProvider()

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{ setUser(u); setLoadingAuth(false) })
    return ()=>unsub()
  },[])

  useEffect(()=>{ if(user) loadItems() }, [user])

  async function login(){ try{ await signInWithPopup(auth, provider) } catch(e){ alert('Login failed: '+e.message) } }
  async function logout(){ await signOut(auth) }

  async function loadItems(){
    const snap = await getDocs(collection(db, 'clinicUpdates'))
    setItems(snap.docs.map(d=>({ id: d.id, ...d.data() })))
  }

  async function createUpdate(e){
    e.preventDefault()
    if(!title) return alert('Enter title')
    await addDoc(collection(db, 'clinicUpdates'), { title, category, body, date: serverTimestamp(), createdBy: user?.email || null })
    setTitle(''); setBody(''); await loadItems()
  }

  async function removeItem(id){
    if(!confirm('Delete this update?')) return
    await deleteDoc(doc(db, 'clinicUpdates', id))
    await loadItems()
  }

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">Admin — Clinic Updates</h1>
        {loadingAuth ? <p>Checking auth...</p> : user ? (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">Signed in as <strong>{user.email}</strong></div>
              <button onClick={logout} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">Sign out</button>
            </div>
            <form onSubmit={createUpdate} className="mt-4 space-y-3">
              <div><label className="block text-sm">Title</label><input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full mt-1 p-2 rounded border" /></div>
              <div><label className="block text-sm">Category</label><select value={category} onChange={(e)=>setCategory(e.target.value)} className="mt-1 p-2 rounded border"><option>MDT</option><option>Scan</option><option>Social Welfare</option><option>General</option></select></div>
              <div><label className="block text-sm">Details</label><textarea value={body} onChange={(e)=>setBody(e.target.value)} className="w-full mt-1 p-2 rounded border" rows="4" /></div>
              <div><button type="submit" className="px-4 py-2 bg-qehBlue text-white rounded">Save Update</button></div>
            </form>
            <div className="mt-6">
              <h2 className="font-semibold">Existing updates</h2>
              <div className="mt-2 space-y-2">{items.map(i=>(
                <div key={i.id} className="p-3 border rounded bg-gray-50 dark:bg-gray-700 flex justify-between">
                  <div><div className="font-semibold">{i.title}</div><div className="text-sm text-gray-600 dark:text-gray-300">{i.category}</div></div>
                  <div className="flex items-center gap-2"><button onClick={()=>removeItem(i.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button></div>
                </div>
              ))}{items.length===0 && <div className="text-gray-600 dark:text-gray-300">No updates yet.</div>}</div>
          </>
        ) : (
            <div className="mt-4"><p className="text-gray-700 dark:text-gray-200">Please sign in with Google to edit clinic updates.</p><button onClick={login} className="mt-3 px-4 py-2 bg-qehBlue text-white rounded">Sign in with Google</button></div>
        )}
      </div>
    </Layout>
  )
}
