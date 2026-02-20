'use client'

import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { db } from '../lib/firebaseClient'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { motion } from 'framer-motion'

export default function Support() {
  const [supportData, setSupportData] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'support_resources'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setSupportData(items)
      } catch (error) {
        console.error('❌ Failed to load support data:', error)
      }
    }
    fetchData()
  }, [])

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        {/* 🏥 Permanent CORUM Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-3 text-qehNavy dark:text-white">
            Support & CORUM
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-1">
            Our CORUM community provides emotional and social support for colorectal cancer patients and survivors.
          </p>
          <p>
            Official site:{' '}
            <a
              href="https://corum.com.my/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-qehBlue hover:underline"
            >
              https://corum.com.my/
            </a>
          </p>
        </div>

        {/* 🔽 Dynamic Firestore Entries */}
        {supportData.length === 0 ? (
          <div className="text-gray-500 text-center py-10">
            No CORUM meetups or updates posted yet.
          </div>
        ) : (
          <div className="space-y-8">
            {supportData.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl shadow-sm bg-white dark:bg-gray-800 transition hover:shadow-md"
              >
                {/* Title */}
                <h2 className="text-xl font-semibold text-qehNavy dark:text-white mb-2">
                  {item.title}
                </h2>

                {/* Description */}
                {item.description && (
                  <div
                    className="prose dark:prose-invert max-w-none mb-3"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                )}

                {/* Clickable Image */}
                {item.imageUrl && (
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title || 'Support Image'}
                      className="w-full rounded-md shadow-md object-cover transition-transform hover:scale-[1.02]"
                      style={{ aspectRatio: '16/9' }}
                    />
                  </a>
                )}

                {/* Optional Link */}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-qehBlue hover:underline block mt-3"
                  >
                    Learn More →
                  </a>
                )}

                {/* Timestamp */}
                {item.createdAt?.toDate && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Updated: {item.createdAt.toDate().toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </Layout>
  )
}