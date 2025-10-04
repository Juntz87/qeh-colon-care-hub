import Layout from '../components/Layout'
import { support } from '../data/mock-data'
import { motion } from 'framer-motion'

export default function Support(){
  return (
    <Layout>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">{support.title}</h1>
        <p className="mt-3 text-gray-700 dark:text-gray-200">Support group: <a className="underline" href={support.corumLink} target="_blank" rel="noreferrer">{support.corumLink}</a></p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{support.meetupNote}</p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-sm">Meetup 1</div>
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-sm">Meetup 2</div>
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-sm">Meetup 3</div>
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-sm">Meetup 4</div>
        </div>
      </motion.div>
    </Layout>
  )
}
