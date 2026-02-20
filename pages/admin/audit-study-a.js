'use client'
import { useEffect, useRef, useState } from 'react'
import Layout from '../../components/Layout'
import { db, auth } from '../../lib/firebaseClient'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'

export default function AuditStudiesAdmin() {
  const STUDIES = {
    A: {
      key: 'A',
      title: 'Study A — Postoperative Outcomes',
      coll: 'audit_study_a',
      fields: [
        'StudyID',
        'HospitalNumber',
        'FullName',
        'DOB',
        'Sex',
        'Age',
        'DateOfSurgery',
        'ElectiveOrEmergency',
        'Indication',
        'PrimaryDiagnosis',
        'Procedure',
        'OperativeApproach',
        'ASA',
        'AnaesthesiaType',
        'OperativeTimeMinutes',
        'EstimatedBloodLoss_ml',
        'StomaFormed',
        'SurgeonGrade',
        'ICUAdmission',
        'PostopComplication_YN',
        'ComplicationType',
        'ClavienDindoGrade',
        'Reoperation_YN',
        'Readmission30d_YN',
        'DateOfDischarge',
        'LengthOfStay_days',
        'Mortality30d_YN',
        'DateOfDeath',
        'Notes',
        'SourceDocument'
      ]
    },
    B: {
      key: 'B',
      title: 'Study B — Colorectal Cancer Resection Outcomes',
      coll: 'audit_study_b',
      fields: [
        'StudyID',
        'HospitalNumber',
        'FullName',
        'DOB',
        'Sex',
        'Age',
        'DateOfSurgery',
        'ElectiveOrEmergency',
        'Procedure',
        'OperativeApproach',
        'Surgeon',
        'TumourLocation',
        'PreopStage',
        'Neoadjuvant_YN',
        'AdjuvantPlanned_YN',
        'Pathology_TumourType',
        'pT',
        'pN',
        'pM',
        'TNMStage',
        'ResectionMarginStatus',
        'CircumferentialMargin_mm',
        'DistalMargin_mm',
        'NumberOfNodesExamined',
        'NumberOfNodesPositive',
        'LymphovascularInvasion',
        'PerineuralInvasion',
        'TumourGrade',
        'AnastomoticLeak_YN',
        '30dayComplication_YN',
        'ClavienDindoGrade',
        'Reoperation_YN',
        'LengthOfStay_days',
        '30dayMortality_YN',
        'Readmission30d_YN',
        'PathologyReportRef',
        'CoveringIleostomy_YN',
        '30dReturnToTheatre_YN_Procedure',
      ]
    }
  }

  const [activeStudy, setActiveStudy] = useState('A') // 'A' or 'B'
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const formRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Auth / role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const token = await getIdTokenResult(u)
          setRole((token.claims?.role || token.claims?.role)?.toLowerCase() || 'public')
        } catch (e) {
          console.error('token fetch error', e)
          setRole('public')
        }
      } else setRole('public')
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // initialise empty form for current active study
  useEffect(() => {
    const fields = STUDIES[activeStudy].fields
    const empty = {}
    fields.forEach((f) => (empty[f] = ''))
    setForm(empty)
    setEditingId(null)
  }, [activeStudy])

  // load records for the active study
  useEffect(() => {
    async function load() {
      try {
        const coll = collection(db, STUDIES[activeStudy].coll)
        // try ordering by createdAt if available, fallback to no order
        const q = query(coll, orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        // fallback: load without ordering if ordering throws
        try {
          const coll2 = collection(db, STUDIES[activeStudy].coll)
          const snap2 = await getDocs(coll2)
          setRecords(snap2.docs.map((d) => ({ id: d.id, ...d.data() })))
        } catch (err) {
          console.error('load error', err)
          setRecords([])
        }
      }
    }
    load()
  }, [activeStudy, refreshKey])

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }))

  // Create or update
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const COLL = STUDIES[activeStudy].coll
      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), { ...form, updatedAt: serverTimestamp() })
        alert('Updated successfully')
      } else {
        await addDoc(collection(db, COLL), { ...form, createdAt: serverTimestamp() })
        alert('Saved successfully')
      }
      // refresh list
      setRefreshKey((k) => k + 1)
      // reset
      setForm((prev) => {
        const empty = {}
        STUDIES[activeStudy].fields.forEach((f) => (empty[f] = ''))
        return empty
      })
      setEditingId(null)
      // scroll top a little for UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('save error', err)
      alert('Error saving, check console')
    }
  }

  const handleEdit = (rec) => {
    // preload to form
    const loaded = {}
    STUDIES[activeStudy].fields.forEach((f) => {
      loaded[f] = rec[f] ?? ''
    })
    setForm(loaded)
    setEditingId(rec.id)
    // scroll into view
    setTimeout(() => {
      const y = formRef.current?.offsetTop || 0
      window.scrollTo({ top: y - 20, behavior: 'smooth' })
    }, 50)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return
    try {
      await deleteDoc(doc(db, STUDIES[activeStudy].coll, id))
      setRecords((r) => r.filter((x) => x.id !== id))
    } catch (err) {
      console.error('delete error', err)
      alert('Error deleting, check console')
    }
  }

  const exportCSV = () => {
    const fields = STUDIES[activeStudy].fields
    const header = fields.join(',')
    const lines = records.map((r) =>
      fields.map((f) => JSON.stringify(r[f] ?? '')).join(',')
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${STUDIES[activeStudy].coll}.csv`
    a.click()
  }

  if (loading)
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    )

  if (!['master', 'officer'].includes(role))
    return (
      <Layout>
        <div className="py-24 text-center text-gray-600 dark:text-gray-300">
          Access Denied — Master or Officer role required.
        </div>
      </Layout>
    )

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-qehNavy dark:text-white">
            Audit Studies (Admin)
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => exportCSV()}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Study Tabs */}
        <div className="flex gap-2">
          {Object.values(STUDIES).map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setActiveStudy(s.key)
                setEditingId(null)
                setForm(
                  s.fields.reduce((acc, f) => {
                    acc[f] = ''
                    return acc
                  }, {})
                )
              }}
              className={`px-3 py-2 rounded ${
                activeStudy === s.key
                  ? 'bg-qehNavy text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-gray-800 p-4 rounded shadow"
        >
          {STUDIES[activeStudy].fields.map((f) => (
            <input
              key={f}
              name={f}
              value={form[f] ?? ''}
              onChange={handleChange}
              placeholder={f}
              className="p-2 border rounded dark:bg-gray-700 dark:text-white w-full"
            />
          ))}

          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue text-white rounded hover:bg-qehNavy"
            >
              {editingId ? 'Update Entry' : 'Submit Entry'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  const empty = {}
                  STUDIES[activeStudy].fields.forEach((f) => (empty[f] = ''))
                  setForm(empty)
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Records list (table-like) */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {STUDIES[activeStudy].fields.slice(0, 6).map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                      {h}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="odd:bg-gray-50 dark:odd:bg-gray-700">
                    {STUDIES[activeStudy].fields.slice(0, 6).map((f) => (
                      <td key={f} className="px-2 py-2">
                        {r[f] ?? ''}
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(r)}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={STUDIES[activeStudy].fields.slice(0, 6).length + 1} className="p-4 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}