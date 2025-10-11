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

export default function SupportAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  // ✅ Use your existing Firestore collection
  const COLL = "support_resources";

  // 👤 Auth
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

  // 🔄 Load data
  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const q = query(collection(db, COLL), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("load error:", e);
    }
  }

  async function handleAdd() {
    if (!title.trim()) return alert("Please enter a title.");
    try {
      let imageUrl = "";
      if (image) {
        const imgRef = ref(storage, `support/${Date.now()}_${image.name}`);
        await uploadBytes(imgRef, image);
        imageUrl = await getDownloadURL(imgRef);
      }

      await addDoc(collection(db, COLL), {
        title,
        link,
        description,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setLink("");
      setDescription("");
      setImage(null);
      setShowForm(false);
      await loadItems();
    } catch (e) {
      console.error("add error:", e);
      alert("Failed to add entry — check console.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, COLL, id));
      await loadItems();
    } catch (e) {
      console.error("delete error:", e);
    }
  }

  async function handleEdit(id, existing) {
    const newTitle = prompt("Edit title:", existing.title);
    if (!newTitle) return;
    try {
      await updateDoc(doc(db, COLL, id), { title: newTitle });
      await loadItems();
    } catch (e) {
      console.error("edit error:", e);
    }
  }

  const handleToggleForm = () => {
    setShowForm(!showForm);
    if (!showForm && formRef.current) {
      setTimeout(() => formRef.current.scrollIntoView({ behavior: "smooth" }), 100);
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
          <h1 className="text-2xl font-semibold">Support — Admin</h1>
          <button
            onClick={handleToggleForm}
            className="px-4 py-2 bg-qehBlue text-white rounded hover:opacity-90"
          >
            {showForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {/* Toggle Form */}
        {showForm && (
          <div ref={formRef} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
            <input
              className="border rounded p-2 w-full"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="border rounded p-2 w-full"
              placeholder="Link (optional)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <ReactQuill theme="snow" value={description} onChange={setDescription} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-qehBlue text-white rounded hover:opacity-90"
            >
              Save Item
            </button>
          </div>
        )}

        {/* Display Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    {item.link}
                  </a>
                )}
                <div
                  className="text-sm text-gray-400"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item.id, item)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
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