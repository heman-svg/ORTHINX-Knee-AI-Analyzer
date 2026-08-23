import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientStore } from "../store/patientStore";
import { ArrowRight, UserPlus } from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";

export const NewPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const { createPatient } = usePatientStore();

  const [formData, setFormData] = useState({
    name: "Sarah Johnson",
    age: "42",
    gender: "Female",
    side: "Right Knee",
    height: "168",
    grade: "Grade 3 - Moderate OA",
    notes: "Patient presents with persistent medial joint pain after prolonged weight-bearing. Prior arthroscopic evaluation in 2022.",
  });

  const handleSubmit = async () => {
    await new Promise((r) => setTimeout(r, 800));
    await createPatient({
      name: formData.name,
      age: parseInt(formData.age) || 45,
      sex: formData.gender === "Male" ? "Male" : "Female",
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Register New Patient</h1>
        <p className="page-subtitle">Enter clinical background and imaging prerequisites</p>
      </div>

      <div className="card" style={{ maxWidth: "920px" }}>
        <div className="card-header">
          <h2 className="card-title">Patient Information</h2>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* Row 1: Name, Age, Gender */}
          <div className="form-grid-3" style={{ marginBottom: "20px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Johnson"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Age</label>
              <input
                type="number"
                required
                placeholder="e.g. 42"
                className="form-input"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Row 2: Side, Height, KL Grade */}
          <div className="form-grid-3" style={{ marginBottom: "24px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Affected Knee Side</label>
              <select
                className="form-select"
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value })}
              >
                <option value="Right Knee">Right Knee</option>
                <option value="Left Knee">Left Knee</option>
                <option value="Bilateral">Bilateral</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Height (cm)</label>
              <input
                type="number"
                placeholder="Enter height"
                className="form-input"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">KL Grade (Kellgren-Lawrence)</label>
              <select
                className="form-select"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              >
                <option value="Grade 0 - Normal">Grade 0 - Normal</option>
                <option value="Grade 1 - Doubtful">Grade 1 - Doubtful</option>
                <option value="Grade 2 - Minimal">Grade 2 - Minimal OA</option>
                <option value="Grade 3 - Moderate OA">Grade 3 - Moderate OA</option>
                <option value="Grade 4 - Severe OA">Grade 4 - Severe OA</option>
              </select>
            </div>
          </div>

          {/* Row 3: Notes */}
          <div className="form-group" style={{ marginBottom: "32px" }}>
            <label className="form-label">Clinical Notes & History (optional)</label>
            <textarea
              rows={4}
              placeholder="Enter surgical history, symptoms, or contraindications"
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>

          {/* Submit Action */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <AnimatedButton
              type="submit"
              variant="pill"
              icon={<ArrowRight size={16} />}
              loadingText="Creating Record..."
              successText="Patient Registered!"
              onClick={handleSubmit}
              onSuccess={() => navigate("/upload")}
              style={{ padding: "12px 32px", fontSize: "15px" }}
            >
              Proceed to Upload Image
            </AnimatedButton>
          </div>
        </form>
      </div>
    </div>
  );
};