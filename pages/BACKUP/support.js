// pages/support.js
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db } from "../lib/firebaseClient";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Support() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "support_resources"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error loading support data:", e);
      }
    }
    load();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4 text-qehNavy">Support & CORUM</h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Our CORUM community provides emotional and social support for colorectal cancer patients
          and survivors.
          <br />
          Official site:{" "}
          <a
            href="https://corum.com.my/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-qehBlue hover:underline"
          >
            https://corum.com.my/
          </a>
        </p>

        {items.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">No support updates yet.</div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {items.map((it, i) => (
            <div
              key={it.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              {it.imageUrl && (
                <img
                  src={it.imageUrl}
                  alt={it.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-lg font-semibold text-qehNavy dark:text-white mb-1">
                  Meetup {i + 1}: {it.title}
                </h2>
                {it.link && (
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-qehBlue hover:underline text-sm"
                  >
                    {it.link}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}