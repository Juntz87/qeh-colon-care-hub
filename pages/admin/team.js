'use client'

import { useEffect, useState, useRef } from "react";
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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function TeamAdmin() {
  const formRef = useRef(null);

  const [user, setUser] = useState(null);
  const [role, setRole] = useState("public");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [rank, setRank] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null); // selected File object
  const [imageUrl, setImageUrl] = useState(null); // preview/public url when editing

  const COLL = "team_members";

  // 👤 Auth
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

  // 🔄 Load members sorted by rank
  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, COLL), orderBy("rank", "asc"));
        const snap = await getDocs(q);
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Load error:", e);
      }
    }
    load();
  }, []);

  // Upload file -> returns { url, path } where path is storage path (e.g. team/ts_filename.jpg)
  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, '_');
      const storagePath = `team/${timestamp}_${safeName}`;
      const storageRef = ref(storage, storagePath);
      const metadata = { contentType: file.type || 'image/jpeg' };
      await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(storageRef);
      return { url, path: storagePath };
    } catch (e) {
      console.error("Image upload failed:", e);
      throw e;
    }
  };

  // Delete image by preferring known storagePath; fallback to parse download URL
  const handleImageDelete = async (id, maybeImagePath, maybeImageUrl) => {
    if (!id && !maybeImagePath && !maybeImageUrl) return;

    try {
      let deletedFromStorage = false;

      // 1) If we have a storage path stored in the doc, delete with that first (reliable)
      if (maybeImagePath) {
        try {
          const imgRef = ref(storage, maybeImagePath);
          await deleteObject(imgRef);
          deletedFromStorage = true;
          console.log('Deleted image from storage by path:', maybeImagePath);
        } catch (err) {
          console.warn('Could not delete image by stored path:', err?.message || err);
        }
      }

      // 2) Fallback: if we have only a download URL, attempt to derive encoded path and delete
      if (!deletedFromStorage && maybeImageUrl) {
        try {
          const parts = maybeImageUrl.split('/o/');
          if (parts.length > 1) {
            const pathAndQuery = parts[1];
            const encodedPath = pathAndQuery.split('?')[0];
            const storagePath = decodeURIComponent(encodedPath);
            const imgRef = ref(storage, storagePath);
            await deleteObject(imgRef);
            deletedFromStorage = true;
            console.log('Deleted image from storage by derived path:', storagePath);
          }
        } catch (err) {
          console.warn('Could not delete object from storage using URL fallback:', err?.message || err);
        }
      }

      // 3) Clear Firestore fields (imageUrl and imagePath)
      if (id) {
        try {
          await updateDoc(doc(db, COLL, id), { imageUrl: null, imagePath: null });
          console.log('Cleared imageUrl and imagePath in Firestore for id:', id);
        } catch (e) {
          console.warn('Could not clear imageUrl/imagePath in Firestore:', e?.message || e);
        }
      }

      // 4) Update local UI state so placeholder disappears immediately
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, imageUrl: null, imagePath: null } : m)));
      setImageUrl(null);
      setImage(null);

      if (!deletedFromStorage) {
        // Most likely permission issue; inform user but it's non-blocking
        console.warn('Image deletion attempted but may have failed due to Storage permissions.');
      }
    } catch (e) {
      console.error('Error deleting image:', e);
      alert('Unexpected error deleting image — check console for details.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Find currently editing doc (if editing)
      const prevData = editingId ? members.find((m) => m.id === editingId) : null;

      // If a new file is selected, upload it and get url/path.
      // If no new file but imageUrl exists (from editing), keep it.
      let uploadedUrl = imageUrl || null;
      let uploadedPath = prevData?.imagePath || null;

      if (image) {
        // If we have an existing storage file (previous image), try to delete it first
        if (prevData?.imagePath) {
          try {
            const prevRef = ref(storage, prevData.imagePath);
            await deleteObject(prevRef);
            console.log('Deleted previous storage image before uploading new one:', prevData.imagePath);
          } catch (err) {
            console.warn('Could not delete previous storage image (non-fatal):', err?.message || err);
          }
        }

        const uploaded = await handleImageUpload(image); // {url, path}
        uploadedUrl = uploaded?.url || uploadedUrl;
        uploadedPath = uploaded?.path || uploadedPath;
      }

      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), {
          name,
          position,
          rank: Number(rank) || 999,
          bio,
          imageUrl: uploadedUrl || null,
          imagePath: uploadedPath || null,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLL), {
          name,
          position,
          rank: Number(rank) || 999,
          bio,
          imageUrl: uploadedUrl || null,
          imagePath: uploadedPath || null,
          createdAt: serverTimestamp(),
        });
      }

      // clear form
      setName("");
      setPosition("");
      setRank("");
      setBio("");
      setImage(null);
      setImageUrl(null);
      setEditingId(null);
      setShowForm(false);

      // scroll top and refresh listing
      window.scrollTo({ top: 0, behavior: "smooth" });
      const q = query(collection(db, COLL), orderBy("rank", "asc"));
      const snap = await getDocs(q);
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save. Check console for details.");
    }
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setName(m.name);
    setPosition(m.position);
    setRank(m.rank || "");
    setBio(m.bio);
    setImageUrl(m.imageUrl || null);
    setShowForm(true);
    // scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this member?")) return;
    await deleteDoc(doc(db, COLL, id));
    setMembers(members.filter((m) => m.id !== id));
  };

  const moveItem = async (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= members.length) return;

    const updated = [...members];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    await Promise.all(
      updated.map((item, i) =>
        updateDoc(doc(db, COLL, item.id), { rank: i + 1 })
      )
    );
    setMembers(updated);
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
      <div className="p-6 space-y-6" ref={formRef}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-qehNavy dark:text-white">
            Meet Our Team <span className="text-gray-400 text-lg">(Admin)</span>
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setName("");
                setPosition("");
                setRank("");
                setBio("");
                setImage(null);
                setImageUrl(null);
              }
            }}
            className={`px-4 py-2 rounded text-white transition ${
              showForm ? "bg-gray-500 hover:bg-gray-600" : "bg-qehBlue hover:bg-qehNavy"
            }`}
          >
            {showForm ? "Cancel" : "New Member"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Position / Role"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <input
              type="number"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="Seniority (1 = Most Senior)"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <ReactQuill theme="snow" value={bio} onChange={setBio} />
            <input
              type="file"
              onChange={(e) => {
                setImage(e.target.files[0] || null);
                // If user picks a different file, keep existing preview URL until upload completes
              }}
              accept="image/*"
            />

            {imageUrl && (
              <div className="relative mt-2">
                <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                  <img src={imageUrl} alt="" className="w-32 h-32 object-cover rounded cursor-pointer" />
                </a>
                <button
                  type="button"
                  onClick={() => handleImageDelete(editingId, members.find(m => m.id === editingId)?.imagePath, imageUrl)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full px-2 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-qehBlue hover:bg-qehNavy text-white rounded transition duration-200"
            >
              {editingId ? "Update Member" : "Add Member"}
            </button>
          </form>
        )}

        <div className="space-y-4 mt-6">
          {members.map((m, index) => (
            <div
              key={m.id}
              className="p-4 border rounded bg-white dark:bg-gray-800 shadow-sm flex justify-between"
            >
              <div>
                <h3 className="font-semibold text-qehNavy dark:text-white text-lg">
                  {m.name} <span className="text-gray-400 text-sm">({m.rank || '-'})</span>
                </h3>
                <div className="text-gray-600 dark:text-gray-300">{m.position}</div>
                <div
                  className="mt-2 text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: m.bio }}
                />
                {m.imageUrl && (
                  <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="w-24 h-24 mt-2 object-cover rounded cursor-pointer"
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
                    onClick={() => handleEdit(m)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-md transition duration-200 w-20 sm:w-auto"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
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