let currentPatient = null;
let currentScan = null;
let currentSegmentation = null;
let currentMode = "overlay";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  setupEventListeners();
});

async function initApp() {
  await loadPatients();
  setupDropZone();
}

async function loadPatients() {
  try {
    const res = await fetch("/patients/");
    if (!res.ok) throw new Error("Failed to load patients");
    const patients = await res.json();

    const select = document.getElementById("patientSelect");
    select.innerHTML = '<option value="">-- Choose Patient --</option>';

    if (patients.length === 0) {
      // Create default test patient if none exists
      const newP = await createDefaultPatient();
      patients.push(newP);
    }

    patients.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.patient_code})`;
      select.appendChild(opt);
    });

    if (patients.length > 0) {
      select.value = patients[0].id;
      onPatientSelected(patients[0]);
    }
  } catch (err) {
    console.error("Error initializing patients:", err);
  }
}

async function createDefaultPatient() {
  const payload = {
    patient_code: "PAT-CGMH-2026",
    name: "Eleanor Vance",
    age: 62,
    sex: "F",
  };
  const res = await fetch("/patients/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

function onPatientSelected(patient) {
  currentPatient = patient;
  document.getElementById("patientDetailsBox").classList.remove("hidden");
  document.getElementById("pId").textContent = patient.patient_code;
  document.getElementById("pName").textContent = patient.name;
  document.getElementById("pAgeGender").textContent = `${patient.age} / ${patient.sex}`;
  document.getElementById("pSide").textContent = "Right Knee";
}

function setupEventListeners() {
  document.getElementById("patientSelect").addEventListener("change", async (e) => {
    const pId = e.target.value;
    if (!pId) return;
    const res = await fetch(`/patients/${pId}`);
    if (res.ok) {
      const p = await res.json();
      onPatientSelected(p);
    }
  });

  document.getElementById("btnNewPatientModal").addEventListener("click", async () => {
    const name = prompt("Enter patient full name:", "Jane Doe");
    if (!name) return;
    const patCode = "PAT-" + Math.floor(1000 + Math.random() * 9000);
    const res = await fetch("/patients/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_code: patCode,
        name: name,
        age: 58,
        sex: "F",
      }),
    });
    if (res.ok) {
      await loadPatients();
    }
  });

  document.getElementById("fileInput").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      uploadScanFile(e.target.files[0]);
    }
  });

  document.getElementById("btnLoadTestSample").addEventListener("click", async () => {
    const sampleVal = document.getElementById("testSampleSelect").value;
    await loadPredefinedTestSample(sampleVal);
  });

  document.getElementById("btnRunPreprocess").addEventListener("click", runPreprocessing);
  document.getElementById("btnRunSegment").addEventListener("click", runSegmentation);
  document.getElementById("btnRunMeasurements").addEventListener("click", runMeasurements);
  document.getElementById("btnRunAssessment").addEventListener("click", runAssessment);
  document.getElementById("btnRunReport").addEventListener("click", runCompleteReport);

  // PDF and JSON export buttons
  document.getElementById("btnExportPdf").addEventListener("click", () => {
    const scanId = currentScan ? (currentScan.scan_id || currentScan.id) : null;
    if (scanId) {
      window.open(`/scans/${scanId}/report/pdf`, "_blank");
    }
  });

  document.getElementById("btnExportJson").addEventListener("click", () => {
    const scanId = currentScan ? (currentScan.scan_id || currentScan.id) : null;
    if (scanId) {
      window.open(`/scans/${scanId}/report/json`, "_blank");
    }
  });

  // Opacity slider
  const opSlider = document.getElementById("opacityRange");
  opSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    document.getElementById("opacityVal").textContent = `${val}%`;
    document.getElementById("overlayLayer").style.opacity = val / 100.0;
  });

  // View Mode buttons
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      setViewMode(e.target.dataset.mode);
    });
  });
}

let currentMeasurements = null;
let currentAssessment = null;
let currentReport = null;

function setupDropZone() {
  const dropZone = document.getElementById("dropZone");
  ["dragenter", "dragover"].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });
  dropZone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length > 0) {
      uploadScanFile(e.dataTransfer.files[0]);
    }
  });
}

async function uploadScanFile(file) {
  if (!currentPatient) {
    alert("Please select or create a patient first.");
    return;
  }

  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`/patients/${currentPatient.id}/images`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    currentScan = data;

    statusEl.textContent = `Upload complete: ${file.name} (Scan ID: ${data.scan_id})`;
    document.getElementById("activeScanSubtitle").textContent = `Active Scan: ${file.name} (ID: ${data.scan_id})`;
    document.getElementById("btnRunPreprocess").disabled = false;
    document.getElementById("btnRunSegment").disabled = true;
    document.getElementById("btnRunMeasurements").disabled = true;
    document.getElementById("btnRunAssessment").disabled = true;

    // Show uploaded image preview
    const previewUrl = URL.createObjectURL(file);
    document.getElementById("primaryImage").src = previewUrl;
    document.getElementById("overlayLayer").classList.add("hidden");
    document.getElementById("splitOriginalImage").src = previewUrl;

    updateStep(2);
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}

async function loadPredefinedTestSample(sampleName) {
  if (!currentPatient) {
    alert("Please select a patient first.");
    return;
  }

  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = `Loading test radiograph ${sampleName}...`;

  try {
    const res = await fetch(`/patients/${currentPatient.id}/load-test-sample/${sampleName}`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to load test sample");
    const data = await res.json();
    currentScan = data;

    statusEl.textContent = `Loaded test scan: ${data.filename} (Scan ID: ${data.scan_id})`;
    document.getElementById("activeScanSubtitle").textContent = `Active Scan: ${data.filename} (ID: ${data.scan_id})`;
    document.getElementById("btnRunPreprocess").disabled = false;
    document.getElementById("btnRunSegment").disabled = true;
    document.getElementById("btnRunMeasurements").disabled = true;
    document.getElementById("btnRunAssessment").disabled = true;

    const previewUrl = `/static/uploads/${data.filename}`;
    document.getElementById("primaryImage").src = previewUrl;
    document.getElementById("overlayLayer").classList.add("hidden");
    document.getElementById("splitOriginalImage").src = previewUrl;

    updateStep(2);

    // Auto-run pipeline for smooth user flow
    await runPreprocessing();
  } catch (err) {
    statusEl.textContent = `Error loading test sample: ${err.message}`;
  }
}

async function runPreprocessing() {
  if (!currentScan) return;
  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = "Running letterbox aspect-ratio preserving preprocessing...";

  try {
    const res = await fetch(`/scans/${currentScan.scan_id}/preprocess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        normalization_method: "percentile",
        resample_spacing: null
      })
    });
    if (!res.ok) throw new Error("Preprocessing failed");
    const data = await res.json();

    statusEl.textContent = `Preprocessing complete! Letterboxed tensor: ${data.output_shape.join("x")}`;
    document.getElementById("btnRunSegment").disabled = false;
    updateStep(3);

    // Auto-trigger segmentation
    await runSegmentation();
  } catch (err) {
    statusEl.textContent = `Preprocessing Error: ${err.message}`;
  }
}

