import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, F, monoLabel } from "./theme";
import { Cursor, type Way } from "./cursor";
import {
  AppFrame,
  Avatar,
  Card,
  CheckBox,
  FeedbackPanel,
  GreenButton,
  Overlay,
  Rise,
  SceneFade,
  TypeText,
} from "./bits";

/* Shared layout: a 1000px content column centered in the main area (x 610..1610). */
const COL: React.CSSProperties = {
  position: "absolute",
  left: 310,
  width: 1000,
  top: 0,
};

const STEPS = [
  "Pull the draft from Notion",
  "Check every link",
  "Format in the template",
  "Schedule for Tuesday 9am",
  "Post recap in community",
];

const NOTE_1 =
  "Double-check every link before sending. Broken links went out twice.";
const NOTE_2 = "Subject line should be sentence case, not title case.";

const TRANSCRIPT =
  "ok so every week we send the newsletter... pull the draft from Notion, check all the links, format it in the template, schedule for Tuesday 9am, then post the recap in the community.";

const H1: React.CSSProperties = {
  fontFamily: F.display,
  fontWeight: 700,
  fontSize: 40,
  letterSpacing: "-0.03em",
  color: C.ink,
  margin: 0,
};

/* ================= Scene 1 — Describe how you work (0–210) ================= */

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const clickTextarea = 26;
  const typeStart = 30;
  const clickGenerate = 104;
  const resultAt = 120;

  const ways: Way[] = [
    { f: 0, x: 1500, y: 950 },
    { f: 20, x: 700, y: 330 },
    { f: clickTextarea, x: 700, y: 330, click: true },
    { f: 88, x: 700, y: 330 },
    { f: 98, x: 1168, y: 615 },
    { f: clickGenerate, x: 1168, y: 615, click: true },
    { f: 190, x: 1530, y: 700 },
  ];

  const focused = frame >= clickTextarea;
  const generating = frame >= clickGenerate && frame < resultAt;
  const showResult = frame >= resultAt;
  const formOpacity = interpolate(frame, [resultAt - 5, resultAt + 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade dur={210} fadeIn={false}>
      <AppFrame variant="admin" active="Playbooks" userName="Abdullah" userInitial="A">
        <div style={COL}>
          <h1 style={{ ...H1, marginTop: 84 }}>New playbook</h1>
          <p style={{ fontFamily: F.body, fontSize: 19, color: C.sub, margin: "12px 0 0" }}>
            Describe the task — Clovior drafts the playbook.
          </p>

          {/* Describe form */}
          {formOpacity > 0 ? (
            <Card style={{ marginTop: 32, padding: 28, opacity: formOpacity }}>
              <div style={monoLabel(13)}>Describe how you work</div>
              <div
                style={{
                  marginTop: 16,
                  height: 300,
                  borderRadius: 8,
                  border: `1.5px solid ${focused ? C.green : C.border}`,
                  background: C.card,
                  padding: "18px 22px",
                  fontFamily: F.body,
                  fontSize: 20,
                  lineHeight: 1.55,
                  color: C.ink,
                }}
              >
                {frame < typeStart ? (
                  <span style={{ color: "#B4B3AB" }}>
                    e.g. how we publish the weekly newsletter
                  </span>
                ) : (
                  <TypeText text={TRANSCRIPT} start={typeStart} fpc={0.28} seed="s1" />
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <GreenButton
                  label={generating ? "Drafting…" : "Generate playbook"}
                  pressedAt={clickGenerate}
                />
              </div>
            </Card>
          ) : null}

          {/* Generated playbook */}
          {showResult ? (
            <Rise at={resultAt} style={{ position: "absolute", top: 216, width: 1000 }}>
              <Card style={{ padding: 28 }}>
                <div style={monoLabel(13)}>Draft playbook</div>
                <div
                  style={{
                    fontFamily: F.display,
                    fontWeight: 700,
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                    marginTop: 10,
                  }}
                >
                  Publish the weekly newsletter
                </div>
                <div style={{ marginTop: 18 }}>
                  {STEPS.map((s, i) => (
                    <Rise key={s} at={resultAt + 6 + i * 4} dy={8}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "15px 4px",
                          borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                        }}
                      >
                        <span
                          style={{
                            ...monoLabel(13),
                            color: C.green,
                            width: 28,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontFamily: F.body, fontSize: 21 }}>{s}</span>
                      </div>
                    </Rise>
                  ))}
                </div>
              </Card>
            </Rise>
          ) : null}
        </div>
        <Overlay text="Describe it once." at={146} hold={45} />
        <Cursor ways={ways} />
      </AppFrame>
    </SceneFade>
  );
};

