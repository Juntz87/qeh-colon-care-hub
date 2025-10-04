'use client'
import Layout from '../components/Layout'
import { patientEducation } from '../data/mock-data'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Patients(){
  const tabs = ['Chemotherapy','Stoma Care','ULAR']
  const [active, setActive] = useState(0)
  return (
    <Layout>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">{patientEducation.title}</h1>

        <div className="mt-4">
          <div className="flex gap-2">
            {tabs.map((t,i)=>(
              <button key={t} onClick={()=>setActive(i)} className={`px-3 py-2 rounded-md ${active===i? 'bg-qehBlue text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{t}</button>
            ))}
          </div>

          <div className="mt-4 text-gray-700 dark:text-gray-200">
            {active===0 && <ul className="list-disc ml-5">{patientEducation.chemoSideEffects.map((s,i)=>(<li key={i}>{s}</li>))}</ul>}
            {active===1 && <p>{patientEducation.stomaCare}</p>}
            {active===2 && <p>{patientEducation.ular}</p>}
          </div>
        </div>
      </motion.div>
    </Layout>
  )
}
