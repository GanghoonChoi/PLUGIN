import React, { useState } from "react";
import "./footer.css";
// (선택) 호스트에서 제공되면 사용할 수 있음. 없으면 아래 window.fetch 사용
import { mediacoreBackend } from "uxp";

const TICKS_PER_SECOND = 254016000000;

/** 하드코딩된 세그먼트 (영상 길이 180초 예시) */
const DEFAULT_SEGMENTS = [
  { startSec: 0.0,   endSec: 12.5,  title: "Intro",                 desc: "오프닝 로고 및 배경음" },
  { startSec: 12.5,  endSec: 38.0,  title: "제품 등장",             desc: "제품 전체샷, 카메라 팬" },
  { startSec: 38.0,  endSec: 65.2,  title: "기능 1: 빠른 설정",      desc: "설정 화면 데모 및 자막" },
  { startSec: 65.2,  endSec: 92.0,  title: "기능 2: 스마트 추천",    desc: "추천 UI와 사용 시나리오" },
  { startSec: 92.0,  endSec: 128.3, title: "사용자 후기 하이라이트",  desc: "3명 인터뷰 클립 모음" },
  { startSec: 128.3, endSec: 156.7, title: "가격/프로모션",          desc: "가격 카드 & 프로모션 배너" },
  { startSec: 156.7, endSec: 180.0, title: "콜투액션 & 엔딩",        desc: "웹사이트/QR, 엔드카드" }
];

