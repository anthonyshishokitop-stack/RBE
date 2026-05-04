// ====================== FIREBASE SETUP ======================
const firebaseConfig = {
    apiKey: "AIzaSyCnDsQVhQxk9Q7axCPcMSpHDcqOonBbNMc",
    authDomain: "rbe-equipment.firebaseapp.com",
    projectId: "rbe-equipment",
    storageBucket: "rbe-equipment.firebasestorage.app",
    messagingSenderId: "481759813476",
    appId: "1:481759813476:web:ef176ffa73fb65e01ca471",
    measurementId: "G-15E0HZJ2X6"
};

// Initialize Firebase (Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp, 
    onSnapshot, 
    query, 
    orderBy, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('%c✅ Firebase initialized successfully (Modular)', 'color:#16a34a; font-weight:bold');

const HISTORY_COLLECTION = 'searchHistory';

// Save a new search to Firebase
async function addToSearchHistory(jobOrderNumber, pdfName = '') {
  if (!jobOrderNumber) return;
  try {
    await addDoc(collection(db, HISTORY_COLLECTION), {
      jobOrder: jobOrderNumber.toString().trim(),
      pdfName: pdfName || `Job Order ${jobOrderNumber}`,
      timestamp: serverTimestamp(),
      searchedAt: new Date().toISOString()
    });
    console.log(`✅ Saved to history: ${jobOrderNumber}`);
  } catch (e) {
    console.error("❌ Error saving to history:", e);
  }
}

// Real-time listener
let historyUnsubscribe = null;

function startLiveSearchHistory() {
  if (historyUnsubscribe) historyUnsubscribe();

  const q = query(
    collection(db, HISTORY_COLLECTION),
    orderBy("timestamp", "desc"),
    limit(30)
  );

  historyUnsubscribe = onSnapshot(q, (snapshot) => {
    const history = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(data.searchedAt)
      });
    });
    updateHistoryUI(history);
  }, (error) => {
    console.error("History listener error:", error);
  });
}

// Display history in the list
function updateHistoryUI(history) {
  const container = document.getElementById('history-list');
  if (!container) {
    console.error("❌ #history-list not found");
    return;
  }

  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = `<li class="list-group-item text-muted">No searches yet. Perform a search above.</li>`;
    return;
  }

  history.forEach(item => {
    const li = document.createElement('li');
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div>
        <strong>Job Order: ${item.jobOrder}</strong><br>
        <small class="text-muted">${item.pdfName || ''}</small>
      </div>
      <small class="text-muted">${item.timestamp.toLocaleString()}</small>
    `;
    container.appendChild(li);
  });
}

// ====================== CONNECT SEARCH BUTTON ======================
document.addEventListener('DOMContentLoaded', function() {
  const searchForm = document.getElementById('search-form');
  
  if (searchForm) {
    searchForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Get value from Equipment ID or Job Order select
      let jobOrderNumber = document.getElementById('s-loco').value.trim();
      if (!jobOrderNumber) {
        jobOrderNumber = document.getElementById('job-loco').value;
      }

      if (jobOrderNumber) {
        await addToSearchHistory(jobOrderNumber);   // ← Save to Firebase
        console.log(`🔍 Searched: ${jobOrderNumber}`);
        // You can add your existing search logic here later
      } else {
        alert("Please enter Equipment ID or select Job Order Equipment");
      }
    });
  }

  // Start listening to Firebase history
  console.log('%c📡 Starting live search history...', 'color:#3b82f6');
  startLiveSearchHistory();
});

// Optional: Clear history button (type in console: clearSearchHistory())
window.clearSearchHistory = async () => {
  if (confirm("Clear all search history?")) {
    const snapshot = await db.collection(HISTORY_COLLECTION).get();
    snapshot.docs.forEach(doc => doc.ref.delete());
    console.log("🗑️ History cleared");
  }
};

// ====================== EXCEL IMPORT BREAKDOWN ======================

let importedData = [];
let mappedRows = [];

// Handle file upload
window.handleFileUpload = function() {
    const fileInput = document.getElementById('excel-file');
    if (!fileInput || !fileInput.files[0]) {
        alert("Please select an Excel file first!");
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Find sheet with "breakdown" in name
            let sheetName = workbook.SheetNames.find(name => 
                name.toLowerCase().includes('breakdown')
            ) || workbook.SheetNames[0];
            
            const worksheet = workbook.Sheets[sheetName];
            importedData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log(`✅ Loaded ${importedData.length} rows from sheet: ${sheetName}`);
            
            if (importedData.length === 0) {
                alert("No data found in the Excel file.");
                return;
            }
            
            alert(`Successfully parsed ${importedData.length} rows from "${sheetName}" sheet.\n\nNow click "Start Mapping" if the button appears.`);
            
            // Auto start mapping
            startColumnMapping();
            
        } catch (err) {
            console.error(err);
            alert("Error reading Excel file: " + err.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
};

// Start column mapping
window.startColumnMapping = function() {
    if (importedData.length === 0) {
        alert("Please upload and parse Excel file first.");
        return;
    }
    
    // Show mapping section (you can expand this later)
    console.log("🔄 Starting column mapping...");
    console.table(importedData.slice(0, 5)); // Show sample data
    
    // For now, just preview first 10 rows
    previewImportedData();
};

// Simple preview
function previewImportedData() {
    console.log("%c📋 Preview of first 5 rows:", "color:orange; font-weight:bold");
    console.table(importedData.slice(0, 5));
    
    alert(`✅ Parsed ${importedData.length} rows successfully!\n\nCheck console (F12) for preview.\n\nNext step: We need to create the mapping UI and import function.`);
}

// Optional: Import to Firebase (Breakdowns collection)
window.importSelectedRows = async function() {
    if (importedData.length === 0) return;
    
    try {
        for (let row of importedData) {
            await addDoc(collection(db, "breakdowns"), {
                equipmentId: row["Equipment ID"] || row["Equipment"] || "Unknown",
                date: row["Date"] || new Date(),
                downtime: parseFloat(row["Downtime"] || row["Down Hrs"] || 0),
                reason: row["Reason"] || row["Fault"] || row["Description"] || "",
                shift: row["Shift"] || "",
                timestamp: serverTimestamp()
            });
        }
        alert("✅ Successfully imported all rows to Firebase!");
    } catch (e) {
        console.error(e);
        alert("Error during import: " + e.message);
    }
};
