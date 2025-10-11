'use client'
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { auth, db } from "../lib/firebaseClient";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function OfficersResources() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [tabs, setTabs] = useState([]);
  const [active, setActive] = useState(0);
  const [loadingTabs, setLoadingTabs] = useState(true);

  // 👤 Auth + Role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await getIdTokenResult(u);
        const r = token.claims?.role?.toLowerCase() || 'public';
        setUser(u);
        setRole(r);
      } else {
        setUser(null);
        setRole('public');
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Load data
  useEffect(() => {
    async function load() {
      setLoadingTabs(true);
      try {
        const q = query(collection(db, "officer_resources"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        setTabs(data);
        setActive(0);
      } catch (e) {
        console.error("load officer resources:", e);
      } finally {
        setLoadingTabs(false);
      }
    }
    load();
  }, []);

  if (loadingAuth) return <Layout><div className="p-6 text-center">Checking access...</div></Layout>;

  if (!['master', 'officer'].includes(role)) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-700 dark:text-gray-300">
          403 — Access restricted. This section is only available to authorised Medical Officers / Admins.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4 text-qehNavy dark:text-white">Officers Resources</h1>

        {loadingTabs && <div className="text-gray-500">Loading resources...</div>}

        {!loadingTabs && tabs.length === 0 && (
          <div className="text-gray-600">No resources published yet.</div>
        )}

        {!loadingTabs && tabs.length > 0 && (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {tabs.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActive(i)}
                  className={`px-4 py-2 rounded-2xl border-2 transition
                    ${i === active
                      ? "bg-qehNavy text-white border-qehNavy shadow-lg"
                      : "bg-white dark:bg-gray-800 text-qehNavy border-gray-200 dark:border-gray-700"
                    }`}
                >
                  {t.title}
                </button>
              ))}
            </div>

            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
              {tabs[active] && (
                <>
                  {tabs[active].imageUrl && (
                    <img
                      src={tabs[active].imageUrl}
                      alt={tabs[active].title}
                      className="w-full h-56 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-qehNavy dark:text-white">
                        {tabs[active].title}
                      </h2>
                      {tabs[active].category && (
                        <span className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {tabs[active].category}
                        </span>
                      )}
                    </div>

                    <div
                      className="prose max-w-none dark:prose-invert text-gray-700 dark:text-gray-300 mt-4"
                      dangerouslySetInnerHTML={{ __html: tabs[active].content || "" }}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}