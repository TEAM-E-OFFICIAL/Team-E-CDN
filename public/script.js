const API = '/api';

async function createFolder() {
  const name = document.getElementById('folderName').value.trim();
  const pass = document.getElementById('folderPass').value;

  if (!name || !pass) return alert("Folder name and password required");

  const res = await fetch(`${API}/create-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderName: name, password: pass })
  });

  const data = await res.json();
  alert(data.success ? `Folder "${name}" created!` : data.error);
}

async function uploadFile() {
  const folder = document.getElementById('uploadFolder').value.trim();
  const pass = document.getElementById('uploadPass').value;
  const file = document.getElementById('fileInput').files[0];

  if (!folder || !pass || !file) return alert("All fields required");

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  form.append('password', pass);

  const res = await fetch(`${API}/upload`, { method: 'POST', body: form });
  const data = await res.json();

  alert(data.success ? `Uploaded! URL: ${data.url}` : data.error);
}

async function listFiles() {
  const folder = document.getElementById('listFolder').value.trim();
  const pass = document.getElementById('listPass').value;
  const listDiv = document.getElementById('fileList');

  if (!folder || !pass) return alert("Folder and password required");

  const res = await fetch(`${API}/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, password: pass })
  });

  const data = await res.json();

  if (!data.files) {
    listDiv.innerHTML = `<p style="color:red">${data.error}</p>`;
    return;
  }

  listDiv.innerHTML = data.files.map(f => `
    <a href="${f.url}" target="_blank">${f.name} (${(f.size/1024).toFixed(1)} KB)</a>
  `).join('');
}
