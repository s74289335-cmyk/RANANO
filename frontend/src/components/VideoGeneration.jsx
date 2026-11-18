import { useState } from "react";
import { api, fileUrl } from "../api.js";

const VIDEO_FORMATS = [
  {
    value: "9:16",
    label: "9:16",
    title: "VERTICAL REEL",
    size: "1080 × 1920",
    icon: "▯",
    description: "Reels • Shorts • TikTok",
  },
  {
    value: "16:9",
    label: "16:9",
    title: "LANDSCAPE",
    size: "1920 × 1080",
    icon: "▭",
    description: "YouTube • Normal Video",
  },
  {
    value: "1:1",
    label: "1:1",
    title: "SQUARE",
    size: "1080 × 1080",
    icon: "□",
    description: "Instagram • Social Posts",
  },
];

const VOICES = [
  {
    value: "female",
    label: "FEMALE",
    icon: "♀",
  },
  {
    value: "male",
    label: "MALE",
    icon: "♂",
  },
];

const TEXT_EFFECTS = [
  {
    value: "fade",
    label: "FADE",
    icon: "◌",
  },
  {
    value: "slide",
    label: "SLIDE",
    icon: "→",
  },
  {
    value: "typewriter",
    label: "TYPEWRITER",
    icon: "⌁",
  },
  {
    value: "pop",
    label: "POP",
    icon: "✦",
  },
  {
    value: "bounce",
    label: "BOUNCE",
    icon: "↕",
  },
  {
    value: "zoom",
    label: "ZOOM",
    icon: "⊙",
  },
  {
    value: "glitch",
    label: "GLITCH",
    icon: "⚡",
  },
  {
    value: "wave",
    label: "WAVE",
    icon: "≈",
  },
  {
    value: "word_pop",
    label: "WORD POP",
    icon: "W",
  },
  {
    value: "letter_pop",
    label: "LETTER POP",
    icon: "A",
  },
  {
    value: "kinetic",
    label: "KINETIC",
    icon: "↗",
  },
  {
    value: "neon",
    label: "NEON",
    icon: "✧",
  },
  {
    value: "rise",
    label: "RISE",
    icon: "↑",
  },
  {
    value: "drop",
    label: "DROP",
    icon: "↓",
  },
  {
    value: "blur",
    label: "BLUR",
    icon: "◉",
  },
  {
    value: "cinematic",
    label: "CINEMATIC",
    icon: "◆",
  },
];

