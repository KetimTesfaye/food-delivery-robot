// kitchen.js

const SERVER_URL = 'wss://order-server-p529.onrender.com';
const ordersContainer = document.getElementById('orders-container');
const statusDiv = document.getElementById('status');

function connect() {
  const socket = new WebSocket(SERVER_URL);

  socket.onopen = () => {
    console.log('Connected to server');
    statusDiv.textContent = 'Connected ✅';
    statusDiv.style.color = 'green';
  };

  // --- 'onmessage' SECTION (No change) ---
  socket.onmessage = (event) => {
    try {
      console.log('Received message:', event.data);
      const message = JSON.parse(event.data);

      if (message.type === 'order') {
        displayOrder(message);
      } else if (message.type === 'cancel') {
        removeOrder(message.table);
      } else if (message.type === 'item-remove') {
        removeItem(message.id);
      }
      
    } catch (error) {
      console.error('Error parsing message data:', error);
    }
  };

  socket.onclose = () => {
    console.log('Disconnected. Trying to reconnect in 3 seconds...');
    statusDiv.textContent = 'Disconnected ❌. Reconnecting...';
    statusDiv.style.color = 'red';
    setTimeout(connect, 3000);
  };

  socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
    statusDiv.textContent = 'Connection Error ❌';
    statusDiv.style.color = 'red';
  };
}

// --- 'displayOrder' SECTION (HEAVILY UPDATED) ---
// This function now finds an existing ticket or creates a new one
function displayOrder(order) {
  // Try to find an existing ticket for this table
  let ticket = document.querySelector(`.order-ticket[data-table="${order.table}"]`);
  let itemList;
  
  if (ticket) {
    // Ticket exists, just find the <ul> inside it
    itemList = ticket.querySelector('ul');
    console.log(`Adding items to existing ticket for Table ${order.table}`);
  } else {
    // No ticket exists, so create a new one
    console.log(`Creating new ticket for Table ${order.table}`);
    ticket = document.createElement('div');
    ticket.className = 'order-ticket';
    ticket.dataset.table = order.table; 

    const tableHeader = document.createElement('h2');
    tableHeader.textContent = `Table ${order.table}`;
    ticket.appendChild(tableHeader);

    // Create the <ul> for the items
    itemList = document.createElement('ul');
    ticket.appendChild(itemList);
    
    // Add the new ticket to the top of the container
    ordersContainer.prepend(ticket);
  }
  
  // Now, add the new items to the itemList (whether it's new or old)
  order.items.forEach(itemObject => {
    const li = document.createElement('li');
    li.textContent = itemObject.item;
    li.dataset.id = itemObject.id;
    itemList.appendChild(li);
  });
}

// --- 'removeOrder' SECTION (No change) ---
// This function removes the ENTIRE ticket
function removeOrder(tableNumber) {
  const ticketToRemove = document.querySelector(`.order-ticket[data-table="${tableNumber}"]`);
  if (ticketToRemove) {
    ticketToRemove.remove();
  }
}

// --- 'removeItem' SECTION (No change) ---
// This function removes a SINGLE item from a ticket
function removeItem(id) {
  const liToRemove = document.querySelector(`li[data-id="${id}"]`);
  if (liToRemove) {
    liToRemove.remove();
  }
}

// Start the connection
connect();