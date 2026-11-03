(() => {
  "use strict";
  const auth = window.NBJBAuth;
  const el = (id) => document.getElementById(id);
  const lessonSelect = el("studio-lesson");
  const panel = el("studio-auto-panel");
  const startInput = el("studio-auto-start");
  const endInput = el("studio-auto-end");
  const consent = el("studio-auto-consent");
  const go = el("studio-auto-go");
  const stop = el("studio-auto-stop");
  const progress = el("studio-auto-progress");
  const info = el("studio-auto-info");
  let report = null;
  let lesson = "";
  let busy = false;
  let stopped = false;
  let generationToken = 0;

  function message(value, isError = false) {
    info.textContent = value;
    info.dataset.error = isError ? "true" : "false";
  }
  async function api(action, extra = {}) {
    if (!auth?.client) throw new Error("editorial_session_required");
    const { data, error } = await auth.client.functions.invoke("premium-audio-admin", {
      body: { action, ...extra }
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || "request_failed");
    return data;
  }
  function selectedPages() {
    if (!report?.pages) return [];
    const first = Number(startInput.value);
    const last = Number(endInput.value);
    if (!Number.isInteger(first) || !Number.isInteger(last) ||
        first < 1 || last < first || last > report.pages.length) return [];
    return report.pages.filter((p) => !p.exists && p.number >= first && p.number <= last);
  }
  function summarize() {
    if (!report || busy) return;
    const valid = Boolean(report?.pages?.length);
    const first = Number(startInput.value);
    const last = Number(endInput.value);
    const pages = selectedPages();
    const allInRange = valid && Number.isInteger(first) && Number.isInteger(last) &&
      first > 0 && last >= first && last <= report.pages.length;
    const chars = pages.reduce((total, p) => total + p.characters, 0);
    const estimate = (chars / 1000 * Number(report.estimate_usd_per_1000_chars || 0.1)).toFixed(2);
    go.disabled = !report.configured || !allInRange || !pages.length || !consent.checked;
    if (!report.configured) {
      message("Automatic generation is disabled: the private ElevenLabs API key and approved voice ID are not configured. No charges or recordings will be created.");
    } else if (!allInRange) {
      message("Enter a valid range between page 1 and page " + report.pages.length + ".");
    } else if (!pages.length) {
      message("No missing recordings in this range. Existing files are preserved.");
    } else {
      message(pages.length + " missing page(s) selected of " + report.pages.length +
        " total. " + chars.toLocaleString() + " characters. Estimated base TTS cost: $" +
        estimate + " at the published model rate (your provider plan may differ). " +
        (pages.length > 1 ? "Generate one test page and listen first." : "Good test size: one page."));
    }
  }
  async function refresh() {
    if (busy) return;
    const chosen = lessonSelect?.value || "";
    if (!chosen) {
      panel.hidden = true;
      return;
    }
    const token = ++generationToken;
    lesson = chosen;
    report = null;
    go.disabled = true;
    consent.checked = false;
    panel.hidden = false;
    message("Checking private text, saved recordings, and narrator setup…");
    try {
      const result = await api("tts_status", { slug: chosen });
      if (token !== generationToken || lessonSelect.value !== chosen) return;
      if (!Array.isArray(result.pages)) throw new Error("invalid_page_manifest");
      report = result;
      startInput.max = String(result.pages.length);
      endInput.max = String(result.pages.length);
      startInput.value = String(Math.min(3, result.pages.length));
      endInput.value = startInput.value; // first run: exactly one new sample
      summarize();
    } catch (error) {
      if (token !== generationToken) return;
      message("Narration generator unavailable: " + (error?.message || "request_failed"), true);
    }
  }
  async function generate() {
    if (busy || !report?.configured || !consent.checked) return;
    const jobs = selectedPages();
    if (!jobs.length) return;
    busy = true;
    stopped = false;
    go.disabled = true;
    stop.disabled = false;
    startInput.disabled = true;
    endInput.disabled = true;
    lessonSelect.disabled = true;
    el("studio-auto-refresh").disabled = true;
    progress.hidden = false;
    progress.value = 0;
    progress.max = jobs.length;
    let complete = 0;
    try {
      for (const page of jobs) {
        if (stopped) break;
        message("Generating page " + page.number + " of " + report.pages.length +
          " · " + (complete + 1) + "/" + jobs.length + ". Leave this tab open.");
        // Exactly one paid request; never auto-retry a timed-out or failed request.
        const result = await api("tts_generate", {
          slug: lesson, section: page.number, consent: true
        });
        if (!result.saved || result.section !== page.number) throw new Error("unexpected_generation_result");
        page.exists = true;
        complete++;
        progress.value = complete;
      }
      message(stopped
        ? "Stopped after " + complete + " page(s). Saved recordings remain private. Refresh before continuing."
        : "Completed " + complete + " missing narration page(s). Listen through the lesson player before generating more.");
    } catch (error) {
      message("Stopped after " + complete + " successful page(s). Error: " +
        (error?.message || "request_failed") +
        ". Check saved recordings before restarting: failed responses are not automatically retried.", true);
    } finally {
      busy = false;
      stop.disabled = true;
      startInput.disabled = false;
      endInput.disabled = false;
      lessonSelect.disabled = false;
      el("studio-auto-refresh").disabled = false;
      consent.checked = false;
      go.disabled = true;
      // Reconcile with the actual bucket inventory; do not infer missing files.
      el("studio-refresh")?.click();
    }
  }
  el("studio-auto-refresh")?.addEventListener("click", refresh);
  lessonSelect?.addEventListener("change", refresh);
  const watchOptions = new MutationObserver(() => {
    if (!busy && lessonSelect?.value && lessonSelect.value !== lesson) refresh();
  });
  if (lessonSelect) watchOptions.observe(lessonSelect, { childList: true });
  startInput?.addEventListener("input", () => { consent.checked = false; summarize(); });
  endInput?.addEventListener("input", () => { consent.checked = false; summarize(); });
  consent?.addEventListener("change", summarize);
  go?.addEventListener("click", generate);
  stop?.addEventListener("click", () => {
    stopped = true;
    stop.disabled = true;
    message("Stop requested. The current page will finish or report an error; no additional pages will start.");
  });
  if (lessonSelect?.value) refresh();
})();