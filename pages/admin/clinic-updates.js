import React, { useEffect, useState } from "react";
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

export default function ClinicUpdatesAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("MDT");
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const COLL = "clinic_updates";

  // 👤 Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await getIdTokenResult(u);
        setIsAdmin(Boolean(token.claims?.admin));
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Load data
  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    const q = query(collection(db, COLL), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  // ➕ Add new entry
  async function handleAdd() {
    if (!title.trim()) return alert("Please enter a title");
    try {
      setUploading(true);
      let imageUrl = "";
      if (imageFile) {
        const imgRef = ref(storage, `clinic/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imgRef, imageFile);
        imageUrl = await getDownloadURL(imgRef);
      }

      await addDoc(collection(db, COLL), {
        title,
        body,
        category,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setBody("");
      setCategory("MDT");
      setImageFile(null);
      setShowForm(false);
      await loadEntries();
    } catch (err) {
      console.error("Add error:", err);
      alert("Failed to add entry.");
    } finally {
      setUploading(false);
    }
  }

  // ✏️ Edit entry
  async function handleEdit(id, existing) {
    const newTitle = prompt("Edit title:", existing.title);
    if (!newTitle) return;
    await updateDoc(doc(db, COLL, id), { title: newTitle });
    await loadEntries();
  }

  // ❌ Delete entry
  async function handleDelete(id) {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, COLL, id));
    await loadEntries();
  }

  // 🕒 UI states
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

  // 🧱 Render
  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header with Toggle */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-qehNavy dark:text-white">
            Clinic Updates — Admin
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-qehBlue text-white px-4 py-2 rounded hover:bg-qehNavy transition"
          >
            {showForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {/* Add New Update Form */}
        {showForm && (
          <div className="grid gap-4 mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Add New Update</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body"
              rows="3"
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            >
              <option>MDT</option>
              <option>Scan</option>
              <option>Social Welfare</option>
              <option>Case Discussion</option>
            </select>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="p-2 border rounded w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={uploading}
                className="bg-qehBlue text-white px-4 py-2 rounded hover:bg-qehNavy transition"
              >
                {uploading ? "Uploading..." : "Add Entry"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing Entries */}
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-700 p-4 rounded-lg flex justify-between items-start"
            >
              <div>
                <h2 className="font-semibold">{entry.title}</h2>
                <p className="text-sm text-gray-500">
                  {entry.category} •{" "}
                  {entry.createdAt
                    ? new Date(entry.createdAt.seconds * 1000).toLocaleString()
                    : "Pending..."}
                </p>
                <p className="mt-2">{entry.body}</p>
                {entry.imageUrl && (
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(entry.id, entry)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
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