export const Footer = (props) => {
  const [items, setItems] = useState([]);      // [{ id, name, ref, type: 'clip'|'sequence'|'folder' }]
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedPath, setSelectedPath] = useState("");
  const [preferProxy, setPreferProxy] = useState(true);

  // ===== 업로드 설정 (샘플) =====
  const UPLOAD_URL = "https://your-upload-endpoint.example/upload"; // TODO: 실제 도메인으로 교체
  const AUTH_TOKEN = ""; // 필요 시 사용
  const FORM_FIELD_NAME = "file";

  // ===== 추가 상태: 시퀀스 & 모그랏 & 세그먼트 =====
  const [presetPath, setPresetPath] = useState("/path/to/V3A2.sqpreset");
  const [newSequenceName, setNewSequenceName] = useState("SceneReview");
  const [mogrtPath, setMogrtPath] = useState("/path/to/subtitle_block.mogrt");
  const [videoTrackIndexForMogrt, setVideoTrackIndexForMogrt] = useState(1);
  const [audioTrackIndexForMogrt, setAudioTrackIndexForMogrt] = useState(0);
  const [paramIndexTitle, setParamIndexTitle] = useState(0);
  const [paramIndexDesc, setParamIndexDesc] = useState(1);
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS.slice());

  // ===== 추가 상태: 타임라인 스냅샷 JSON =====
  const [snapshotJson, setSnapshotJson] = useState("");

  // 콘솔 출력 헬퍼
  const log = (msg) => {
    if (props && typeof props.writeToConsole === "function") {
      try { props.writeToConsole(String(msg)); } catch (e) { console.log(msg); }
    } else {
      console.log(msg);
    }
  };

  // 안전한 값 추출(프로퍼티가 프라미스/값/함수일 수 있어도 전부 처리)
  const val = async (maybe) => {
    try {
      if (typeof maybe === "function") return await maybe();
      if (maybe && typeof maybe.then === "function") return await maybe;
      return maybe;
    } catch (_) { return undefined; }
  };

  // TickTime -> {seconds, ticks, ticksNumber}
  const tickToObj = async (t) => {
    if (!t) return null;
    return {
      seconds: await val(t.seconds),
      ticks: await val(t.ticks),
      ticksNumber: await val(t.ticksNumber),
    };
  };

  // ProjectItem → (가능하면) ClipProjectItem 캐스팅 후 경로/이름/Guid
  const projectItemToSource = async (pi) => {
    if (!pi) return null;
    let name = "";
    try {
      if (typeof pi.getName === "function") name = await pi.getName();
      else if (typeof pi.name === "string") name = pi.name;
    } catch (_) {}

    let guid = "";
    try {
      if (typeof pi.getGuid === "function") guid = await pi.getGuid();
      else if (typeof pi.guid === "string") guid = pi.guid;
    } catch (_) {}

    const ppro = require("premierepro");
    let mediaPath = null;

    try {
      if (ppro && ppro.ClipProjectItem && typeof ppro.ClipProjectItem.cast === "function") {
        const cpi = await ppro.ClipProjectItem.cast(pi);
        if (cpi) {
          let hasProxy = false;
          try { if (typeof cpi.hasProxy === "function") hasProxy = await cpi.hasProxy(); } catch (_) {}

          if (preferProxy && hasProxy && typeof cpi.getProxyPath === "function") {
            try { const p = await cpi.getProxyPath(); if (p) mediaPath = p; } catch (_) {}
          }
          if (!mediaPath && typeof cpi.getMediaFilePath === "function") {
            try { const p = await cpi.getMediaFilePath(); if (p) mediaPath = p; } catch (_) {}
          }
          if (!mediaPath && typeof cpi.getMediaPath === "function") {
            try { const p = await cpi.getMediaPath(); if (p) mediaPath = p; } catch (_) {}
          }
        }
      }
    } catch (_) {}

    return { name: name || "", guid: guid || "", mediaPath: mediaPath || "" };
  };

  // 특정 트랙의 Clip 아이템 수집
  const dumpTrackItems = async (track, clipTypeConst) => {
    const out = [];
    if (!track || typeof track.getTrackItems !== "function") return out;

    let itemsArr = [];
    try { itemsArr = await track.getTrackItems(clipTypeConst, false); } catch (_) {}
    if (!itemsArr || !itemsArr.length) return out;

    for (let i = 0; i < itemsArr.length; i++) {
      const it = itemsArr[i];

      const start = (it && typeof it.getStartTime === "function") ? await it.getStartTime() : null;
      const end   = (it && typeof it.getEndTime   === "function") ? await it.getEndTime()   : null;
      const dur   = (it && typeof it.getDuration  === "function") ? await it.getDuration()  : null;
      const inPt  = (it && typeof it.getInPoint   === "function") ? await it.getInPoint()   : null;
      const outPt = (it && typeof it.getOutPoint  === "function") ? await it.getOutPoint()  : null;

      const name = (it && typeof it.getName === "function") ? (await it.getName()) : "";
      const type = (it && typeof it.getType === "function") ? (await it.getType()) : "";
      const trackIndex = (it && typeof it.getTrackIndex === "function") ? (await it.getTrackIndex()) : -1;

      const disabled = (it && typeof it.isDisabled === "function") ? (await it.isDisabled()) : false;
      const isAdj = (it && typeof it.isAdjustmentLayer === "function") ? (await it.isAdjustmentLayer()) : false;
      const speed = (it && typeof it.getSpeed === "function") ? (await it.getSpeed()) : 100;
      const reversed = (it && typeof it.isSpeedReversed === "function") ? (await it.isSpeedReversed()) : false;

      let pi = null;
      try { if (it && typeof it.getProjectItem === "function") pi = await it.getProjectItem(); } catch (_) {}
      const source = await projectItemToSource(pi);

      out.push({
        name, type, trackIndex,
        isAdjustmentLayer: !!isAdj,
        disabled: !!disabled,
        speed: speed,
        reversed: !!reversed,
        seqStart: await tickToObj(start),
        seqEnd: await tickToObj(end),
        seqDuration: await tickToObj(dur),
        srcIn: await tickToObj(inPt),
        srcOut: await tickToObj(outPt),
        source,
      });
    }
    return out;
  };

  // === FPS/Timecode 유틸 ===
  const getActiveSequenceFps = async () => {
    try {
      const ppro = require("premierepro");
      const project = await ppro.Project.getActiveProject();
      if (!project || typeof project.getActiveSequence !== "function") return 30;
      const seq = await project.getActiveSequence();
      if (!seq) return 30;

      if (typeof seq.getFrameRate === "function") {
        try {
          const r = await seq.getFrameRate();
          if (typeof r === "number" && r > 0) return r;
          if (r && typeof r.numerator === "number" && typeof r.denominator === "number" && r.denominator !== 0) {
            return r.numerator / r.denominator;
          }
        } catch (_) {}
      }
      if (typeof seq.getTimebase === "function") {
        try {
          const tb = await seq.getTimebase();
          if (tb && tb.numerator && tb.denominator) {
            const secondsPerTick = tb.numerator / tb.denominator;
            if (secondsPerTick > 0) return 1 / secondsPerTick;
          }
        } catch (_) {}
      }
      if (typeof seq.getTicksPerFrame === "function") {
        try {
          const tpf = await seq.getTicksPerFrame();
          if (tpf && tpf > 0) {
            const fps = TICKS_PER_SECOND / tpf;
            if (fps > 0) return fps;
          }
        } catch (_) {}
      }
    } catch (_) {}
    return 30;
  };

  const isDropFrameRate = (fps) => {
    const close = (a, b) => Math.abs(a - b) < 0.01;
    return close(fps, 29.97) || close(fps, 59.94);
  };

  const ticksToFrames = (ticks, fps) => {
    const ticksPerFrame = TICKS_PER_SECOND / fps;
    return Math.round(ticks / ticksPerFrame);
  };

  const framesToTimecode = (totalFrames, fps, dropFrame) => {
    if (!dropFrame) {
      const hh = Math.floor(totalFrames / (fps * 3600));
      const mm = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
      const ss = Math.floor((totalFrames % (fps * 60)) / fps);
      const ff = totalFrames % Math.round(fps);
      return (
        String(hh).padStart(2, "0") + ":" +
        String(mm).padStart(2, "0") + ":" +
        String(ss).padStart(2, "0") + ":" +
        String(ff).padStart(2, "0")
      );
    }
    const roundFps = Math.round(fps);
    const dropFramesPerMinute = Math.round(2 * (roundFps / 30));
    const framesPerHour = roundFps * 60 * 60;
    const framesPer24Hours = framesPerHour * 24;
    const framesPer10Minutes = roundFps * 60 * 10;

    let f = totalFrames % framesPer24Hours;
    const d = Math.floor(f / framesPer10Minutes);
    const m = f % framesPer10Minutes;

    // 드롭 프레임 계산(간단화된 구현)
    const extra = dropFramesPerMinute * (d * 9 + Math.max(0, Math.floor((m - roundFps * 60) / (roundFps * 60))));
    let frames = f + extra;

    const hh = Math.floor(frames / framesPerHour);
    frames = frames % framesPerHour;
    const mm = Math.floor(frames / (roundFps * 60));
    frames = frames % (roundFps * 60);
    const ss = Math.floor(frames / roundFps);
    const ff = frames % roundFps;

    return (
      String(hh).padStart(2, "0") + ":" +
      String(mm).padStart(2, "0") + ":" +
      String(ss).padStart(2, "0") + ";" +
      String(ff).padStart(2, "0")
    );
  };

  const ticksToTimecode = async (ticks) => {
    if (!ticks || ticks <= 0) return "00:00:00:00";
    const fps = await getActiveSequenceFps();
    const df = isDropFrameRate(fps);
    const totalFrames = ticksToFrames(ticks, fps);
    return framesToTimecode(totalFrames, fps, df);
  };

  // === “현재 시퀀스 전체 타임라인 스냅샷 JSON” 생성 ===
  const dumpActiveSequence = async () => {
    try {
      const ppro = require("premierepro");
      if (!ppro || !ppro.Project || typeof ppro.Project.getActiveProject !== "function") {
        log("Premiere Pro UXP DOM (ppro.Project) is not available.");
        return null;
      }
      const project = await ppro.Project.getActiveProject();
      if (!project) { log("There is no active project found"); return null; }

      if (typeof project.getActiveSequence !== "function") { log("project.getActiveSequence is not available."); return null; }
      const sequence = await project.getActiveSequence();
      if (!sequence) { log("No active sequence."); return null; }

      const seqName = await val(sequence.name);
      const seqGuid = await val(sequence.guid);
      const inPoint = (typeof sequence.getInPoint === "function") ? await sequence.getInPoint() : null;
      const outPoint = (typeof sequence.getOutPoint === "function") ? await sequence.getOutPoint() : null;
      const endTime = (typeof sequence.getEndTime === "function") ? await sequence.getEndTime() : null;
      const zero = (typeof sequence.getZeroPoint === "function") ? await sequence.getZeroPoint() : null;
      const timebase = (typeof sequence.getTimebase === "function") ? await sequence.getTimebase() : undefined;

      let settings = null;
      try { if (typeof sequence.getSettings === "function") settings = await sequence.getSettings(); } catch (e) { log("sequence.getSettings() failed: " + e); }

      const vCount = (typeof sequence.getVideoTrackCount === "function") ? await sequence.getVideoTrackCount() : 0;
      const aCount = (typeof sequence.getAudioTrackCount === "function") ? await sequence.getAudioTrackCount() : 0;

      let clipTypeConst = 1;
      try {
        if (ppro && ppro.Constants && ppro.Constants.TrackItemType && typeof ppro.Constants.TrackItemType.Clip !== "undefined") {
          clipTypeConst = ppro.Constants.TrackItemType.Clip;
        }
      } catch (_) {}

      const videoTracks = [];
      for (let i = 0; i < Number(vCount || 0); i++) {
        let vt = null;
        try { if (typeof sequence.getVideoTrack === "function") vt = await sequence.getVideoTrack(i); } catch (_) {}
        if (!vt) continue;

        const idx = (typeof vt.getIndex === "function") ? await vt.getIndex() : i;
        const tname = await val(vt.name);
        const items = await dumpTrackItems(vt, clipTypeConst);

        videoTracks.push({ index: idx, name: tname || "", items });
      }

      const audioTracks = [];
      for (let i = 0; i < Number(aCount || 0); i++) {
        let at = null;
        try { if (typeof sequence.getAudioTrack === "function") at = await sequence.getAudioTrack(i); } catch (_) {}
        if (!at) continue;

        const idx = (typeof at.getIndex === "function") ? await at.getIndex() : i;
        const tname = await val(at.name);
        const items = await dumpTrackItems(at, clipTypeConst);

        audioTracks.push({ index: idx, name: tname || "", items });
      }

      // 마커
      let markers = [];
      try {
        if (ppro && ppro.Markers && typeof ppro.Markers.getMarkers === "function") {
          const markersObj = await ppro.Markers.getMarkers(sequence);
          if (markersObj && typeof markersObj.getMarkers === "function") {
            const arr = await markersObj.getMarkers();
            if (arr && arr.length) {
              for (let m of arr) {
                const mName = (m && typeof m.getName === "function") ? await m.getName() : "";
                const mStart = (m && typeof m.getStart === "function") ? await m.getStart() : null;
                const mDuration = (m && typeof m.getDuration === "function") ? await m.getDuration() : null;
                const mType = (m && typeof m.getType === "function") ? await m.getType() : "";
                const mColor = (m && typeof m.getColor === "function") ? await m.getColor() : null;
                const mComments = (m && typeof m.getComments === "function") ? await m.getComments() : "";
                const mUrl = (m && typeof m.getUrl === "function") ? await m.getUrl() : "";
                const mTarget = (m && typeof m.getTarget === "function") ? await m.getTarget() : "";

                let colorStr = "";
                try { if (mColor && typeof mColor.toString === "function") colorStr = await mColor.toString(); } catch (_) {}

                markers.push({
                  name: mName || "",
                  start: await tickToObj(mStart),
                  duration: await tickToObj(mDuration),
                  type: mType || "",
                  color: colorStr || "",
                  comments: mComments || "",
                  url: mUrl || "",
                  target: mTarget || "",
                });
              }
            }
          }
        }
      } catch (e) { log("Markers read failed: " + e); }

      return {
        sequence: {
          name: seqName || "",
          guid: seqGuid || "",
          timebase: timebase,
          zeroPoint: await tickToObj(zero),
          inPoint: await tickToObj(inPoint),
          outPoint: await tickToObj(outPoint),
          endTime: await tickToObj(endTime),
          settings: settings || null,
        },
        videoTracks,
        audioTracks,
        markers,
      };
    } catch (e) {
      log("[Error] dumpActiveSequence: " + e);
      return null;
    }
  };

  const makeTimelineSnapshotJSON = async () => {
    const snap = await dumpActiveSequence();
    if (!snap) {
      setSnapshotJson("");
      log("Timeline snapshot is empty.");
      return;
    }
    const text = JSON.stringify(snap, null, 2);
    setSnapshotJson(text);
    log("Timeline snapshot (JSON) is ready. Size: " + text.length + " chars");
  };

  const exportTimelineSnapshotJSON = async () => {
    try {
      if (!snapshotJson) await makeTimelineSnapshotJSON();
      const text = snapshotJson || "";
      if (!text) { log("No snapshot to export."); return; }

      const uxp = require("uxp");
      const storage = (uxp && uxp.storage) ? uxp.storage : null;
      if (!storage || !storage.localFileSystem) { log("UXP localFileSystem not available."); return; }

      const file = await storage.localFileSystem.getFileForSaving("timeline-snapshot.json");
      if (!file) { log("User cancelled."); return; }
      await file.write(text);
      log("Exported: timeline-snapshot.json");
    } catch (e) {
      log("[Error] exportTimelineSnapshotJSON: " + e);
    }
  };

  const copySnapshotToClipboard = async () => {
    try {
      if (!snapshotJson) { log("No snapshot to copy."); return; }
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(snapshotJson);
        log("Snapshot copied to clipboard.");
      } else {
        log("Clipboard API not available. You can select & copy from the text area.");
      }
    } catch (e) {
      log("[Error] copySnapshotToClipboard: " + e);
    }
  };

  // 1) 프로젝트/시퀀스 점검
  const populateApplicationInfo = async () => {
    try {
      const ppro = require("premierepro");
      if (!ppro || !ppro.Project || !ppro.Project.getActiveProject) {
        log("Premiere Pro UXP DOM (ppro.Project) is not available.");
        return;
      }
      const project = await ppro.Project.getActiveProject();
      if (!project) { log("There is no active project found"); return; }
      log("Active project: " + (project.name || "(Untitled)"));

      if (typeof project.getActiveSequence === "function") {
        const sequence = await project.getActiveSequence();
        if (!sequence) log("There is no active sequence found");
        else log("Active sequence: " + (sequence.name || "(Sequence)"));
      }
    } catch (e) {
      log("[Error] populateApplicationInfo: " + e);
    }
  };

  // 2) 루트 아이템 로드 + 타입 분류
  const openProjectItem = async () => {
    try {
      const ppro = require("premierepro");
      if (!ppro || !ppro.Project || !ppro.Project.getActiveProject) {
        log("Premiere Pro UXP DOM (ppro.Project) is not available.");
        return;
      }
      const project = await ppro.Project.getActiveProject();
      if (!project) { log("There is no active project found"); return; }

      const list = [];

      // (옵션) 시퀀스도 함께 리스트
      if (typeof project.getSequences === "function") {
        try {
          const sequences = await project.getSequences();
          if (Array.isArray(sequences)) {
            for (let i = 0; i < sequences.length; i++) {
              const seq = sequences[i];
              list.push({
                id: "seq_" + (seq.guid || i),
                name: seq.name || "(Sequence)",
                ref: seq,
                type: "sequence",
              });
            }
          }
        } catch (e) {
          log("getSequences failed: " + e);
        }
      }

      if (typeof project.getRootItem !== "function") {
        log("project.getRootItem is not available");
        return;
      }
      const root = await project.getRootItem();
      const rootItems = (root && typeof root.getItems === "function") ? await root.getItems() : [];
      if (!rootItems || rootItems.length === 0) {
        setItems([]); setSelectedIndex(-1); setSelectedPath("");
        log("There are no project items found");
        return;
      }

      for (let i = 0; i < rootItems.length; i++) {
        const ref = rootItems[i];
        let name = "(no-name)";
        if (ref && typeof ref.name === "string") name = ref.name;
        else if (ref && typeof ref.getName === "function") {
          try { name = await ref.getName(); } catch (_) {}
        }

        // clip / sequence / folder 분류
        let type = "folder";
        try {
          if (ppro.ClipProjectItem && typeof ppro.ClipProjectItem.cast === "function") {
            const clip = await ppro.ClipProjectItem.cast(ref);
            if (clip) {
              let isSeq = false;
              try { if (typeof clip.isSequence === "function") isSeq = await clip.isSequence(); } catch (_) {}
              type = isSeq ? "sequence" : "clip";
            }
          }
        } catch (_) {
          // cast 실패 → folder로 둠
        }

        list.push({ id: "pi_" + i, name, ref, type });
      }

      setItems(list);
      setSelectedIndex(-1);
      setSelectedPath("");
      log("Loaded items: " + list.length);
    } catch (e) {
      log("[Error] openProjectItem: " + e);
    }
  };

  // 공통: ClipProjectItem → 경로 해석 (프록시 → mediaFilePath → mediaPath)
  const resolvePathFromClip = async (clip, label) => {
    try {
      if (!clip) return "";
      let isSeq = false, isOffline = false, hasProxy = false;

      try { if (typeof clip.isSequence === "function") isSeq = await clip.isSequence(); } catch (_) {}
      try { if (typeof clip.isOffline === "function")  isOffline = await clip.isOffline(); } catch (_) {}
      try { if (typeof clip.hasProxy === "function")   hasProxy = await clip.hasProxy(); } catch (_) {}

      log((label || "Clip") + " — isSequence:" + isSeq + " isOffline:" + isOffline + " hasProxy:" + hasProxy);
      if (isSeq) return "";
      if (isOffline) return "";

      if (preferProxy && hasProxy && typeof clip.getProxyPath === "function") {
        try {
          const p = await clip.getProxyPath();
          if (p) { log("[Proxy] " + (label || "clip") + " -> " + p); return p; }
        } catch (e) { log("getProxyPath failed: " + e); }
      }
      if (typeof clip.getMediaFilePath === "function") {
        try {
          const p = await clip.getMediaFilePath();
          if (p) { log("[MediaFilePath] " + (label || "clip") + " -> " + p); return p; }
        } catch (e) { log("getMediaFilePath failed: " + e); }
      }
      if (typeof clip.getMediaPath === "function") {
        try {
          const p = await clip.getMediaPath();
          if (p) { log("[MediaPath] " + (label || "clip") + " -> " + p); return p; }
        } catch (e) { log("getMediaPath failed: " + e); }
      }
      return "";
    } catch (e) {
      log("[Error] resolvePathFromClip: " + e);
      return "";
    }
  };

  // 3) 리스트에서 선택된 항목의 경로 해석
  const resolveSelectedMediaPath = async () => {
    try {
      if (selectedIndex < 0 || selectedIndex >= items.length) { log("Select an item first."); return; }
      const ppro = require("premierepro");
      if (!ppro || !ppro.ClipProjectItem || typeof ppro.ClipProjectItem.cast !== "function") {
        log("ClipProjectItem API not available.");
        return;
      }
      const row = items[selectedIndex];

      if (row.type === "folder") { setSelectedPath(""); log("Selected item is a folder/bin. Choose a clip."); return; }
      if (row.type === "sequence") { setSelectedPath(""); log("Selected item is a sequence. Choose a clip."); return; }

      const clip = await ppro.ClipProjectItem.cast(row.ref);
      if (!clip) { setSelectedPath(""); log("Cannot cast to ClipProjectItem (maybe not a clip)."); return; }

      const mediaPath = await resolvePathFromClip(clip, "ListSelection");
      if (!mediaPath) { setSelectedPath(""); log("No media path found for selected item."); return; }
      setSelectedPath(mediaPath);
      log("Resolved media path: " + mediaPath);
    } catch (e) {
      log("[Error] resolveSelectedMediaPath: " + e);
    }
  };

  // === 타임라인 선택에서 경로 해석 + 타임코드 출력 ===
  const resolveFromTimelineSelection = async () => {
    try {
      const ppro = require("premierepro");
      if (!ppro || !ppro.Project || typeof ppro.Project.getActiveProject !== "function") {
        log("Premiere Pro UXP DOM (ppro.Project) is not available.");
        return;
      }
      const project = await ppro.Project.getActiveProject();
      if (!project) { log("There is no active project found"); return; }

      if (typeof project.getActiveSequence !== "function") { log("project.getActiveSequence is not available."); return; }
      const seq = await project.getActiveSequence();
      if (!seq) { log("No active sequence."); return; }

      if (typeof seq.getSelection !== "function") { log("Sequence.getSelection API not available."); return; }
      const selection = await seq.getSelection();

      let trackItems = [];
      if (selection && typeof selection.getTrackItems === "function") {
        try { trackItems = await selection.getTrackItems(); } catch (e) {}
      } else if (selection && typeof selection.getItems === "function") {
        try { trackItems = await selection.getItems(); } catch (e) {}
      } else if (selection && selection.items) {
        trackItems = selection.items;
      }
      if (!trackItems || trackItems.length === 0) { log("No track items selected in timeline."); return; }

      const fps = await getActiveSequenceFps();
      const df = isDropFrameRate(fps);
      log("Timeline selection count: " + trackItems.length + " (fps=" + fps.toFixed(3) + ", dropFrame=" + df + ")");

      for (let i = 0; i < trackItems.length; i++) {
        const ti = trackItems[i];

        const start = (ti && typeof ti.getStartTime === "function") ? await ti.getStartTime() : null;
        const end   = (ti && typeof ti.getEndTime === "function")   ? await ti.getEndTime()   : null;
        const inPt  = (ti && typeof ti.getInPoint === "function")   ? await ti.getInPoint()   : null;
        const outPt = (ti && typeof ti.getOutPoint === "function")  ? await ti.getOutPoint()  : null;
        const trackIdx = (ti && typeof ti.getTrackIndex === "function") ? await ti.getTrackIndex() : -1;

        const startTC = (start && start.ticks) ? await ticksToTimecode(start.ticks) : "--:--:--:--";
        const endTC   = (end && end.ticks) ? await ticksToTimecode(end.ticks) : "--:--:--:--";
        const inTC    = (inPt && inPt.ticks) ? await ticksToTimecode(inPt.ticks) : "--:--:--:--";
        const outTC   = (outPt && outPt.ticks) ? await ticksToTimecode(outPt.ticks) : "--:--:--:--";

        const projItem = (ti && typeof ti.getProjectItem === "function") ? await ti.getProjectItem() : null;
        let clip = null;
        if (projItem && ppro.ClipProjectItem && typeof ppro.ClipProjectItem.cast === "function") {
          try { clip = await ppro.ClipProjectItem.cast(projItem); } catch (_) {}
        }
        const path = clip ? await resolvePathFromClip(clip, "Timeline[" + i + "]") : "";

        const key = String(trackIdx) + "_" + String((start && start.ticks) || 0) + "_" + String((end && end.ticks) || 0);

        log(
          "#" + i +
          " key=" + key +
          " | track=" + trackIdx +
          " | seqStart=" + (start && start.ticks ? start.ticks : "-") + " (" + startTC + ")" +
          " | seqEnd=" + (end && end.ticks ? end.ticks : "-") + " (" + endTC + ")" +
          " | srcIn=" + (inPt && inPt.ticks ? inPt.ticks : "-") + " (" + inTC + ")" +
          " | srcOut=" + (outPt && outPt.ticks ? outPt.ticks : "-") + " (" + outTC + ")" +
          " | path=" + (path || "-")
        );

        if (i === 0 && path) setSelectedPath(path);
      }
    } catch (e) {
      log("[Error] resolveFromTimelineSelection: " + e);
    }
  };

  // 4) 업로드 대상 경로 피커 (샘플) — 필요시 유지
  const chooseUploadTargetSample = async () => {
    try {
      const uxp = require("uxp");
      const storage = (uxp && uxp.storage) ? uxp.storage : null;
      if (!storage || !storage.localFileSystem) { log("UXP localFileSystem not available."); return; }
      const f = await storage.localFileSystem.getFileForSaving("upload-dummy.txt");
      if (!f) { log("User cancelled picker."); return; }
      const chosen = f.nativePath ? f.nativePath : (f.name || "(unknown)");
      log("(Sample) Target save path chosen: " + chosen);
    } catch (e) {
      log("[Error] chooseUploadTargetSample: " + e);
    }
  };

  // ===== 파일 읽기 → Uint8Array =====
  const readFileAsUint8 = async (path) => {
    const fs = require("fs");
    if (!fs || typeof fs.readFile !== "function") throw new Error("UXP fs API is not available.");
    const data = await fs.readFile(path);
    if (data && typeof data.byteLength === "number") return new Uint8Array(data);
    if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) return new Uint8Array(data);
    if (data instanceof Uint8Array) return data;
    if (typeof data === "string") return new TextEncoder().encode(data);
    throw new Error("Unsupported data type from fs.readFile");
  };

  // 업로드: 바이너리
  const uploadBinary = async () => {
    try {
      if (!selectedPath) { log("No resolved media path. Resolve first."); return; }
      if (!UPLOAD_URL) { log("UPLOAD_URL is empty."); return; }

      const bytes = await readFileAsUint8(selectedPath);
      const fileName = selectedPath.split(/[\\/]/).pop() || "media";
      log("Uploading (binary): " + fileName + ", " + bytes.byteLength + " bytes");

      const headers = { "Content-Type": "application/octet-stream" };
      if (AUTH_TOKEN) headers["Authorization"] = "Bearer " + AUTH_TOKEN;

      const doFetch = (typeof mediacoreBackend !== "undefined" && mediacoreBackend && typeof mediacoreBackend.fetch === "function")
        ? mediacoreBackend.fetch
        : fetch;

      const resp = await doFetch(UPLOAD_URL, {
        method: "POST",
        headers: headers,
        body: bytes,
      });
      const text = await (resp && typeof resp.text === "function" ? resp.text() : Promise.resolve("")).catch(function(){ return ""; });

      log("Upload (binary) status: " + resp.status);
      if (text) log("Server response: " + text);
      if (!resp.ok) throw new Error("Upload failed with status " + resp.status);
      log("Upload (binary) done.");
    } catch (e) {
      log("[Error] uploadBinary: " + e);
    }
  };

  // 업로드: 멀티파트
  const uploadMultipart = async () => {
    try {
      if (!selectedPath) { log("No resolved media path. Resolve first."); return; }
      if (!UPLOAD_URL) { log("UPLOAD_URL is empty."); return; }

      const bytes = await readFileAsUint8(selectedPath);
      const fileName = selectedPath.split(/[\\/]/).pop() || "media";
      const blob = new Blob([bytes], { type: "application/octet-stream" });

      const form = new FormData();
      form.append(FORM_FIELD_NAME, blob, fileName);
      form.append("source", "Premiere-UXP");
      form.append("originalPath", selectedPath);

      const headers = {};
      if (AUTH_TOKEN) headers["Authorization"] = "Bearer " + AUTH_TOKEN;

      const doFetch = (typeof mediacoreBackend !== "undefined" && mediacoreBackend && typeof mediacoreBackend.fetch === "function")
        ? mediacoreBackend.fetch
        : fetch;

      const resp = await doFetch(UPLOAD_URL, {
        method: "POST",
        headers: headers,
        body: form,
      });
      const text = await (resp && typeof resp.text === "function" ? resp.text() : Promise.resolve("")).catch(function(){ return ""; });

      log("Upload (multipart) status: " + resp.status);
      if (text) log("Server response: " + text);
      if (!resp.ok) throw new Error("Upload failed with status " + resp.status);
      log("Upload (multipart) done.");
    } catch (e) {
      log("[Error] uploadMultipart: " + e);
    }
  };

  const prepareNetworkUploadExample = async () => {
    try {
      if (!selectedPath) { log("No resolved media path. Resolve first."); return; }
      const uploadInfo = {
        url: UPLOAD_URL,
        method: "POST",
        headers: { "X-Source": "Premiere-UXP" },
        meta: {
          filePath: selectedPath,
          fileName: selectedPath.split(/[\\/]/).pop() || "media",
        },
      };
      log("Upload call is ready (metadata only):");
      log(JSON.stringify(uploadInfo, null, 2));
    } catch (e) {
      log("[Error] prepareNetworkUploadExample: " + e);
    }
  };

  const clearApplicationInfo = async () => {
    try { if (props && typeof props.clearConsole === "function") props.clearConsole(); } catch (_) {}
    setItems([]); setSelectedIndex(-1); setSelectedPath("");
    setSnapshotJson("");
  };

  // 새 시퀀스 만들기 (프리셋 경로 사용)
  const createEmptySequenceWithPreset = async () => {
    try {
      const ppro = require("premierepro");
      const project = await ppro.Project.getActiveProject();
      if (!project) { log("No active project."); return null; }

      let seq = null;
      if (typeof project.createSequenceWithPresetPath === "function") {
        seq = await project.createSequenceWithPresetPath(newSequenceName, presetPath);
      } else if (typeof project.createSequence === "function") {
        seq = await project.createSequence(newSequenceName, presetPath);
      } else {
        throw new Error("No sequence creation API available.");
      }
      log("Created sequence: " + (seq && seq.name ? seq.name : "(Unnamed)"));
      return seq;
    } catch (e) {
      log("[Error] createEmptySequenceWithPreset: " + e);
      return null;
    }
  };

  // 선택된 클립으로부터 시퀀스 만들기 (원본 기반 시퀀스)
  const createSequenceFromSelectedClip = async () => {
    try {
      if (selectedIndex < 0 || selectedIndex >= items.length) {
        log("Select a clip item first (not a folder/sequence).");
        return null;
      }
      const ppro = require("premierepro");
      const row = items[selectedIndex];
      if (row.type !== "clip") { log("Selected item is not a clip."); return null; }

      if (!(ppro && ppro.ClipProjectItem && typeof ppro.ClipProjectItem.cast === "function")) { log("ClipProjectItem API not available."); return null; }
      const clip = await ppro.ClipProjectItem.cast(row.ref);
      if (!clip) { log("Cannot cast to ClipProjectItem."); return null; }

      const project = await ppro.Project.getActiveProject();
      if (!project) { log("No active project."); return null; }

      if (typeof project.createSequenceFromMedia !== "function") {
        log("createSequenceFromMedia is not available. Fallback to empty sequence preset.");
        return await createEmptySequenceWithPreset();
      }
      const seq = await project.createSequenceFromMedia(newSequenceName, [clip], null);
      log("Created sequence from media: " + (seq && seq.name ? seq.name : "(Unnamed)"));
      return seq;
    } catch (e) {
      log("[Error] createSequenceFromSelectedClip: " + e);
      return null;
    }
  };

  // TickTime 생성
  const tt = {
    fromSeconds: async (sec) => {
      const ppro = require("premierepro");
      if (!(ppro && ppro.TickTime && typeof ppro.TickTime.createWithSeconds === "function")) throw new Error("TickTime.createWithSeconds not available.");
      return await ppro.TickTime.createWithSeconds(Number(sec) || 0);
    }
  };

  // MOGRT 삽입 + 파라미터 설정(제목/설명)
  const insertMogrtBlock = async (editor, seg, opts) => {
    opts = opts || {};
    const mPath = opts.hasOwnProperty("mogrtPath") ? opts.mogrtPath : undefined;
    const vTrack = opts.hasOwnProperty("vTrack") ? opts.vTrack : 1;
    const aTrack = opts.hasOwnProperty("aTrack") ? opts.aTrack : 0;
    const pTitle = opts.hasOwnProperty("pTitle") ? opts.pTitle : 0;
    const pDesc  = opts.hasOwnProperty("pDesc")  ? opts.pDesc  : 1;

    const tIn  = await tt.fromSeconds(seg.startSec);
    const tOut = await tt.fromSeconds(seg.endSec);

    if (typeof editor.insertMogrtFromPath !== "function") {
      throw new Error("SequenceEditor.insertMogrtFromPath is not available.");
    }

    const inserted = await editor.insertMogrtFromPath(mPath, tIn, vTrack, aTrack);
    if (!Array.isArray(inserted) || inserted.length === 0) {
      throw new Error("insertMogrtFromPath failed to return items.");
    }
    const g = inserted[0];

    if (g && typeof g.setEndTime === "function") {
      try { await g.setEndTime(tOut); } catch (_) {}
    }

    if (!g || typeof g.getComponentChain !== "function") {
      log("Graphic item has no getComponentChain(). Skip param mapping.");
      return;
    }
    const chain = await g.getComponentChain();
    if (!chain || typeof chain.getComponentAtIndex !== "function") {
      log("No component chain. Skip param mapping.");
      return;
    }
    const comp = await chain.getComponentAtIndex(0);
    if (!comp || typeof comp.getParam !== "function") {
      log("No component or getParam(). Skip param mapping.");
      return;
    }

    const titleParam = await comp.getParam(pTitle);
    const descParam  = await comp.getParam(pDesc);

    const ppro = require("premierepro");
    const project = await ppro.Project.getActiveProject();

    if (project && typeof project.executeTransaction === "function") {
      await project.executeTransaction(function (tx) {
        if (titleParam && titleParam.createKeyframe && titleParam.createSetValueAction) {
          const k1 = titleParam.createKeyframe(String(seg.title != null ? seg.title : ""));
          tx.addAction(titleParam.createSetValueAction(k1, true));
        }
        if (descParam && descParam.createKeyframe && descParam.createSetValueAction) {
          const k2 = descParam.createKeyframe(String(seg.desc != null ? seg.desc : ""));
          tx.addAction(descParam.createSetValueAction(k2, true));
        }
      }, "Set subtitle for " + String(seg.title != null ? seg.title : ""));
    } else {
      log("project.executeTransaction not available. Parameters not set as keyframes.");
    }
  };

  const getTopVideoTrackIndex = async (editor) => {
    try {
      if (typeof editor.getVideoTrackCount === "function") {
        const n = await editor.getVideoTrackCount();
        if (Number.isFinite(n) && n > 0) return n - 1;
      }
    } catch (_) {}

    const candidates = [7, 6, 5, 4, 3, 2, 1, 0];
    for (let c = 0; c < candidates.length; c++) {
      const idx = candidates[c];
      try {
        if (typeof editor.hasVideoTrackAt === "function") {
          const ok = await editor.hasVideoTrackAt(idx);
          if (ok) return idx;
        }
      } catch (_) {}
    }
    return 1;
  };

  const buildReviewSequenceWithOriginal = async () => {
    try {
      if (segments.length === 0) { log("Segments are empty."); return; }
      const seq = await createSequenceFromSelectedClip();
      if (!seq) { log("Failed to create sequence from clip."); return; }
      const ppro = require("premierepro");
      const editor = await ppro.SequenceEditor.getEditor(seq);
      if (!editor) { log("Cannot get SequenceEditor."); return; }

      let topV = await getTopVideoTrackIndex(editor);
      if (topV <= 0) {
        log("⚠️ Sequence may only have V1. If insertion fails, prepare a preset with V2+ or add a track manually.");
      }

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        try {
          await insertMogrtBlock(editor, seg, {
            mogrtPath,
            vTrack: Number.isFinite(topV) ? topV : 1,
            aTrack: Number(audioTrackIndexForMogrt),
            pTitle: Number(paramIndexTitle),
            pDesc:  Number(paramIndexDesc),
          });
        } catch (e) {
          if (topV > 0) {
            try {
              log("Top track V" + topV + " failed. Fallback to V" + (topV - 1));
              await insertMogrtBlock(editor, seg, {
                mogrtPath,
                vTrack: topV - 1,
                aTrack: Number(audioTrackIndexForMogrt),
                pTitle: Number(paramIndexTitle),
                pDesc:  Number(paramIndexDesc),
              });
            } catch (e2) {
              log("[Error] insert on top and fallback failed: " + e2);
            }
          } else {
            log("[Error] insert on V" + topV + " failed: " + e);
          }
        }
      }
      log("Done: Review sequence with ORIGINAL + topmost-track MOGRT overlays.");
    } catch (e) {
      log("[Error] buildReviewSequenceWithOriginal: " + e);
    }
  };

  const buildReportSequenceWithBlackBg = async () => {
    try {
      if (segments.length === 0) { log("Segments are empty."); return; }
      const seq = await createEmptySequenceWithPreset();
      if (!seq) { log("Failed to create empty sequence."); return; }
      const ppro = require("premierepro");
      const editor = await ppro.SequenceEditor.getEditor(seq);
      if (!editor) { log("Cannot get SequenceEditor."); return; }

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        await insertMogrtBlock(editor, seg, {
          mogrtPath,
          vTrack: Number(videoTrackIndexForMogrt),
          aTrack: Number(audioTrackIndexForMogrt),
          pTitle: Number(paramIndexTitle),
          pDesc:  Number(paramIndexDesc),
        });
      }
      log("Done: Report sequence with BLACK-BG MOGRT blocks.");
    } catch (e) {
      log("[Error] buildReportSequenceWithBlackBg: " + e);
    }
  };

  // ======== UI ========
  return (
    <sp-body>
      <div className="plugin-footer">
        {/* 상단 컨트롤 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <sp-button onClick={populateApplicationInfo}>Populate Application Info</sp-button>
          <sp-button onClick={openProjectItem}>Load Root Items</sp-button>
          <sp-button onClick={clearApplicationInfo}>Clear</sp-button>
        </div>

        {/* 루트 아이템 리스트 */}
        <div style={{ border: "1px solid #333", borderRadius: 6, padding: 8, maxHeight: 220, overflow: "auto", marginTop: 8 }}>
          {items.length === 0 ? (
            <sp-field-label>No items. Click “Load Root Items”.</sp-field-label>
          ) : (
            <div>
              {items.map(function (row, idx) {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={row.id}
                    onClick={function () {
                      log("Selected item index: " + idx);
                      setSelectedIndex(idx);
                      setSelectedPath("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 4px",
                      cursor: "pointer",
                      borderRadius: 6,
                      background: isSelected ? "#2b2b2b" : "transparent",
                      outline: isSelected ? "1px solid #4c4c4c" : "1px solid transparent",
                    }}
                  >
                    <sp-radio
                      emphasized={isSelected ? "" : undefined}
                      aria-checked={isSelected ? "true" : "false"}
                      value={String(idx)}
                    >
                      {row.name} <small>({row.type})</small>
                    </sp-radio>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 경로 해석 & 업로드 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <sp-button variant="primary" onClick={resolveSelectedMediaPath}>Resolve Media Path</sp-button>
          <sp-button onClick={resolveFromTimelineSelection}>Resolve From Timeline Selection</sp-button>

          <sp-divider size="m" vertical></sp-divider>

          <sp-checkbox
            checked={preferProxy}
            onChange={function () { setPreferProxy(!preferProxy); }}
          >
            Prefer Proxy (if available)
          </sp-checkbox>

          <sp-divider size="m" vertical></sp-divider>

          <sp-button onClick={prepareNetworkUploadExample}>Prepare Upload (meta)</sp-button>
          <sp-button onClick={chooseUploadTargetSample} quiet>(Sample) Choose Target Path</sp-button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <sp-button onClick={uploadBinary} quiet>Upload (binary)</sp-button>
          <sp-button onClick={uploadMultipart} quiet>Upload (multipart)</sp-button>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 6, padding: 8, marginTop: 8 }}>
          <sp-field-label>Resolved Local Path</sp-field-label>
          <sp-body>{selectedPath || "-"}</sp-body>
        </div>

        {/* ====================== 세그먼트/MOGRT/시퀀스 생성 ====================== */}
        <div style={{ border: "1px solid #444", borderRadius: 8, padding: 10, marginTop: 12 }}>
          <sp-heading size="s">Scene Split → Sequence & Subtitles</sp-heading>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <sp-button onClick={function(){ setSegments(DEFAULT_SEGMENTS.slice()); log("Loaded hardcoded segments: " + DEFAULT_SEGMENTS.length); }}>
              Load Hardcoded Segments
            </sp-button>
            <sp-field-label>Current segments: {segments.length}</sp-field-label>
          </div>

          <div style={{gap: 8, marginTop: 8, alignItems: "center" }}>
            <sp-field-label>New Sequence Name</sp-field-label>
            <sp-textfield value={newSequenceName} onInput={function(e){ setNewSequenceName((e && e.target) ? e.target.value : ""); }} placeholder="SceneReview"></sp-textfield>

            <sp-field-label>Sequence Preset (.sqpreset)</sp-field-label>
            <sp-textfield value={presetPath} onInput={function(e){ setPresetPath((e && e.target) ? e.target.value : ""); }} placeholder="/path/to/V3A2.sqpreset"></sp-textfield>

            <sp-field-label>MOGRT Path</sp-field-label>
            <sp-textfield value={mogrtPath} onInput={function(e){ setMogrtPath((e && e.target) ? e.target.value : ""); }} placeholder="/path/to/subtitle_block.mogrt"></sp-textfield>

            <sp-field-label>Video Track Index (for Black BG build)</sp-field-label>
            <sp-number-field value={String(videoTrackIndexForMogrt)} onInput={function(e){ setVideoTrackIndexForMogrt(Number((e && e.target) ? e.target.value : 1)); }} min="0"></sp-number-field>

            <sp-field-label>Audio Track Index</sp-field-label>
            <sp-number-field value={String(audioTrackIndexForMogrt)} onInput={function(e){ setAudioTrackIndexForMogrt(Number((e && e.target) ? e.target.value : 0)); }} min="-1"></sp-number-field>

            <sp-field-label>MOGRT Param Index (Title)</sp-field-label>
            <sp-number-field value={String(paramIndexTitle)} onInput={function(e){ setParamIndexTitle(Number((e && e.target) ? e.target.value : 0)); }} min="0"></sp-number-field>

            <sp-field-label>MOGRT Param Index (Desc)</sp-field-label>
            <sp-number-field value={String(paramIndexDesc)} onInput={function(e){ setParamIndexDesc(Number((e && e.target) ? e.target.value : 1)); }} min="0"></sp-number-field>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <sp-button variant="primary" onClick={buildReviewSequenceWithOriginal}>
              Make Review Sequence (Original + MOGRT on Topmost Track)
            </sp-button>
            <sp-button onClick={buildReportSequenceWithBlackBg}>
              Make Report Sequence (Black BG MOGRT)
            </sp-button>
          </div>

          <sp-detail>
            안내: <br/>
            • <b>Original + MOGRT</b>: 목록에서 <i>클립</i>을 선택한 뒤 실행하세요. 선택 클립으로 시퀀스를 만들고, <b>실제 존재하는 최상위 비디오 트랙</b>에 MOGRT 자막을 배치합니다. <br/>
            • <b>Black BG MOGRT</b>: 프리셋으로 빈 시퀀스를 만든 뒤, (검은 배경 포함) MOGRT만으로 세그먼트 구간을 채웁니다. <br/>
            • 파라미터 인덱스는 템플릿마다 달라요. 텍스트 파라미터 순서에 맞춰 <i>Title/Desc</i> 인덱스를 조정하세요.
          </sp-detail>
        </div>
        {/* ====================== 세그먼트 영역 끝 ====================== */}

        {/* ====================== 타임라인 스냅샷(JSON) 생성/보기/Export ====================== */}
        <div style={{ border: "1px solid #444", borderRadius: 8, padding: 10, marginTop: 12 }}>
          <sp-heading size="s">Timeline Snapshot (JSON)</sp-heading>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <sp-button variant="primary" onClick={makeTimelineSnapshotJSON}>Snapshot Timeline (JSON)</sp-button>
            <sp-button onClick={exportTimelineSnapshotJSON}>Export JSON to File</sp-button>
            <sp-button onClick={copySnapshotToClipboard} quiet>Copy JSON</sp-button>
          </div>
          <div style={{ marginTop: 8 }}>
            <sp-field-label>Preview</sp-field-label>
            <textarea
              readOnly
              value={snapshotJson}
              placeholder="Click “Snapshot Timeline (JSON)” to generate."
              style={{
                width: "100%",
                minHeight: 240,
                background: "#1f1f1f",
                color: "#ddd",
                border: "1px solid #333",
                borderRadius: 6,
                padding: 8,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 12,
                lineHeight: "1.4",
                resize: "vertical",
              }}
              onChange={function(){}}
            />
          </div>
        </div>
        {/* ====================== 스냅샷 영역 끝 ====================== */}
      </div>
    </sp-body>
  );
};
