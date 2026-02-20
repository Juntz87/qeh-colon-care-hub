'use client'
import Layout from '../components/Layout'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Layout>
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mt-4">
        <div className="md:flex">
          {/* Left Side — Hero Text */}
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-qehNavy dark:text-white mb-4"
            >
              QEH Colorectal Hub
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed"
            >
              A dedicated clinic portal for colorectal cancer education, surgical counselling, and patient support.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="mt-6 flex gap-3 flex-wrap"
            >
              <Link href="/patients">
                <button className="px-6 py-2 rounded-md bg-qehBlue text-white hover:bg-qehNavy transition">
                  Patient Education
                </button>
              </Link>
              <Link href="/officers-resources">
                <button className="px-6 py-2 rounded-md border border-qehBlue text-qehNavy dark:text-gray-200 hover:bg-qehBlue hover:text-white transition">
                  Officers Resources
                </button>
              </Link>
            </motion.div>
          </div>

          {/* Right Side — Logo Section */}
          <div className="md:w-1/2 p-8 flex items-center justify-center bg-gradient-to-tr from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center w-full h-full"
            >
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg flex flex-col items-center">
                <Image
                  src="/LogoCRC.png"
                  alt="Colorectal QEH Logo"
                  width={380}
                  height={260}
                  priority
                  className="object-contain rounded-md"
                />
                <p className="mt-4 text-qehNavy dark:text-gray-300 font-medium tracking-wide text-center">
                  Colorectal care • Education • Support
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  )
}