import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import kneeSegmented from "../assets/knee_segmented.jpg";

interface ReportItem {
  id: string;
  name: string;
  patientId: string;
  date: string;
  type: string;
  surgeon: string;
  status: string;
  findings: string;
  metrics: {
    femoralWidth: string;
    femoralAP: string;
    tibialWidth: string;
    jswMin: string;
    implant: string;
  };
}

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | "All">(8);

  const allReports: ReportItem[] = [
    {
      id: "REP-2025-001",
      name: "Sarah Johnson",
      patientId: "PT-10492",
      date: "Oct 24, 2025",
      type: "Meniscus & Implant Match",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Focal degenerative thinning noted in the anterior horn and body segment of the medial meniscus (2.1mm thickness). Preserved lateral compartment. Implant Size 4 offers optimal 97% anatomical fit.",
      metrics: {
        femoralWidth: "68.4mm",
        femoralAP: "59.2mm",
        tibialWidth: "71.8mm",
        jswMin: "2.1mm",
        implant: "Size 4 (97% Fit)",
      },
    },
    {
      id: "REP-2025-002",
      name: "Michael Brown",
      patientId: "PT-10493",
      date: "Oct 22, 2025",
      type: "Anatomical Measurement",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Tibia plateau width measured at 74.2mm with preserved posterior slope angle (6.8°). Minimal osteophytic changes. Implant Size 5 recommended with standard 10mm tibial insert.",
      metrics: {
        femoralWidth: "72.1mm",
        femoralAP: "62.4mm",
        tibialWidth: "74.2mm",
        jswMin: "3.4mm",
        implant: "Size 5 (95% Fit)",
      },
    },
    {
      id: "REP-2025-003",
      name: "Emily Davis",
      patientId: "PT-10494",
      date: "Oct 19, 2025",
      type: "Comprehensive AI Assessment",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Bilateral study indicating moderate medial compartment osteoarthritis. Femoral AP diameter 58.6mm. JSW narrowed medially to 1.8mm. Recommend Size 3 CR system with 9mm poly spacer.",
      metrics: {
        femoralWidth: "65.8mm",
        femoralAP: "58.6mm",
        tibialWidth: "68.3mm",
        jswMin: "1.8mm",
        implant: "Size 3 (96% Fit)",
      },
    },
    {
      id: "REP-2025-004",
      name: "James Wilson",
      patientId: "PT-10495",
      date: "Oct 15, 2025",
      type: "Pre-Op Implant Planning",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Complete complex radial tear of posterior horn medial meniscus. Femoral condylar width 70.4mm. Automated surgical resection plan ready for clinical sign-off.",
      metrics: {
        femoralWidth: "70.4mm",
        femoralAP: "60.8mm",
        tibialWidth: "73.1mm",
        jswMin: "2.4mm",
        implant: "Size 4 (98% Fit)",
      },
    },
    {
      id: "REP-2025-005",
      name: "Robert Martinez",
      patientId: "PT-10496",
      date: "Oct 12, 2025",
      type: "Subchondral Bone Density",
      surgeon: "Dr. Elena Vance",
      status: "Completed",
      findings: "Severe medial joint space narrowing with subchondral sclerosis in the medial tibial plateau. Lateral joint space intact at 4.6mm. Size 4 PS implant planned.",
      metrics: {
        femoralWidth: "69.2mm",
        femoralAP: "60.1mm",
        tibialWidth: "72.5mm",
        jswMin: "1.2mm",
        implant: "Size 4 PS (94% Fit)",
      },
    },
    {
      id: "REP-2025-006",
      name: "Amanda Taylor",
      patientId: "PT-10497",
      date: "Oct 10, 2025",
      type: "Cartilage Thickness Mapping",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Full-thickness chondral defect (Grade IV) over the weight-bearing medial femoral condyle measuring 14x12mm. Lateral compartment cartilage preserved (2.8mm).",
      metrics: {
        femoralWidth: "63.5mm",
        femoralAP: "55.4mm",
        tibialWidth: "66.2mm",
        jswMin: "1.5mm",
        implant: "Size 2 (97% Fit)",
      },
    },
    {
      id: "REP-2025-007",
      name: "David Chen",
      patientId: "PT-10498",
      date: "Oct 08, 2025",
      type: "Meniscus & Implant Match",
      surgeon: "Dr. Marcus Sterling",
      status: "Completed",
      findings: "Horizontal cleavage tear involving the body and posterior horn of the lateral meniscus. Medial compartment shows Kellgren-Lawrence Grade 2 OA. Size 5 implant optimal.",
      metrics: {
        femoralWidth: "73.6mm",
        femoralAP: "63.1mm",
        tibialWidth: "75.8mm",
        jswMin: "2.9mm",
        implant: "Size 5 (96% Fit)",
      },
    },
    {
      id: "REP-2025-008",
      name: "Jennifer White",
      patientId: "PT-10499",
      date: "Oct 05, 2025",
      type: "Patellofemoral Alignment",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Patellar tilt angle of 14.2° with lateral subluxation of 3.8mm. Trochlear dysplasia Type A noted. Femoral AP 56.8mm. Size 3 implant recommended.",
      metrics: {
        femoralWidth: "64.2mm",
        femoralAP: "56.8mm",
        tibialWidth: "67.4mm",
        jswMin: "3.1mm",
        implant: "Size 3 (95% Fit)",
      },
    },
    {
      id: "REP-2025-009",
      name: "Thomas Anderson",
      patientId: "PT-10500",
      date: "Oct 02, 2025",
      type: "Comprehensive AI Assessment",
      surgeon: "Dr. Elena Vance",
      status: "Completed",
      findings: "Severe bi-compartmental osteoarthritis with marked joint space collapse medially (0.8mm). Marginal osteophytes on medial femur and tibia. Size 5 PS TKR suggested.",
      metrics: {
        femoralWidth: "74.1mm",
        femoralAP: "64.0mm",
        tibialWidth: "76.3mm",
        jswMin: "0.8mm",
        implant: "Size 5 PS (98% Fit)",
      },
    },
    {
      id: "REP-2025-010",
      name: "Lisa Garcia",
      patientId: "PT-10501",
      date: "Sep 29, 2025",
      type: "Pre-Op Implant Planning",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Medial compartment unicompartmental knee arthroplasty candidate. Intact ACL and preserved lateral compartment (4.8mm JSW). Fixed-bearing medial UKA Size 3.",
      metrics: {
        femoralWidth: "66.0mm",
        femoralAP: "57.5mm",
        tibialWidth: "68.9mm",
        jswMin: "2.0mm",
        implant: "Size 3 UKA (99% Fit)",
      },
    },
    {
      id: "REP-2025-011",
      name: "Brian Miller",
      patientId: "PT-10502",
      date: "Sep 26, 2025",
      type: "Anatomical Measurement",
      surgeon: "Dr. Marcus Sterling",
      status: "Completed",
      findings: "Tibial plateau AP dimension 48.2mm, coronal width 75.0mm. Neutral mechanical axis alignment. Size 5 Cruciate-Retaining implant.",
      metrics: {
        femoralWidth: "71.8mm",
        femoralAP: "61.9mm",
        tibialWidth: "75.0mm",
        jswMin: "3.6mm",
        implant: "Size 5 CR (96% Fit)",
      },
    },
    {
      id: "REP-2025-012",
      name: "Jessica Moore",
      patientId: "PT-10503",
      date: "Sep 23, 2025",
      type: "Meniscus & Implant Match",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Extrusion of the medial meniscus (3.4mm) associated with severe medial joint space loss. Lateral meniscus intact with normal morphology. Size 3 implant recommended.",
      metrics: {
        femoralWidth: "65.1mm",
        femoralAP: "56.2mm",
        tibialWidth: "67.0mm",
        jswMin: "1.4mm",
        implant: "Size 3 (97% Fit)",
      },
    },
    {
      id: "REP-2025-013",
      name: "Daniel Jackson",
      patientId: "PT-10504",
      date: "Sep 20, 2025",
      type: "Cartilage Thickness Mapping",
      surgeon: "Dr. Elena Vance",
      status: "Completed",
      findings: "Diffuse cartilage thinning across medial and lateral tibial plateaus. Subchondral cyst formation (6mm) in medial femoral condyle. Size 4 implant candidate.",
      metrics: {
        femoralWidth: "69.8mm",
        femoralAP: "60.4mm",
        tibialWidth: "73.2mm",
        jswMin: "1.6mm",
        implant: "Size 4 (95% Fit)",
      },
    },
    {
      id: "REP-2025-014",
      name: "Rachel Adams",
      patientId: "PT-10505",
      date: "Sep 17, 2025",
      type: "Comprehensive AI Assessment",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Post-traumatic osteoarthritis with 4° varus deformity. Tibial slope angle 8.1°. Size 3 implant with 11mm ultra-congruent poly insert.",
      metrics: {
        femoralWidth: "64.9mm",
        femoralAP: "56.0mm",
        tibialWidth: "67.8mm",
        jswMin: "1.9mm",
        implant: "Size 3 UC (96% Fit)",
      },
    },
    {
      id: "REP-2025-015",
      name: "Kevin Harris",
      patientId: "PT-10506",
      date: "Sep 14, 2025",
      type: "Pre-Op Implant Planning",
      surgeon: "Dr. Marcus Sterling",
      status: "Completed",
      findings: "High flex knee design recommended for active patient. Femoral AP 63.5mm, condylar width 72.8mm. Size 5 High-Flex Cruciate-Sacrificing component.",
      metrics: {
        femoralWidth: "72.8mm",
        femoralAP: "63.5mm",
        tibialWidth: "75.4mm",
        jswMin: "2.8mm",
        implant: "Size 5 HF (97% Fit)",
      },
    },
    {
      id: "REP-2025-016",
      name: "Michelle Clark",
      patientId: "PT-10507",
      date: "Sep 11, 2025",
      type: "Subchondral Bone Density",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Moderate osteopenia noted. High-density trabecular bone preservation achieved at distal femoral cut level. Size 2 implant with porous titanium coating.",
      metrics: {
        femoralWidth: "62.4mm",
        femoralAP: "54.1mm",
        tibialWidth: "65.3mm",
        jswMin: "2.2mm",
        implant: "Size 2 Porous (98% Fit)",
      },
    },
    {
      id: "REP-2025-017",
      name: "Christopher Lee",
      patientId: "PT-10508",
      date: "Sep 08, 2025",
      type: "Meniscus & Implant Match",
      surgeon: "Dr. Elena Vance",
      status: "Completed",
      findings: "Root tear of the posterior horn of the medial meniscus with secondary medial collateral ligament pseudolaxity. Size 4 implant with standard stem extension.",
      metrics: {
        femoralWidth: "70.2mm",
        femoralAP: "60.9mm",
        tibialWidth: "73.6mm",
        jswMin: "1.7mm",
        implant: "Size 4 (96% Fit)",
      },
    },
    {
      id: "REP-2025-018",
      name: "Stephanie Wright",
      patientId: "PT-10509",
      date: "Sep 05, 2025",
      type: "Anatomical Measurement",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Femoral trochlear groove depth 5.2mm with normal sulcus angle (138°). Patella thickness 22.4mm. Size 3 femoral component with resurfaced patellar button.",
      metrics: {
        femoralWidth: "66.5mm",
        femoralAP: "57.8mm",
        tibialWidth: "69.1mm",
        jswMin: "2.6mm",
        implant: "Size 3 Resurf (95% Fit)",
      },
    },
    {
      id: "REP-2025-019",
      name: "Marcus Johnson",
      patientId: "PT-10510",
      date: "Aug 31, 2025",
      type: "Comprehensive AI Assessment",
      surgeon: "Dr. Marcus Sterling",
      status: "Completed",
      findings: "Isolated lateral compartment osteoarthritis (Valgus 6°). Medial meniscus and cartilage healthy. Lateral unicompartmental arthroplasty Size 4.",
      metrics: {
        femoralWidth: "71.4mm",
        femoralAP: "62.0mm",
        tibialWidth: "74.5mm",
        jswMin: "1.5mm",
        implant: "Size 4 Lateral UKA (97% Fit)",
      },
    },
    {
      id: "REP-2025-020",
      name: "Hannah Scott",
      patientId: "PT-10511",
      date: "Aug 28, 2025",
      type: "Pre-Op Implant Planning",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Severe tricompartmental gonarthrosis with 8mm bone loss at posteromedial tibia. Size 3 augment block and Size 3 Revision component planned.",
      metrics: {
        femoralWidth: "63.8mm",
        femoralAP: "55.2mm",
        tibialWidth: "66.7mm",
        jswMin: "0.6mm",
        implant: "Size 3 Revision (94% Fit)",
      },
    },
    {
      id: "REP-2025-021",
      name: "Anthony King",
      patientId: "PT-10512",
      date: "Aug 24, 2025",
      type: "Cartilage Thickness Mapping",
      surgeon: "Dr. Elena Vance",
      status: "Completed",
      findings: "Grade III chondromalacia patellae with diffuse trochlear wear. Medial/lateral tibiofemoral joint spaces preserved (>3.8mm). Patellofemoral replacement planned.",
      metrics: {
        femoralWidth: "68.9mm",
        femoralAP: "59.7mm",
        tibialWidth: "72.0mm",
        jswMin: "3.9mm",
        implant: "PFA System Size 4 (96% Fit)",
      },
    },
    {
      id: "REP-2025-022",
      name: "Nicole Green",
      patientId: "PT-10513",
      date: "Aug 20, 2025",
      type: "Meniscus & Implant Match",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Bucket-handle tear of the medial meniscus locked in the intercondylar notch. Minimal arthritic changes. Meniscal repair vs Size 2 focal resurfacing.",
      metrics: {
        femoralWidth: "61.8mm",
        femoralAP: "53.6mm",
        tibialWidth: "64.5mm",
        jswMin: "3.2mm",
        implant: "Size 2 (98% Fit)",
      },
    },
    {
      id: "REP-2025-023",
      name: "Gregory Baker",
      patientId: "PT-10514",
      date: "Aug 16, 2025",
      type: "Anatomical Measurement",
      surgeon: "Dr. Marcus Sterling",
      status: "Completed",
      findings: "Distal femoral valgus angle 5.4°. Posterior condylar offset 27.2mm preserved. Size 5 asymmetric tibial baseplate recommended.",
      metrics: {
        femoralWidth: "73.2mm",
        femoralAP: "63.7mm",
        tibialWidth: "76.1mm",
        jswMin: "2.7mm",
        implant: "Size 5 Asym (96% Fit)",
      },
    },
    {
      id: "REP-2025-024",
      name: "Olivia Nelson",
      patientId: "PT-10515",
      date: "Aug 12, 2025",
      type: "Comprehensive AI Assessment",
      surgeon: "Dr. Alex Morgan",
      status: "Completed",
      findings: "Early Stage II medial OA. Cartilage preservation protocol indicated with potential unicompartmental arthroplasty Size 2 if symptoms persist.",
      metrics: {
        femoralWidth: "64.0mm",
        femoralAP: "55.8mm",
        tibialWidth: "66.9mm",
        jswMin: "2.5mm",
        implant: "Size 2 UKA (97% Fit)",
      },
    },
  ];

  // Pagination calculation
  const totalReports = allReports.length;
  const pageSize = rowsPerPage === "All" ? totalReports : rowsPerPage;
  const totalPages = rowsPerPage === "All" ? 1 : Math.ceil(totalReports / pageSize);

  const displayedReports = useMemo(() => {
    if (rowsPerPage === "All") {
      return allReports;
    }
    const startIndex = (activePage - 1) * pageSize;
    return allReports.slice(startIndex, startIndex + pageSize);
  }, [allReports, activePage, pageSize, rowsPerPage]);

  const handleRowsPerPageChange = (val: string) => {
    if (val === "All") {
      setRowsPerPage("All");
      setActivePage(1);
    } else {
      const num = parseInt(val, 10);
      setRowsPerPage(num);
      setActivePage(1);
    }
  };

  const handleDownloadPatientPdf = (report: ReportItem) => {
    // Generate a downloadable clinical report document
    const reportContent = `================================================================================
                    ORTHINX CLINICAL DIAGNOSTIC & IMPLANT PLAN
================================================================================
Report ID:         ${report.id}
Generated Date:    ${report.date}
Attending Surgeon: ${report.surgeon} (Orthopedics)
Verification:      AI Verified (96.8% Confidence)

PATIENT INFORMATION:
--------------------------------------------------------------------------------
Patient Name:      ${report.name}
Patient ID:        ${report.patientId}
Analysis Type:     ${report.type}
Status:            ${report.status}

QUANTITATIVE ANATOMICAL MEASUREMENTS:
--------------------------------------------------------------------------------
- Femoral Condylar Width:     ${report.metrics.femoralWidth}
- Femoral AP Diameter:        ${report.metrics.femoralAP}
- Tibial Plateau Width:       ${report.metrics.tibialWidth}
- Min Joint Space Width (JSW): ${report.metrics.jswMin}
- Recommended Implant System: ${report.metrics.implant}

CLINICAL FINDINGS & AI DIAGNOSTIC ASSESSMENT:
--------------------------------------------------------------------------------
${report.findings}

SURGICAL RECOMMENDATION:
--------------------------------------------------------------------------------
Based on multi-planar AI segmentation and morphometric reconstruction, the
recommended implant system is ${report.metrics.implant}. Proceed with pre-operative
template verification.

================================================================================
Certified by ORTHINX Clinical Suite · Department of Orthopedic Surgery
================================================================================`;

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.id}_${report.name.replace(/\s+/g, "_")}_Clinical_Report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    // Download batch summary
    const summary = allReports
      .map(
        (r) =>
          `[${r.id}] ${r.name} (${r.patientId}) - ${r.type} | Date: ${r.date} | Implant: ${r.metrics.implant}`
      )
      .join("\n");
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ORTHINX_All_Diagnostic_Reports_Summary.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startRecord = rowsPerPage === "All" ? 1 : (activePage - 1) * pageSize + 1;
  const endRecord =
    rowsPerPage === "All" ? totalReports : Math.min(activePage * pageSize, totalReports);

  return (
    <div>
      {/* Header */}
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <h1 className="page-title">Diagnostic Reports</h1>
          <p className="page-subtitle">
            View, download, and sign off on verified AI-generated orthopedic reports
          </p>
        </div>

        <AnimatedButton
          icon={<FileText size={16} />}
          loadingText="Generating Batch..."
          successText="Batch Exported"
          onClick={handleDownloadAllZip}
        >
          Export All Reports (ZIP)
        </AnimatedButton>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {/* Table Controls Bar */}
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-muted)" }}>
            <Filter size={15} color="var(--primary)" />
            <span>Total Reports: <strong style={{ color: "var(--text-main)" }}>{totalReports}</strong></span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
            <span>Rows per page:</span>
            <select
              className="form-select"
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(e.target.value)}
              style={{
                width: "auto",
                padding: "4px 28px 4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="20">20</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Patient Name</th>
              <th>Analysis Type</th>
              <th>Generated Date</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedReports.map((report) => (
              <tr key={report.id}>
                <td className="patient-id-badge" style={{ color: "var(--primary)" }}>
                  {report.id}
                </td>
                <td>
                  <div className="patient-name-cell">{report.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {report.patientId}
                  </div>
                </td>
                <td style={{ color: "var(--text-main)", fontWeight: 500 }}>{report.type}</td>
                <td>{report.date}</td>
                <td>
                  <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={11} /> {report.status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "8px" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => setSelectedReport(report)}
                      title={`View Report for ${report.name}`}
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => handleDownloadPatientPdf(report)}
                      title={`Download PDF for ${report.name}`}
                    >
                      <Download size={14} />
                      <span>PDF</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Dynamic Pagination */}
        <div className="pagination-wrapper">
          <span>
            Showing {totalReports > 0 ? startRecord : 0} to {endRecord} of {totalReports} reports
          </span>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={activePage === 1}
                onClick={() => setActivePage(Math.max(1, activePage - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`page-btn ${activePage === pageNum ? "active" : ""}`}
                  onClick={() => setActivePage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="page-btn"
                disabled={activePage === totalPages}
                onClick={() => setActivePage(Math.min(totalPages, activePage + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Report Preview Modal */}
      {selectedReport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "760px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "32px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Report Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "2px solid var(--primary)",
                paddingBottom: "16px",
                marginBottom: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: "18px",
                  }}
                >
                  <FileText size={20} />
                  <span>ORTHINX Clinical Diagnostic & Implant Plan</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Report ID: {selectedReport.id} · Generated on {selectedReport.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Patient Details Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                background: "var(--primary-subtle)",
                padding: "16px",
                borderRadius: "10px",
                marginBottom: "24px",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Patient
                </span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                  {selectedReport.name}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  ID: {selectedReport.patientId}
                </p>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Attending Surgeon
                </span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                  {selectedReport.surgeon}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Orthopedics</p>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Analysis Type
                </span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)" }}>
                  {selectedReport.type}
                </p>
                <p style={{ fontSize: "12px", color: "var(--success)" }}>AI Verified (96.8%)</p>
              </div>
            </div>

            {/* MRI & Diagnostic Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "#000",
                }}
              >
                <img
                  src={kneeSegmented}
                  alt="Segmentation"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <div>
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    marginBottom: "8px",
                  }}
                >
                  Clinical Findings
                </h4>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: "12px",
                  }}
                >
                  {selectedReport.findings}
                </p>
                <div
                  style={{
                    background: "var(--success-bg)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--success-text)",
                  }}
                >
                  <strong>Key Metrics:</strong> Femoral Width: {selectedReport.metrics.femoralWidth} · Femoral AP: {selectedReport.metrics.femoralAP} · Tibial Width: {selectedReport.metrics.tibialWidth} · Min JSW: {selectedReport.metrics.jswMin} · Recommended Implant:{" "}
                  <strong>{selectedReport.metrics.implant}</strong>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} />
                <span>Print</span>
              </button>
              <AnimatedButton
                icon={<Download size={16} />}
                loadingText="Generating PDF..."
                successText="Downloaded!"
                onClick={async () => {
                  await new Promise((resolve) => setTimeout(resolve, 800));
                  handleDownloadPatientPdf(selectedReport);
                }}
                onSuccess={() => setSelectedReport(null)}
              >
                Download Official PDF
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};