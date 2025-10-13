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

export default function PatientsAdmin() {
  const [tabs, setTabs] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const formRef = useRef(null);

  const COLL = "patients_tabs";

  // 👤 Auth
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

  // 🔄 Load data
  useEffect(() => {
    async function load() {
      const q = query(collection(db, COLL), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setTabs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  // 🖼️ Upload Image
  const handleImageUpload = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `patients/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // 🗑️ Delete Image
  const handleImageDelete = async (id, imageUrl) => {
    try {
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => {});
      }
      await updateDoc(doc(db, COLL, id), {
        imageUrl: null,
        updatedAt: serverTimestamp(),
      });
      setTabs(tabs.map((t) => (t.id === id ? { ...t, imageUrl: null } : t)));
      setImageUrl(null);
    } catch (e) {
      console.error("Error deleting image:", e);
    }
  };

  // 💾 Save / Update
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const uploadedUrl = image ? await handleImageUpload(image) : imageUrl || null;

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

  // ✏️ Edit
  const handleEdit = (tab) => {
    setEditingId(tab.id);
    setTitle(tab.title);
    setContent(tab.content);
    setImageUrl(tab.imageUrl || null);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  // ❌ Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, COLL, id));
    setTabs(tabs.filter((t) => t.id !== id));
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
            Patient Education <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded text-white transition ${
              showForm
                ? "bg-gray-500 hover:bg-gray-600"
                : "bg-qehBlue hover:bg-qehNavy"
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
            <input
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
              accept="image/*"
            />
            {imageUrl && (
              <div className="relative mt-2">
                <img
                  src={imageUrl}
                  alt=""
                  className="w-32 h-32 object-cover rounded"
                />
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

        {/* Existing Entries */}
        <div className="space-y-4 mt-6">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm flex justify-between"
            >
              <div>
                <h3 className="font-semibold text-qehNavy dark:text-white">{tab.title}</h3>
                <div
                  className="mt-2 text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: tab.content }}
                />
                {tab.imageUrl && (
                  <img
                    src={tab.imageUrl}
                    alt=""
                    className="w-24 h-24 mt-2 object-cover rounded"
                  />
                )}
              </div>
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center sm:items-start justify-end">
  <button
    onClick={() => handleEdit(tab)}
    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-md transition duration-200 w-20 sm:w-auto"
  >
    Edit
  </button>
  <button
    onClick={() => handleDelete(tab.id)}
    className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-md transition duration-200 w-20 sm:w-auto"
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