export default function VideoGeneration({
  gallery = [],
  onBack,
}) {
  const [selected, setSelected] = useState([]);

  const [videoUrl, setVideoUrl] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [format, setFormat] = useState("9:16");

  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const [voiceText, setVoiceText] = useState("");

  const [voice, setVoice] = useState("female");

  const [animatedTextEnabled, setAnimatedTextEnabled] =
    useState(false);

  const [textEffect, setTextEffect] =
    useState("kinetic");

  const [captionsEnabled, setCaptionsEnabled] =
    useState(false);

  function toggleSelect(url) {
    setSelected((previous) =>
      previous.includes(url)
        ? previous.filter(
            (item) => item !== url
          )
        : [...previous, url]
    );

    setVideoUrl(null);
    setError(null);
  }

  function selectAllImages() {
    if (gallery.length === 0) {
      return;
    }

    setSelected([...gallery]);
    setVideoUrl(null);
    setError(null);
  }

  function clearSelection() {
    setSelected([]);
    setVideoUrl(null);
    setError(null);
  }

  async function handleGenerateVideo() {
    if (
      selected.length === 0 ||
      loading
    ) {
      return;
    }

    if (
      voiceEnabled &&
      !voiceText.trim()
    ) {
      setError(
        "Enter the dialogue or description for the voiceover."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const relativePaths =
        selected.map((url) =>
          url.replace(
            /^.*(\/files\/)/,
            "/files/"
          )
        );

      const result =
        await api.generateVideo(
          relativePaths,
          {
            format,
            voiceEnabled,
            voiceText:
              voiceText.trim(),
            voice,
            animatedTextEnabled,
            textEffect,
            captionsEnabled,
          }
        );

      setVideoUrl(
        fileUrl(result.video_url)
      );
    } catch (e) {
      setError(
        e?.message ||
          "Video generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedFormat =
    VIDEO_FORMATS.find(
      (item) => item.value === format
    );

  return (
    <main
      className="image-generation-page"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* BACKGROUND */}

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

      {/* HEADER */}

      <header className="ig-workspace-header">

        <button
          type="button"
          className="ig-tools-button"
          onClick={onBack}
        >
          <span className="ig-tools-arrow">
            ←
          </span>

          <span>TOOLS</span>
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
          >
            ⓘ
          </button>

          <button
            type="button"
            className="ig-header-icon"
          >
            ⚙
          </button>

        </div>

      </header>

      {/* HERO */}

      <section className="ig-hero">

        <div className="ig-hero-copy">

          <div className="ig-section-label">
            <span>/</span>
            VIDEO GENERATION
          </div>

          <h1>
            CREATE
            <br />
            <span>YOUR VIDEO.</span>
          </h1>

          <p>
            Turn your generated images into
            a video with voice, captions,
            animated text, and your preferred
            video format.
          </p>

          <div className="ig-hero-status">

            <span className="ig-status-line" />

            IMAGE → VIDEO

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
            <span>▶</span>
          </div>

          <div className="ig-mascot-caption">
            CREATIVE CORE
          </div>

        </div>

      </section>

      {/* ERROR */}

      {error && (
        <div className="ig-error">

          <span className="ig-error-symbol">
            ⚠
          </span>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            ×
          </button>

        </div>
      )}

      {/* WORKSPACE */}

      <section className="ig-workspace">

        {/* INPUT */}

        <section className="ig-panel ig-prompt-panel">

          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                01
              </div>

              <div className="ig-panel-label">
                VIDEO CREATOR
              </div>

            </div>

            <span className="ig-panel-code">
              INPUT
            </span>

          </div>

          <h2>
            Build your
            <br />
            <span>video.</span>
          </h2>

          <p className="ig-panel-description">
            Select your generated images,
            choose a format, and optionally
            add voiceover and animated text.
          </p>

          {/* IMAGE GALLERY */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              marginBottom: "10px",
            }}
          >

            <div
              style={{
                fontSize: "10px",
                letterSpacing: "1.5px",
                opacity: 0.65,
              }}
            >
              GENERATED IMAGES
            </div>

            {gallery.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "7px",
                }}
              >

                <button
                  type="button"
                  onClick={selectAllImages}
                  disabled={loading}
                  style={{
                    border:
                      "1px solid rgba(255,212,0,.2)",
                    background:
                      "rgba(255,255,255,.02)",
                    color: "#ffd400",
                    borderRadius: "6px",
                    padding:
                      "5px 8px",
                    fontSize: "9px",
                    letterSpacing: "1px",
                    cursor:
                      loading
                        ? "default"
                        : "pointer",
                  }}
                >
                  SELECT ALL
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={loading}
                  style={{
                    border:
                      "1px solid rgba(255,255,255,.1)",
                    background:
                      "rgba(255,255,255,.02)",
                    color: "inherit",
                    borderRadius: "6px",
                    padding:
                      "5px 8px",
                    fontSize: "9px",
                    letterSpacing: "1px",
                    cursor:
                      loading
                        ? "default"
                        : "pointer",
                  }}
                >
                  CLEAR
                </button>

              </div>
            )}

          </div>

          {gallery.length === 0 ? (
            <div
              className="ig-output-stage"
              style={{
                minHeight: "260px",
              }}
            >

              <div className="ig-empty-output">

                <div className="ig-empty-orbit">
                  <span>✦</span>
                </div>

                <div className="ig-empty-label">
                  NO IMAGES AVAILABLE
                </div>

                <h3>
                  Your generated images
                  <br />
                  will appear here.
                </h3>

                <p>
                  Generate images first in
                  Image Generation.
                </p>

              </div>

            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "9px",
                maxHeight: "310px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >

              {gallery.map(
                (url, index) => {

                  const isSelected =
                    selected.includes(url);

                  return (
                    <button
                      type="button"
                      key={`${url}-${index}`}
                      onClick={() =>
                        toggleSelect(url)
                      }
                      disabled={loading}
                      style={{
                        position:
                          "relative",
                        padding: 0,
                        border:
                          isSelected
                            ? "2px solid #ffd400"
                            : "1px solid rgba(255,212,0,.2)",
                        background:
                          "rgba(0,0,0,.35)",
                        borderRadius:
                          "9px",
                        overflow:
                          "hidden",
                        cursor:
                          loading
                            ? "default"
                            : "pointer",
                        aspectRatio:
                          "1 / 1",
                      }}
                    >

                      <img
                        src={url}
                        alt={`Frame ${
                          index + 1
                        }`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "cover",
                          display:
                            "block",
                          opacity:
                            isSelected
                              ? 0.7
                              : 1,
                        }}
                      />

                      <span
                        style={{
                          position:
                            "absolute",
                          top: "6px",
                          left: "6px",
                          fontSize:
                            "9px",
                          padding:
                            "3px 5px",
                          borderRadius:
                            "4px",
                          background:
                            "rgba(0,0,0,.75)",
                          color:
                            "#ffd400",
                        }}
                      >
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </span>

                      {isSelected && (
                        <span
                          style={{
                            position:
                              "absolute",
                            right: "6px",
                            top: "6px",
                            width: "23px",
                            height: "23px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            borderRadius:
                              "50%",
                            background:
                              "#ffd400",
                            color:
                              "#080808",
                            fontWeight:
                              "900",
                          }}
                        >
                          ✓
                        </span>
                      )}

                    </button>
                  );
                }
              )}

            </div>
          )}

          {/* SELECTION */}

          {gallery.length > 0 && (
            <div
              className="ig-result-note"
              style={{
                marginTop: "12px",
              }}
            >
              <span>✦</span>

              {selected.length} FRAME
              {selected.length === 1
                ? ""
                : "S"} SELECTED
            </div>
          )}

          {/* VIDEO FORMAT */}

          <div
            style={{
              marginTop: "22px",
            }}
          >

            <div
              style={{
                fontSize: "10px",
                letterSpacing: "1.5px",
                opacity: 0.65,
                marginBottom: "10px",
              }}
            >
              VIDEO FORMAT
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "8px",
              }}
            >

              {VIDEO_FORMATS.map(
                (item) => {

                  const active =
                    format === item.value;

                  return (
                    <button
                      type="button"
                      key={item.value}
                      disabled={loading}
                      onClick={() =>
                        setFormat(
                          item.value
                        )
                      }
                      style={{
                        minHeight:
                          "105px",
                        borderRadius:
                          "10px",
                        border:
                          active
                            ? "1px solid #ffd400"
                            : "1px solid rgba(255,212,0,.18)",
                        background:
                          active
                            ? "rgba(255,212,0,.08)"
                            : "rgba(255,255,255,.015)",
                        color:
                          active
                            ? "#ffd400"
                            : "inherit",
                        cursor:
                          loading
                            ? "default"
                            : "pointer",
                        textAlign:
                          "left",
                        padding:
                          "12px",
                      }}
                    >

                      <div
                        style={{
                          fontSize:
                            "22px",
                          marginBottom:
                            "7px",
                        }}
                      >
                        {item.icon}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "14px",
                          fontWeight:
                            "800",
                          letterSpacing:
                            "1px",
                        }}
                      >
                        {item.label}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "8px",
                          letterSpacing:
                            "1px",
                          opacity:
                            0.65,
                          marginTop:
                            "4px",
                        }}
                      >
                        {item.title}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "8px",
                          opacity:
                            0.5,
                          marginTop:
                            "3px",
                        }}
                      >
                        {item.size}
                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </div>

          {/* VOICEOVER */}

          <div
            style={{
              marginTop: "22px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "10px",
              }}
            >

              <div
                style={{
                  fontSize: "10px",
                  letterSpacing:
                    "1.5px",
                  opacity: 0.65,
                }}
              >
                TEXT → VOICE
              </div>

              <button
                type="button"
                onClick={() =>
                  setVoiceEnabled(
                    (value) =>
                      !value
                  )
                }
                disabled={loading}
                style={{
                  border:
                    voiceEnabled
                      ? "1px solid #ffd400"
                      : "1px solid rgba(255,212,0,.18)",
                  background:
                    voiceEnabled
                      ? "rgba(255,212,0,.08)"
                      : "rgba(255,255,255,.015)",
                  color:
                    voiceEnabled
                      ? "#ffd400"
                      : "inherit",
                  borderRadius:
                    "7px",
                  padding:
                    "6px 10px",
                  fontSize:
                    "9px",
                  letterSpacing:
                    "1px",
                  cursor:
                    loading
                      ? "default"
                      : "pointer",
                }}
              >
                {voiceEnabled
                  ? "VOICE ON ✓"
                  : "ADD VOICE"}
              </button>

            </div>

            {voiceEnabled && (
              <>
                <textarea
                  value={voiceText}
                  onChange={(event) =>
                    setVoiceText(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  rows={5}
                  placeholder="Enter the dialogue, narration, or description you want spoken in the video..."
                  style={{
                    width: "100%",
                    resize: "vertical",
                    minHeight:
                      "120px",
                    border:
                      "1px solid rgba(255,212,0,.18)",
                    borderRadius:
                      "9px",
                    outline:
                      "none",
                    background:
                      "rgba(255,255,255,.015)",
                    color:
                      "inherit",
                    padding:
                      "13px",
                    fontSize:
                      "14px",
                    lineHeight:
                      "1.5",
                    boxSizing:
                      "border-box",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "8px",
                    marginTop:
                      "9px",
                  }}
                >

                  {VOICES.map(
                    (item) => {

                      const active =
                        voice ===
                        item.value;

                      return (
                        <button
                          type="button"
                          key={item.value}
                          disabled={loading}
                          onClick={() =>
                            setVoice(
                              item.value
                            )
                          }
                          style={{
                            minHeight:
                              "48px",
                            borderRadius:
                              "8px",
                            border:
                              active
                                ? "1px solid #ffd400"
                                : "1px solid rgba(255,212,0,.18)",
                            background:
                              active
                                ? "rgba(255,212,0,.08)"
                                : "rgba(255,255,255,.015)",
                            color:
                              active
                                ? "#ffd400"
                                : "inherit",
                            cursor:
                              loading
                                ? "default"
                                : "pointer",
                          }}
                        >
                          {item.icon}{" "}
                          {item.label}
                        </button>
                      );
                    }
                  )}

                </div>
              </>
            )}

          </div>

          {/* ANIMATED TEXT */}

          <div
            style={{
              marginTop: "22px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "10px",
              }}
            >

              <div
                style={{
                  fontSize: "10px",
                  letterSpacing:
                    "1.5px",
                  opacity: 0.65,
                }}
              >
                ANIMATED TEXT
              </div>

              <button
                type="button"
                onClick={() =>
                  setAnimatedTextEnabled(
                    (value) =>
                      !value
                  )
                }
                disabled={loading}
                style={{
                  border:
                    animatedTextEnabled
                      ? "1px solid #ffd400"
                      : "1px solid rgba(255,212,0,.18)",
                  background:
                    animatedTextEnabled
                      ? "rgba(255,212,0,.08)"
                      : "rgba(255,255,255,.015)",
                  color:
                    animatedTextEnabled
                      ? "#ffd400"
                      : "inherit",
                  borderRadius:
                    "7px",
                  padding:
                    "6px 10px",
                  fontSize:
                    "9px",
                  letterSpacing:
                    "1px",
                  cursor:
                    loading
                      ? "default"
                      : "pointer",
                }}
              >
                {animatedTextEnabled
                  ? "TEXT ON ✓"
                  : "ADD TEXT"}
              </button>

            </div>

            {animatedTextEnabled && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: "7px",
                  }}
                >

                  {TEXT_EFFECTS.map(
                    (item) => {

                      const active =
                        textEffect ===
                        item.value;

                      return (
                        <button
                          type="button"
                          key={item.value}
                          disabled={loading}
                          onClick={() =>
                            setTextEffect(
                              item.value
                            )
                          }
                          style={{
                            minHeight:
                              "50px",
                            borderRadius:
                              "8px",
                            border:
                              active
                                ? "1px solid #ffd400"
                                : "1px solid rgba(255,212,0,.16)",
                            background:
                              active
                                ? "rgba(255,212,0,.08)"
                                : "rgba(255,255,255,.015)",
                            color:
                              active
                                ? "#ffd400"
                                : "inherit",
                            cursor:
                              loading
                                ? "default"
                                : "pointer",
                            fontSize:
                              "9px",
                            letterSpacing:
                              ".7px",
                          }}
                        >
                          <span
                            style={{
                              marginRight:
                                "4px",
                            }}
                          >
                            {item.icon}
                          </span>

                          {item.label}
                        </button>
                      );
                    }
                  )}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCaptionsEnabled(
                      (value) =>
                        !value
                    )
                  }
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop:
                      "9px",
                    minHeight:
                      "43px",
                    borderRadius:
                      "8px",
                    border:
                      captionsEnabled
                        ? "1px solid #ffd400"
                        : "1px solid rgba(255,212,0,.16)",
                    background:
                      captionsEnabled
                        ? "rgba(255,212,0,.08)"
                        : "rgba(255,255,255,.015)",
                    color:
                      captionsEnabled
                        ? "#ffd400"
                        : "inherit",
                    cursor:
                      loading
                        ? "default"
                        : "pointer",
                    fontSize:
                      "10px",
                    letterSpacing:
                      "1px",
                  }}
                >
                  {captionsEnabled
                    ? "✓ AUTO CAPTIONS ENABLED"
                    : "ADD AUTO CAPTIONS"}
                </button>
              </>
            )}

          </div>

          {/* SUMMARY */}

          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              border:
                "1px solid rgba(255,212,0,.12)",
              borderRadius:
                "9px",
              background:
                "rgba(255,255,255,.012)",
            }}
          >

            <div
              style={{
                fontSize: "9px",
                letterSpacing:
                  "1.4px",
                opacity: 0.55,
                marginBottom:
                  "7px",
              }}
            >
              VIDEO SETTINGS
            </div>

            <div
              style={{
                display: "flex",
                flexWrap:
                  "wrap",
                gap: "6px",
              }}
            >

              <span className="ig-result-note">
                {selectedFormat?.label}
              </span>

              <span className="ig-result-note">
                {selectedFormat?.size}
              </span>

              {voiceEnabled && (
                <span className="ig-result-note">
                  VOICE:{" "}
                  {voice.toUpperCase()}
                </span>
              )}

              {animatedTextEnabled && (
                <span className="ig-result-note">
                  TEXT:{" "}
                  {textEffect.toUpperCase()}
                </span>
              )}

            </div>

          </div>

          {/* ACTION */}

          <div
            className="ig-actions"
            style={{
              marginTop: "20px",
            }}
          >

            <button
              type="button"
              className="ig-generate-button"
              onClick={
                handleGenerateVideo
              }
              disabled={
                selected.length === 0 ||
                loading
              }
            >

              <span>
                {loading
                  ? "RENDERING VIDEO..."
                  : `CREATE VIDEO (${selected.length})`}
              </span>

              {!loading && (
                <span className="ig-button-arrow">
                  →
                </span>
              )}

            </button>

          </div>

          {loading && (
            <div
              className="ig-progress"
              style={{
                marginTop: "16px",
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
                RANANO IS RENDERING YOUR VIDEO...
              </span>

            </div>
          )}

        </section>

        {/* OUTPUT */}

        <section className="ig-panel ig-output-panel">

          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                02
              </div>

              <div className="ig-panel-label">
                VIDEO OUTPUT
              </div>

            </div>

            <span className="ig-panel-code">
              OUTPUT
            </span>

          </div>

          <div
            className={`ig-output-stage ${
              videoUrl
                ? "has-image"
                : ""
            }`}
          >

            {videoUrl ? (
              <div
                className="ig-generated-result"
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  height:
                    "100%",
                  gap:
                    "12px",
                }}
              >

                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="ig-generated-image"
                  style={{
                    objectFit:
                      "contain",
                    background:
                      "#000",
                    maxHeight:
                      "calc(100% - 60px)",
                  }}
                />

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "8px",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    flexWrap:
                      "wrap",
                  }}
                >

                  <span
                    style={{
                      border:
                        "1px solid #ffd400",
                      color:
                        "#ffd400",
                      background:
                        "rgba(255,212,0,.08)",
                      borderRadius:
                        "6px",
                      padding:
                        "7px 10px",
                      fontSize:
                        "9px",
                      letterSpacing:
                        "1px",
                    }}
                  >
                    ✦ VIDEO READY
                  </span>

                  <a
                    href={videoUrl}
                    download="ranano-video.mp4"
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      textDecoration:
                        "none",
                      border:
                        "1px solid #ffd400",
                      color:
                        "#080808",
                      background:
                        "#ffd400",
                      borderRadius:
                        "7px",
                      padding:
                        "8px 13px",
                      fontSize:
                        "10px",
                      fontWeight:
                        "800",
                      letterSpacing:
                        "1px",
                    }}
                  >
                    DOWNLOAD VIDEO ↓
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      setVideoUrl(null)
                    }
                    style={{
                      border:
                        "1px solid rgba(255,255,255,.15)",
                      color:
                        "inherit",
                      background:
                        "rgba(255,255,255,.03)",
                      borderRadius:
                        "7px",
                      padding:
                        "8px 13px",
                      fontSize:
                        "10px",
                      letterSpacing:
                        "1px",
                      cursor:
                        "pointer",
                    }}
                  >
                    CLEAR
                  </button>

                </div>

              </div>
            ) : (
              <div className="ig-empty-output">

                <div className="ig-empty-orbit">
                  <span>▶</span>
                </div>

                <div className="ig-empty-label">
                  WAITING FOR FRAMES
                </div>

                <h3>
                  Your video
                  <br />
                  will appear here.
                </h3>

                <p>
                  Select your images and
                  choose a video format.
                </p>

              </div>
            )}

          </div>

        </section>

      </section>

      {/* FOOTER */}

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