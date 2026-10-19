// script.js

const SERVER_URL = 'wss://order-server-p529.onrender.com';
const socket = new WebSocket(SERVER_URL);

socket.onopen = () => {
  console.log('Menu is connected to the order server.');
};
socket.onerror = (error) => {
  console.error('Menu WebSocket error:', error);
  alert('Error: Could not connect to the order server. Please refresh.');
};

// --- TRANSLATION MAP ---
const amharicMap = {
  "Injera Firfir": "እንጀራ ፍርፍር",
  "pasta": "ፓስታ", 
  "Shiro Wot": "ሽሮ ወጥ",
  "Doro Wot": "ዶሮ ወጥ",
  "Tea": "ሻይ",
  "Coffee": "ቡና",
  "Milk": "ወተት",
  "Water": "ውሃ",
  
  // Phrases
  "added_to_table": "ወደ ጠረጴዛ ታዟል",
  "order_confirmed_for_table": "የጠረጴዛ ትዕዛዝ ፀድቋል",
  "order_canceled_for_table": "የጠረጴዛ ትዕዛዝ ተሰርዟል"
};

document.addEventListener("DOMContentLoaded", () => {
  // --- DARK MODE LOGIC ---
  const darkModeToggle = document.getElementById('darkModeToggle');
  const body = document.body;

  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
      body.classList.add('dark-mode');
      darkModeToggle.textContent = '☀️';
  }

  darkModeToggle.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      
      let theme = 'light';
      if (body.classList.contains('dark-mode')) {
          theme = 'dark';
          darkModeToggle.textContent = '☀️';
      } else {
          darkModeToggle.textContent = '🌙';
      }
      
      localStorage.setItem('theme', theme);
  });

  // --- ROBOT IDLE SCREEN & VOICE/MOUTH LOGIC ---
  const idleScreen = document.getElementById("idle-screen");
  const robotMouth = document.getElementById("robot-mouth");
  let idleTimer;
  const IDLE_TIMEOUT_MS = 20000; // 20 seconds inactivity triggers idle screen

  function playIdleGreeting() {
    // 1. Start mouth animation
    if (robotMouth) robotMouth.classList.add("speaking");

    // 2. Speak English Greeting
    speakText("Hello! I am your friendly service robot. Ready to take your order.", "en");

    // 3. Speak Amharic Greeting after 4 seconds
    setTimeout(() => {
      speakAmharic("ሰላም! እኔ የእርስዎ ወዳጃዊ የአገልግሎት ሮቦት ነኝ። ትዕዛዝዎን ለመቀበል ዝግጁ ነኝ።");
    }, 4500);

    // 4. Stop mouth animation after 9 seconds
    setTimeout(() => {
      if (robotMouth) robotMouth.classList.remove("speaking");
    }, 9500);
  }

  function showIdleScreen() {
    idleScreen.classList.remove("hidden");
    playIdleGreeting();
  }

  function hideIdleScreen() {
    idleScreen.classList.add("hidden");
    if (robotMouth) robotMouth.classList.remove("speaking");
    speechSynthesis.cancel(); // Stop talking on tap
    resetIdleTimer();
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showIdleScreen, IDLE_TIMEOUT_MS);
  }

  window.addEventListener("mousemove", resetIdleTimer);
  window.addEventListener("mousedown", resetIdleTimer);
  window.addEventListener("keypress", resetIdleTimer);
  window.addEventListener("touchstart", resetIdleTimer);
  window.addEventListener("click", resetIdleTimer);

  idleScreen.addEventListener("click", hideIdleScreen);
  resetIdleTimer();

  const orderBtns = document.querySelectorAll(".order-btn");
  const confirmBtns = document.querySelectorAll(".confirm-btn");
  const cancelBtns = document.querySelectorAll(".cancel-btn");
  const tableSelect = document.getElementById("table-select");

  let orders = {}; 
  let currentTable = parseInt(tableSelect.value);

  [1,2,3,4,5].forEach(t => orders[t] = []);

  tableSelect.addEventListener("change", (e) => {
    currentTable = parseInt(e.target.value);
  });

  // --- 'orderBtns' SECTION ---
  orderBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement.getAttribute("data-item");
      const uniqueId = crypto.randomUUID();
      const orderItem = { id: uniqueId, item: item };
      orders[currentTable].push(orderItem);
      
      const orderList = document.getElementById(`order-list-${currentTable}`);
      const li = document.createElement("li");
      li.textContent = item;
      li.dataset.id = uniqueId;
      
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.className = "remove-item-btn";
      removeBtn.onclick = () => {
        removeItemFromOrder(currentTable, uniqueId);
      };

      li.appendChild(removeBtn);
      orderList.appendChild(li);
      
      speakText(`${item} added to Table ${currentTable}`, "en");
      const amharicItem = amharicMap[item] || item;
      const amharicPhrase = amharicMap["added_to_table"];
      setTimeout(() => speakAmharic(`${amharicItem} ${amharicPhrase} ${currentTable}`), 1500);
    });
  });

  // --- 'removeItemFromOrder' FUNCTION ---
  function removeItemFromOrder(table, id) {
    orders[table] = orders[table].filter(order => order.id !== id);
    const liToRemove = document.querySelector(`li[data-id="${id}"]`);
    if (liToRemove) {
      liToRemove.remove();
    }
    const updateData = {
      type: 'item-remove',
      table: table,
      id: id
    };
    socket.send(JSON.stringify(updateData));
  }

  // --- 'confirmBtns' SECTION ---
  confirmBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.getAttribute("data-table");
      if (!orders[table] || orders[table].length === 0) {
        alert(`Table ${table} has no new items to order.`);
        return;
      }
      
      alert(`Order for Table ${table} is confirmed!`);
      btn.classList.add("confirmed");
      
      speakText(`Order for Table ${table} is confirmed.`, "en");
      const amharicPhrase = amharicMap["order_confirmed_for_table"];
      setTimeout(() => speakAmharic(`${amharicPhrase} ${table}`), 1500);
      
      const orderData = {
        type: 'order',
        table: table,
        items: orders[table]
      };
      
      socket.send(JSON.stringify(orderData));

      const orderList = document.getElementById(`order-list-${table}`);
      orderList.querySelectorAll('li').forEach(li => {
        const itemSent = orders[table].find(order => order.id === li.dataset.id);
        if (itemSent) {
          li.style.color = 'orange';
          const removeBtn = li.querySelector('.remove-item-btn');
          if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.style.backgroundColor = '#aaa';
          }
        }
      });
      
      orders[table] = []; 
    });
  });

  // --- 'cancelBtns' SECTION ---
  cancelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.getAttribute("data-table");
      
      orders[table] = [];
      const orderList = document.getElementById(`order-list-${table}`);
      orderList.innerHTML = "";
      
      alert(`Order for Table ${table} has been canceled.`);
      
      speakText(`Order for Table ${table} has been canceled.`, "en");
      const amharicPhrase = amharicMap["order_canceled_for_table"];
      setTimeout(() => speakAmharic(`${amharicPhrase} ${table}`), 1500);

      const cancelData = {
        type: 'cancel',
        table: table
      };
      socket.send(JSON.stringify(cancelData));
    });
  });

  // --- 'speakText' FUNCTION ---
  function speakText(text, lang) {
    if (lang !== "en") return; 
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    
    utterance.voice = voices.find(v => v.lang.includes("en") && v.name.toLowerCase().includes("female"))
                        || voices.find(v => v.lang.includes("en")) 
                        || voices[0]; 
                        
    speechSynthesis.speak(utterance);
  }

  // --- 'speakAmharic' FUNCTION ---
  function speakAmharic(text) {
    console.log(`Requesting Amharic: ${text}`);
    const encodedText = encodeURIComponent(text);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodedText}&tl=am`;
    
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.error("Audio play failed:", e));
  }

  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => { speechSynthesis.getVoices(); };
  }
});