"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// MediaRecorder fallback for browsers without the Web Speech API (iOS Safari,
// older WebViews). Records up to 45s of audio and returns a base64 string that
// the server transcribes (Whisper) via the existing /api/chat audioBase64 path.
const MAX_MS = 45_000;

export function useVoiceNote() {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function"
    );
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(async (): Promise<string | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return new Promise<string | null>((resolve) => {
      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : null;
          resolve(dataUrl ? dataUrl.split(",")[1] ?? null : null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });
  }, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      let mime = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mime)) mime = "audio/webm";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mime)) mime = "audio/mp4";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => setError("Recording failed — try again.");
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_MS / 1000) void stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setRecording(false);
      setError("Microphone unavailable. Check browser permissions and try again.");
    }
  }, [stop]);

  const cancel = useCallback(() => {
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    cleanup();
    chunksRef.current = [];
    setElapsed(0);
  }, [cleanup]);

  return { supported, recording, elapsed, error, start, stop, cancel };
}