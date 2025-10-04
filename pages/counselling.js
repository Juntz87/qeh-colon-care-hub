import Layout from '../components/Layout'
import { counselling } from '../data/mock-data'
import { motion } from 'framer-motion'

export default function Counselling(){
  return (
    <Layout>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">{counselling.title}</h1>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {counselling.sections.map((s,i)=>(
            <motion.section key={i} whileHover={{y:-4}} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h3 className="font-semibold text-qehNavy dark:text-white">{s.name}</h3>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{s.info}</p>
            </motion.section>
          ))}
        </div>
      </motion.div>
    </Layout>
  )
}
