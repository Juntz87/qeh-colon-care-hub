'use client'
import { useEffect, useState, useRef } from 'react'
import Layout from '../../components/Layout'
import { db, auth } from '../../lib/firebaseClient'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'

export default function AuditStudyA() {
  const COLL = 'audit_study_a'
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [editingId, setEditingId] = useState(null)
  const formRef = useRef(null)

  const emptyForm = {
    StudyID: '',
    HospitalNumber: '',
    FullName: '',
    DOB: '',
    Sex: '',
    Age: '',
    DateOfSurgery: '',
    ElectiveOrEmergency: '',
    Indication: '',
    PrimaryDiagnosis: '',
    Procedure: '',
    OperativeApproach: '',
    ASA: '',
    AnaesthesiaType: '',
    OperativeTimeMinutes: '',
    EstimatedBloodLoss_ml: '',
    StomaFormed: '',
    SurgeonGrade: '',
    ICUAdmission: '',
    PostopComplication_YN: '',
    ComplicationType: '',
    ClavienDindoGrade: '',
    Reoperation_YN: '',
    Readmission30d_YN: '',
    DateOfDischarge: '',
    LengthOfStay_days: '',
    Mortality30d_YN: '',
    DateOfDeath: '',
    Notes: '',
    SourceDocument: ''
  }

  const [form, setForm] = useState(emptyForm)

  // ✅ Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await getIdTokenResult(u)
        const r = token.claims?.role?.toLowerCase() || 'public'
        setRole(r)
      } else setRole('public')
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // ✅ Load data
  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, COLL))
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setData(docs)
    }
    load()
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // ✅ Create or Update entry
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingId) {
      await updateDoc(doc(db, COLL, editingId), { ...form, updatedAt: serverTimestamp() })
      alert('✅ Entry updated!')
    } else {
      await addDoc(collection(db, COLL), { ...form, createdAt: serverTimestamp() })
      alert('✅ Entry saved!')
    }
    setForm(emptyForm)
    setEditingId(null)
    const snap = await getDocs(collection(db, COLL))
    setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  // ✅ Edit function
  const handleEdit = (entry) => {
    setEditingId(entry.id)
    setForm(entry)
    window.scrollTo({ top: formRef.current?.offsetTop || 0, behavior: 'smooth' })
  }

  // ✅ Delete function
  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return
    await deleteDoc(doc(db, COLL, id))
    setData(data.filter((d) => d.id !== id))
  }

  // ✅ Export CSV
  const exportCSV = () => {
    const headers = Object.keys(emptyForm)
    const csv = [
      headers.join(','),
      ...data.map((d) => headers.map((h) => JSON.stringify(d[h] || '')).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'StudyA_PostopOutcomes.csv'
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
          Access Denied — Admin Only
        </div>
      </Layout>
    )

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
          Study A: Postoperative Outcomes After Colorectal Surgery{' '}
          <span className="text-gray-400 text-lg">(Admin)</span>
        </h1>

        {/* ✅ Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow"
        >
          {Object.keys(emptyForm).map((k) => (
            <input
              key={k}
              name={k}
              placeholder={k}
              value={form[k] || ''}
              onChange={handleChange}
              className="p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
          ))}
          <button
            type="submit"
            className="col-span-2 bg-qehBlue hover:bg-qehNavy text-white py-2 rounded transition"
          >
            {editingId ? 'Update Entry' : 'Submit Entry'}
          </button>
        </form>

        {/* ✅ Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-qehNavy dark:text-white">Existing Records</h2>
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            Export to CSV
          </button>
        </div>

        {/* ✅ Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-qehNavy text-white">
                {Object.keys(emptyForm).map((h) => (
                  <th key={h} className="border px-2 py-1">
                    {h}
                  </th>
                ))}
                <th className="border px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="odd:bg-gray-50 dark:odd:bg-gray-700">
                  {Object.keys(emptyForm).map((f) => (
                    <td key={f} className="border px-2 py-1">
                      {r[f]}
                    </td>
                  ))}
                  <td className="border px-2 py-1 text-center space-x-1">
                    <button
                      onClick={() => handleEdit(r)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={Object.keys(emptyForm).length + 1}
                    className="text-center py-4 text-gray-500"
                  >
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}