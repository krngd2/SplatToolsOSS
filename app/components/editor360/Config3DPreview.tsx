'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { FrameView } from '@/hooks/useEditor360';

interface Config3DPreviewProps {
    frameViews: FrameView[];
    activeFrameViewId: string | null;
    size?: number;
}

/**
 * Clean 3D Preview showing camera frustums for each frame view
 * Manually rotatable by dragging
 */
export default function Config3DPreview({
    frameViews,
    activeFrameViewId,
    size = 180
}: Config3DPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        frustumGroup: THREE.Group;
    } | null>(null);

    // Camera orbit state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; cameraAngle: number; cameraY: number } | null>(null);
    const cameraAngleRef = useRef(0.5); // Initial angle
    const cameraYRef = useRef(2);

    // Initialize Three.js scene once
    useEffect(() => {
        if (!containerRef.current || sceneRef.current) return;

        const container = containerRef.current;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x111827, 1);
        container.appendChild(renderer.domElement);

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        updateCameraPosition(camera, cameraAngleRef.current, cameraYRef.current);

        // Subtle ground grid
        const gridHelper = new THREE.GridHelper(3, 6, 0x374151, 0x1f2937);
        gridHelper.position.y = -0.8;
        scene.add(gridHelper);

        // Container for frustums
        const frustumGroup = new THREE.Group();
        scene.add(frustumGroup);

        sceneRef.current = { renderer, scene, camera, frustumGroup };

        // Initial render
        renderer.render(scene, camera);

        return () => {
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            sceneRef.current = null;
        };
    }, [size]);

    // Update camera position helper
    function updateCameraPosition(camera: THREE.PerspectiveCamera, angle: number, y: number) {
        const radius = 3.5;
        camera.position.x = Math.cos(angle) * radius;
        camera.position.z = Math.sin(angle) * radius;
        camera.position.y = y;
        camera.lookAt(0, 0, 0);
    }

    // Re-render when dragging updates camera
    const render = () => {
        if (!sceneRef.current) return;
        const { renderer, scene, camera } = sceneRef.current;
        updateCameraPosition(camera, cameraAngleRef.current, cameraYRef.current);
        renderer.render(scene, camera);
    };

    // Handle drag events
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            cameraAngleRef.current = dragStartRef.current.cameraAngle + dx * 0.01;
            cameraYRef.current = Math.max(0.5, Math.min(4, dragStartRef.current.cameraY - dy * 0.02));

            render();
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            cameraAngle: cameraAngleRef.current,
            cameraY: cameraYRef.current
        };
    };

    // Update frustums when frameViews change
    useEffect(() => {
        if (!sceneRef.current) return;

        const { frustumGroup } = sceneRef.current;

        // Clear existing
        while (frustumGroup.children.length > 0) {
            const child = frustumGroup.children[0];
            frustumGroup.remove(child);
        }

        // Create frustum for each view
        frameViews.forEach((view) => {
            const isActive = view.id === activeFrameViewId;
            const color = isActive ? 0x818cf8 : 0x64748b;

            const yawRad = THREE.MathUtils.degToRad(view.yaw);
            const pitchRad = THREE.MathUtils.degToRad(view.pitch);
            const fovRad = THREE.MathUtils.degToRad(view.fov || 90);

            const distance = 0.8;
            const halfSize = Math.tan(fovRad / 2) * distance;

            // Frustum edges
            const vertices = new Float32Array([
                0, 0, 0,
                -halfSize, -halfSize, -distance,
                halfSize, -halfSize, -distance,
                halfSize, halfSize, -distance,
                -halfSize, halfSize, -distance,
            ]);

            const indices = new Uint16Array([
                0, 1, 0, 2, 0, 3, 0, 4,
                1, 2, 2, 3, 3, 4, 4, 1
            ]);

            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geom.setIndex(new THREE.BufferAttribute(indices, 1));

            const line = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: isActive ? 1 : 0.6
            }));

            // Far plane fill
            const planeVerts = new Float32Array([
                -halfSize, -halfSize, -distance, halfSize, -halfSize, -distance, halfSize, halfSize, -distance,
                -halfSize, -halfSize, -distance, halfSize, halfSize, -distance, -halfSize, halfSize, -distance,
            ]);
            const planeGeom = new THREE.BufferGeometry();
            planeGeom.setAttribute('position', new THREE.BufferAttribute(planeVerts, 3));

            const plane = new THREE.Mesh(planeGeom, new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: isActive ? 0.4 : 0.15,
                side: THREE.DoubleSide
            }));

            const group = new THREE.Group();
            group.add(line);
            group.add(plane);
            group.rotation.order = 'YXZ';
            group.rotation.y = yawRad;
            group.rotation.x = -pitchRad;

            frustumGroup.add(group);
        });

        // Render after updating
        render();
    }, [frameViews, activeFrameViewId]);

    return (
        <div
            ref={containerRef}
            className={`rounded-lg overflow-hidden border border-gray-700 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ width: size, height: size }}
            onMouseDown={handleMouseDown}
            title="Drag to rotate view"
        />
    );
}
