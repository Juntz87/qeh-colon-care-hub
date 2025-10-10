// pages/admin/support.js
import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { auth, db, storage } from "../../lib/firebaseClient";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminSupport() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState(null);

  const COLL = "support_resources";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await getIdTokenResult(u);
          setIsAdmin(Boolean(token.claims?.admin));
        } catch (e) {
          console.error("getIdTokenResult error:", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const q = query(collection(db, COLL), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("load error:", e);
    }
  }

  async function handleAdd() {
    if (!title.trim()) return alert("Enter a title");
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
        imageUrl,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || null,
      });

      setTitle("");
      setLink("");
      setImage(null);
      await load();
    } catch (e) {
      console.error("add error:", e);
      alert("Failed to add item — see console.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, COLL, id));
      await load();
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete item.");
    }
  }

  if (loading) return <Layout><div className="p-6">Loading...</div></Layout>;
  if (!user) return <Layout><div className="p-6">Please sign in to access admin pages.</div></Layout>;
  if (!isAdmin) return <Layout><div className="p-6">Access denied — admin only.</div></Layout>;

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Support — Admin</h1>

        {/* Add new support item */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
          <input
            className="border rounded p-2 w-full mb-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border rounded p-2 w-full mb-2"
            placeholder="Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="w-full mb-3"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-qehBlue text-white rounded hover:opacity-90"
          >
            Add Support Item
          </button>
        </div>

        {/* List existing items */}
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="p-3 bg-white dark:bg-gray-700 rounded flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{it.title}</div>
                {it.link && (
                  <div className="text-qehBlue">
                    <a href={it.link} target="_blank" rel="noreferrer">
                      {it.link}
                    </a>
                  </div>
                )}
                {it.imageUrl && (
                  <img
                    src={it.imageUrl}
                    alt={it.title}
                    className="w-32 h-20 object-cover rounded mt-2"
                  />
                )}
              </div>
              <button
                onClick={() => handleDelete(it.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:opacity-90"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}