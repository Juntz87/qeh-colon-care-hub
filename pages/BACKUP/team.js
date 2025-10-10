import Layout from '../components/Layout'
import useSWR from 'swr'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

// Fetch team members sorted by rank (ascending)
const fetcher = async () => {
  try {
    const q = query(collection(db, 'team_members'), orderBy('rank', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('Error fetching team members:', e)
    return []
  }
}

export default function Team() {
  const { data } = useSWR('team_members', fetcher, { revalidateOnFocus: false })

  // Fallback data if Firestore is empty or fails
  const team =
    data && data.length > 0
      ? data
      : [
          { name: 'Dr. Alice Lim', role: 'Consultant (Visiting)', rank: 1, photo: '/team/consultant.jpg' },
          { name: 'Dr. Bernard Wong', role: 'Specialist', rank: 2, photo: '/team/specialist.jpg' },
          { name: 'Dr. Cheryl Tan', role: 'Medical Officer', rank: 3, photo: '/team/med1.jpg' },
          { name: 'Dr. Daniel Koh', role: 'Medical Officer', rank: 4, photo: '/team/med2.jpg' },
          { name: 'Dr. Farah Azmi', role: 'Medical Officer', rank: 5, photo: '/team/med3.jpg' },
          { name: 'Dr. Grace Lee', role: 'House Officer', rank: 6, photo: '/team/ho1.jpg' },
          { name: 'Dr. Hafiz Rahman', role: 'House Officer', rank: 7, photo: '/team/ho2.jpg' },
        ]

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">Meet Our Team</h1>
        <p className="mt-3 text-gray-700 dark:text-gray-200">
          Our dedicated multidisciplinary team at QEH Colon Care Hub works collaboratively to provide comprehensive,
          compassionate, and evidence-based care.
        </p>

        {/* Team Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {team.map((m, i) => (
            <div
              key={m.id || i}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col items-center text-center hover:shadow-lg transition"
            >
              <img
                src={m.photo}
                alt={m.name}
                className="w-28 h-28 rounded-full object-cover border-2 border-white shadow-md"
              />
              <div className="mt-3">
                <div className="font-semibold text-qehNavy dark:text-white">{m.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
