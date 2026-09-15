import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Mail, Shield } from "lucide-react";

export const HelpPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "What medical imaging modalities are supported by ORTHINX?",
      a: "ORTHINX natively supports standard DICOM (.dcm), NIfTI (.nii, .nii.gz), and high-resolution JPEG/PNG formats. Modalities include MRI (Sagittal T1/T2, Proton Density fat-suppressed), digital weight-bearing Radiographs (X-Ray), and CT Scans.",
    },
    {
      q: "How accurate is the AI segmentation for meniscus and bone boundaries?",
      a: "Our deep learning ensemble achieves a mean Dice similarity coefficient of 96.8% for femoral/tibial structures and 94.2% for meniscus segmentation, validated against gold-standard multi-center orthopedic radiologist annotations.",
    },
    {
      q: "How are implant candidates ranked and matched?",
      a: "Candidate components are ranked using geometric contour matching across femoral width, femoral AP, tibial plateau width, and tibial AP dimensions with clinical tolerance thresholds.",
    },
    {
      q: "How is patient health information (PHI) protected?",
      a: "All DICOM metadata is anonymized on client-side before transmission, encrypted with AES-256 in transit and at rest in full compliance with HIPAA and GDPR regulations.",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Help & Support</h1>
        <p className="page-subtitle">
          Guides, documentation, and technical support for ORTHINX Clinical Suite.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* FAQs */}
        <div className="card">
          <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <HelpCircle size={18} color="var(--primary)" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: openFaq === idx ? "var(--primary-subtle)" : "var(--bg-surface)",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-main)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </button>

                {openFaq === idx && (
                  <div style={{ padding: "14px 16px", background: "var(--bg-surface)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, borderTop: "1px solid var(--border)" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Resources */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Mail size={18} color="var(--primary)" />
              <span>Clinical Support Desk</span>
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Need assistance with DICOM PACS integration or custom implant libraries? Our support team is available 24/7.
            </p>
            <div style={{ background: "var(--primary-subtle)", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", color: "var(--text-main)", fontWeight: 600, border: "1px solid var(--border)" }}>
              support@orthinx.health
            </div>
          </div>

          <div className="card" style={{ background: "var(--primary-light)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>
              <Shield size={18} />
              <span>Regulatory & Compliance</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              ORTHINX Clinical Suite is certified for clinical decision support. Always verify dimensions with primary calibrated DICOM viewers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};