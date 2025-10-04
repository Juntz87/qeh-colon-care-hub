import Layout from '../components/Layout'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home(){
  return (
    <Layout>
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-8">
            <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-3xl font-bold text-qehNavy dark:text-white">Colon Care Hub</motion.h1>
            <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.08}} className="mt-4 text-gray-600 dark:text-gray-300">A dedicated clinic portal for colorectal cancer education, surgical counselling, and patient support.</motion.p>

            <motion.div className="mt-6 flex gap-3" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:0.15}}>
              <Link href="/patients" className="px-4 py-2 rounded-md bg-qehBlue text-white hover:opacity-90 transition">Patient Education</Link>
              <Link href="/medical-officers" className="px-4 py-2 rounded-md border border-qehBlue text-qehNavy hover:bg-qehBlue hover:text-white transition">For Medical Officers</Link>
            </motion.div>
          </div>

          <div className="md:w-1/2 p-6 flex items-center justify-center bg-gradient-to-tr from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} className="w-full max-w-md">
              <svg viewBox="0 0 600 400" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
                <rect width="600" height="400" rx="20" fill="#EFF6FF" />
                <g transform="translate(40,40)">
                  <circle cx="120" cy="110" r="60" fill="#3282B8" opacity="0.12" />
                  <rect x="200" y="40" width="260" height="200" rx="12" fill="#0B3C5D" opacity="0.06" />
                  <text x="0" y="260" fill="#0B3C5D" fontSize="18">Colorectal care • Education • Support</text>
                </g>
              </svg>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/medical-officers" className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:scale-102 transition-transform">
          <h3 className="text-lg font-semibold text-qehNavy dark:text-white">Medical Officers</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Follow-up protocols, HPE review checklist, and clinic workflows.</p>
        </a>

        <a href="/patients" className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:scale-102 transition-transform">
          <h3 className="text-lg font-semibold text-qehNavy dark:text-white">Patient Education</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Chemotherapy side effects, stoma care, and ULAR syndrome resources for patients.</p>
        </a>

        <a href="/support" className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:scale-102 transition-transform">
          <h3 className="text-lg font-semibold text-qehNavy dark:text-white">Support & CORUM</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Link to CORUM and updates for Kota Kinabalu meetups.</p>
        </a>
      </section>
    </Layout>
  )
}