async function runSegmentation() {
  if (!currentScan) return;
  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = "Running MONAI V2 U-Net Knee Joint Segmentation...";

  try {
    const res = await fetch(`/scans/${currentScan.scan_id}/segment`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Segmentation inference failed");
    const data = await res.json();
    currentSegmentation = data;

    statusEl.textContent = "AI Segmentation completed. Extracting measurements & assessment...";
    document.getElementById("btnRunMeasurements").disabled = false;
    document.getElementById("btnRunAssessment").disabled = false;
    displayResults(data);
    updateStep(4);

    // Auto-trigger measurements and assessment
    await runMeasurements();
    await runAssessment();
  } catch (err) {
    statusEl.textContent = `Inference Error: ${err.message}`;
  }
}

async function runMeasurements() {
  if (!currentScan) return;
  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = "Extracting Native-Space Knee Geometry & JSW Profile...";

  try {
    const res = await fetch(`/scans/${currentScan.scan_id}/measurements`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Measurement extraction failed");
    const data = await res.json();
    currentMeasurements = data;

    statusEl.textContent = `Native measurements complete (Quality: ${data.quality.status})!`;
    displayMeasurementResults(data);
  } catch (err) {
    statusEl.textContent = `Measurement Error: ${err.message}`;
  }
}

async function runAssessment() {
  if (!currentScan) return;
  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = "Generating Structured Research Knee Assessment...";

  try {
    const res = await fetch(`/scans/${currentScan.scan_id}/assessment`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Research assessment failed");
    const data = await res.json();
    currentAssessment = data;

    statusEl.textContent = `Research Assessment generated (Reliability Score: ${data.research_assessment.measurement_reliability_score})!`;
    document.getElementById("btnRunReport").disabled = false;
    displayAssessmentResults(data);
  } catch (err) {
    statusEl.textContent = `Assessment Error: ${err.message}`;
  }
}

async function runCompleteReport() {
  if (!currentScan) return;
  const statusEl = document.getElementById("pipelineStatus");
  statusEl.textContent = "Compiling Complete Research Knee Analysis Report & PDF...";

  try {
    const res = await fetch(`/scans/${currentScan.scan_id}/report`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Report generation failed");
    const data = await res.json();
    currentReport = data;

    statusEl.textContent = `Complete Report generated: ${data.report_id}!`;
    document.getElementById("btnExportPdf").disabled = false;
    document.getElementById("btnExportJson").disabled = false;
    displayReportResults(data);

    // Switch to report viewer tab
    document.querySelectorAll(".mode-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.mode === "report");
    });
    setViewMode("report");
  } catch (err) {
    statusEl.textContent = `Report Error: ${err.message}`;
  }
}

function displayReportResults(reportData) {
  const seg = reportData.segmentation || {};
  const jsw = reportData.jsw_measurements || {};
  const cal = reportData.calibration || {};
  const qc = reportData.quality_control || {};
  const res = reportData.research_assessment || {};
  const proc = reportData.processing || {};

  document.getElementById("reportIdLabel").textContent = `Report ID: ${reportData.report_id} (${proc.processing_time_ms} ms)`;

  // Badges
  document.getElementById("segQualityBadge").textContent = `SEG: ${seg.quality || "--"}`;
  document.getElementById("assessBadge").textContent = `QC: ${qc.status || "--"}`;
  document.getElementById("reliabilityBadge").textContent = `Reliability: ${res.measurement_reliability_score || "--"}`;

  // Metrics Bar
  document.getElementById("resArea").textContent = `${seg.foreground_pixels ? seg.foreground_pixels.toLocaleString() : "--"} px`;
  document.getElementById("resCoverage").textContent = `${seg.area_percentage ? seg.area_percentage.toFixed(2) : "--"}% native area`;
  document.getElementById("resHeight").textContent = `${jsw.median_px !== null ? jsw.median_px : "--"} px`;
  document.getElementById("resJswUnit").textContent = cal.available ? `Calibrated: ${cal.jsw_mm ? cal.jsw_mm.median_mm : "--"} mm` : "Native pixel distance";
  document.getElementById("resMinMaxJsw").textContent = `${jsw.min_px || "--"} / ${jsw.max_px || "--"} px`;
  document.getElementById("resSampleCount").textContent = `${jsw.sample_count || 0} cross-sections`;
  document.getElementById("resQualityStatus").textContent = qc.status || "VALID";
  document.getElementById("resLatency").textContent = `Latency: ${proc.processing_time_ms || "--"} ms`;

  // Quality Details
  document.getElementById("assessSegQuality").textContent = `${seg.quality} (${(seg.top2_components_ratio * 100).toFixed(1)}% in dominant lobes)`;
  document.getElementById("assessMeasQuality").textContent = qc.status;
  document.getElementById("assessReliabilityScore").textContent = `${res.measurement_reliability_score} / 1.00`;
  document.getElementById("summaryJswStats").textContent = `Min: ${jsw.min_px || "--"} px | Median: ${jsw.median_px || "--"} px | Mean: ${jsw.mean_px || "--"} px | Max: ${jsw.max_px || "--"} px`;
  document.getElementById("summaryJswPercentiles").textContent = `10th: ${jsw.p10_px || "--"} px | 25th: ${jsw.p25_px || "--"} px | 75th: ${jsw.p75_px || "--"} px`;
  document.getElementById("summaryCalibration").textContent = cal.notice || "Uncalibrated";

  const warnEl = document.getElementById("assessWarnings");
  const warns = (qc.warning_reasons || []).concat(qc.invalid_reasons || []);
  if (warns.length > 0) {
    warnEl.textContent = warns.join(" | ");
  } else {
    warnEl.textContent = "None (Fully compliant)";
  }

  const obsEl = document.getElementById("assessObservations");
  if (res.observations && res.observations.length > 0) {
    obsEl.textContent = res.observations.join(" ");
  }
}

function displayResults(segData) {
  const meas = segData.measurements || {};

  // Metrics
  document.getElementById("resArea").textContent = `${meas.foreground_pixels ? meas.foreground_pixels.toLocaleString() : "--"} px`;
  document.getElementById("resCoverage").textContent = `${meas.area_percentage || "--"}% of total scan area`;
  document.getElementById("resHeight").textContent = `${meas.joint_height_median_px || "--"} px`;
  document.getElementById("resLatency").textContent = `${segData.inference_time_ms || "--"} ms`;

  // Summary
  if (meas.bounding_box) {
    const b = meas.bounding_box;
    document.getElementById("summaryBBox").textContent = `[x:${b.x_min}, y:${b.y_min}, w:${b.width}, h:${b.height}]`;
  }

  // Visual Overlays
  if (segData.overlay_relative_url) {
    const overlayLayer = document.getElementById("overlayLayer");
    overlayLayer.src = segData.overlay_relative_url;
    overlayLayer.classList.remove("hidden");
    document.getElementById("splitOverlayImage").src = segData.overlay_relative_url;
  }
}

function displayMeasurementResults(measData) {
  const seg = measData.segmentation || {};
  const jsw = measData.jsw || {};
  const cal = measData.calibration || {};
  const qual = measData.quality || {};
  const dims = measData.native_dimensions || {};

  // Metrics Bar
  document.getElementById("resArea").textContent = `${seg.foreground_pixels ? seg.foreground_pixels.toLocaleString() : "--"} px`;
  document.getElementById("resCoverage").textContent = `${seg.area_percentage || "--"}% native area`;
  document.getElementById("resHeight").textContent = `${jsw.median_px !== null ? jsw.median_px : "--"} px`;
  document.getElementById("resJswUnit").textContent = cal.available ? `Calibrated: ${cal.jsw_mm.median_mm} mm` : "Native pixel distance";
  document.getElementById("resMinMaxJsw").textContent = `${jsw.min_px || "--"} / ${jsw.max_px || "--"} px`;
  document.getElementById("resSampleCount").textContent = `${jsw.sample_count || 0} column cross-sections`;
  document.getElementById("resQualityStatus").textContent = qual.status || "VALID";
  document.getElementById("resLatency").textContent = `Latency: ${measData.processing_time_ms || "--"} ms`;

  // Quality Badge Color
  const badge = document.getElementById("assessmentBadge");
  badge.textContent = `QC: ${qual.status || "VALID"}`;
  if (qual.status === "VALID") {
    badge.className = "badge-status success";
  } else if (qual.status === "VALID_WITH_WARNING") {
    badge.className = "badge-status warning";
  } else {
    badge.className = "badge-status danger";
  }

  // Detailed Summary Section
  document.getElementById("summaryJswStats").textContent = `Min: ${jsw.min_px || "--"} px | Median: ${jsw.median_px || "--"} px | Mean: ${jsw.mean_px || "--"} px | Max: ${jsw.max_px || "--"} px`;
  document.getElementById("summaryJswPercentiles").textContent = `10th: ${jsw.p10_px || "--"} px | 25th: ${jsw.p25_px || "--"} px | 75th: ${jsw.p75_px || "--"} px`;
  
  if (seg.bounding_box) {
    const b = seg.bounding_box;
    document.getElementById("summaryBBox").textContent = `[x:${b.x_min}, y:${b.y_min}, w:${b.width}, h:${b.height}]`;
  }
  if (seg.centroid) {
    document.getElementById("summaryCentroid").textContent = `(x: ${seg.centroid.x}, y: ${seg.centroid.y})`;
  }
  document.getElementById("summaryComponents").textContent = `${seg.component_count || 1} component(s) (Top-2: ${seg.top2_components_percentage || 100}%)`;
  document.getElementById("summaryCalibration").textContent = cal.notice || "Uncalibrated";
}

function displayAssessmentResults(assessData) {
  const seg = assessData.segmentation || {};
  const jsw = assessData.jsw_profile || {};
  const cal = assessData.calibration || {};
  const qc = assessData.quality_control || {};
  const res = assessData.research_assessment || {};

  // Badges
  document.getElementById("segQualityBadge").textContent = `SEG: ${seg.segmentation_quality || "--"}`;
  document.getElementById("assessBadge").textContent = `QC: ${qc.quality_status || "--"}`;
  document.getElementById("reliabilityBadge").textContent = `Reliability: ${res.measurement_reliability_score || "--"}`;

  document.getElementById("assessSegQuality").textContent = `${seg.segmentation_quality} (${(seg.top2_components_ratio * 100).toFixed(1)}% in dominant lobes)`;
  document.getElementById("assessMeasQuality").textContent = qc.quality_status;
  document.getElementById("assessReliabilityScore").textContent = `${res.measurement_reliability_score} / 1.00`;

  const warnEl = document.getElementById("assessWarnings");
  if (qc.warning_reasons && qc.warning_reasons.length > 0) {
    warnEl.textContent = qc.warning_reasons.join(" | ");
  } else if (qc.invalid_reasons && qc.invalid_reasons.length > 0) {
    warnEl.textContent = `INVALID: ${qc.invalid_reasons.join(" | ")}`;
  } else {
    warnEl.textContent = "None (Fully compliant)";
  }

  const obsEl = document.getElementById("assessObservations");
  if (res.observations && res.observations.length > 0) {
    obsEl.textContent = res.observations.join(" ");
  }
}

function setViewMode(mode) {
  currentMode = mode;
  const singleView = document.getElementById("singleViewport");
  const splitView = document.getElementById("splitViewport");
  const overlayLayer = document.getElementById("overlayLayer");
  const primaryImg = document.getElementById("primaryImage");
  const overlayControls = document.getElementById("overlayControls");

  if (mode === "split") {
    singleView.classList.add("hidden");
    splitView.classList.remove("hidden");
  } else {
    singleView.classList.remove("hidden");
    splitView.classList.add("hidden");

    if (mode === "overlay") {
      overlayLayer.classList.remove("hidden");
      overlayControls.classList.remove("hidden");
      if (currentSegmentation && currentSegmentation.overlay_relative_url) {
        overlayLayer.src = currentSegmentation.overlay_relative_url;
      }
    } else if (mode === "report") {
      overlayLayer.classList.add("hidden");
      overlayControls.classList.add("hidden");
      if (currentReport && currentReport.visualization_url) {
        primaryImg.src = currentReport.visualization_url;
      } else if (currentAssessment && currentAssessment.visualization_url) {
        primaryImg.src = currentAssessment.visualization_url;
      }
    } else if (mode === "assessment") {
      overlayLayer.classList.add("hidden");
      overlayControls.classList.add("hidden");
      if (currentAssessment && currentAssessment.visualization_url) {
        primaryImg.src = currentAssessment.visualization_url;
      }
    } else if (mode === "measurements") {
      overlayLayer.classList.add("hidden");
      overlayControls.classList.add("hidden");
      if (currentMeasurements && currentMeasurements.visualization_url) {
        primaryImg.src = currentMeasurements.visualization_url;
      }
    } else if (mode === "raw") {
      overlayLayer.classList.add("hidden");
      overlayControls.classList.add("hidden");
    } else if (mode === "mask") {
      overlayLayer.classList.add("hidden");
      overlayControls.classList.add("hidden");
      if (currentSegmentation && currentSegmentation.mask_relative_url) {
        primaryImg.src = currentSegmentation.mask_relative_url;
      }
    }
  }
}

function updateStep(stepNum) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`stepIndicator${i}`);
    if (i < stepNum) {
      el.className = "step-item completed";
    } else if (i === stepNum) {
      el.className = "step-item active";
    } else {
      el.className = "step-item";
    }
  }
}
