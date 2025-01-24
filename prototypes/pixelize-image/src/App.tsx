import { shaderMaterial } from '@react-three/drei';
import { Canvas, extend, Object3DNode, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Texture, TextureLoader, Vector2 } from 'three';

// Define the shader material
const PixelizedImage = shaderMaterial(
  {
    uTexture: null,
    uResolution: null,
    uPixelSize: null,
    uTime: 0,
    uMouse: null,
  },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform float uPixelSize;
    uniform float uTime;
    uniform vec2 uMouse;

    void main() {
      // 1. Calculate distance from the mouse to the current fragment
      float d = distance(uMouse, vUv);
      float diameter = 0.2; // Diameter of the circular area
      float radius = diameter / 2.0; // Radius of the circular area
      float gridSize = 2.0; // Number of grid cells (e.g., 4x4 grid)
  
      // 2. Check if the fragment is inside the circular area
      if (d < radius) {
          // 3. Calculate the size of each grid cell in UV space
          float cellSize = diameter / gridSize;
  
          // 4. Shift the coordinate system so the mouse is at the center of the grid
          //    and all coordinates are positive
          vec2 gridCoord = floor((vUv - uMouse + vec2(radius)) / cellSize);
  
          // 5. Calculate the center of the nearest grid cell
          vec2 nearestCellCenter = 
            (gridCoord + 0.5) * cellSize // Convert grid units back to shifted UV space
            - vec2(radius)               // Undo the earlier shift
            + uMouse; 
  
          // 6. Sample the texture at the center of the nearest grid cell
          vec4 texColor = texture2D(uTexture, nearestCellCenter);
  
          // 7. Set the fragment color to the sampled color
          gl_FragColor = texColor;
      } else {
          // 8. If outside the circular area, set the color to black
          gl_FragColor = vec4(vec3(0.0), 1.0);
      }
  }

  `
);

extend({ PixelizedImage });

declare module '@react-three/fiber' {
  interface ThreeElements {
    pixelizedImage: Object3DNode<typeof PixelizedImage, InstanceType<typeof PixelizedImage>> & {
      uTexture?: Texture;
      uResolution?: Vector2;
      uPixelSize?: number;
      uTime?: number; 
      uMouse?: Vector2;
    };
  }
}

const ShaderPlane = () => {
  const { viewport } = useThree();
  const imageUrl = 'https://picsum.photos/seed/picsum/200/300';
  const texture = useLoader(TextureLoader, imageUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null);
  const mouseRef = useRef(new Vector2(0.5, 0.5));
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uMouse.value = mouseRef.current;
    }
  });

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const x = event.nativeEvent.clientX / window.innerWidth;
    const y = 1 - (event.nativeEvent.clientY / window.innerHeight); // Flip Y coordinate
    mouseRef.current.set(x, y);
  };

  return (
    <mesh onPointerMove={handlePointerMove}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <pixelizedImage
        ref={materialRef}
        uTexture={texture} 
        uResolution={new Vector2(viewport.width, viewport.height)} 
        uPixelSize={30}
        uMouse={mouseRef.current}
      />
    </mesh>
  );
};

const App = () => (
  <Canvas orthographic style={{ width: '100vw', height: '100vh' }}>
    <ShaderPlane />
  </Canvas>
);

export default App;