/* ================= Scene 2 — Hand-off (210–420) ================= */

const Select: React.FC<{
  label: string;
  value: React.ReactNode;
  x: number;
  focused?: boolean;
}> = ({ label, value, x, focused }) => (
  <div style={{ position: "absolute", left: x, top: 28, width: 442 }}>
    <div style={monoLabel(13)}>{label}</div>
    <div
      style={{
        marginTop: 12,
        height: 56,
        borderRadius: 8,
        border: `1.5px solid ${focused ? C.green : C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        fontFamily: F.body,
        fontSize: 20,
        background: C.card,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>{value}</span>
      <svg width={16} height={16} viewBox="0 0 16 16">
        <path d="M4 6l4 4 4-4" fill="none" stroke={C.sub} strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

const Menu: React.FC<{
  x: number;
  items: { label: React.ReactNode; key: string }[];
  hoverKey?: string;
}> = ({ x, items, hoverKey }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 124,
      width: 442,
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      boxShadow: "0 16px 40px -16px rgba(22,21,15,0.25)",
      padding: 6,
      zIndex: 20,
    }}
  >
    {items.map((it) => (
      <div
        key={it.key}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 52,
          padding: "0 14px",
          borderRadius: 6,
          fontFamily: F.body,
          fontSize: 20,
          background: hoverKey === it.key ? C.muted : "transparent",
        }}
      >
        {it.label}
      </div>
    ))}
  </div>
);

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const openOwner = 32;
  const pickMaya = 58;
  const openSched = 90;
  const pickWeekly = 118;
  const save = 148;

  const ways: Way[] = [
    { f: 0, x: 1530, y: 700 },
    { f: 26, x: 559, y: 261 },
    { f: openOwner, x: 559, y: 261, click: true },
    { f: 52, x: 559, y: 333 },
    { f: pickMaya, x: 559, y: 333, click: true },
    { f: 84, x: 1061, y: 261 },
    { f: openSched, x: 1061, y: 261, click: true },
    { f: 112, x: 1061, y: 437 },
    { f: pickWeekly, x: 1061, y: 437, click: true },
    { f: 142, x: 1233, y: 381 },
    { f: save, x: 1233, y: 381, click: true },
    { f: 200, x: 1545, y: 620 },
  ];

  const ownerMenuOpen = frame >= openOwner && frame < pickMaya;
  const schedMenuOpen = frame >= openSched && frame < pickWeekly;
  const hasMaya = frame >= pickMaya;
  const hasWeekly = frame >= pickWeekly;
  const saved = frame >= save + 8;

  const mayaChip = (
    <>
      <Avatar initial="M" color={C.mint} size={28} />
      Maya
    </>
  );

  return (
    <SceneFade dur={210}>
      <AppFrame variant="admin" active="Playbooks" userName="Abdullah" userInitial="A">
        <div style={COL}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 84 }}>
            <h1 style={H1}>Publish the weekly newsletter</h1>
            <span
              style={{
                ...monoLabel(12),
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "4px 10px",
              }}
            >
              Playbook
            </span>
          </div>

          {/* Hand-off card. Geometry is fixed so the cursor waypoints line up. */}
          <div style={{ position: "relative" }}>
            <Card style={{ marginTop: 40, height: 260, position: "relative" }}>
              {/* Selects sit at y 240(card top)+28 → boxes y 352..408 in frame coords */}
              <Select
                label="Owner"
                value={hasMaya ? mayaChip : <span style={{ color: "#B4B3AB" }}>Unassigned</span>}
                x={28}
                focused={ownerMenuOpen}
              />
              <Select
                label="Schedule"
                value={hasWeekly ? "Weekly" : <span style={{ color: "#B4B3AB" }}>None</span>}
                x={530}
                focused={schedMenuOpen}
              />
              <div style={{ position: "absolute", right: 28, bottom: 26 }}>
                <GreenButton label={saved ? "Saved ✓" : "Save"} pressedAt={save} />
              </div>
              {ownerMenuOpen ? (
                <Menu
                  x={28}
                  hoverKey={frame > 48 ? "maya" : undefined}
                  items={[
                    {
                      key: "maya",
                      label: (
                        <>
                          <Avatar initial="M" color={C.mint} size={28} /> Maya
                        </>
                      ),
                    },
                    {
                      key: "jordan",
                      label: (
                        <>
                          <Avatar initial="J" color="#5B4BE0" size={28} /> Jordan
                        </>
                      ),
                    },
                    {
                      key: "sam",
                      label: (
                        <>
                          <Avatar initial="S" color={C.red} size={28} /> Sam
                        </>
                      ),
                    },
                  ]}
                />
              ) : null}
              {schedMenuOpen ? (
                <Menu
                  x={530}
                  hoverKey={frame > 108 ? "weekly" : undefined}
                  items={[
                    { key: "none", label: "None" },
                    { key: "daily", label: "Daily" },
                    { key: "weekly", label: "Weekly" },
                    { key: "monthly", label: "Monthly" },
                  ]}
                />
              ) : null}
            </Card>

            <Card style={{ marginTop: 24, padding: "10px 28px" }}>
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 0",
                    borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ ...monoLabel(13), color: C.green, width: 28 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontFamily: F.body, fontSize: 20 }}>{s}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
        <Overlay text="Hand it off." at={128} hold={48} />
        <Cursor ways={ways} />
      </AppFrame>
    </SceneFade>
  );
};

/* ================= Scene 3 — The operator runs it (420–840) ================= */

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const checks = [120, 160, 200, 240, 280];
  const submit = 330;
  const submitted = frame >= submit + 10;

  const rowY = (i: number) => 408 + i * 82; // frame-coord centers of checklist rows

  const ways: Way[] = [
    { f: 0, x: 1545, y: 620 },
    { f: 46, x: 1150, y: 700 },
    { f: checks[0] - 8, x: 354, y: rowY(0) },
    { f: checks[0], x: 354, y: rowY(0), click: true },
    { f: checks[1] - 8, x: 354, y: rowY(1) },
    { f: checks[1], x: 354, y: rowY(1), click: true },
    { f: checks[2] - 8, x: 354, y: rowY(2) },
    { f: checks[2], x: 354, y: rowY(2), click: true },
    { f: checks[3] - 8, x: 354, y: rowY(3) },
    { f: checks[3], x: 354, y: rowY(3), click: true },
    { f: checks[4] - 8, x: 354, y: rowY(4) },
    { f: checks[4], x: 354, y: rowY(4), click: true },
    { f: submit - 8, x: 1203, y: 837 },
    { f: submit, x: 1203, y: 837, click: true },
    { f: 384, x: 1310, y: 860 },
  ];

  const done = checks.filter((c) => frame >= c + 4).length;
  const progress = interpolate(
    frame,
    checks.flatMap((c) => [c + 2, c + 10]),
    checks.flatMap((_, i) => [i / 5, (i + 1) / 5]),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <SceneFade dur={420}>
      <AppFrame variant="operator" active="Home" userName="Maya" userInitial="M" userColor={C.mint}>
        <div style={COL}>
          <h1 style={{ ...H1, fontSize: 36, marginTop: 64 }}>
            Publish the weekly newsletter
          </h1>
          <div style={{ ...monoLabel(13), marginTop: 10 }}>Run · Due Tue 9:00 AM</div>

          <FeedbackPanel notes={[{ text: NOTE_1 }]} style={{ marginTop: 26 }} />

          {!submitted ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  marginTop: 26,
                }}
              >
                <span style={monoLabel(12)}>Progress</span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: C.muted,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: "100%",
                      background: C.green,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ ...monoLabel(12), color: C.ink }}>{done} of 5</span>
              </div>

              {/* Checklist: rows are 82px tall; centers must match rowY() above. */}
              <Card style={{ marginTop: 20, padding: "8px 28px" }}>
                {STEPS.map((s, i) => {
                  const at = checks[i];
                  const isChecked = frame >= at + 5;
                  return (
                    <div
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        height: 82,
                        borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                      }}
                    >
                      <CheckBox checkedAt={at} />
                      <span
                        style={{
                          fontFamily: F.body,
                          fontSize: 21,
                          color: isChecked ? C.sub : C.ink,
                          textDecoration: isChecked ? "line-through" : "none",
                          textDecorationColor: "#C9C8C0",
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  );
                })}
              </Card>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <GreenButton label="Submit for review" pressedAt={submit} />
              </div>
            </>
          ) : (
            <Rise at={submit + 10}>
              <Card
                style={{
                  marginTop: 26,
                  padding: "56px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(46,125,82,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width={30} height={30} viewBox="0 0 20 20">
                    <path
                      d="M4 10.5 L8.5 15 L16 5.5"
                      fill="none"
                      stroke={C.mint}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div
                  style={{
                    fontFamily: F.display,
                    fontWeight: 700,
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Submitted for review
                </div>
                <div style={{ fontFamily: F.body, fontSize: 19, color: C.sub }}>
                  All 5 steps complete.
                </div>
              </Card>
            </Rise>
          )}
        </div>
        <Overlay text="Your corrections show first." at={34} hold={55} />
        <Cursor ways={ways} />
      </AppFrame>
    </SceneFade>
  );
};

/* ================= Scene 4 — Correct once (840–1140) ================= */

const Toggle: React.FC = () => (
  <div
    style={{
      width: 52,
      height: 30,
      borderRadius: 15,
      background: C.green,
      position: "relative",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: "absolute",
        right: 3,
        top: 3,
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#fff",
      }}
    />
  </div>
);

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const openDialog = 30;
  const focusNote = 58;
  const typeStart = 62;
  const send = 202;
  const dialogVisible = frame >= openDialog && frame < send + 8;
  const toastAt = send + 12;

  const ways: Way[] = [
    { f: 0, x: 1310, y: 860 },
    { f: 24, x: 566, y: 306 },
    { f: openDialog, x: 566, y: 306, click: true },
    { f: 52, x: 959, y: 420 },
    { f: focusNote, x: 959, y: 420, click: true },
    { f: 150, x: 959, y: 420 },
    { f: 172, x: 623, y: 552 },
    { f: 196, x: 1248, y: 622 },
    { f: send, x: 1248, y: 622, click: true },
    { f: 262, x: 1420, y: 850 },
  ];

  return (
    <SceneFade dur={300}>
      <AppFrame variant="admin" active="Command View" userName="Abdullah" userInitial="A">
        <div style={COL}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 84 }}>
            <h1 style={H1}>Publish the weekly newsletter</h1>
            <span
              style={{
                ...monoLabel(12),
                color: C.green,
                border: `1px solid rgba(31,61,43,0.3)`,
                borderRadius: 6,
                padding: "4px 10px",
              }}
            >
              In review
            </span>
          </div>

          <Card style={{ marginTop: 40, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar initial="M" color={C.mint} size={38} />
              <div>
                <div style={{ fontFamily: F.body, fontSize: 21, fontWeight: 500 }}>
                  Maya submitted this run
                </div>
                <div style={{ ...monoLabel(12), marginTop: 4 }}>2m ago · 5 of 5 steps</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
              <GreenButton label="Approve" />
              <GreenButton label="Request changes" outline pressedAt={openDialog} />
            </div>
          </Card>
        </div>

        {/* Request-changes dialog */}
        {dialogVisible ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(22,21,15,0.28)",
              zIndex: 40,
              opacity: interpolate(frame, [openDialog, openDialog + 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 560,
                top: 250,
                width: 800,
                background: C.card,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                boxShadow: "0 32px 80px -32px rgba(22,21,15,0.4)",
                padding: 36,
              }}
            >
              <div
                style={{
                  fontFamily: F.display,
                  fontWeight: 700,
                  fontSize: 26,
                  letterSpacing: "-0.02em",
                }}
              >
                Request changes
              </div>
              <div
                style={{
                  marginTop: 22,
                  height: 170,
                  borderRadius: 8,
                  border: `1.5px solid ${frame >= focusNote ? C.green : C.border}`,
                  padding: "16px 20px",
                  fontFamily: F.body,
                  fontSize: 20,
                  lineHeight: 1.5,
                }}
              >
                {frame < typeStart ? (
                  <span style={{ color: "#B4B3AB" }}>What needs to change?</span>
                ) : (
                  <TypeText text={NOTE_2} start={typeStart} fpc={1.5} seed="s4" />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 24,
                }}
              >
                <Toggle />
                <span style={{ fontFamily: F.body, fontSize: 18, color: C.ink }}>
                  Save as a standing note — Maya will see this on every future run.
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 28 }}>
                <GreenButton label="Cancel" outline />
                <GreenButton label="Send back" pressedAt={send} />
              </div>
            </div>
          </div>
        ) : null}

        {/* Confirmation toast */}
        {frame >= toastAt ? (
          <Rise at={toastAt} dy={14} style={{ position: "absolute", right: 60, bottom: 150, zIndex: 50 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.mint}`,
                borderRadius: 10,
                boxShadow: "0 16px 40px -16px rgba(22,21,15,0.3)",
                padding: "18px 24px",
                maxWidth: 640,
                fontFamily: F.body,
                fontSize: 18,
                lineHeight: 1.45,
              }}
            >
              <svg width={22} height={22} viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                <circle cx={10} cy={10} r={9} fill="rgba(46,125,82,0.14)" />
                <path
                  d="M5.5 10.5 L8.5 13.5 L14.5 6.5"
                  fill="none"
                  stroke={C.mint}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
              <span>
                Saved. Maya will see this on every future run of{" "}
                <strong style={{ fontWeight: 600 }}>Publish the weekly newsletter</strong>.
              </span>
            </div>
          </Rise>
        ) : null}

        <Overlay text="Correct it once." at={222} hold={50} />
        <Cursor ways={ways} />
      </AppFrame>
    </SceneFade>
  );
};

