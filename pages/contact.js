import Layout from '../components/Layout'
import { whatsappDefault } from '../data/mock-data'
export default function Contact(){
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || whatsappDefault
  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">Contact</h1>
        <p className="mt-3 text-gray-700 dark:text-gray-300">For questions, message us on WhatsApp:</p>
        <a className="inline-block mt-3 px-4 py-2 rounded-md bg-qehBlue text-white" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Chat on WhatsApp</a>

        <div className="mt-6">
          <h2 className="font-semibold">Emergency</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">For emergencies, call local emergency services immediately.</p>
        </div>
      </div>

      <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || whatsappDefault}`} target="_blank" rel="noreferrer" className="fixed right-6 bottom-6 bg-green-500 text-white p-3 rounded-full shadow-lg">WhatsApp</a>
    </Layout>
  )
}
