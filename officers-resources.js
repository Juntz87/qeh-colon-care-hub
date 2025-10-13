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
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const COLL = "officer_resources";

  // 👤 Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await getIdTokenResult(u);
        setUser(u);
        setRole(token.claims?.role?.toLowerCase() || "public");
      } else {
        setUser(null);
        setRole("public");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Load all docs (assign default order to legacy)
  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, COLL), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        const loaded = snap.docs.map((d, i) => ({
          id: d.id,
          ...d.data(),
          order: d.data().order ?? i, // assign fallback order
        }));
        setResources(loaded.sort((a, b) => a.order - b.order));
      } catch (e) {
        console.error("Load error:", e);
      }
    }
    load();
  }, []);

  // 🖼 Upload with progress
  const handleImageUpload = async (file) => {
    if (!file) return null;
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `${COLL}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        "state_changed",
        (snap) =>
          setUploadProgress(
            ((snap.bytesTransferred / snap.totalBytes) * 100).toFixed(0)
          ),
        reject,
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  };

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
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "unknown",
          order: resources.length,
        });
      }

      setTitle("");
      setContent("");
      setImage(null);
      setShowForm(false);
      setEditingId(null);
      setUploadProgress(0);
      window.location.reload();
    } catch (e) {
      console.error("Error saving:", e);
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

  // 🔼🔽 Order handlers
  const swap = (arr, i, j) => {
    const copy = [...arr];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  const handleMoveUp = (index) =>
    index > 0 && setResources(swap(resources, index, index - 1));

  const handleMoveDown = (index) =>
    index < resources.length - 1 && setResources(swap(resources, index, index + 1));

  const handleSaveOrder = async () => {
    try {
      const batch = writeBatch(db);
      resources.forEach((r, i) =>
        batch.update(doc(db, COLL, r.id), { order: i })
      );
      await batch.commit();
      alert("Order saved!");
    } catch (e) {
      console.error("Save order error:", e);
    }
  };

  if (loading)
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    );

  if (!["master", "officer"].includes(role))
    return (
      <Layout>
        <div className="p-6 text-center text-gray-500">
          Access denied — Master or Officer only.
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-qehNavy dark:text-white">
            Officers Resources <span className="text-gray-400">(Admin)</span>
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
            className={`px-4 py-2 rounded text-white ${
              showForm ? "bg-gray-500" : "bg-qehBlue hover:bg-qehNavy"
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
            {uploadProgress > 0 && (
              <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded"
            >
              {editingId ? "Update Entry" : "Submit Update"}
            </button>
          </form>
        )}

        {/* Ordered list */}
        <div className="mt-6">
          <div className="flex justify-end mb-3">
            <button
              onClick={handleSaveOrder}
              className="px-3 py-1 bg-qehBlue text-white rounded hover:bg-qehNavy"
            >
              Save Order
            </button>
          </div>

          <div className="space-y-4">
            {resources.map((r, i) => (
              <div
                key={r.id}
                className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-qehNavy dark:text-white">
                      {r.title || "Untitled"}
                    </div>
                    <div
                      className="mt-2 text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: r.content }}
                    />
                    {r.imageUrl && (
                      <a href={r.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={r.imageUrl}
                          alt=""
                          className="w-full max-w-md mt-2 rounded-lg object-cover hover:scale-[1.02] transition-transform"
                        />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <div className="text-sm text-gray-400">#{i + 1}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveUp(i)}
                        disabled={i === 0}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(i)}
                        disabled={i === resources.length - 1}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}