/* ================= Scene 5 — It sticks + end card (1140–1350) ================= */

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const endAt = 120;
  const endO = interpolate(frame, [endAt, endAt + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const endScale = interpolate(frame, [endAt, endAt + 20], [0.985, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade dur={210} fadeOut={false}>
      <AppFrame variant="operator" active="Home" userName="Maya" userInitial="M" userColor={C.mint}>
        <div style={COL}>
          <h1 style={{ ...H1, fontSize: 36, marginTop: 64 }}>
            Publish the weekly newsletter
          </h1>
          <div style={{ ...monoLabel(13), marginTop: 10 }}>Next run · Due Tue 9:00 AM</div>

          <FeedbackPanel
            notes={[{ text: NOTE_2, isNew: true }, { text: NOTE_1 }]}
            style={{ marginTop: 26 }}
          />

          <Card style={{ marginTop: 24, padding: "8px 28px" }}>
            {STEPS.slice(0, 3).map((s, i) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  height: 78,
                  borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                }}
              >
                <CheckBox checkedAt={null} />
                <span style={{ fontFamily: F.body, fontSize: 21 }}>{s}</span>
              </div>
            ))}
          </Card>
        </div>
        <Overlay text="It never comes back." at={26} hold={52} />
      </AppFrame>

      {/* End card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.bg,
          opacity: endO,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
            transform: `scale(${endScale})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 5,
                width: 55,
                height: 55,
              }}
            >
              <div style={{ borderRadius: 8, background: C.green }} />
              <div style={{ borderRadius: 8, background: C.mint }} />
              <div style={{ borderRadius: 8, background: C.green }} />
              <div style={{ borderRadius: 8, background: C.green }} />
            </div>
            <div
              style={{
                fontFamily: F.display,
                fontWeight: 700,
                fontSize: 76,
                letterSpacing: "-0.04em",
                color: C.ink,
              }}
            >
              Clovior
            </div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 27, color: C.sub }}>
            Hand off work. It stays handed off.
          </div>
          <div style={{ ...monoLabel(16), marginTop: 6 }}>clovior.com</div>
        </div>
      </div>
    </SceneFade>
  );
};
