"use client";

import { useEffect, useRef } from "react";
import { LinearSRGBColorSpace, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { buildModel, GLASS_OPACITY, isGlass, modelHasGlass, modelVoxelSize } from "@/lib/journey/models";
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
    const PIXEL = 2;
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
    const grid = buildModel(model), b = grid.bounds(), s = modelVoxelSize(model), glass = modelHasGlass(model);
    const center: [number, number, number] = [-(b.minX + b.maxX + 1) * s / 2, -(b.minY + b.maxY + 1) * s / 2, -(b.minZ + b.maxZ + 1) * s / 2];
    const mesh = new Mesh(gridGeometry(grid, center, 0.035, s, glass ? color => !isGlass(color) : undefined), new MeshBasicMaterial({ vertexColors: true }));
    const pane = glass ? new Mesh(gridGeometry(grid, center, 0.035, s, isGlass), new MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: GLASS_OPACITY, depthWrite: false,
    })) : null;
    const scene = new Scene();
    scene.add(mesh);
    if (pane) scene.add(pane);
    const radius = Math.hypot(b.maxX - b.minX + 1, b.maxY - b.minY + 1, b.maxZ - b.minZ + 1) * s / 2;
    const elevation = 0.38, distance = radius * 1.04 / Math.sin(camera.fov * Math.PI / 360);
    let frame = 0, angle = 0.5, previous = performance.now();
    function draw(now: number) {
      if (!motion.matches) angle += Math.min(0.05, (now - previous) / 1000) * 0.6;
      previous = now;
      camera.position.set(Math.sin(angle) * distance * Math.cos(elevation), distance * Math.sin(elevation), Math.cos(angle) * distance * Math.cos(elevation));
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (!motion.matches) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      mesh.geometry.dispose(); mesh.material.dispose();
      pane?.geometry.dispose(); pane?.material.dispose();
      renderer.dispose();
    };
  }, [model]);
  return <figure className="journey-preview"><canvas ref={canvasRef} width={160} height={100} role="img" aria-label={`Voxel close-up of the ${label}`} /></figure>;
}
