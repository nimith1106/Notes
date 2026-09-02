(function(){
  const API_ORIGIN = (import.meta.env && import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const API = API_ORIGIN + '/api/notes';
  const ADMIN_STATUS_API = API_ORIGIN + '/api/admin/status';
  const SEMESTERS = ["Sem 1","Sem 2","Sem 3","Sem 4","Sem 5","Sem 6","Sem 7","Sem 8"];
  const TYPES = ["Notes","QuestionBank","PreviousPaper","Syllabus"];
  const TYPE_LABELS = { Notes:"Notes", QuestionBank:"Question Bank", PreviousPaper:"Previous Paper", Syllabus:"Syllabus" };
  const AVATAR_COLORS = ["#2f5fdc","#7c3aed","#d97706","#0d9488","#dc4444","#059669","#db2777","#4f46e5"];

  const semTabs = document.getElementById('semTabs');
  const chipRow = document.getElementById('chipRow');
  const sortSelect = document.getElementById('sortSelect');
  const subjectGrid = document.getElementById('subjectGrid');
  const searchInput = document.getElementById('searchInput');
  const brandStats = document.getElementById('brandStats');
  const recentStrip = document.getElementById('recentStrip');
  const recentRow = document.getElementById('recentRow');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const adminBtn = document.getElementById('adminBtn');
  const heroUploadBtn = document.getElementById('heroUploadBtn');
  const heroBrowseBtn = document.getElementById('heroBrowseBtn');
  const heroNotesCount = document.getElementById('heroNotesCount');
  const heroFavCount = document.getElementById('heroFavCount');

  const dialogOverlay = document.getElementById('dialogOverlay');
  const dialogModal = document.getElementById('dialogModal');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogMessage = document.getElementById('dialogMessage');
  const dialogInputWrap = document.getElementById('dialogInputWrap');
  const dialogPasswordInput = document.getElementById('dialogPasswordInput');
  const dialogErrorText = document.getElementById('dialogErrorText');
  const dialogCancelBtn = document.getElementById('dialogCancelBtn');
  const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
  const toastContainer = document.getElementById('toastContainer');

  const openUploadBtn = document.getElementById('openUploadBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const cancelUpload = document.getElementById('cancelUpload');
  const submitUpload = document.getElementById('submitUpload');
  const semSelect = document.getElementById('semSelect');
  const subjectNameInput = document.getElementById('subjectName');
  const subjectCodeInput = document.getElementById('subjectCode');
  const typeSelect = document.getElementById('typeSelect');
  const noteTitleField = document.getElementById('noteTitleField');
  const noteTitleInput = document.getElementById('noteTitle');
  const fileDrop = document.getElementById('fileDrop');
  const fileDropText = document.getElementById('fileDropText');
  const fileInput = document.getElementById('fileInput');
  const bulkHint = document.getElementById('bulkHint');
  const fileError = document.getElementById('fileError');

  const editOverlay = document.getElementById('editOverlay');
  const cancelEdit = document.getElementById('cancelEdit');
  const submitEdit = document.getElementById('submitEdit');
  const editSubjectName = document.getElementById('editSubjectName');
  const editSubjectCode = document.getElementById('editSubjectCode');
  const editTypeSelect = document.getElementById('editTypeSelect');
  const editNoteTitle = document.getElementById('editNoteTitle');
  const editFileDrop = document.getElementById('editFileDrop');
  const editFileDropText = document.getElementById('editFileDropText');
  const editFileInput = document.getElementById('editFileInput');
  const editFileError = document.getElementById('editFileError');

  let allNotes = [];
  let activeSem = SEMESTERS[0];
  let activeFilter = 'All';
  let activeSort = 'newest';
  let pickedFiles = [];
  let editTargetId = null;
  let editPickedFile = null;
  let adminPassword = sessionStorage.getItem('notestudio-admin-password') || '';
  let isAdmin = false;

  function fmtSize(bytes){
    if(!bytes) return '';
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  }
  function fmtTotalSize(bytes){
    if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  }
  function avatarColor(name){
    let hash = 0;
    for(let i=0;i<name.length;i++){ hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function fileIconSvg(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'; }
  function downloadIconSvg(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>'; }
  function trashIconSvg(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'; }
  function eyeIconSvg(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>'; }
  function starIconSvg(filled){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'; }
  function pencilIconSvg(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'; }

  // ---------- theme ----------
  function applyTheme(theme){
    document.body.setAttribute('data-theme', theme);
    themeIcon.innerHTML = theme === 'dark'
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  }
  themeToggle.addEventListener('click', ()=>{
    const current = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('notestudio-theme', next);
  });
  applyTheme(localStorage.getItem('notestudio-theme') || 'light');

  let dialogResolver = null;
  function closeDialog(){
    dialogOverlay.classList.remove('open');
    dialogOverlay.setAttribute('aria-hidden', 'true');
    dialogInputWrap.style.display = 'none';
    dialogPasswordInput.value = '';
    dialogErrorText.textContent = '';
    dialogErrorText.classList.remove('show');
    dialogModal.classList.remove('danger');
    dialogConfirmBtn.classList.remove('danger');
    dialogConfirmBtn.dataset.mode = 'confirm';
  }

  function openDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false, showInput = false } = {}){
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogConfirmBtn.textContent = confirmText;
    dialogCancelBtn.textContent = cancelText;
    dialogModal.classList.toggle('danger', isDanger);
    dialogConfirmBtn.classList.toggle('danger', isDanger);
    dialogInputWrap.style.display = showInput ? 'block' : 'none';
    dialogPasswordInput.value = '';
    dialogErrorText.textContent = '';
    dialogErrorText.classList.remove('show');
    dialogOverlay.classList.add('open');
    dialogOverlay.setAttribute('aria-hidden', 'false');
    dialogConfirmBtn.dataset.mode = showInput ? 'input' : 'confirm';
    if(showInput){ dialogPasswordInput.focus(); }
  }

  function showConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false } = {}){
    return new Promise(resolve => {
      dialogResolver = resolve;
      openDialog({ title, message, confirmText, cancelText, isDanger });
    });
  }

  function showPasswordDialog({ title = 'Owner access', message = 'Enter the owner password to continue.' } = {}){
    return new Promise(resolve => {
      dialogResolver = resolve;
      openDialog({ title, message, confirmText: 'Continue', cancelText: 'Cancel', showInput: true });
    });
  }

  function showInfoDialog({ title, message, confirmText = 'OK' } = {}){
    return new Promise(resolve => {
      dialogResolver = resolve;
      openDialog({ title, message, confirmText, cancelText: 'Close' });
    });
  }

  function showToast({ type = 'success', message = 'Saved', duration = 2600 } = {}) {
    if(!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<div class="toast-icon">' + (type === 'error' ? '!' : '✓') + '</div>' +
      '<div class="toast-text">' + escapeHtml(message) + '</div>';
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    }, duration);
  }

  function setLoadingState(button, isLoading, label) {
    if(!button) return;
    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);
    button.textContent = isLoading ? label : button.dataset.defaultLabel || label;
  }

  dialogCancelBtn.addEventListener('click', ()=>{
    closeDialog();
    if(dialogResolver){ dialogResolver(null); dialogResolver = null; }
  });

  dialogConfirmBtn.addEventListener('click', ()=>{
    if(dialogConfirmBtn.dataset.mode === 'input'){
      const value = dialogPasswordInput.value.trim();
      if(!value){
        dialogErrorText.textContent = 'Please enter the owner password.';
        dialogErrorText.classList.add('show');
        dialogPasswordInput.focus();
        return;
      }
      closeDialog();
      if(dialogResolver){ dialogResolver(value); dialogResolver = null; }
      return;
    }

    closeDialog();
    if(dialogResolver){ dialogResolver(true); dialogResolver = null; }
  });

  dialogOverlay.addEventListener('click', (event)=>{
    if(event.target !== dialogOverlay) return;
    closeDialog();
    if(dialogResolver){ dialogResolver(null); dialogResolver = null; }
  });

  // ---------- API helpers ----------
  async function fetchNotes(){
    const res = await fetch(API);
    if(!res.ok) throw new Error('Failed to load notes');
    allNotes = await res.json();
  }
  async function toggleFavoriteApi(id){
    const res = await fetch(API + '/' + id + '/favorite', { method:'POST' });
    return res.json();
  }
  async function markViewedApi(id){
    const res = await fetch(API + '/' + id + '/view', { method:'POST' });
    return res.json();
  }
  async function deleteNoteApi(id){
    const res = await fetch(API + '/' + id, { method:'DELETE', headers:{ 'x-admin-password': adminPassword } });
    return res.json();
  }

  async function checkAdmin(){
    const res = await fetch(ADMIN_STATUS_API, { headers:{ 'x-admin-password': adminPassword } });
    const result = await res.json();
    isAdmin = result.admin === true;
    adminBtn.textContent = isAdmin ? 'Owner logout' : 'Owner login';
    renderGrid();
  }

  adminBtn.addEventListener('click', async ()=>{
    if(isAdmin){
      adminPassword = '';
      sessionStorage.removeItem('notestudio-admin-password');
      isAdmin = false;
      adminBtn.textContent = 'Owner login';
      renderGrid();
      return;
    }

    const password = await showPasswordDialog({
      title: 'Owner access',
      message: 'Enter the owner password to unlock admin controls.'
    });

    if(!password) return;
    adminPassword = password;
    await checkAdmin();
    if(!isAdmin){
      adminPassword = '';
      await showInfoDialog({
        title: 'Owner access failed',
        message: 'The password you entered is incorrect. Please try again.'
      });
      showToast({ type:'error', message:'Owner access denied' });
    }else{
      sessionStorage.setItem('notestudio-admin-password', adminPassword);
      showToast({ type:'success', message:'Owner access granted' });
    }
  });

  // ---------- stats ----------
  function renderStats(){
    const count = allNotes.length;
    const totalBytes = allNotes.reduce((sum,n)=> sum + (n.size||0), 0);
    brandStats.textContent = count + (count===1 ? ' note' : ' notes') + (count ? ' · ' + fmtTotalSize(totalBytes) : '');

    if(heroNotesCount) heroNotesCount.textContent = String(count);
    if(heroFavCount) heroFavCount.textContent = String(allNotes.filter(note => note.favorite).length);
  }

  // ---------- recently viewed ----------
  function renderRecent(){
    const viewed = allNotes.filter(n=> n.viewedAt).sort((a,b)=> b.viewedAt - a.viewedAt).slice(0,8);
    if(!viewed.length){ recentStrip.style.display = 'none'; return; }
    recentStrip.style.display = 'block';
    recentRow.innerHTML = '';
    viewed.forEach(n=>{
      const card = document.createElement('div');
      card.className = 'recent-card';
      card.innerHTML =
        '<div class="rc-title">' + escapeHtml(n.title) + '</div>' +
        '<div class="rc-meta">' + escapeHtml(n.subjectName) + ' · ' + n.sem + '</div>';
      card.addEventListener('click', ()=> openViewer(n));
      recentRow.appendChild(card);
    });
  }

  // ---------- tabs ----------
  function renderTabs(){
    semTabs.innerHTML = '';
    SEMESTERS.forEach(sem=>{
      const tab = document.createElement('button');
      tab.className = 'sem-tab' + (sem === activeSem ? ' active' : '');
      tab.textContent = sem;
      tab.addEventListener('click', ()=>{
        activeSem = sem;
        searchInput.value = '';
        renderTabs();
        renderGrid();
      });
      semTabs.appendChild(tab);
    });
  }

  // ---------- filter chips ----------
  function renderChips(){
    const chips = [
      { key:'All', label:'All' },
      ...TYPES.map(t => ({ key:t, label: TYPE_LABELS[t] })),
      { key:'Favorites', label:'★ Favorites', fav:true }
    ];
    chipRow.innerHTML = '';
    chips.forEach(c=>{
      const chip = document.createElement('button');
      chip.className = 'chip' + (c.fav ? ' fav' : '') + (activeFilter === c.key ? ' active' : '');
      chip.textContent = c.label;
      chip.addEventListener('click', ()=>{
        activeFilter = c.key;
        renderChips();
        renderGrid();
      });
      chipRow.appendChild(chip);
    });
  }
  sortSelect.addEventListener('change', ()=>{ activeSort = sortSelect.value; renderGrid(); });

  // ---------- grid ----------
  function groupSubjects(entries){
    const groups = {};
    const order = [];
    entries.forEach(n=>{
      const key = (n.subjectCode || n.subjectName).toLowerCase() + '|' + n.subjectName.toLowerCase();
      if(!groups[key]){
        groups[key] = { name: n.subjectName, code: n.subjectCode, notes: [] };
        order.push(key);
      }
      groups[key].notes.push(n);
    });
    return order.map(k => groups[k]);
  }

  function getFilteredEntries(){
    const q = (searchInput.value || '').trim().toLowerCase();
    let entries;
    if(q){
      entries = allNotes.filter(n=>
        n.subjectName.toLowerCase().includes(q) ||
        (n.subjectCode||'').toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q)
      );
    }else{
      entries = allNotes.filter(n => n.sem === activeSem);
    }

    if(activeFilter === 'Favorites'){
      entries = entries.filter(n => n.favorite);
    }else if(activeFilter !== 'All'){
      entries = entries.filter(n => n.type === activeFilter);
    }

    entries = entries.slice();
    if(activeSort === 'az'){
      entries.sort((a,b)=> a.title.localeCompare(b.title));
    }else{
      entries.sort((a,b)=> b.addedAt - a.addedAt);
    }
    return entries;
  }

  function renderGrid(){
    renderStats();
    renderRecent();
    const q = (searchInput.value || '').trim().toLowerCase();
    const entries = getFilteredEntries();
    const subjects = groupSubjects(entries);

    subjectGrid.innerHTML = '';

    if(!subjects.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.gridColumn = '1 / -1';
      empty.innerHTML =
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>' +
        '<p>' + (q || activeFilter !== 'All' ? 'No notes match this view.' : 'No notes uploaded for this semester yet.') + '</p>';
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.style.margin = '0 auto';
      btn.textContent = 'Upload document';
      btn.addEventListener('click', openUploadModal);
      empty.appendChild(btn);
      subjectGrid.appendChild(empty);
      return;
    }

    subjects.forEach(subject=>{
      const card = document.createElement('div');
      card.className = 'subject-card';

      const top = document.createElement('div');
      top.className = 'subject-top';
      const avatar = document.createElement('div');
      avatar.className = 'subject-avatar';
      avatar.style.background = avatarColor(subject.name);
      avatar.textContent = subject.name.trim().charAt(0).toUpperCase() || '?';
      const name = document.createElement('h3');
      name.className = 'subject-name';
      name.textContent = subject.name;
      name.title = subject.name;
      top.appendChild(avatar);
      top.appendChild(name);
      if(subject.code){
        const code = document.createElement('span');
        code.className = 'subject-code';
        code.textContent = subject.code;
        top.appendChild(code);
      }
      card.appendChild(top);

      const fileList = document.createElement('div');
      fileList.className = 'file-list';
      subject.notes.forEach(note=>{
        const row = document.createElement('div');
        row.className = 'file-row';

        const rowTop = document.createElement('div');
        rowTop.className = 'file-row-top';

        const info = document.createElement('div');
        info.className = 'file-info';
        info.innerHTML =
          '<div class="file-icon">' + fileIconSvg() + '</div>' +
          '<div class="file-text">' +
            '<div class="file-title" title="' + escapeHtml(note.title) + '">' + escapeHtml(note.title) + '</div>' +
            '<div class="file-meta">' + note.sem + (note.size ? ' · ' + fmtSize(note.size) : '') + '</div>' +
            '<span class="type-badge type-' + note.type + '">' + TYPE_LABELS[note.type] + '</span>' +
          '</div>';

        const buttons = document.createElement('div');
        buttons.className = 'file-buttons';

        const starBtn = document.createElement('button');
        starBtn.className = 'icon-btn star' + (note.favorite ? ' active' : '');
        starBtn.title = note.favorite ? 'Remove from favorites' : 'Add to favorites';
        starBtn.innerHTML = starIconSvg(note.favorite);
        starBtn.addEventListener('click', ()=> toggleFavorite(note.id));

        const viewBtn = document.createElement('button');
        viewBtn.className = 'icon-btn';
        viewBtn.title = 'View';
        viewBtn.innerHTML = eyeIconSvg();
        viewBtn.addEventListener('click', ()=> openViewer(note));

        const dlBtn = document.createElement('button');
        dlBtn.className = 'icon-btn download';
        dlBtn.title = 'Download';
        dlBtn.innerHTML = downloadIconSvg();
        dlBtn.addEventListener('click', ()=> downloadNote(note));

        buttons.appendChild(starBtn);
        buttons.appendChild(viewBtn);
        buttons.appendChild(dlBtn);
        if(isAdmin){
          const editBtn = document.createElement('button');
          editBtn.className = 'icon-btn edit';
          editBtn.title = 'Edit';
          editBtn.innerHTML = pencilIconSvg();
          editBtn.addEventListener('click', ()=> openEditModal(note));

          const delBtn = document.createElement('button');
          delBtn.className = 'icon-btn delete';
          delBtn.title = 'Delete';
          delBtn.innerHTML = trashIconSvg();
          delBtn.addEventListener('click', ()=> deleteNote(note.id));

          buttons.appendChild(editBtn);
          buttons.appendChild(delBtn);
        }

        rowTop.appendChild(info);
        rowTop.appendChild(buttons);
        row.appendChild(rowTop);
        fileList.appendChild(row);
      });
      card.appendChild(fileList);

      subjectGrid.appendChild(card);
    });
  }

  async function toggleFavorite(id){
    const updated = await toggleFavoriteApi(id);
    const note = allNotes.find(n=> n.id === id);
    if(note) note.favorite = updated.favorite;
    renderGrid();
  }

  function downloadNote(note){
    const a = document.createElement('a');
    a.href = API + '/' + note.id + '/download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function deleteNote(id){
    const confirmed = await showConfirmDialog({
      title: 'Delete this note?',
      message: 'This note will be permanently removed from your library.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDanger: true
    });

    if(!confirmed) return;

    try{
      await deleteNoteApi(id);
      allNotes = allNotes.filter(n => n.id !== id);
      renderGrid();
      showToast({ type:'success', message:'Note deleted' });
    }catch (error) {
      await showInfoDialog({
        title: 'Delete failed',
        message: 'The note could not be deleted right now. Please try again.'
      });
      showToast({ type:'error', message:'Delete failed' });
    }
  }

  // ---------- upload modal (bulk supported) ----------
  function openUploadModal(){
    semSelect.innerHTML = '';
    SEMESTERS.forEach(sem=>{
      const opt = document.createElement('option');
      opt.value = sem; opt.textContent = sem;
      if(sem === activeSem) opt.selected = true;
      semSelect.appendChild(opt);
    });
    typeSelect.value = 'Notes';
    subjectNameInput.value = '';
    subjectCodeInput.value = '';
    noteTitleInput.value = '';
    resetFilePicker();
    modalOverlay.classList.add('open');
  }
  function closeUploadModal(){ modalOverlay.classList.remove('open'); }

  function resetFilePicker(){
    pickedFiles = [];
    fileInput.value = '';
    fileDropText.textContent = 'Click to choose document file(s), or drag them here';
    fileDropText.className = '';
    fileError.classList.remove('show');
    fileError.textContent = '';
    bulkHint.style.display = 'none';
    noteTitleField.style.display = 'block';
  }

  function handleFiles(fileArr){
    fileError.classList.remove('show');
    if(!fileArr || !fileArr.length) return;

    const invalid = fileArr.find(f => !/\.(pdf|docx?|pptx?)$/i.test(f.name));
    if(invalid){
      fileError.textContent = 'Please choose PDF, DOC, DOCX, PPT, or PPTX files only.';
      fileError.classList.add('show');
      resetFilePicker();
      return;
    }

    pickedFiles = fileArr;

    if(fileArr.length > 1){
      fileDropText.textContent = fileArr.length + ' files selected';
      fileDropText.className = 'picked';
      bulkHint.style.display = 'block';
      noteTitleField.style.display = 'none';
    }else{
      fileDropText.textContent = fileArr[0].name + ' (' + fmtSize(fileArr[0].size) + ')';
      fileDropText.className = 'picked';
      bulkHint.style.display = 'none';
      noteTitleField.style.display = 'block';
      if(!noteTitleInput.value){ noteTitleInput.value = fileArr[0].name.replace(/\.(pdf|docx?)$/i, ''); }
    }
  }

  fileDrop.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (e)=> handleFiles(Array.from(e.target.files)));
  fileDrop.addEventListener('dragover', (e)=>{ e.preventDefault(); fileDrop.classList.add('drag'); });
  fileDrop.addEventListener('dragleave', ()=> fileDrop.classList.remove('drag'));
  fileDrop.addEventListener('drop', (e)=>{
    e.preventDefault();
    fileDrop.classList.remove('drag');
    if(e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files));
  });

  heroUploadBtn.addEventListener('click', openUploadModal);
  heroBrowseBtn.addEventListener('click', ()=> {
    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    searchInput.focus();
  });

  openUploadBtn.addEventListener('click', openUploadModal);
  cancelUpload.addEventListener('click', closeUploadModal);
  modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closeUploadModal(); });

  submitUpload.addEventListener('click', async ()=>{
    const sem = semSelect.value;
    const subjectName = subjectNameInput.value.trim();
    const subjectCode = subjectCodeInput.value.trim();
    const type = typeSelect.value;

    if(!subjectName){ subjectNameInput.focus(); return; }
    if(!pickedFiles.length){
      fileError.textContent = 'Please choose at least one supported document file.';
      fileError.classList.add('show');
      return;
    }
    if(pickedFiles.length === 1 && !noteTitleInput.value.trim()){
      noteTitleInput.focus(); return;
    }

    submitUpload.disabled = true;
    submitUpload.dataset.defaultLabel = 'Add note';
    submitUpload.textContent = 'Uploading…';
    submitUpload.classList.add('is-loading');

    try{
      const formData = new FormData();
      formData.append('sem', sem);
      formData.append('subjectName', subjectName);
      formData.append('subjectCode', subjectCode);
      formData.append('type', type);
      if(pickedFiles.length === 1) formData.append('title', noteTitleInput.value.trim());
      pickedFiles.forEach(f => formData.append('files', f));

      const res = await fetch(API, { method:'POST', body: formData });
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'Upload failed'}));
        throw new Error(err.error || 'Upload failed');
      }
      const created = await res.json();
      allNotes = created.concat(allNotes);
      activeSem = sem;
      closeUploadModal();
      renderTabs();
      renderGrid();
      showToast({ type:'success', message:'Document uploaded' });
    }catch(e){
      fileError.textContent = e.message || 'Upload failed.';
      fileError.classList.add('show');
      showToast({ type:'error', message: e.message || 'Upload failed' });
    }finally{
      submitUpload.disabled = false;
      submitUpload.classList.remove('is-loading');
      submitUpload.textContent = 'Add note';
    }
  });

  // ---------- edit modal ----------
  function openEditModal(note){
    editTargetId = note.id;
    editSubjectName.value = note.subjectName;
    editSubjectCode.value = note.subjectCode || '';
    editTypeSelect.value = note.type;
    editNoteTitle.value = note.title;
    editPickedFile = null;
    editFileInput.value = '';
    editFileDropText.textContent = 'Click to replace the document, or leave as-is';
    editFileDropText.className = '';
    editFileError.classList.remove('show');
    editOverlay.classList.add('open');
  }
  function closeEditModal(){
    editOverlay.classList.remove('open');
    editTargetId = null;
  }
  cancelEdit.addEventListener('click', closeEditModal);
  editOverlay.addEventListener('click', (e)=>{ if(e.target === editOverlay) closeEditModal(); });

  editFileDrop.addEventListener('click', ()=> editFileInput.click());
  editFileInput.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    editFileError.classList.remove('show');
    const isDocument = /\.(pdf|docx?|pptx?)$/i.test(file.name);
    if(!isDocument){
      editFileError.textContent = 'Please choose a PDF, DOC, DOCX, PPT, or PPTX file.';
      editFileError.classList.add('show');
      return;
    }
    editPickedFile = file;
    editFileDropText.textContent = file.name + ' (' + fmtSize(file.size) + ')';
    editFileDropText.className = 'picked';
  });

  submitEdit.addEventListener('click', async ()=>{
    const subjectName = editSubjectName.value.trim();
    const title = editNoteTitle.value.trim();
    if(!subjectName){ editSubjectName.focus(); return; }
    if(!title){ editNoteTitle.focus(); return; }

    submitEdit.disabled = true;
    submitEdit.dataset.defaultLabel = 'Save changes';
    submitEdit.textContent = 'Saving…';
    submitEdit.classList.add('is-loading');
    try{
      const formData = new FormData();
      formData.append('subjectName', subjectName);
      formData.append('subjectCode', editSubjectCode.value.trim());
      formData.append('type', editTypeSelect.value);
      formData.append('title', title);
      if(editPickedFile) formData.append('file', editPickedFile);

      const res = await fetch(API + '/' + editTargetId, {
        method:'PUT',
        headers:{ 'x-admin-password': adminPassword },
        body: formData
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'Could not save changes'}));
        throw new Error(err.error || 'Could not save changes');
      }
      const updated = await res.json();
      const idx = allNotes.findIndex(n=> n.id === updated.id);
      if(idx !== -1) allNotes[idx] = updated;
      closeEditModal();
      renderTabs();
      renderGrid();
      showToast({ type:'success', message:'Changes saved' });
    }catch(e){
      editFileError.textContent = e.message || 'Could not save changes.';
      editFileError.classList.add('show');
      showToast({ type:'error', message: e.message || 'Could not save changes' });
    }finally{
      submitEdit.disabled = false;
      submitEdit.classList.remove('is-loading');
      submitEdit.textContent = 'Save changes';
    }
  });

  // ---------- viewer ----------
  const viewerOverlay = document.getElementById('viewerOverlay');
  const viewerBox = document.getElementById('viewerBox');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerBody = document.getElementById('viewerBody');
  const viewerCloseBtn = document.getElementById('viewerCloseBtn');
  const viewerDownloadBtn = document.getElementById('viewerDownloadBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLabel = document.getElementById('zoomLabel');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  let viewerNote = null;
  let zoomLevel = 100;
  let viewerFrame = null;

  async function openViewer(note){
    viewerNote = note;
    zoomLevel = 100;
    zoomLabel.textContent = '100%';
    viewerTitle.textContent = note.title;
    viewerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderViewerIframe();

    const updated = await markViewedApi(note.id);
    note.viewedAt = updated.viewedAt;
    renderRecent();
  }

  function renderViewerIframe(){
    if(!viewerNote) return;
    const iframe = document.createElement('iframe');
    const fileUrl = API + '/' + viewerNote.id + '/file';
    const isPdf = /\.pdf$/i.test(viewerNote.originalName || '');
    iframe.src = isPdf ? fileUrl + '#zoom=' + zoomLevel : API + '/' + viewerNote.id + '/preview';
    iframe.title = viewerNote.title;
    iframe.addEventListener('load', applyViewerZoom);
    viewerBody.innerHTML = '';
    viewerBody.appendChild(iframe);
    viewerFrame = iframe;
    applyViewerZoom();
  }

  function applyViewerZoom(){
    if(!viewerFrame) return;
    try {
      const documentBody = viewerFrame.contentDocument && viewerFrame.contentDocument.body;
      if(documentBody) documentBody.style.zoom = zoomLevel + '%';
    } catch {}
  }

  function closeViewer(){
    viewerNote = null;
    viewerFrame = null;
    viewerOverlay.classList.remove('open');
    viewerBody.innerHTML = '';
    document.body.style.overflow = '';
    if(document.fullscreenElement) document.exitFullscreen();
  }

  viewerCloseBtn.addEventListener('click', closeViewer);
  viewerOverlay.addEventListener('click', (e)=>{ if(e.target === viewerOverlay) closeViewer(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && viewerOverlay.classList.contains('open')) closeViewer(); });
  viewerDownloadBtn.addEventListener('click', ()=>{ if(viewerNote) downloadNote(viewerNote); });

  zoomInBtn.addEventListener('click', ()=>{
    zoomLevel = Math.min(300, zoomLevel + 25);
    zoomLabel.textContent = zoomLevel + '%';
    if(viewerNote && /\.pdf$/i.test(viewerNote.originalName || '')) renderViewerIframe();
    else applyViewerZoom();
  });
  zoomOutBtn.addEventListener('click', ()=>{
    zoomLevel = Math.max(50, zoomLevel - 25);
    zoomLabel.textContent = zoomLevel + '%';
    if(viewerNote && /\.pdf$/i.test(viewerNote.originalName || '')) renderViewerIframe();
    else applyViewerZoom();
  });
  fullscreenBtn.addEventListener('click', ()=>{
    if(document.fullscreenElement){
      document.exitFullscreen();
    }else if(viewerBox.requestFullscreen){
      viewerBox.requestFullscreen();
    }
  });

  searchInput.addEventListener('input', renderGrid);

  (async function init(){
    try{
      await checkAdmin();
      await fetchNotes();
    }catch(e){
      console.error(e);
    }
    renderTabs();
    renderChips();
    renderGrid();
  })();
})();
