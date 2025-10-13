// pages/patients.js
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db } from "../lib/firebaseClient";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function Patients() {
  const [tabs, setTabs] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Read from Firestore (patients_tabs collection)
        const q = query(collection(db, "patients_tabs"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTabs(data);
        setActive(0);
      } catch (e) {
        console.error("Error loading patients tabs:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white mb-4">
          Patient Education
        </h1>

        {loading && <div className="text-gray-500">Loading...</div>}

        {!loading && tabs.length === 0 && (
          <div className="text-gray-600">No patient education tabs found.</div>
        )}

        {!loading && tabs.length > 0 && (
          <div className="mt-4">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {tabs.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActive(i)}
                  className={`px-3 py-2 rounded-md transition ${
                    active === i
                      ? "bg-qehBlue text-white shadow"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>

            {/* Active Tab Content */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {tabs[active].imageUrl && (
                <img
                  src={tabs[active].imageUrl}
                  alt={tabs[active].title}
                  className="w-full h-56 object-cover rounded mb-4"
                />
              )}

              <h2 className="text-xl font-semibold text-qehNavy dark:text-white mb-3">
                {tabs[active].title}
              </h2>

              <div
                className="prose max-w-none dark:prose-invert text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: tabs[active].content || "" }}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}