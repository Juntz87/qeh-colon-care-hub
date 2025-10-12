'use client'
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

export default function QEHStyleGuide() {
  const [role, setRole] = useState("public");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await getIdTokenResult(u);
        const r = token.claims?.role?.toLowerCase() || "public";
        setRole(r);
      } else {
        setRole("public");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading)
    return (
      <Layout>
        <div className="text-center py-20">Loading design preview...</div>
      </Layout>
    );

  if (role !== "master") {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-500 dark:text-gray-300">
          Access denied — Master role required.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="qeh-container space-y-10">
        <h1 className="text-3xl font-bold text-qehNavy dark:text-white">🎨 QEH Style Guide</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Visual reference for all reusable design components — buttons, cards, typography, and layout spacing.
        </p>

        {/* BUTTONS */}
        <section className="space-y-4">
          <h2 className="section-header">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-cancel">Cancel</button>
            <button className="btn btn-warning">Warning</button>
            <button className="btn btn-danger">Delete</button>
            <button className="btn btn-success">Success</button>
          </div>
        </section>

        {/* INPUT FIELDS */}
        <section className="space-y-4">
          <h2 className="section-header">Input Fields</h2>
          <input className="input-field" placeholder="Type something..." />
          <textarea className="input-field h-24" placeholder="Enter details here..." />
        </section>

        {/* CARD PREVIEW */}
        <section className="space-y-4">
          <h2 className="section-header">Cards</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="card-title">Standard Card</h3>
              <p className="text-gray-600 dark:text-gray-300">
                This card uses the shared <code>.card</code> and <code>.card-title</code> classes.
              </p>
              <button className="btn btn-primary mt-3">Action</button>
            </div>
            <div className="card">
              <h3 className="card-title">With Image</h3>
              <img
                src="/LogoCRC.png"
                alt="Example"
                className="rounded-lg shadow-md mt-3"
              />
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                You can place images inside cards easily. This scales responsively.
              </p>
            </div>
          </div>
        </section>

        {/* TYPOGRAPHY */}
        <section className="space-y-4">
          <h2 className="section-header">Typography</h2>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-qehNavy dark:text-white">Heading 1</h1>
            <h2 className="text-2xl font-semibold text-qehNavy dark:text-white">Heading 2</h2>
            <h3 className="text-xl font-medium text-qehBlue">Heading 3</h3>
            <p className="text-gray-700 dark:text-gray-300">
              This is normal paragraph text using default Tailwind typography.
            </p>
            <p className="text-sm text-gray-500 italic">This is smaller caption text.</p>
          </div>
        </section>

        {/* COLOR PALETTE */}
        <section className="space-y-4">
          <h2 className="section-header">Color Palette</h2>
          <div className="flex flex-wrap gap-4">
            <div className="w-24 h-24 bg-qehNavy rounded-xl shadow-soft flex items-center justify-center text-white">Navy</div>
            <div className="w-24 h-24 bg-qehBlue rounded-xl shadow-soft flex items-center justify-center text-white">Blue</div>
            <div className="w-24 h-24 bg-qehLight rounded-xl shadow-soft flex items-center justify-center text-qehNavy">Light</div>
            <div className="w-24 h-24 bg-qehGray rounded-xl shadow-soft flex items-center justify-center text-qehNavy">Gray</div>
          </div>
        </section>
      </div>
    </Layout>
  );
}