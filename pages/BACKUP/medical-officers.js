import Layout from '../components/Layout'
import { medicalGuidelines } from '../data/mock-data'
import { motion } from 'framer-motion'

export default function MedicalOfficers(){
  return (
    <Layout>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">{medicalGuidelines.title}</h1>
        <div className="mt-4 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold">Follow-up Plan</h2>
            <ul className="list-disc ml-5 mt-2 text-gray-700 dark:text-gray-200">
              {medicalGuidelines.followup.map((t,i)=>(<li key={i}>{t}</li>))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">HPE Review</h2>
            <ul className="list-disc ml-5 mt-2 text-gray-700 dark:text-gray-200">
              {medicalGuidelines.hpeReview.map((t,i)=>(<li key={i}>{t}</li>))}
            </ul>
          </div>
        </div>
      </motion.div>
    </Layout>
  )
}
