(() => {
  "use strict";
  const auth = window.NBJBAuth;
  const bucket = "nbjb-premium-audio";
  const el = (id) => document.getElementById(id);
  const state = { lesson: "", pages: [], uploaded: [], files: [], uploading: false };
  const pageByNumber = (n) => state.pages.find((p) => p.number === n);
  const existing = () => new Set(state.uploaded.map((r) => r.section));

  function status(text, error = false, target = el("studio-upload-status")) {
    target.textContent = text;
    target.dataset.error = error ? "true" : "false";
  }
  async function api(action, extra = {}) {
    const { data, error } = await auth.client.functions.invoke("premium-audio-admin", {
      body: { action, ...extra }
    });
    if (error || data?.error) {
      const message = data?.error || error?.message || "request_failed";
      throw new Error(message);
    }
    return data;
  }
  function buttonState() {
    const rows = state.files.filter((r) => r.status !== "uploaded");
    const numbered = rows.map((r) => r.section);
    const mapped = rows.length > 0 && numbered.every((n) => Number.isInteger(n) && Boolean(pageByNumber(n)));
    const duplicates = new Set(numbered).size !== numbered.length;
    const conflicts = numbered.some((n) => existing().has(n));
    const validFiles = rows.every((r) => r.valid !== false && r.file.size >= 1000 && r.file.size <= 25 * 1024 * 1024);
    const ready = mapped && !duplicates && !conflicts && validFiles;
    el("studio-upload").disabled = state.uploading || !ready || !el("studio-confirm").checked;
    el("studio-assign").disabled = state.uploading || !state.files.length || !state.pages.length;
    if (!state.uploading && rows.length) {
      if (conflicts) status("A chosen page already has an MP3 in private storage. Change its page number; existing recordings are protected.", true);
      else if (duplicates) status("Two selected MP3s map to the same page. Give every file a different destination.", true);
      else if (!mapped) status("Choose a destination page for every MP3 before uploading.");
      else if (!validFiles) status("One or more files aren't valid MP3s or exceed the 25 MB limit.", true);
      else if (!el("studio-confirm").checked) status("Review the audio previews and page labels, then check the confirmation box.");
      else status("Ready: " + rows.length + " verified files can be uploaded to the private bucket in one batch.");
    }
  }
  function durationLabel(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "duration unavailable";
    return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
  }
  function revealRows() {
    const root = el("studio-rows");
    root.replaceChildren();
    el("studio-batch").hidden = state.files.length === 0;
    if (!state.files.length) return;
    const taken = existing();
    const totals = new Map();
    state.files.forEach((r) => {
      if (r.section != null && r.status !== "uploaded") totals.set(r.section, (totals.get(r.section) || 0) + 1);
    });
    for (const [index, row] of state.files.entries()) {
      const tr = document.createElement("tr");
      const first = document.createElement("td");
      const name = document.createElement("strong");
      name.textContent = row.file.name;
      const size = document.createElement("small");
      size.textContent = (row.file.size / 1048576).toFixed(2) + " MB · " + durationLabel(row.duration);
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "metadata";
      audio.src = row.url;
      audio.setAttribute("aria-label", "Preview recording " + row.file.name);
      audio.addEventListener("loadedmetadata", () => {
        row.duration = audio.duration;
        size.textContent = (row.file.size / 1048576).toFixed(2) + " MB · " + durationLabel(row.duration);
        const page = pageByNumber(row.section);
        if (page?.words && row.duration < page.words / 160 * 60 * 0.57) {
          lengthWarning.textContent = "Short for the expected text—check for a truncated recording.";
          lengthWarning.className = "studio-danger";
        } else lengthWarning.textContent = "";
      });
      const lengthWarning = document.createElement("small");
      first.append(name, size, audio, lengthWarning);

      const second = document.createElement("td");
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Assign page for " + row.file.name);
      const empty = document.createElement("option");
      empty.value = ""; empty.textContent = "Choose a page…"; select.append(empty);
      for (const p of state.pages) {
        const opt = document.createElement("option");
        opt.value = String(p.number);
        opt.textContent = "Page " + p.number + " · " + p.title;
        select.append(opt);
      }
      select.value = row.section == null ? "" : String(row.section);
      select.disabled = state.uploading || row.status === "uploaded";
      const expectedTitle = document.createElement("strong");
      const excerpt = document.createElement("small");
      function showSelection() {
        const p = pageByNumber(row.section);
        expectedTitle.textContent = p ? p.title : "No page selected";
        excerpt.textContent = p ? "Begins: " + p.excerpt : "Choose the page that matches what you hear.";
        if (p && Number.isFinite(row.duration) && row.duration > 0 &&
          row.duration < p.words / 160 * 60 * 0.57) {
          lengthWarning.textContent = "Short for the expected text—check for a truncated recording.";
          lengthWarning.className = "studio-danger";
        } else lengthWarning.textContent = "";
      }
      select.addEventListener("change", () => {
        row.section = select.value ? Number(select.value) : null;
        el("studio-confirm").checked = false;
        showSelection();
        buttonState();
      });
      showSelection();
      const note = document.createElement("small");
      if (row.section != null && taken.has(row.section) && row.status !== "uploaded") {
        note.textContent = "Already uploaded — choose another page.";
        note.className = "studio-danger";
      } else if (row.section != null && (totals.get(row.section) || 0) > 1 && row.status !== "uploaded") {
        note.textContent = "Duplicate page assignment";
        note.className = "studio-danger";
      }
      second.append(select, expectedTitle, excerpt, note);

      const third = document.createElement("td");
      const tag = document.createElement("span");
      tag.className = "studio-pill" + (row.status === "uploaded" ? " ok" : row.status === "failed" ? " warning" : "");
      tag.textContent = row.status === "uploaded" ? "Uploaded" : row.status === "failed" ? "Failed · retry" :
        row.status === "uploading" ? "Uploading…" : row.valid === false ? "Invalid MP3" : "Ready to map";
      const error = document.createElement("small");
      error.textContent = row.message || "";
      third.append(tag, error);
      tr.append(first, second, third);
      root.append(tr);
    }
    buttonState();
  }
  async function checkMp3(file) {
    if (!/\.mp3$/i.test(file.name) || file.size < 1000 || file.size > 25 * 1024 * 1024) return false;
    try {
      const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const id3 = bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51;
      const mpeg = bytes[0] === 255 && (bytes[1] & 224) === 224;
      return id3 || mpeg;
    } catch (_) { return false; }
  }
  function clearFiles() {
    for (const row of state.files) if (row.url) URL.revokeObjectURL(row.url);
    state.files = [];
    el("studio-files").value = "";
    el("studio-confirm").checked = false;
    revealRows();
  }
  async function useFiles() {
    const incoming = Array.from(el("studio-files").files || []);
    // Stable natural filename sort, displayed explicitly in the mapping table.
    incoming.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const row of state.files) if (row.url) URL.revokeObjectURL(row.url);
    state.files = incoming.map((file) => {
      const m = /^section-([1-9]\d*)\.mp3$/i.exec(file.name);
      const n = m ? Number(m[1]) : null;
      return {
        file, url: URL.createObjectURL(file),
        section: pageByNumber(n) ? n : null,
        duration: null, valid: null, status: "pending", message: ""
      };
    });
    el("studio-confirm").checked = false;
    for (const row of state.files) row.valid = await checkMp3(row.file);
    revealRows();
  }
  function inventory() {
    const list = el("studio-uploaded");
    list.replaceChildren();
    for (const item of state.uploaded.sort((a, b) => a.section - b.section)) {
      const li = document.createElement("li");
      li.textContent = "Page " + item.section + " ✓";
      list.append(li);
    }
    if (!state.uploaded.length) {
      const li = document.createElement("li");
      li.textContent = "No recordings uploaded for this lesson yet.";
      list.append(li);
    }
    el("studio-lesson-details").textContent =
      state.pages.length + " reading pages · " + state.uploaded.length +
      " installed · " + Math.max(0, state.pages.length - state.uploaded.length) + " remaining.";
  }
  async function refreshLesson({ clear = false } = {}) {
    const slug = el("studio-lesson").value;
    if (!slug) return;
    if (clear || slug !== state.lesson) clearFiles();
    state.lesson = slug;
    status("Checking private narration inventory…", false, el("studio-auth-status"));
    try {
      const data = await api("details", { slug });
      state.pages = data.pages || [];
      state.uploaded = data.uploaded || [];
      inventory();
      const taken = existing();
      const firstMissing = state.pages.find((p) => !taken.has(p.number));
      if (firstMissing && (clear || !el("studio-start").value)) el("studio-start").value = String(firstMissing.number);
      status("Editorial access verified. Your MP3s can be matched to the lesson's actual sections.", false, el("studio-auth-status"));
      revealRows();
    } catch (error) {
      status("Couldn't check the lesson's storage: " + error.message, true, el("studio-auth-status"));
    }
  }
  function assignSequential() {
    const start = Number(el("studio-start").value);
    if (!Number.isInteger(start) || start < 1 || start > state.pages.length) {
      return status("Choose a valid starting page.", true);
    }
    const taken = existing();
    let number = start;
    for (const row of state.files) {
      if (row.status === "uploaded") continue;
      while (taken.has(number) && number <= state.pages.length) number++;
      row.section = number <= state.pages.length ? number++ : null;
    }
    el("studio-confirm").checked = false;
    revealRows();
    status("Assigned by filename order starting at page " + start + ". Preview and verify before uploading.");
  }
  async function uploadBatch() {
    if (state.uploading || !el("studio-confirm").checked || el("studio-upload").disabled) return;
    const rows = state.files.filter((r) => r.status !== "uploaded");
    if (!rows.length) return;
    state.uploading = true;
    el("studio-upload").disabled = true;
    el("studio-files").disabled = true;
    el("studio-lesson").disabled = true;
    el("studio-start").disabled = true;
    el("studio-assign").disabled = true;
    el("studio-progress").hidden = false;
    el("studio-progress").value = 0;
    status("Authorizing " + rows.length + " private uploads…");
    try {
      const data = await api("prepare", { slug: state.lesson,
        files: rows.map((r) => ({ section: r.section, bytes: r.file.size })) });
      const grants = new Map((data.uploads || []).map((x) => [x.section, x]));
      const client = auth.client.storage.from(bucket);
      let finished = 0;
      // Three uploads in flight is efficient without overwhelming the browser.
      const tasks = [...rows];
      async function worker() {
        while (tasks.length) {
          const row = tasks.shift();
          const grant = grants.get(row.section);
          if (!grant?.token || !grant?.path) {
            row.status = "failed"; row.message = "Missing upload token"; finished++; continue;
          }
          row.status = "uploading";
          revealRows();
          try {
            const { error } = await client.uploadToSignedUrl(grant.path, grant.token, row.file,
              { contentType: "audio/mpeg", cacheControl: "3600" });
            if (error) throw error;
            row.status = "uploaded";
            row.message = "Saved privately as " + grant.path;
          } catch (error) {
            row.status = "failed";
            row.message = error.message || "Upload failed";
          }
          finished++;
          el("studio-progress").value = 100 * finished / rows.length;
          status("Uploaded " + rows.filter((r) => r.status === "uploaded").length +
            " of " + rows.length + ". " + finished + " processed.");
          revealRows();
        }
      }
      await Promise.all([worker(), worker(), worker()]);
      const successful = rows.filter((r) => r.status === "uploaded").length;
      status(successful === rows.length ?
        "Batch completed! " + successful + " private recordings uploaded. Refresh inventory to confirm." :
        successful + " of " + rows.length + " uploaded. Review the failed rows; existing files were not replaced.",
        successful !== rows.length);
      await refreshLesson();
    } catch (error) {
      const conflict = error.message === "files_already_exist";
      status(conflict ? "An audio file already exists at one of these destinations. Refresh the inventory and remap before retrying." :
        "Batch authorization failed: " + error.message, true);
    } finally {
      state.uploading = false;
      el("studio-files").disabled = false;
      el("studio-lesson").disabled = false;
      el("studio-start").disabled = false;
      el("studio-confirm").checked = false;
      revealRows();
    }
  }
  async function init() {
    const user = (await auth?.ready)?.user;
    if (!auth?.client || !user?.id) {
      status("Sign in with the approved editorial account to use the batch uploader.", true, el("studio-auth-status"));
      el("studio-account").textContent = "Not signed in.";
      return;
    }
    el("studio-account").textContent = "Signed in as " + (user.email || "an NBJB member");
    try {
      const { lessons } = await api("overview");
      if (!Array.isArray(lessons) || !lessons.length) throw new Error("No editorial lessons found");
      const select = el("studio-lesson");
      select.replaceChildren();
      lessons.forEach((lesson) => {
        const option = document.createElement("option");
        option.value = lesson.slug;
        option.textContent = lesson.title + " · " + lesson.pages + " reading pages";
        select.append(option);
      });
      el("studio-workspace").hidden = false;
      select.addEventListener("change", () => refreshLesson({ clear: true }));
      el("studio-refresh").addEventListener("click", () => refreshLesson());
      el("studio-files").addEventListener("change", useFiles);
      el("studio-assign").addEventListener("click", assignSequential);
      el("studio-confirm").addEventListener("change", buttonState);
      el("studio-upload").addEventListener("click", uploadBatch);
      window.addEventListener("pagehide", () => {
        for (const row of state.files) if (row.url) URL.revokeObjectURL(row.url);
      });
      await refreshLesson({ clear: true });
    } catch (error) {
      status("This page is for the approved NBJB editorial account only. " + error.message,
        true, el("studio-auth-status"));
    }
  }
  init().catch((error) => status("Uploader couldn't start: " + error.message, true, el("studio-auth-status")));
})();
