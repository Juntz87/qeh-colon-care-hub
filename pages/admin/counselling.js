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

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function CounsellingAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  // ✅ Use your actual Firestore collection
  const COLL = "counselling_tabs";

  // 👤 Auth listener
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
      } else setIsAdmin(false);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Load existing data
  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const q = query(collection(db, COLL), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setSections(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Load error:", e);
    }
  }

  async function handleAdd() {
    if (!title.trim()) return alert("Please enter a title.");
    try {
      let imageUrl = "";
      if (image) {
        const imgRef = ref(storage, `counselling/${Date.now()}_${image.name}`);
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
      await loadSections();
    } catch (e) {
      console.error("Add error:", e);
      alert("Failed to add section — check console.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteDoc(doc(db, COLL, id));
      await loadSections();
    } catch (e) {
      console.error("Delete error:", e);
    }
  }

  async function handleEdit(id, existing) {
    const newTitle = prompt("Edit title:", existing.title);
    if (!newTitle) return;
    try {
      await updateDoc(doc(db, COLL, id), { title: newTitle });
      await loadSections();
    } catch (e) {
      console.error("Edit error:", e);
    }
  }

  const handleToggleForm = () => {
    setShowForm(!showForm);
    if (!showForm && formRef.current) {
      setTimeout(() => {
        formRef.current.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Counselling — Admin</h1>
          <button
            onClick={handleToggleForm}
            className="px-4 py-2 bg-qehBlue text-white rounded hover:opacity-90"
          >
            {showForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {/* New Form */}
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
              Save Section
            </button>
          </div>
        )}

        {/* Display Existing */}
        <div className="space-y-3">
          {sections.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold">{s.title}</h2>
                <div
                  className="text-sm text-gray-400"
                  dangerouslySetInnerHTML={{ __html: s.content }}
                />
                {s.imageUrl && (
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(s.id, s)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
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