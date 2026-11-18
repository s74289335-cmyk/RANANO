import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  api,
  fileUrl,
} from "../api.js";


export default function ImageEnhancement({
  onBack,
}) {

  // ============================================================
  // STATE
  // ============================================================

  const [file, setFile] =
    useState(null);

  const [preview, setPreview] =
    useState(null);

  const [enhancedUrl, setEnhancedUrl] =
    useState(null);

  const [enhancementLabel, setEnhancementLabel] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [dragOver, setDragOver] =
    useState(false);


  const fileInputRef =
    useRef(null);


  // ============================================================
  // CLEANUP OBJECT URL
  // ============================================================

  useEffect(() => {

    return () => {

      if (preview) {
        URL.revokeObjectURL(preview);
      }

    };

  }, [preview]);


  // ============================================================
  // FILE VALIDATION
  // ============================================================

  function validateFile(selectedFile) {

    if (!selectedFile) {
      return "Please select an image.";
    }


    if (
      !selectedFile.type ||
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {

      return (
        "Please select a valid image file."
      );

    }


    const MAX_SIZE =
      20 * 1024 * 1024;


    if (
      selectedFile.size >
      MAX_SIZE
    ) {

      return (
        "Image is too large. Maximum size is 20 MB."
      );

    }


    return null;
  }


  // ============================================================
  // ACCEPT FILE
  // ============================================================

  function acceptFile(
    selectedFile
  ) {

    const validationError =
      validateFile(
        selectedFile
      );


    if (validationError) {

      setError(
        validationError
      );

      return;

    }


    setError(null);


    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }


    const objectUrl =
      URL.createObjectURL(
        selectedFile
      );


    setFile(
      selectedFile
    );

    setPreview(
      objectUrl
    );

    setEnhancedUrl(null);
    setEnhancementLabel(null);

  }


  // ============================================================
  // FILE SELECT
  // ============================================================

  function handleFileSelect(
    event
  ) {

    const selectedFile =
      event.target.files?.[0];


    acceptFile(
      selectedFile
    );

  }


  // ============================================================
  // DRAG & DROP
  // ============================================================

  function handleDragOver(
    event
  ) {

    event.preventDefault();

    if (!loading) {
      setDragOver(true);
    }

  }


  function handleDragLeave(
    event
  ) {

    event.preventDefault();

    setDragOver(false);

  }


  function handleDrop(
    event
  ) {

    event.preventDefault();

    setDragOver(false);


    if (loading) {
      return;
    }


    const droppedFile =
      event.dataTransfer.files?.[0];


    acceptFile(
      droppedFile
    );

  }


  // ============================================================
  // OPEN FILE PICKER
  // ============================================================

  function openFilePicker() {

    if (loading) {
      return;
    }


    fileInputRef.current?.click();

  }


  // ============================================================
  // CLOUD AI ENHANCEMENT
  // ============================================================

  async function handleEnhance() {

    if (
      !file ||
      loading
    ) {

      return;

    }


    setLoading(true);

    setError(null);

    setEnhancedUrl(null);
    setEnhancementLabel(null);


    try {

      /*
       * IMPORTANT:
       *
       * "cloud" tells the backend to use
       * the hosted Cloud AI image-to-image
       * enhancement model.
       *
       * This does NOT use:
       * - OpenCV fast enhancement
       * - local ESRGAN
       * - local RANANO DDPM
       */

      const result =
        await api.enhanceImage(
          file,
          "cloud"
        );


      if (
        !result ||
        !result.image_url
      ) {

        throw new Error(
          "completed the request but did not return an image."
        );

      }


      setEnhancedUrl(
        fileUrl(
          result.image_url
        )
      );

      setEnhancementLabel(
        result.enhancement ||
          "Image enhancement complete"
      );

    } catch (e) {

      console.error(
        "RANANO Cloud enhancement error:",
        e
      );


      setError(
        e?.message ||
          "image enhancement failed."
      );

    } finally {

      setLoading(false);

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
  // CLEAR
  // ============================================================

  function clearImage() {

    if (preview) {

      URL.revokeObjectURL(
        preview
      );

    }


    setFile(null);

    setPreview(null);

    setEnhancedUrl(null);
    setEnhancementLabel(null);

    setError(null);

    setDragOver(false);


    if (
      fileInputRef.current
    ) {

      fileInputRef.current.value =
        "";

    }

  }


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <main
      className="image-generation-page"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
      }}
    >

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
          onClick={onBack}
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

            IMAGE ENHANCEMENT

          </div>


          <h1>

            ENHANCE

            <br />

            <span>
              YOUR IMAGE.
            </span>

          </h1>


          <p>
            Improve clarity, restore details,
            and bring your images back to life.
          </p>


          <div className="ig-hero-status">

            <span className="ig-status-line" />

            IMAGE → ENHANCED

            <span className="ig-status-line" />

          </div>

        </div>


        {/* CREATIVE CORE */}

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
          MAIN WORKSPACE
          ======================================================== */}

      <section className="ig-workspace">


        {/* ======================================================
            INPUT PANEL
            ====================================================== */}

        <section className="ig-panel ig-prompt-panel">


          {/* PANEL HEADER */}

          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                01
              </div>

              <div className="ig-panel-label">
                SOURCE IMAGE
              </div>

            </div>


            <span className="ig-panel-code">
              INPUT
            </span>

          </div>


          {/* TITLE */}

          <h2>

            Give your image

            <br />

            <span>
              another life.
            </span>

          </h2>


          {/* DESCRIPTION */}

          <p className="ig-panel-description">

            Upload an image and let RANANO
            improve its clarity, sharpness,
            and visual quality using Cloud AI.

          </p>


          {/* ====================================================
              CLOUD AI STATUS
              ==================================================== */}

          <div
            style={{
              marginTop: "20px",
              marginBottom: "18px",
              padding: "12px 14px",
              border:
                "1px solid rgba(255, 212, 0, 0.18)",
              borderRadius: "10px",
              background:
                "rgba(255, 212, 0, 0.035)",
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
              }}
            >

              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background:
                    "#ffd400",
                  boxShadow:
                    "0 0 10px rgba(255,212,0,.7)",
                }}
              />

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing:
                    "0.12em",
                }}
              >
                CLOUD AI ENHANCEMENT
              </span>

            </div>


            <div
              style={{
                marginTop: "6px",
                fontSize: "11px",
                lineHeight: 1.5,
                opacity: 0.55,
              }}
            >
              Hosted image-to-image enhancement
              powered through Hugging Face.
            </div>

          </div>


          {/* ====================================================
              UPLOAD AREA
              ==================================================== */}

          <div
            className="ig-prompt-box"
            style={{
              minHeight: "250px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: loading
                ? "default"
                : "pointer",
              border:
                dragOver
                  ? "1px solid #ffd400"
                  : undefined,
            }}
            onClick={
              openFilePicker
            }
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={
              handleDrop
            }
          >

            {preview ? (

              <div
                style={{
                  position:
                    "relative",
                  width: "100%",
                  height: "250px",
                }}
              >

                <img
                  src={preview}
                  alt="Selected image"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "contain",
                    display: "block",
                  }}
                />


                <div
                  style={{
                    position:
                      "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "rgba(0,0,0,.55)",
                    opacity: 0,
                    transition:
                      "opacity .2s ease",
                  }}
                  onMouseEnter={(
                    event
                  ) => {

                    event.currentTarget.style.opacity =
                      "1";

                  }}
                  onMouseLeave={(
                    event
                  ) => {

                    event.currentTarget.style.opacity =
                      "0";

                  }}
                >

                  <strong>
                    IMAGE SELECTED
                  </strong>

                  <small
                    style={{
                      marginTop:
                        "6px",
                      opacity:
                        0.7,
                    }}
                  >
                    Click to replace
                  </small>

                </div>

              </div>

            ) : (

              <div
                style={{
                  textAlign:
                    "center",
                  padding:
                    "30px",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "42px",
                    color:
                      "#ffd400",
                    marginBottom:
                      "18px",
                  }}
                >
                  ↑
                </div>


                <strong
                  style={{
                    display:
                      "block",
                    letterSpacing:
                      "1px",
                  }}
                >
                  DROP YOUR IMAGE HERE
                </strong>


                <span
                  style={{
                    display:
                      "block",
                    marginTop:
                      "8px",
                    opacity:
                      0.65,
                  }}
                >
                  or click to browse
                </span>


                <small
                  style={{
                    display:
                      "block",
                    marginTop:
                      "18px",
                    opacity:
                      0.5,
                  }}
                >
                  PNG · JPG · JPEG ·
                  UP TO 20MB
                </small>

              </div>

            )}


            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleFileSelect
              }
              hidden
            />

          </div>


          {/* ====================================================
              ACTIONS
              ==================================================== */}

          <div className="ig-actions">

            <button
              type="button"
              className="ig-generate-button"
              onClick={
                handleEnhance
              }
              disabled={
                !file ||
                loading
              }
            >

              <span>

                {loading
                  ? "ENHANCING..."
                  : "ENHANCE IMAGE"}

              </span>


              {!loading && (

                <span className="ig-button-arrow">
                  →
                </span>

              )}

            </button>


            {file && !loading && (

              <button
                type="button"
                className="ig-random-button"
                onClick={
                  clearImage
                }
                title="Clear image"
                aria-label="Clear image"
              >
                ×
              </button>

            )}

          </div>


          {/* ====================================================
              PROGRESS
              ==================================================== */}

          {loading && (

            <div
              className="ig-progress"
              style={{
                marginTop:
                  "18px",
              }}
            >

              <div className="ig-progress-track">

                <div
                  className="ig-progress-fill"
                  style={{
                    width: "70%",
                    animation:
                      "pulse 1.2s infinite",
                  }}
                />

              </div>


              <span className="ig-progress-text">
                ENHANCING WITH CLOUD AI...
              </span>

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
                ENHANCED RESULT
              </div>

            </div>


            <span className="ig-panel-code">
              OUTPUT
            </span>

          </div>


          {/* OUTPUT */}

          <div
            className={`ig-output-stage ${
              enhancedUrl
                ? "has-image"
                : ""
            }`}
          >

            {enhancedUrl ? (

              <div className="ig-generated-result">

                <img
                  src={enhancedUrl}
                  alt="Cloud AI enhanced result"
                  className="ig-generated-image"
                />


                <div className="ig-image-overlay">

                  <span>
                    ✦ {
                      enhancementLabel?.toLowerCase().includes(
                        "real-esrgan"
                      )
                        ? "LOCAL REAL-ESRGAN ENHANCED"
                        : "CLOUD AI ENHANCED"
                    }
                  </span>


                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        enhancedUrl,
                        "ranano-enhanced-image.png"
                      )
                    }
                    style={{
                      border: "1px solid #ffd400",
                      color: "#080808",
                      background: "#ffd400",
                      borderRadius: "6px",
                      padding: "7px 10px",
                      fontSize: "9px",
                      letterSpacing: "1px",
                      cursor: "pointer",
                    }}
                  >
                    ↓ DOWNLOAD
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEnhancedUrl(null)
                    }
                  >
                    CLEAR
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
                  WAITING FOR INPUT
                </div>


                <h3>

                  Your enhanced image

                  <br />

                  will appear here.

                </h3>


                <p>

                  Upload an image and start
                  the Cloud AI enhancement process.

                </p>

              </div>

            )}

          </div>


          {/* RESULT NOTE */}

          {enhancedUrl && (

            <div
              className="ig-result-note"
              style={{
                marginTop:
                  "16px",
              }}
            >

              <span>
                ✦
              </span>

              {enhancementLabel ||
                "Image enhancement completed."}

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