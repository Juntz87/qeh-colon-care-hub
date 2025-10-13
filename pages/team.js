'use client'
import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { db } from "../lib/firebaseClient";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Team() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const q = query(collection(db, "team_members"), orderBy("rank", "asc"));
        const snap = await getDocs(q);
        const members = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unnamed",
            position: data.position || data.role || "",
            imageUrl: data.imageUrl || data.photo || "",
            rank: data.rank || 999,
            bio: data.bio || "",
          };
        });
        setTeam(members);
      } catch (e) {
        console.error("Error loading team:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
          Meet Our Team
        </h1>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          Our multidisciplinary team provides expert colorectal care.
        </p>

        {loading ? (
          <div className="mt-8 text-center text-gray-500">Loading team...</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {team.map((m) => (
              <div
                key={m.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg flex flex-col items-center text-center hover:shadow-lg hover:shadow-qehBlue/20 dark:hover:shadow-qehBlue/40 transition"
              >
                <img
                  src={m.imageUrl || "/default-avatar.png"}
                  alt={m.name}
                  className="w-28 h-28 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="mt-3">
                  <div className="font-semibold text-qehNavy dark:text-white">
                    {m.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {m.position}
                  </div>
                  {m.bio && (
                    <div
                      className="mt-2 text-gray-700 dark:text-gray-300 text-sm"
                      dangerouslySetInnerHTML={{ __html: m.bio }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}