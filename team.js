'use client'
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Layout from "../../components/Layout";
import { auth, db, storage } from "../../lib/firebaseClient";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function TeamAdmin() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("public");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [rank, setRank] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);

  const COLL = "team_members";

  // 👤 Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await getIdTokenResult(u);
        const r = token.claims?.role?.toLowerCase() || "public";
        setUser(u);
        setRole(r);
      } else {
        setUser(null);
        setRole("public");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Load members sorted by rank
  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, COLL), orderBy("rank", "asc"));
        const snap = await getDocs(q);
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Load error:", e);
      }
    }
    load();
  }, []);

  const handleImageUpload = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `team/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const imageUrl = image ? await handleImageUpload(image) : null;

      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), {
          name,
          position,
          rank: Number(rank) || 999,
          bio,
          ...(imageUrl && { imageUrl }),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLL), {
          name,
          position,
          rank: Number(rank) || 999,
          bio,
          imageUrl,
          createdAt: serverTimestamp(),
        });
      }

      setName("");
      setPosition("");
      setRank("");
      setBio("");
      setImage(null);
      setShowForm(false);
      setEditingId(null);
      window.location.reload();
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setName(m.name);
    setPosition(m.position);
    setRank(m.rank || "");
    setBio(m.bio);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this member?")) return;
    await deleteDoc(doc(db, COLL, id));
    setMembers(members.filter((m) => m.id !== id));
  };

  if (loading) return <Layout><div className="p-6">Loading...</div></Layout>;

  if (!['master', 'officer'].includes(role)) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-600 dark:text-gray-300">
          Access denied — Master or Officer role required.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-qehNavy dark:text-white">
            Meet Our Team <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setName("");
                setPosition("");
                setRank("");
                setBio("");
                setImage(null);
              }
            }}
            className={`px-4 py-2 rounded text-white transition ${
              showForm ? "bg-gray-500 hover:bg-gray-600" : "bg-qehBlue hover:bg-qehNavy"
            }`}
          >
            {showForm ? "Cancel" : "New Member"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Position / Role"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <input
              type="number"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="Seniority (1 = Most Senior)"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <ReactQuill theme="snow" value={bio} onChange={setBio} />
            <input
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
              accept="image/*"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded transition duration-200"
            >
              {editingId ? "Update Member" : "Add Member"}
            </button>
          </form>
        )}

        <div className="space-y-4 mt-6">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-qehNavy dark:text-white text-lg">
                    {m.name} <span className="text-gray-400 text-sm">({m.rank || '-'})</span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">{m.position}</div>
                  <div
                    className="mt-2 text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: m.bio }}
                  />
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="w-24 h-24 mt-2 object-cover rounded"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(m)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}