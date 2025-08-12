const fileContainer = document.getElementById('files-container');
const scanBtn = document.getElementById('scan-ports');
const portsList = document.getElementById('ports-list');
const portInfo = document.getElementById('port-info');
const sendBtn = document.getElementById('send-file');
const fileInput = document.getElementById('file-input');

let currentPort;
let selectedFile;
const knownDevices = {
  '0x2341-0x0043': 'Arduino Uno',
  '0x0403-0x6001': 'FTDI Serial Device'
};

async function loadFiles() {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) throw new Error('bad response');
    const files = await res.json();
    renderFiles(files);
  } catch (e) {
    console.warn('Falling back to fake files', e);
    const fakeFiles = [
      { id: 1, title: 'Se perdió', category: 'Error', content: 'Se perdió' },
      { id: 2, title: 'la conexión', category: 'Error', content: 'la conexión' },
      { id: 3, title: 'a la base de datos', category: 'Error', content: 'a la base de datos' }
    ];
    renderFiles(fakeFiles);
  }
}

function renderFiles(files) {
  fileContainer.innerHTML = '';
  const grouped = files.reduce((acc, f) => {
    acc[f.category] = acc[f.category] || [];
    acc[f.category].push(f);
    return acc;
  }, {});
  Object.keys(grouped).forEach(cat => {
    const catDiv = document.createElement('div');
    catDiv.className = 'file-category';
    const h3 = document.createElement('h3');
    h3.textContent = cat;
    catDiv.appendChild(h3);
    grouped[cat].forEach(file => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.textContent = file.title;
      div.addEventListener('click', () => {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        selectedFile = file;
        updateSendState();
      });
      catDiv.appendChild(div);
    });
    fileContainer.appendChild(catDiv);
  });
}

scanBtn.addEventListener('click', async () => {
  try {
    const port = await navigator.serial.requestPort();
    currentPort = port;
    await port.open({ baudRate: 9600 });
    const info = port.getInfo();
    const vid = info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : '0x0000';
    const pid = info.usbProductId ? `0x${info.usbProductId.toString(16)}` : '0x0000';
    const key = `${vid}-${pid}`;
    const name = knownDevices[key] || 'Desconocido';
    portsList.innerHTML = `<option>${name}</option>`;
    portInfo.textContent = `Conectado: ${name}`;
    updateSendState();
  } catch (err) {
    console.error(err);
    portInfo.textContent = 'No se seleccionó ningún puerto.';
  }
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      selectedFile = { title: file.name, content: reader.result };
      updateSendState();
    };
    reader.readAsArrayBuffer(file);
  }
});

async function sendFile() {
  if (!currentPort || !selectedFile) return;
  const writer = currentPort.writable.getWriter();
  let data;
  if (typeof selectedFile.content === 'string') {
    data = new TextEncoder().encode(selectedFile.content);
  } else if (selectedFile.content instanceof ArrayBuffer) {
    data = new Uint8Array(selectedFile.content);
  } else {
    data = new TextEncoder().encode(String(selectedFile.content));
  }
  await writer.write(data);
  writer.releaseLock();
}

sendBtn.addEventListener('click', sendFile);

function updateSendState() {
  sendBtn.disabled = !(currentPort && selectedFile);
}

loadFiles();
