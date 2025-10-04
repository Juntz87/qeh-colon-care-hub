import Layout from '../components/Layout'
import useSWR from 'swr'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

const fetcher = async () => {
  const q = query(collection(db, 'clinic_updates'), orderBy('date','desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export default function ClinicUpdates(){
  const { data } = useSWR('clinic_updates', fetcher, { revalidateOnFocus: false })
  const updates = data || []
  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">Clinic Updates</h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Latest MDTs, upcoming scans, and pending social welfare cases.</p>

        <div className="mt-4 space-y-4">
          {updates.length === 0 && <div className="text-gray-600 dark:text-gray-300">No updates yet.</div>}
          {updates.map(u => (
            <div key={u.id} className="p-4 border rounded bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-qehNavy dark:text-white">{u.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{u.category} • {u.date ? new Date(u.date.seconds ? u.date.seconds*1000 : u.date).toLocaleString() : ''}</div>
                </div>
                {u.imageUrl && <img src={u.imageUrl} alt="" className="w-20 h-20 object-cover rounded" />}
              </div>
              {u.body && <div className="mt-2 text-gray-700 dark:text-gray-200">{u.body}</div>}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
