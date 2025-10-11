import React, { useEffect, useState, useRef } from "react";
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

// ✨ Rich text editor
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function OfficersResourcesAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  const COLL = "officer_resources"; // ✅ Correct Firestore collection

  // 👤 Firebase Auth + Admin Check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await getIdTokenResult(u);
          setIsAdmin(Boolean(token.claims?.admin));
        } catch (e) {
          console.error("Token error:", e);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Fetch existing officer resources
  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      const q = query(collection(db, COLL), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Load error:", e);
    }
  }

  // ➕ Add new resource
  async function handleAdd() {
    if (!title.trim()) return alert("Please enter a title.");
    try {
      let imageUrl = "";
      if (image) {
        const imgRef = ref(storage, `officers/${Date.now()}_${image.name}`);
        await uploadBytes(imgRef, image);
        imageUrl = await getDownloadURL(imgRef);
      }

      await addDoc(collection(db, COLL), {
        title,
        content,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setContent("");
      setImage(null);
      setShowForm(false);
      await loadResources();
    } catch (e) {
      console.error("Add error:", e);
      alert("Failed to add resource — check console.");
    }
  }

  // ✏️ Edit existing
  async function handleEdit(id, existing) {
    const newTitle = prompt("Edit title:", existing.title);
    if (!newTitle) return;
    try {
      await updateDoc(doc(db, COLL, id), { title: newTitle });
      await loadResources();
    } catch (e) {
      console.error("Edit error:", e);
    }
  }

  // ❌ Delete existing
  async function handleDelete(id) {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteDoc(doc(db, COLL, id));
      await loadResources();
    } catch (e) {
      console.error("Delete error:", e);
    }
  }

  // 🔘 Toggle form visibility
  const handleToggleForm = () => {
    setShowForm(!showForm);
    if (!showForm && formRef.current) {
      setTimeout(() => {
        formRef.current.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // 🕒 Loading states
  if (loading)
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    );

  if (!user)
    return (
      <Layout>
        <div className="p-6">Please sign in to access admin pages.</div>
      </Layout>
    );

  if (!isAdmin)
    return (
      <Layout>
        <div className="p-6">Access denied — admin only.</div>
      </Layout>
    );

  // 🧱 Main Render
  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Officers Resources — Admin</h1>
          <button
            onClick={handleToggleForm}
            className="px-4 py-2 bg-qehBlue text-white rounded hover:opacity-90"
          >
            {showForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div
            ref={formRef}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3"
          >
            <input
              className="border rounded p-2 w-full"
              placeholder="Section Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <ReactQuill theme="snow" value={content} onChange={setContent} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-qehBlue text-white rounded hover:opacity-90"
            >
              Save Resource
            </button>
          </div>
        )}

        {/* Existing Data */}
        <div className="space-y-3">
          {resources.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-gray-700 p-4 rounded-lg flex justify-between items-start"
            >
              <div>
                <h2 className="font-semibold">{r.title}</h2>
                <div
                  className="text-sm text-gray-400 mt-1"
                  dangerouslySetInnerHTML={{ __html: r.content }}
                />
                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt={r.title}
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(r.id, r)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}