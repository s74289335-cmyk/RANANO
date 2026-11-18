import { useEffect, useState } from "react";
import { api, fileUrl } from "../api.js";
import {
  saveHistoryEntry,
  loadHistory,
} from "../history.js";


// ============================================================
// QUICK IDEAS
// ============================================================

const QUICK_IDEAS = [
  "A single realistic strawberry floating in space",
  "A single realistic red apple on a wooden table",
  "A single realistic Kiwi on sand",
];


// ============================================================
// CLOUD BACKEND
// ============================================================

const CLOUD_BACKEND = "cloud";


// ============================================================
// DEFAULT PROMPT
// ============================================================

const DEFAULT_PROMPT =
  "A single realistic strawberry floating in space";


// ============================================================
// PROGRESS BAR
// ============================================================

function ProgressBar({
  step,
  total,
  stage,
}) {
  if (!total) return null;

  const pct = Math.min(
    100,
    Math.round((step / total) * 100)
  );

  return (
    <div className="ig-progress">

      <div className="ig-progress-track">

        <div
          className="ig-progress-fill"
          style={{
            width: `${pct}%`,
          }}
        />

      </div>

      <span className="ig-progress-text">

        {stage
          ? stage.toUpperCase()
          : "GENERATING"}{" "}

        · {pct}%

      </span>

    </div>
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function ImageGeneration({
  gallery,
  addToGallery,
  onViewHistory,
  onBack,
}) {

  // ============================================================
  // PROMPT
  // ============================================================

  const [prompt, setPrompt] =
    useState(DEFAULT_PROMPT);


  // ============================================================
  // GENERATION STATE
  // ============================================================

  const [
    promptGenerating,
    setPromptGenerating,
  ] = useState(false);


  const [
    promptProgress,
    setPromptProgress,
  ] = useState({
    step: 0,
    total: 0,
    stage: "",
  });


  // ============================================================
  // RANDOM GENERATION STATE
  // ============================================================

  const [
    randomGenerating,
    setRandomGenerating,
  ] = useState(false);


  const [
    randomProgress,
    setRandomProgress,
  ] = useState({
    step: 0,
    total: 0,
    stage: "",
  });


  // ============================================================
  // OUTPUT
  // ============================================================

  const [
    generatedImage,
    setGeneratedImage,
  ] = useState(null);


  const [
    error,
    setError,
  ] = useState(null);


  const [
    promptNote,
    setPromptNote,
  ] = useState(null);


  const [
    recent,
    setRecent,
  ] = useState([]);


  // ============================================================
  // LOAD HISTORY
  // ============================================================

  useEffect(() => {

    setRecent(
      loadHistory().slice(0, 4)
    );

  }, [gallery]);


  // ============================================================
  // BACK
  // ============================================================

  function handleBack() {

    if (
      typeof onBack === "function"
    ) {

      onBack();

      return;
    }

    window.history.back();

  }


  // ============================================================
  // FREE IMAGE-GENERATION FALLBACK
  // ============================================================

  async function generateFreeFallbackImage(text) {
    return new Promise((resolve, reject) => {
      const encodedPrompt = encodeURIComponent(text);
      const fallbackUrl =
        `https://image.pollinations.ai/prompt/${encodedPrompt}` +
        `?width=1024&height=1024&nologo=true&model=flux`;

      const image = new Image();

      image.onload = () => resolve(fallbackUrl);
      image.onerror = () =>
        reject(
          new Error(
            "The free image-generation fallback is unavailable right now."
          )
        );

      image.src = fallbackUrl;
    });
  }


  // ============================================================
  // GENERATE FROM TEXT
  // ============================================================

  async function handleGenerateFromText() {

    const cleanPrompt =
      prompt.trim();


    if (
      !cleanPrompt ||
      promptGenerating ||
      randomGenerating
    ) {

      return;

    }


    setPromptGenerating(true);

    setError(null);

    setPromptNote(null);

    setGeneratedImage(null);


    setPromptProgress({
      step: 0,
      total: 100,
      stage: "starting cloud AI",
    });


    try {

      /*
       * ========================================================
       * CLOUD AI ONLY
       * ========================================================
       *
       * The current RANANO UI intentionally does not expose
       * the local DDPM generator.
       *
       * The local trained RANANO diffusion checkpoints remain
       * part of the project for research/reference purposes.
       *
       * The actual image generated here comes from the
       * configured Cloud AI backend.
       */

      const result =
        await api.runGenerationJob(
          () =>
            api.startGenerateImageFromText(
              cleanPrompt,

              // Background mode was removed from the UI.
              // Always send false.
              false,

              CLOUD_BACKEND
            ),

          (
            step,
            total,
            stage
          ) => {

            setPromptProgress({
              step,
              total,
              stage:
                stage ||
                "generating with cloud AI",
            });

          }
        );


      // ========================================================
      // VALIDATE RESULT
      // ========================================================

      if (
        !result ||
        !result.image_url
      ) {

        throw new Error(
          "The server completed generation but did not return an image."
        );

      }


      const image =
        fileUrl(
          result.image_url
        );


      setGeneratedImage(
        image
      );


      // ========================================================
      // GALLERY
      // ========================================================

      if (
        typeof addToGallery ===
        "function"
      ) {

        addToGallery(
          image
        );

      }


      // ========================================================
      // HISTORY
      // ========================================================

      saveHistoryEntry({
        url: image,

        prompt:
          cleanPrompt,

        matchedClasses:
          result.matched_classes ||
          [],

        note:
          result.note ||
          "Generated with Cloud AI.",
      });


      // ========================================================
      // RESULT INFORMATION
      // ========================================================

      const parts = [];


      parts.push(
        "Generated with Cloud AI."
      );


      if (result.backend) {

        parts.push(
          `Engine: ${result.backend}`
        );

      }


      if (
        result.generation_model
      ) {

        parts.push(
          `Model: ${result.generation_model}`
        );

      }


      /*
       * IMPORTANT:
       *
       * This statement describes the RANANO project.
       * It does NOT claim that the current Cloud image
       * was generated by the local RANANO checkpoint.
       */


      setPromptNote(
        parts.join(" · ")
      );


      setRecent(
        loadHistory().slice(
          0,
          4
        )
      );


    } catch (e) {

      console.error(
        "RANANO generation error:",
        e
      );

      // Free emergency fallback for today's demo if the Cloud provider
      // returns a quota/payment/credit error.
      const message = String(e?.message || "");
      const isCreditError =
        message.includes("402") ||
        message.toLowerCase().includes("depleted") ||
        message.toLowerCase().includes("monthly included credits") ||
        message.toLowerCase().includes("payment required");

      if (isCreditError) {
        try {
          setError(null);
          setPromptProgress({
            step: 85,
            total: 100,
            stage: "using free image fallback",
          });

          const fallbackImage =
            await generateFreeFallbackImage(cleanPrompt);

          setGeneratedImage(fallbackImage);

          if (typeof addToGallery === "function") {
            addToGallery(fallbackImage);
          }

          saveHistoryEntry({
            url: fallbackImage,
            prompt: cleanPrompt,
            matchedClasses: [],
            note: "Generated with free fallback image service.",
          });

          setPromptNote(
            "Free fallback generation · Pollinations · may be rate-limited"
          );

          setRecent(
            loadHistory().slice(0, 4)
          );
        } catch (fallbackError) {
          setError(
            fallbackError?.message ||
              "Cloud AI credits are exhausted and the free image fallback is unavailable."
          );
        }
      } else {
        setError(
          e?.message ||
          "image generation failed."
        );
      }


    } finally {

      setPromptGenerating(
        false
      );


      setPromptProgress({
        step: 0,
        total: 0,
        stage: "",
      });

    }

  }


  // ============================================================
  // RANDOM GENERATION
  // ============================================================

  async function handleGenerateRandom() {

    if (
      promptGenerating ||
      randomGenerating
    ) {

      return;

    }


    setRandomGenerating(true);

    setError(null);

    setPromptNote(null);

    setGeneratedImage(null);


    setRandomProgress({
      step: 0,
      total: 100,
      stage: "starting cloud AI",
    });


    try {

      /*
       * Random generation is also Cloud AI only.
       */

      const result =
        await api.runGenerationJob(
          () =>
            api.startGenerateImage(),

          (
            step,
            total,
            stage
          ) => {

            setRandomProgress({
              step,
              total,
              stage:
                stage ||
                "generating",
            });

          }
        );


      // ========================================================
      // VALIDATE RESULT
      // ========================================================

      if (
        !result ||
        !result.image_url
      ) {

        throw new Error(
          "The server completed random generation but did not return an image."
        );

      }


      const image =
        fileUrl(
          result.image_url
        );


      setGeneratedImage(
        image
      );


      // ========================================================
      // GALLERY
      // ========================================================

      if (
        typeof addToGallery ===
        "function"
      ) {

        addToGallery(
          image
        );

      }


      // ========================================================
      // HISTORY
      // ========================================================

      saveHistoryEntry({
        url: image,

        prompt:
          "Random Cloud AI generation",

        matchedClasses:
          result.matched_classes ||
          [],

        note:
          result.note ||
          "Generated with Cloud AI.",
      });


      // ========================================================
      // RESULT INFORMATION
      // ========================================================

      const parts = [
        "Random image generated with Cloud AI.",
      ];


      if (result.backend) {

        parts.push(
          `Engine: ${result.backend}`
        );

      }


      if (
        result.generation_model
      ) {

        parts.push(
          `Model: ${result.generation_model}`
        );

      }


      setPromptNote(
        parts.join(" · ")
      );


      setRecent(
        loadHistory().slice(
          0,
          4
        )
      );


    } catch (e) {

      console.error(
        "RANANO Cloud random generation error:",
        e
      );


      setError(
        e?.message ||
        "Cloud random generation failed."
      );


    } finally {

      setRandomGenerating(
        false
      );


      setRandomProgress({
        step: 0,
        total: 0,
        stage: "",
      });

    }

  }


  async function handleDownload(url, filename) {
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed.");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  // ============================================================
  // QUICK IDEA
  // ============================================================

  function handleQuickIdea(
    idea
  ) {

    setPrompt(
      idea
    );

    setError(null);

    setPromptNote(null);

  }


  // ============================================================
  // KEYBOARD
  // ============================================================

  function handlePromptKeyDown(
    event
  ) {

    if (
      event.key === "Enter" &&
      event.ctrlKey &&
      !promptGenerating &&
      !randomGenerating
    ) {

      event.preventDefault();

      handleGenerateFromText();

    }

  }


  // ============================================================
  // BUSY
  // ============================================================

  const busy =
    promptGenerating ||
    randomGenerating;


  // ============================================================
  // UI
  // ============================================================

  return (

    <main className="image-generation-page">


      {/* ========================================================
          BACKGROUND
          ======================================================== */}

      <div
        className="ig-background-grid"
        aria-hidden="true"
      />

      <div
        className="ig-background-glow ig-glow-one"
        aria-hidden="true"
      />

      <div
        className="ig-background-glow ig-glow-two"
        aria-hidden="true"
      />


      {/* ========================================================
          HEADER
          ======================================================== */}

      <header className="ig-workspace-header">

        <button
          type="button"
          className="ig-tools-button"
          onClick={handleBack}
        >

          <span className="ig-tools-arrow">
            ←
          </span>

          <span>
            TOOLS
          </span>

        </button>


        <div className="ig-brand">

          <div className="ig-brand-mark">
            ✦
          </div>


          <div>

            <div className="ig-brand-name">
              RANANO
            </div>

            <div className="ig-brand-subtitle">
              AI CREATIVE STUDIO
            </div>

          </div>

        </div>


        <div className="ig-header-right">

          <div className="ig-system-state">

            <span className="ig-system-dot" />

            SYSTEM ONLINE

          </div>


          {onViewHistory && (

            <button
              type="button"
              className="ig-history-button"
              onClick={
                onViewHistory
              }
            >
              HISTORY →
            </button>

          )}


          <button
            type="button"
            className="ig-header-icon"
            aria-label="Information"
          >
            ⓘ
          </button>


          <button
            type="button"
            className="ig-header-icon"
            aria-label="Settings"
          >
            ⚙
          </button>

        </div>

      </header>


      {/* ========================================================
          HERO
          ======================================================== */}

      <section className="ig-hero">

        <div className="ig-hero-copy">

          <div className="ig-section-label">

            <span>
              /
            </span>

            IMAGE GENERATION

          </div>


          <h1>

            CREATE

            <br />

            <span>
              SOMETHING FROM NOTHING.
            </span>

          </h1>


          <p>

            Describe an idea and let
            RANANO turn your imagination
            into an image.

          </p>


          <div className="ig-hero-status">

            <span className="ig-status-line" />

            TEXT → IMAGE

            <span className="ig-status-line" />

          </div>

        </div>


        <div
          className="ig-hero-mascot"
          aria-hidden="true"
        >

          <div className="ig-mascot-orbit ig-orbit-one" />

          <div className="ig-mascot-orbit ig-orbit-two" />

          <div className="ig-mascot-orbit ig-orbit-three" />


          <div className="ig-mascot-core">

            <span>
              ✦
            </span>

          </div>


          <div className="ig-mascot-caption">
            CREATIVE CORE
          </div>

        </div>

      </section>


      {/* ========================================================
          ERROR
          ======================================================== */}

      {error && (

        <div className="ig-error">

          <span className="ig-error-symbol">
            ⚠
          </span>


          <span>
            {error}
          </span>


          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            aria-label="Dismiss error"
          >
            ×
          </button>

        </div>

      )}


      {/* ========================================================
          WORKSPACE
          ======================================================== */}

      <section className="ig-workspace">


        {/* ======================================================
            PROMPT PANEL
            ====================================================== */}

        <section className="ig-panel ig-prompt-panel">


          {/* PANEL HEADER */}

          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                01
              </div>


              <div className="ig-panel-label">
                YOUR PROMPT
              </div>

            </div>


            <span className="ig-panel-code">
              INPUT
            </span>

          </div>


          {/* TITLE */}

          <h2>

            What should

            <br />

            we create?

          </h2>


          {/* DESCRIPTION */}

          <p className="ig-panel-description">

            Describe anything you want to
            create. RANANO will generate
            the image.

          </p>


          {/* ====================================================
              PROMPT BOX
              ==================================================== */}

          <div className="ig-prompt-box">

            <textarea
              value={prompt}
              maxLength={500}
              rows={5}
              placeholder={
                DEFAULT_PROMPT
              }
              onChange={(
                event
              ) =>
                setPrompt(
                  event.target.value
                )
              }
              onKeyDown={
                handlePromptKeyDown
              }
              disabled={busy}
            />


            <span className="ig-character-count">

              {prompt.length}/500

            </span>

          </div>


          {/* ====================================================
              QUICK IDEAS
              ==================================================== */}

          <div className="ig-try-label">
            TRY AN IDEA
          </div>


          <div className="ig-quick-ideas">

            {QUICK_IDEAS.map(
              (idea) => (

                <button
                  type="button"
                  key={idea}
                  className="ig-chip"
                  onClick={() =>
                    handleQuickIdea(
                      idea
                    )
                  }
                  disabled={busy}
                >
                  {idea}
                </button>

              )
            )}

          </div>


          {/* ====================================================
              ACTIONS
              ==================================================== */}

          <div className="ig-actions">


            {/* MAIN GENERATE */}

            <button
              type="button"
              className="ig-generate-button"
              onClick={
                handleGenerateFromText
              }
              disabled={
                busy ||
                !prompt.trim()
              }
            >

              <span>

                {promptGenerating
                  ? "GENERATING..."
                  : "GENERATE IMAGE"}

              </span>


              {!promptGenerating && (

                <span className="ig-button-arrow">
                  →
                </span>

              )}

            </button>


            {/* RANDOM */}

            <button
              type="button"
              className="ig-random-button"
              onClick={
                handleGenerateRandom
              }
              disabled={busy}
              title="Generate a image"
              aria-label="Generate a image"
            >

              {randomGenerating
                ? "..."
                : "✦"}

            </button>

          </div>


          {/* ====================================================
              SHORTCUT
              ==================================================== */}

          <div className="ig-shortcut">

            PRESS{" "}

            <kbd>
              CTRL
            </kbd>

            {" + "}

            <kbd>
              ENTER
            </kbd>

            {" "}TO GENERATE

          </div>


          {/* ====================================================
              PROGRESS
              ==================================================== */}

          {promptGenerating && (

            <ProgressBar
              step={
                promptProgress.step
              }
              total={
                promptProgress.total
              }
              stage={
                promptProgress.stage
              }
            />

          )}


          {randomGenerating && (

            <ProgressBar
              step={
                randomProgress.step
              }
              total={
                randomProgress.total
              }
              stage={
                randomProgress.stage
              }
            />

          )}


          {/* ====================================================
              RESULT NOTE
              ==================================================== */}

          {promptNote && (

            <div className="ig-result-note">

              <span>
                ✦
              </span>

              {promptNote}

            </div>

          )}

        </section>


        {/* ======================================================
            OUTPUT PANEL
            ====================================================== */}

        <section className="ig-panel ig-output-panel">


          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                02
              </div>


              <div className="ig-panel-label">
                YOUR CREATION
              </div>

            </div>


            <span className="ig-panel-code">
              OUTPUT
            </span>

          </div>


          {/* ====================================================
              OUTPUT
              ==================================================== */}

          <div
            className={`ig-output-stage ${
              generatedImage
                ? "has-image"
                : ""
            }`}
          >

            {generatedImage ? (

              <div className="ig-generated-result">

                <img
                  src={generatedImage}
                  alt={
                    prompt ||
                    "Generated Cloud AI artwork"
                  }
                  className="ig-generated-image"
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        generatedImage,
                        "ranano-generated-image.png"
                      )
                    }
                    style={{
                      border: "1px solid #ffd400",
                      color: "#080808",
                      background: "#ffd400",
                      borderRadius: "7px",
                      padding: "9px 14px",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      cursor: "pointer",
                    }}
                  >
                    ↓ DOWNLOAD IMAGE
                  </button>
                </div>

              </div>

            ) : (

              <div className="ig-empty-output">

                <div className="ig-empty-orbit">

                  <span>
                    ✦
                  </span>

                </div>


                <div className="ig-empty-label">
                  WAITING FOR CREATION
                </div>


                <h3>

                  Your image will

                  <br />

                  appear here.

                </h3>


                <p>

                  Write a prompt on the left
                  and start creating.

                </p>

              </div>

            )}

          </div>


          {/* ====================================================
              RECENT CREATIONS
              ==================================================== */}

          {recent.length > 0 && (

            <div className="ig-recent">

              <div className="ig-recent-header">

                <div>

                  <span className="ig-recent-label">
                    RECENT CREATIONS
                  </span>


                  <span className="ig-recent-count">
                    {recent.length}
                  </span>

                </div>


                {onViewHistory && (

                  <button
                    type="button"
                    onClick={
                      onViewHistory
                    }
                  >
                    OPEN GALLERY →
                  </button>

                )}

              </div>


              <div className="ig-recent-grid">

                {recent.map(
                  (entry) => (

                    <button
                      type="button"
                      className="ig-recent-item"
                      key={
                        entry.id ||
                        entry.url
                      }
                      onClick={() =>
                        setGeneratedImage(
                          entry.url
                        )
                      }
                    >

                      <img
                        src={entry.url}
                        alt={
                          entry.prompt ||
                          "Recent Cloud AI generation"
                        }
                      />


                      <span>
                        ↗
                      </span>

                    </button>

                  )
                )}

              </div>

            </div>

          )}

        </section>

      </section>


      {/* ========================================================
          FOOTER
          ======================================================== */}

      <footer className="ig-footer">

        <div className="ig-footer-line" />


        <div className="ig-footer-status">

          <span />

          RANANO CREATIVE CORE

        </div>


        <div className="ig-footer-line" />

      </footer>

    </main>
  );
}