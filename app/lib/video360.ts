/**
 * 360 Video Utilities
 * Detection, projection, and cubemap extraction for equirectangular videos
 */

// Standard cubemap face names
export type CubemapFace = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export const CUBEMAP_FACES: { face: CubemapFace; name: string; yaw: number; pitch: number }[] = [
    { face: 'pz', name: 'Front', yaw: 0, pitch: 0 },
    { face: 'px', name: 'Right', yaw: 90, pitch: 0 },
    { face: 'nz', name: 'Back', yaw: 180, pitch: 0 },
    { face: 'nx', name: 'Left', yaw: 270, pitch: 0 },
    { face: 'py', name: 'Top', yaw: 0, pitch: 90 },
    { face: 'ny', name: 'Bottom', yaw: 0, pitch: -90 },
];

/**
 * Detection result for 360 video
 */
export interface Detection360Result {
    is360: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

/**
 * Detect if a video is a 360° equirectangular video
 * Uses both aspect ratio heuristics and metadata analysis
 */
export async function detect360Video(
    video: HTMLVideoElement
): Promise<Detection360Result> {
    const width = video.videoWidth;
    const height = video.videoHeight;
    const aspectRatio = width / height;

    // Check for 2:1 aspect ratio (equirectangular standard)
    const is2to1 = Math.abs(aspectRatio - 2.0) < 0.05;

    // Check for common 360 video resolutions
    const common360Widths = [7680, 5760, 4096, 3840, 2880, 2048, 1920];
    const isCommon360Resolution = common360Widths.some(w =>
        Math.abs(width - w) < 100 && Math.abs(height - w / 2) < 50
    );

    if (is2to1 && isCommon360Resolution) {
        return {
            is360: true,
            confidence: 'high',
            reason: '2:1 aspect ratio with common 360 resolution'
        };
    }

    if (is2to1) {
        return {
            is360: true,
            confidence: 'medium',
            reason: '2:1 aspect ratio detected'
        };
    }

    // Check for wider aspect ratios that might indicate 360
    if (aspectRatio >= 1.9 && aspectRatio <= 2.1) {
        return {
            is360: true,
            confidence: 'low',
            reason: 'Near 2:1 aspect ratio'
        };
    }

    return {
        is360: false,
        confidence: 'high',
        reason: 'Non-equirectangular aspect ratio'
    };
}

/**
 * Convert spherical coordinates (longitude, latitude) to 3D cartesian coordinates
 * @param lon Longitude in radians (-π to π)
 * @param lat Latitude in radians (-π/2 to π/2)
 * @returns [x, y, z] unit vector
 */
export function sphericalToCartesian(lon: number, lat: number): [number, number, number] {
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    return [x, y, z];
}

/**
 * Convert 3D cartesian coordinates to equirectangular UV coordinates
 * @param x X coordinate
 * @param y Y coordinate  
 * @param z Z coordinate
 * @returns [u, v] in range [0, 1]
 */
export function cartesianToEquirectangularUV(x: number, y: number, z: number): [number, number] {
    const lon = Math.atan2(x, z);
    const lat = Math.asin(Math.max(-1, Math.min(1, y)));

    const u = (lon / Math.PI + 1) / 2;
    const v = (lat / (Math.PI / 2) + 1) / 2;

    return [u, 1 - v]; // Flip V for image coordinates
}

/**
 * Extract a cubemap face from an equirectangular image
 * @param sourceCtx Source canvas context with equirectangular image
 * @param face Which cubemap face to extract
 * @param faceSize Output face size in pixels
 * @returns Canvas with the extracted face
 */
export function extractCubemapFace(
    sourceCtx: CanvasRenderingContext2D,
    face: CubemapFace,
    faceSize: number
): HTMLCanvasElement {
    const sourceWidth = sourceCtx.canvas.width;
    const sourceHeight = sourceCtx.canvas.height;
    const sourceData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = faceSize;
    outputCanvas.height = faceSize;
    const outputCtx = outputCanvas.getContext('2d')!;
    const outputData = outputCtx.createImageData(faceSize, faceSize);

    for (let y = 0; y < faceSize; y++) {
        for (let x = 0; x < faceSize; x++) {
            // Convert pixel position to normalized coordinates (-1 to 1)
            const nx = (2 * x / faceSize) - 1;
            const ny = (2 * y / faceSize) - 1;

            // Get 3D direction vector based on face
            let dir: [number, number, number];
            switch (face) {
                case 'pz': dir = [nx, -ny, 1]; break;   // Front
                case 'nz': dir = [-nx, -ny, -1]; break; // Back
                case 'px': dir = [1, -ny, -nx]; break;  // Right
                case 'nx': dir = [-1, -ny, nx]; break;  // Left
                case 'py': dir = [nx, 1, ny]; break;    // Top
                case 'ny': dir = [nx, -1, -ny]; break;  // Bottom
            }

            // Normalize direction vector
            const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
            dir = [dir[0] / len, dir[1] / len, dir[2] / len];

            // Convert to equirectangular UV
            const [u, v] = cartesianToEquirectangularUV(dir[0], dir[1], dir[2]);

            // Sample from source image with bilinear interpolation
            const srcX = u * (sourceWidth - 1);
            const srcY = v * (sourceHeight - 1);

            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = Math.min(x0 + 1, sourceWidth - 1);
            const y1 = Math.min(y0 + 1, sourceHeight - 1);

            const fx = srcX - x0;
            const fy = srcY - y0;

            const outputIdx = (y * faceSize + x) * 4;

            for (let c = 0; c < 4; c++) {
                const v00 = sourceData.data[(y0 * sourceWidth + x0) * 4 + c];
                const v10 = sourceData.data[(y0 * sourceWidth + x1) * 4 + c];
                const v01 = sourceData.data[(y1 * sourceWidth + x0) * 4 + c];
                const v11 = sourceData.data[(y1 * sourceWidth + x1) * 4 + c];

                const value = (1 - fx) * (1 - fy) * v00 +
                    fx * (1 - fy) * v10 +
                    (1 - fx) * fy * v01 +
                    fx * fy * v11;

                outputData.data[outputIdx + c] = Math.round(value);
            }
        }
    }

    outputCtx.putImageData(outputData, 0, 0);
    return outputCanvas;
}

/**
 * Extract all 6 cubemap faces from an equirectangular image
 * @param sourceCtx Source canvas context with equirectangular image
 * @param faceSize Output face size in pixels
 * @returns Map of face name to canvas
 */
export function extractAllCubemapFaces(
    sourceCtx: CanvasRenderingContext2D,
    faceSize: number
): Map<CubemapFace, HTMLCanvasElement> {
    const faces = new Map<CubemapFace, HTMLCanvasElement>();

    for (const { face } of CUBEMAP_FACES) {
        faces.set(face, extractCubemapFace(sourceCtx, face, faceSize));
    }

    return faces;
}

/**
 * Extract a custom perspective view from an equirectangular image
 * @param sourceCtx Source canvas context with equirectangular image
 * @param yaw Horizontal angle in degrees (0-360)
 * @param pitch Vertical angle in degrees (-90 to 90)
 * @param fov Field of view in degrees
 * @param outputWidth Output width in pixels
 * @param outputHeight Output height in pixels
 * @returns Canvas with the extracted perspective view
 */
export function extractPerspectiveView(
    sourceCtx: CanvasRenderingContext2D,
    yaw: number,
    pitch: number,
    fov: number,
    outputWidth: number,
    outputHeight: number
): HTMLCanvasElement {
    const sourceWidth = sourceCtx.canvas.width;
    const sourceHeight = sourceCtx.canvas.height;
    const sourceData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    const outputCtx = outputCanvas.getContext('2d')!;
    const outputData = outputCtx.createImageData(outputWidth, outputHeight);

    // Convert angles to radians
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const fovRad = (fov * Math.PI) / 180;

    // Calculate focal length from field of view
    const focalLength = outputWidth / (2 * Math.tan(fovRad / 2));

    // Center of output image
    const cx = outputWidth / 2;
    const cy = outputHeight / 2;

    for (let y = 0; y < outputHeight; y++) {
        for (let x = 0; x < outputWidth; x++) {
            // Ray direction in camera space
            const dx = x - cx;
            const dy = cy - y; // Flip Y
            const dz = focalLength;

            // Normalize
            const len = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
            let rayX = dx / len;
            let rayY = dy / len;
            let rayZ = dz / len;

            // Rotate by pitch (around X axis)
            const cosPitch = Math.cos(pitchRad);
            const sinPitch = Math.sin(pitchRad);
            const tempY = rayY * cosPitch - rayZ * sinPitch;
            const tempZ = rayY * sinPitch + rayZ * cosPitch;
            rayY = tempY;
            rayZ = tempZ;

            // Rotate by yaw (around Y axis)
            const cosYaw = Math.cos(yawRad);
            const sinYaw = Math.sin(yawRad);
            const finalX = rayX * cosYaw + rayZ * sinYaw;
            const finalZ = -rayX * sinYaw + rayZ * cosYaw;

            // Convert to equirectangular UV
            const [u, v] = cartesianToEquirectangularUV(finalX, rayY, finalZ);

            // Sample from source with bilinear interpolation
            const srcX = u * (sourceWidth - 1);
            const srcY = v * (sourceHeight - 1);

            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = Math.min(x0 + 1, sourceWidth - 1);
            const y1 = Math.min(y0 + 1, sourceHeight - 1);

            const fx = srcX - x0;
            const fy = srcY - y0;

            const outputIdx = (y * outputWidth + x) * 4;

            for (let c = 0; c < 4; c++) {
                const v00 = sourceData.data[(y0 * sourceWidth + x0) * 4 + c];
                const v10 = sourceData.data[(y0 * sourceWidth + x1) * 4 + c];
                const v01 = sourceData.data[(y1 * sourceWidth + x0) * 4 + c];
                const v11 = sourceData.data[(y1 * sourceWidth + x1) * 4 + c];

                const value = (1 - fx) * (1 - fy) * v00 +
                    fx * (1 - fy) * v10 +
                    (1 - fx) * fy * v01 +
                    fx * fy * v11;

                outputData.data[outputIdx + c] = Math.round(value);
            }
        }
    }

    outputCtx.putImageData(outputData, 0, 0);
    return outputCanvas;
}

/**
 * Generate frame views for custom mode based on configuration
 */
export function generateCustomViews(
    frameCount: number,
    rigPitch: number,
    startAngle: number,
    fov: number
): { name: string; yaw: number; pitch: number; fov: number }[] {
    const views: { name: string; yaw: number; pitch: number; fov: number }[] = [];
    const angleStep = 360 / frameCount;

    for (let i = 0; i < frameCount; i++) {
        const yaw = (startAngle + i * angleStep) % 360;
        views.push({
            name: `View ${i + 1}`,
            yaw,
            pitch: rigPitch,
            fov
        });
    }

    return views;
}
