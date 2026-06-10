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

// --- THIS IS YOUR NEW TRANSLATION MAP ---
const amharicMap = {
  "Injera Firfir": "እንጀራ ፍርፍር",
  "pastar": "ፓስታ", // "pastar" is what's in your HTML
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
// ----------------------------------------


document.addEventListener("DOMContentLoaded", () => {
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

  // --- 'orderBtns' SECTION (UPDATED) ---
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
      
      // --- UPDATED SPEECH ---
      speakText(`${item} added to Table ${currentTable}`, "en");
      const amharicItem = amharicMap[item] || item;
      const amharicPhrase = amharicMap["added_to_table"];
      setTimeout(() => speakAmharic(`${amharicItem} ${amharicPhrase} ${currentTable}`), 1500); // Speak Amharic after 1.5s
    });
  });

  // --- 'removeItemFromOrder' FUNCTION (No speech change) ---
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

  // --- 'confirmBtns' SECTION (UPDATED) ---
  confirmBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.getAttribute("data-table");
      if (!orders[table] || orders[table].length === 0) {
        alert(`Table ${table} has no new items to order.`);
        return;
      }
      
      alert(`Order for Table ${table} is confirmed!`);
      btn.classList.add("confirmed");
      
      // --- UPDATED SPEECH ---
      speakText(`Order for Table ${table} is confirmed.`, "en");
      const amharicPhrase = amharicMap["order_confirmed_for_table"];
      setTimeout(() => speakAmharic(`${amharicPhrase} ${table}`), 1500); // Speak Amharic
      
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

  // --- 'cancelBtns' SECTION (UPDATED) ---
  cancelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.getAttribute("data-table");
      
      orders[table] = [];
      const orderList = document.getElementById(`order-list-${table}`);
      orderList.innerHTML = "";
      
      alert(`Order for Table ${table} has been canceled.`);
      
      // --- UPDATED SPEECH ---
      speakText(`Order for Table ${table} has been canceled.`, "en");
      const amharicPhrase = amharicMap["order_canceled_for_table"];
      setTimeout(() => speakAmharic(`${amharicPhrase} ${table}`), 1500); // Speak Amharic

      const cancelData = {
        type: 'cancel',
        table: table
      };
      socket.send(JSON.stringify(cancelData));
    });
  });

  // --- 'speakText' FUNCTION (UPDATED) ---
  // This now searches for a female English voice
  function speakText(text, lang) {
    if (lang !== "en") return; 
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    
    // Try to find a female English voice
    utterance.voice = voices.find(v => v.lang.includes("en") && v.name.toLowerCase().includes("female"))
                      || voices.find(v => v.lang.includes("en")) // Fallback to any English voice
                      || voices[0]; // Fallback to the first voice
                      
    speechSynthesis.speak(utterance);
  }

  // --- NEW 'speakAmharic' FUNCTION ---
  // This uses the Google Translate free API
  function speakAmharic(text) {
    console.log(`Requesting Amharic: ${text}`);
    const encodedText = encodeURIComponent(text);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodedText}&tl=am`;
    
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.error("Audio play failed:", e));
  }
  // ------------------------------------

  // This part is important for Chrome to load voices
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => { speechSynthesis.getVoices(); };
  }
});