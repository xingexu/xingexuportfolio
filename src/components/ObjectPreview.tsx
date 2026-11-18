"use client";

import { useEffect, useRef } from "react";
import { LinearSRGBColorSpace, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { buildModel } from "@/lib/journey/models";
import { gridGeometry } from "@/lib/journey/mesh";

/** A slowly turning close-up of one voxel model, drawn with the same whole-pixel scaling as the world. */
export default function ObjectPreview({ model, label }: { model: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true }); } catch { return; }
    renderer.outputColorSpace = LinearSRGBColorSpace;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    renderer.setPixelRatio(1);
    const PIXEL = 3;
    let width = 160, height = 100;
    const camera = new PerspectiveCamera(32, width / height, 0.5, 1000);
    const fit = () => {
      const available = canvas.parentElement?.clientWidth ?? 480;
      width = Math.max(60, Math.floor(available / PIXEL)); height = Math.round(width * 0.6);
      renderer.setSize(width, height, false);
      canvas.style.width = `${width * PIXEL}px`; canvas.style.height = `${height * PIXEL}px`;
      camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    fit();
    const observer = new ResizeObserver(() => { fit(); if (motion.matches) draw(performance.now()); });
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    const grid = buildModel(model), b = grid.bounds();
    const geometry = gridGeometry(grid, [-(b.minX + b.maxX + 1) / 2, -(b.minY + b.maxY + 1) / 2, -(b.minZ + b.maxZ + 1) / 2]);
    const material = new MeshBasicMaterial({ vertexColors: true });
    const mesh = new Mesh(geometry, material);
    const scene = new Scene();
    scene.add(mesh);
    const radius = Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) + 1;
    const distance = radius * 1.9;
    let frame = 0, angle = 0.5, previous = performance.now();
    function draw(now: number) {
      if (!motion.matches) angle += Math.min(0.05, (now - previous) / 1000) * 0.6;
      previous = now;
      camera.position.set(Math.sin(angle) * distance, distance * 0.55, Math.cos(angle) * distance);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (!motion.matches) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); geometry.dispose(); material.dispose(); renderer.dispose(); };
  }, [model]);
  return <figure className="journey-preview"><canvas ref={canvasRef} width={160} height={100} role="img" aria-label={`Voxel close-up of the ${label}`} /></figure>;
}
