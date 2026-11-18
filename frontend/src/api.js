// ============================================================
// RANANO API CLIENT
// ============================================================
//
// Local development:
// Browser -> Vite :5173 -> FastAPI :8001
//
// Production:
// Set VITE_API_BASE_URL to your deployed backend.
//

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "";


// ============================================================
// RESPONSE HANDLER
// ============================================================

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    throw new Error(
      body.detail ||
      `Request failed with status ${res.status}`
    );
  }

  return res.json();
}


// ============================================================
// FILE URL
// ============================================================

export function fileUrl(path) {
  if (!path) {
    return "";
  }

  return `${API_BASE}${path}`;
}


// ============================================================
// API
// ============================================================

export const api = {

  // ----------------------------------------------------------
  // HEALTH
  // ----------------------------------------------------------

  health: () =>
    fetch(
      `${API_BASE}/api/health`
    ).then(handleResponse),


  // ----------------------------------------------------------
  // RANDOM IMAGE
  // ----------------------------------------------------------

  startGenerateImage: () =>
    fetch(
      `${API_BASE}/api/generate-image/start`,
      {
        method: "POST",
      }
    ).then(handleResponse),


  // ----------------------------------------------------------
  // TEXT -> IMAGE
  // ----------------------------------------------------------

  startGenerateImageFromText: (
    prompt,
    useBackground = false,
    backend = "cloud"
  ) =>
    fetch(
      `${API_BASE}/api/generate-image-from-text/start`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          prompt,
          use_background: useBackground,
          backend,
        }),
      }
    ).then(handleResponse),


  // ----------------------------------------------------------
  // GENERATION PROGRESS
  // ----------------------------------------------------------

  getGenerationProgress: (
    jobId
  ) =>
    fetch(
      `${API_BASE}/api/generation-progress/${jobId}`
    ).then(handleResponse),


  // ----------------------------------------------------------
  // GENERATION JOB
  // ----------------------------------------------------------

  runGenerationJob: async (
    startFn,
    onProgress
  ) => {

    const {
      job_id
    } = await startFn();


    while (true) {

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 400)
      );


      const job =
        await api.getGenerationProgress(
          job_id
        );


      if (onProgress) {

        onProgress(
          job.step,
          job.total,
          job.stage
        );

      }


      if (
        job.status === "done"
      ) {

        return job.result;

      }


      if (
        job.status === "error"
      ) {

        throw new Error(
          job.error ||
          "Generation failed"
        );

      }

    }

  },


  // ----------------------------------------------------------
  // IMAGE ENHANCEMENT
  // ----------------------------------------------------------

  enhanceImage: (
    file,
    mode = "cloud"
  ) => {

    const formData =
      new FormData();


    formData.append(
      "file",
      file
    );


    formData.append(
      "mode",
      mode
    );


    return fetch(
      `${API_BASE}/api/enhance-image`,
      {
        method: "POST",
        body: formData,
      }
    ).then(handleResponse);

  },


  // ----------------------------------------------------------
  // LABEL PHOTO
  // ----------------------------------------------------------

  labelPhoto: (
    file,
    effect = "fade"
  ) => {

    const formData =
      new FormData();


    formData.append(
      "file",
      file
    );


    formData.append(
      "effect",
      effect
    );


    return fetch(
      `${API_BASE}/api/label-photo`,
      {
        method: "POST",
        body: formData,
      }
    ).then(handleResponse);

  },


  // ----------------------------------------------------------
  // VIDEO
  // ----------------------------------------------------------

  generateVideo: (
    imageUrls,
    options = {}
  ) =>
    fetch(
      `${API_BASE}/api/generate-video`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({

          // Images used to create the video
          image_urls:
            imageUrls,


          // Video format
          format:
            options.format ||
            "9:16",


          // AI voice
          voice_enabled:
            Boolean(
              options.voiceEnabled
            ),


          // Voice/narration text
          voice_text:
            options.voiceText ||
            "",


          // Voice selection
          voice:
            options.voice ||
            "female",


          // Animated text
          animated_text_enabled:
            Boolean(
              options.animatedTextEnabled
            ),


          // Text animation effect
          text_effect:
            options.textEffect ||
            "fade",


          // Captions/subtitles
          captions_enabled:
            Boolean(
              options.captionsEnabled
            ),


          // Background music/audio
          // Enabled by default unless explicitly disabled
          background_music:
            options.backgroundMusic !== false,

        }),
      }
    ).then(handleResponse),


  // ----------------------------------------------------------
  // ANIMATED TEXT
  // ----------------------------------------------------------

  animateText: (
    text,
    effect = "fade"
  ) =>
    fetch(
      `${API_BASE}/api/animate-text`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          text,
          effect,
        }),
      }
    ).then(handleResponse),


  // ----------------------------------------------------------
  // INTENT
  // ----------------------------------------------------------

  classifyIntent: (
    command
  ) =>
    fetch(
      `${API_BASE}/api/classify-intent`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          command,
        }),
      }
    ).then(handleResponse),



  // ----------------------------------------------------------
  // AUDIO TRANSCRIPTION (Groq Whisper)
  // ----------------------------------------------------------
  transcribeAudio: (blob) => {
    const formData = new FormData();
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    formData.append("file", blob, `ranano-recording.${extension}`);
    return fetch(`${API_BASE}/api/transcribe-audio`, {
      method: "POST",
      body: formData,
    }).then(handleResponse);
  },

  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------

  chat: (
    message,
    history = [],
    tool = "RANANO Studio"
  ) =>
    fetch(
      `${API_BASE}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          message,
          history,
          tool,
        }),
      }
    ).then(handleResponse),

};