const filesContainer = document.getElementById('files-container');
const portsList = document.getElementById('ports-list');
const deviceNameSpan = document.getElementById('device-name');
let ports = [];
let currentPort = null;

// Algunos dispositivos conocidos (VID:PID)
const knownDevices = {
  '0x2341:0x0043': 'Arduino Uno'
};

async function loadFiles() {
  try {
    const res = await fetch('files.json');
    if (!res.ok) throw new Error('DB error');
    const data = await res.json();
    renderFiles(data);
  } catch (err) {
    const fallback = [
      { name: 'Conexión', category: 'Easter Egg' },
      { name: 'con', category: 'Easter Egg' },
      { name: 'la', category: 'Easter Egg' },
      { name: 'base', category: 'Easter Egg' },
      { name: 'de datos', category: 'Easter Egg' },
      { name: 'perdida', category: 'Easter Egg' }
    ];
    renderFiles(fallback);
  }
}

function renderFiles(files) {
  filesContainer.innerHTML = '';
  const groups = {};
  files.forEach(f => {
    if (!groups[f.category]) groups[f.category] = [];
    groups[f.category].push(f);
  });
  Object.keys(groups).forEach(cat => {
    const catTitle = document.createElement('h3');
    catTitle.textContent = cat;
    filesContainer.appendChild(catTitle);
    groups[cat].forEach(file => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.innerHTML = `<h3>${file.name}</h3>`;
      const btn = document.createElement('button');
      btn.textContent = 'Enviar al programador';
      btn.addEventListener('click', () => sendFile(file.path || file.name));
      card.appendChild(btn);
      filesContainer.appendChild(card);
    });
  });
}

async function scanPorts() {
  try {
    await navigator.serial.requestPort({ filters: [] });
  } catch (e) {
    console.warn('Solicitud de puertos cancelada', e);
  }
  ports = await navigator.serial.getPorts();
  portsList.innerHTML = '';
  ports.forEach((port, index) => {
    const info = port.getInfo();
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `VID:${info.usbVendorId || 0} PID:${info.usbProductId || 0}`;
    portsList.appendChild(option);
  });
}

async function connectPort() {
  const index = portsList.value;
  const port = ports[index];
  if (!port) {
    alert('Seleccione un puerto');
    return;
  }
  await port.open({ baudRate: 9600 });
  currentPort = port;
  const info = port.getInfo();
  const name = getDeviceName(info);
  deviceNameSpan.textContent = name;
}

function getDeviceName(info) {
  const vid = info.usbVendorId ? '0x' + info.usbVendorId.toString(16) : '0x0000';
  const pid = info.usbProductId ? '0x' + info.usbProductId.toString(16) : '0x0000';
  const key = `${vid}:${pid}`;
  return knownDevices[key] || 'Desconocido';
}

async function sendFile(pathOrName) {
  if (!currentPort) {
    alert('No hay puerto conectado');
    return;
  }
  let data;
  try {
    const res = await fetch(pathOrName);
    data = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    data = new TextEncoder().encode(pathOrName);
  }
  const writer = currentPort.writable.getWriter();
  await writer.write(data);
  writer.releaseLock();
  alert('Enviado');
}

document.getElementById('scan-ports').addEventListener('click', scanPorts);
document.getElementById('connect-port').addEventListener('click', connectPort);

loadFiles();
