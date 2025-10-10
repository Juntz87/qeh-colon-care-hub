// pages/admin/officers-resources.js
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function AdminOfficerResources() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [tabs, setTabs] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState(100);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);

  const COLL = "officer_resources";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await getIdTokenResult(u);
          setIsAdmin(Boolean(token.claims?.admin));
        } catch (e) {
          console.error("token error:", e);
        }
      } else {
        setIsAdmin(false);
      }
      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    loadTabs();
  }, []);

  async function loadTabs() {
    try {
      const q = query(collection(db, COLL), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setTabs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("load officer resources:", e);
    }
  }

  async function handleAdd() {
    if (!title.trim()) return alert("Enter a title");
    try {
      let imageUrl = "";
      if (image) {
        const imgRef = ref(storage, `officer_resources/${Date.now()}_${image.name}`);
        await uploadBytes(imgRef, image);
        imageUrl = await getDownloadURL(imgRef);
      }

      await addDoc(collection(db, COLL), {
        title,
        category,
        content,
        imageUrl,
        order: Number(order) || 100,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setCategory("");
      setContent("");
      setOrder(100);
      setImage(null);
      await loadTabs();
    } catch (e) {
      console.error("add error:", e);
      alert("Failed to add resource. See console.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this resource?")) return;
    try {
      await deleteDoc(doc(db, COLL, id));
      await loadTabs();
    } catch (e) {
      console.error("delete error:", e);
      alert("Failed to delete.");
    }
  }

  async function handleChangeOrder(id) {
    const newOrder = prompt("New order (number):");
    if (!newOrder) return;
    try {
      await updateDoc(doc(db, COLL, id), { order: Number(newOrder) });
      await loadTabs();
    } catch (e) {
      console.error("update order error:", e);
      alert("Failed to update order.");
    }
  }

  if (loadingAuth) return <Layout><div className="p-6">Loading...</div></Layout>;
  if (!user) return <Layout><div className="p-6">Please sign in to access admin pages.</div></Layout>;
  if (!isAdmin) return <Layout><div className="p-6">Access denied — admin only.</div></Layout>;

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Officers Resources — Admin</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
          <input
            className="border rounded p-2 w-full mb-2"
            placeholder="Title (e.g. Surveillance)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-2 mb-2">
            <input
              className="border rounded p-2 w-36"
              placeholder="Category (e.g. Follow-up)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="border rounded p-2 w-24"
              placeholder="Order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="flex-1"
            />
          </div>

          <div className="mb-3">
            <ReactQuill theme="snow" value={content} onChange={setContent} />
          </div>

          <div>
            <button onClick={handleAdd} className="px-4 py-2 bg-qehBlue text-white rounded">
              Add Resource
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-2">Existing Resources</h2>
        <div className="space-y-3">
          {tabs.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-700 p-3 rounded flex items-start justify-between">
              <div>
                <div className="font-medium">
                  {t.title} <span className="text-sm text-gray-500">#{t.order}</span>
                </div>
                <div className="text-sm text-gray-500">{t.category}</div>
                <div className="text-sm text-gray-400">
                  {t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleString() : ""}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleChangeOrder(t.id)} className="px-3 py-1 bg-yellow-500 text-white rounded">Change order</button>
                <button onClick={() => handleDelete(t.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}