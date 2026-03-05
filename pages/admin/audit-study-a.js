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

        // ✅ NEW FIELDS ADDED HERE
        'CoveringIleostomy_YN',
        'ReturnToTheatre30d_YN',

        '30dayComplication_YN',
        'ClavienDindoGrade',
        'Reoperation_YN',
        'LengthOfStay_days',
        '30dayMortality_YN',
        'Readmission30d_YN',
        'PathologyReportRef',
        'Notes'
      ]
    }
  }

  const [activeStudy, setActiveStudy] = useState('A')
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const formRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const token = await getIdTokenResult(u)
          setRole((token.claims?.role)?.toLowerCase() || 'public')
        } catch {
          setRole('public')
        }
      } else setRole('public')
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const empty = {}
    STUDIES[activeStudy].fields.forEach((f) => (empty[f] = ''))
    setForm(empty)
    setEditingId(null)
  }, [activeStudy])

  useEffect(() => {
    async function load() {
      try {
        const coll = collection(db, STUDIES[activeStudy].coll)
        const q = query(coll, orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch {
        const coll2 = collection(db, STUDIES[activeStudy].coll)
        const snap2 = await getDocs(coll2)
        setRecords(snap2.docs.map((d) => ({ id: d.id, ...d.data() })))
      }
    }
    load()
  }, [activeStudy, refreshKey])

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const COLL = STUDIES[activeStudy].coll

    if (editingId) {
      await updateDoc(doc(db, COLL, editingId), {
        ...form,
        updatedAt: serverTimestamp()
      })
    } else {
      await addDoc(collection(db, COLL), {
        ...form,
        createdAt: serverTimestamp()
      })
    }

    setRefreshKey((k) => k + 1)

    const empty = {}
    STUDIES[activeStudy].fields.forEach((f) => (empty[f] = ''))
    setForm(empty)
    setEditingId(null)
  }

  if (loading) return <Layout><div className="p-6">Loading...</div></Layout>

  if (!['master', 'officer'].includes(role))
    return <Layout><div className="py-24 text-center">Access Denied</div></Layout>

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Audit Studies (Admin)</h1>
      </div>
    </Layout>
  )
}