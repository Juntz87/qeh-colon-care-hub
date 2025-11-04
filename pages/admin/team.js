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
  const [imagePath, setImagePath] = useState(null); // stored path (team/<timestamp>_file.jpg)

  const COLL = "team_members";

  // Auth + role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const token = await getIdTokenResult(u);
          const r = (token.claims?.role || token.claims?.Role || "public").toLowerCase();
          setUser(u);
          setRole(r);
        } catch (e) {
          console.warn("Could not read token claims:", e);
          setUser(u);
          setRole("public");
        }
      } else {
        setUser(null);
        setRole("public");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load members sorted by rank
  async function reloadMembers() {
    try {
      const q = query(collection(db, COLL), orderBy("rank", "asc"));
      const snap = await getDocs(q);
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Load error:", e);
    }
  }

  useEffect(() => {
    reloadMembers();
  }, []);

  // Upload file -> returns { url, path }
  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, "_");
      const storagePath = `team/${timestamp}_${safeName}`;
      const storageRef = ref(storage, storagePath);
      const metadata = { contentType: file.type || "image/jpeg" };
      await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(storageRef);
      return { url, path: storagePath };
    } catch (e) {
      console.error("Image upload failed (likely CORS / bucket mismatch):", e);
      throw e;
    }
  };

  // Delete image safely (prefers path; fallback to parse URL)
  const handleImageDelete = async (id, maybePath, maybeUrl) => {
    if (!id && !maybePath && !maybeUrl) return;
    try {
      let deleted = false;

      if (maybePath) {
        try {
          const imgRef = ref(storage, maybePath);
          await deleteObject(imgRef);
          deleted = true;
          console.log("Deleted by path:", maybePath);
        } catch (err) {
          console.warn("Could not delete by path:", err?.message || err);
        }
      }

      if (!deleted && maybeUrl) {
        try {
          const parts = maybeUrl.split("/o/");
          if (parts.length > 1) {
            const pathAndQuery = parts[1];
            const encodedPath = pathAndQuery.split("?")[0];
            const storagePath = decodeURIComponent(encodedPath);
            const imgRef = ref(storage, storagePath);
            await deleteObject(imgRef);
            deleted = true;
            console.log("Deleted by derived path:", storagePath);
          }
        } catch (err) {
          console.warn("Delete by URL fallback failed:", err?.message || err);
        }
      }

      // clear fields in firestore (set explicit nulls to avoid undefined)
      if (id) {
        try {
          await updateDoc(doc(db, COLL, id), { imageUrl: null, imagePath: null });
        } catch (e) {
          console.warn("Could not clear image fields in Firestore:", e?.message || e);
        }
      }

      // update local UI
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, imageUrl: null, imagePath: null } : m)));
      setImageUrl(null);
      setImagePath(null);
      setImage(null);

      if (!deleted) {
        console.warn("Image deletion attempted but may have failed due to Storage permissions or bucket misconfiguration.");
      }
    } catch (e) {
      console.error("Error deleting image:", e);
      alert("Unexpected error deleting image — check console for details.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const prevData = editingId ? members.find((m) => m.id === editingId) : null;

      // keep previous image values unless replaced
      let uploadedUrl = imageUrl || null;
      let uploadedPath = imagePath || prevData?.imagePath || null;

      if (image) {
        // try delete previous storage file (best-effort)
        if (prevData?.imagePath) {
          try {
            const prevRef = ref(storage, prevData.imagePath);
            await deleteObject(prevRef);
            console.log("Deleted previous image before upload:", prevData.imagePath);
          } catch (err) {
            console.warn("Could not delete previous storage image (non-fatal):", err?.message || err);
          }
        }

        try {
          const uploaded = await handleImageUpload(image); // {url, path}
          uploadedUrl = uploaded?.url || uploadedUrl;
          uploadedPath = uploaded?.path || uploadedPath;
        } catch (uploadErr) {
          console.error("Upload failed (continuing without new image):", uploadErr);
          alert("Image upload failed (likely bucket/CORS). The record will still be saved without changing the image.");
        }
      }

      // Build payload with defaults (avoid undefined)
      const fields = {
        name: name ?? "",
        position: position ?? "",
        rank: Number(rank) || 999,
        bio: bio ?? "",
        imageUrl: uploadedUrl || null,
        imagePath: uploadedPath || null,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, COLL, editingId), fields);
      } else {
        const addFields = { ...fields };
        addFields.createdAt = serverTimestamp();
        delete addFields.updatedAt;
        await addDoc(collection(db, COLL), addFields);
      }

      // reset form
      setName("");
      setPosition("");
      setRank("");
      setBio("");
      setImage(null);
      setImageUrl(null);
      setImagePath(null);
      setEditingId(null);
      setShowForm(false);

      // smooth scroll to top & reload listing
      window.scrollTo({ top: 0, behavior: "smooth" });
      await reloadMembers();
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save. Check console for details.");
    }
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setName(m.name || "");
    setPosition(m.position || "");
    setRank(m.rank || "");
    setBio(m.bio || "");
    setImageUrl(m.imageUrl || null);
    setImagePath(m.imagePath || null);
    setShowForm(true);
    // scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this member?")) return;
    try {
      await deleteDoc(doc(db, COLL, id));
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete — check console for details.");
    }
  };

  const moveItem = async (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= members.length) return;

    const updated = [...members];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    try {
      await Promise.all(
        updated.map((item, i) =>
          updateDoc(doc(db, COLL, item.id), { rank: i + 1 })
        )
      );
      setMembers(updated);
    } catch (e) {
      console.error("Reorder failed:", e);
      alert("Reorder failed — check console for details.");
    }
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
                setImagePath(null);
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
                  onClick={() => handleImageDelete(editingId, imagePath, imageUrl)}
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
                  dangerouslySetInnerHTML={{ __html: m.bio || "" }}
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