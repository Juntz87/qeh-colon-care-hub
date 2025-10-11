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

export default function OfficersResourcesAdmin() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("public");
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const COLL = "officer_resources";

  // 👤 Auth + Role
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

  // 🔄 Load existing resources
  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, COLL));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const orderA = a.order ?? 9999;
          const orderB = b.order ?? 9999;
          if (orderA !== orderB) return orderA - orderB;
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setResources(data);
      } catch (e) {
        console.error("Load error:", e);
      }
    }
    load();
  }, []);

  const handleImageUpload = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `officers/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // 💾 Save or update
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const imageUrl = image ? await handleImageUpload(image) : null;

      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), {
          title,
          content,
          ...(imageUrl && { imageUrl }),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLL), {
          title,
          content,
          imageUrl,
          order: Date.now(), // ensures sorting consistency with old data
          createdAt: serverTimestamp(),
        });
      }

      setTitle("");
      setContent("");
      setImage(null);
      setShowForm(false);
      setEditingId(null);

      // Reload data
      const snap = await getDocs(collection(db, COLL));
      const updatedData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      updatedData.sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setResources(updatedData);
    } catch (e) {
      console.error("Error saving:", e);
      alert("❌ Failed to save. Check console for details.");
    }
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setTitle(r.title);
    setContent(r.content);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, COLL, id));
    setResources(resources.filter((r) => r.id !== id));
  };

  if (loading) return <Layout><div className="p-6">Loading...</div></Layout>;

  if (!["master", "officer"].includes(role)) {
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
            Officers Resources <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setTitle("");
                setContent("");
                setImage(null);
              }
            }}
            className={`px-4 py-2 rounded text-white transition ${
              showForm
                ? "bg-gray-500 hover:bg-gray-600"
                : "bg-qehBlue hover:bg-qehNavy"
            }`}
          >
            {showForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {/* ✏️ Form */}
        {showForm && (
          <form
            onSubmit={handleSave}
            className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <ReactQuill theme="snow" value={content} onChange={setContent} />
            <input
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
              accept="image/*"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded transition duration-200"
            >
              {editingId ? "Update Entry" : "Submit Update"}
            </button>
          </form>
        )}

        {/* 📜 Display List */}
        <div className="space-y-4 mt-6">
          {resources.map((r) => (
            <div
              key={r.id}
              className="p-4 border rounded bg-gray-50 dark:bg-gray-700 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-qehNavy dark:text-white">
                    {r.title || "Untitled"}
                  </div>
                  <div
                    className="mt-2 text-gray-700 dark:text-gray-200"
                    dangerouslySetInnerHTML={{ __html: r.content }}
                  />
                  {r.imageUrl && (
                    <img
                      src={r.imageUrl}
                      alt=""
                      className="w-24 h-24 mt-2 object-cover rounded"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(r)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
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