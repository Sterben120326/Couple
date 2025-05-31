function openWebsite() {
  document.getElementById("introScreen").style.display = "none";
  document.getElementById("home").style.display = "block";
  document.getElementById("timer").style.display = "block";
  startTimer();
  loadNotes();
}

function goBack() {
  document.getElementById("home").style.display = "none";
  document.getElementById("introScreen").style.display = "block";
  document.getElementById("timer").style.display = "none";
}

function startTimer() {
  const philippineStart = new Date('2025-05-27T06:05:00+08:00');

  function updateTimer() {
    const now = new Date();
    const nowPH = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );

    const diff = nowPH - philippineStart;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById("timer").innerText =
      `Since May 27, 2025 6:05 Am: ${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// Letter Page
function openLetterPage() {
  document.getElementById("home").style.display = "none";
  document.getElementById("letterPage").style.display = "block";
  document.getElementById("timer").style.display = "none";
  loadNotes();
}

function goToHome() {
  document.getElementById("letterPage").style.display = "none";
  document.getElementById("voicePage").style.display = "none";
  document.getElementById("musicPage").style.display = "none";
  document.getElementById("home").style.display = "block";
  document.getElementById("timer").style.display = "block";
}

// Notes
const noteInput = document.getElementById("noteInput");
const notesDisplay = document.getElementById("notesDisplay");

// Get the server URL based on environment
const serverUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://couple-k9l8.onrender.com';

async function addNote() {
  const note = noteInput.value.trim();
  if (note.length === 0) return;

  try {
    const response = await fetch(`${serverUrl}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: note })
    });

    if (!response.ok) throw new Error('Failed to save note');
    
    noteInput.value = "";
    loadNotes();
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Failed to save note. Please try again.');
  }
}

async function deleteNote(id) {
  try {
    const response = await fetch(`${serverUrl}/api/notes/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete note');
    
    loadNotes();
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Failed to delete note. Please try again.');
  }
}

async function loadNotes() {
  try {
    const response = await fetch(`${serverUrl}/api/notes`);
    if (!response.ok) throw new Error('Failed to fetch notes');
    
    const notes = await response.json();
    
    if (notes.length === 0) {
      notesDisplay.innerHTML = "<p>No notes yet. Write one above!</p>";
      return;
    }

    notesDisplay.innerHTML = notes.map(n => `
      <div class="note-item">
        <span>• ${n.content}</span>
        <button class="delete-btn" onclick="deleteNote('${n._id}')">🗑️</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading notes:', error);
    notesDisplay.innerHTML = "<p>Failed to load notes. Please try again later.</p>";
  }
}

// Voice Mail
let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const voiceList = document.getElementById("voiceList");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function openVoicePage() {
  document.getElementById("home").style.display = "none";
  document.getElementById("voicePage").style.display = "block";
  document.getElementById("timer").style.display = "none";
  loadVoices();
}

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", event => {
      audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
      await saveVoice(audioBlob);
    });

    recordButton.style.display = "none";
    stopButton.style.display = "inline-block";
  });
}

function stopRecording() {
  mediaRecorder.stop();
  recordButton.style.display = "inline-block";
  stopButton.style.display = "none";
}

async function saveVoice(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.mp3');

    const response = await fetch(`${serverUrl}/api/voicemails`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to save voice mail');
    
    loadVoices();
  } catch (error) {
    console.error('Error saving voice mail:', error);
    alert('Failed to save voice mail. Please try again.');
  }
}

async function loadVoices() {
  try {
    const response = await fetch(`${serverUrl}/api/voicemails`);
    if (!response.ok) throw new Error('Failed to fetch voice mails');
    
    const voiceMails = await response.json();
    voiceList.innerHTML = "";
    
    voiceMails.forEach(vm => {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = `${serverUrl}/public/uploads/${vm.filename}`;

      const deleteButton = document.createElement("button");
      deleteButton.innerText = "Delete this voice mail";
      deleteButton.classList.add("delete-btn");
      deleteButton.onclick = async () => {
        try {
          const response = await fetch(`${serverUrl}/api/voicemails/${vm._id}`, {
            method: 'DELETE'
          });
          if (!response.ok) throw new Error('Failed to delete voice mail');
          loadVoices();
        } catch (error) {
          console.error('Error deleting voice mail:', error);
          alert('Failed to delete voice mail. Please try again.');
        }
      };

      const container = document.createElement("div");
      container.appendChild(audio);
      container.appendChild(deleteButton);
      voiceList.appendChild(container);
    });
  } catch (error) {
    console.error('Error loading voice mails:', error);
    voiceList.innerHTML = "<p>Failed to load voice mails. Please try again later.</p>";
  }
}

// Music Page
function openMusicPage() {
  document.getElementById("home").style.display = "none";
  document.getElementById("musicPage").style.display = "block";
  document.getElementById("timer").style.display = "none";
}
