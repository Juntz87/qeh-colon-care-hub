'use client'

import { useEffect, useState, useRef } from "react";
import Layout from "../../components/Layout";
import dynamic from "next/dynamic";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../../lib/firebaseClient";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function CounsellingAdmin() {
  const [tabs, setTabs] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const formRef = useRef(null);

  const COLL = "counselling_tabs";

  // 👤 Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await getIdTokenResult(u);
        setUser(u);
        setRole(token.claims?.role || "public");
      } else {
        setUser(null);
        setRole("public");
      }
    });
    return () => unsub();
  }, []);

  // 🔄 Load tabs
  useEffect(() => {
    async function load() {
      const q = query(collection(db, COLL), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setTabs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  // 🖼 Upload image
  const handleImageUpload = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `counselling/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // 🗑 Delete image
  const handleImageDelete = async (id, imageUrl) => {
    try {
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => {});
      }
      await updateDoc(doc(db, COLL, id), { imageUrl: null, updatedAt: serverTimestamp() });
      setTabs(tabs.map((t) => (t.id === id ? { ...t, imageUrl: null } : t)));
      setImageUrl(null);
    } catch (e) {
      console.error("Error deleting image:", e);
    }
  };

  // 💾 Save or update tab
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const uploadedUrl = image ? await handleImageUpload(image) : imageUrl || null;
      let newOrder = tabs.length + 1;

      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), {
          title,
          content,
          imageUrl: uploadedUrl,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLL), {
          title,
          content,
          imageUrl: uploadedUrl,
          order: newOrder,
          createdAt: serverTimestamp(),
        });
      }

      setTitle("");
      setContent("");
      setImage(null);
      setImageUrl(null);
      setEditingId(null);
      setShowForm(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.location.reload();
    } catch (e) {
      console.error("Error saving:", e);
    }
  };

  // ✏ Edit tab
  const handleEdit = (t) => {
    setEditingId(t.id);
    setTitle(t.title);
    setContent(t.content);
    setImageUrl(t.imageUrl || null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  };

  // ❌ Delete tab
  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, COLL, id));
    setTabs(tabs.filter((t) => t.id !== id));
  };

  // ⬆⬇ Reorder
  const moveItem = async (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tabs.length) return;

    const updatedTabs = [...tabs];
    const temp = updatedTabs[index];
    updatedTabs[index] = updatedTabs[newIndex];
    updatedTabs[newIndex] = temp;

    await Promise.all(
      updatedTabs.map((item, i) => updateDoc(doc(db, COLL, item.id), { order: i + 1 }))
    );
    setTabs(updatedTabs);
  };

  if (!["master", "officer"].includes(role))
    return (
      <Layout>
        <div className="p-6 text-center text-gray-600 dark:text-gray-300">
          Access denied — Master or Officer role required.
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="p-6 space-y-6" ref={formRef}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-qehNavy dark:text-white">
            Counselling <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded text-white transition ${
              showForm ? "bg-gray-500 hover:bg-gray-600" : "bg-qehBlue hover:bg-qehNavy"
            }`}
          >
            {showForm ? "Cancel" : "New Update"}
          </button>
        </div>

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
            <input type="file" onChange={(e) => setImage(e.target.files[0])} accept="image/*" />
            {imageUrl && (
              <div className="relative mt-2">
                <img src={imageUrl} alt="" className="w-32 h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleImageDelete(editingId, imageUrl)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full px-2 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded"
            >
              {editingId ? "Update Entry" : "Submit Update"}
            </button>
          </form>
        )}

        <div className="space-y-4 mt-6">
          {tabs.map((t, index) => (
            <div
              key={t.id}
              className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm flex justify-between"
            >
              <div>
                <h3 className="font-semibold text-qehNavy dark:text-white">{t.title}</h3>
                <div
                  className="mt-2 text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: t.content }}
                />
                {t.imageUrl && (
                  <a href={t.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={t.imageUrl}
                      alt=""
                      className="w-24 h-24 mt-2 object-cover rounded hover:scale-105 transition-transform cursor-pointer"
                    />
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-center justify-end">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveItem(index, "up")}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded px-2 py-1 mb-1"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded px-2 py-1"
                  >
                    ↓
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(t)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-md transition duration-200 w-20 sm:w-auto"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-md transition duration-200 w-20 sm:w-auto"
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