import { shaderMaterial } from '@react-three/drei';
import { Canvas, extend, Object3DNode, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Texture, TextureLoader, Vector2 } from 'three';

// Define the shader material
const PixelatedImage = shaderMaterial(
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
      const int NUM_CIRCLES = 100;
      const float MAX_RADIUS = 1.0;
      const float GRID_GROWTH_FACTOR = 1.1;
      
      float currentRadius = MAX_RADIUS;
      float currentGridSize = 40.0;
      vec4 finalColor = texture2D(uTexture, vUv);
      
      for(int i = 0; i < NUM_CIRCLES; i++) {
          float scaledRadius = currentRadius * pow(0.8, float(i));
          float scaledGridSize = currentGridSize * pow(GRID_GROWTH_FACTOR, float(i));
          
          // Calculate influence with overlap
          float dist = distance(uMouse, vUv);
          float influence = smoothstep(scaledRadius * 0.95, scaledRadius * 1.05, dist);
          
          // Grid calculations
          float cellSize = (scaledRadius * 2.0) / scaledGridSize;
          vec2 gridCoord = floor((vUv - uMouse + vec2(scaledRadius)) / cellSize);
          vec2 nearestCellCenter = uMouse - vec2(scaledRadius) + (gridCoord + 0.5) * cellSize;
          
          // Swirling effect
          vec2 dir = nearestCellCenter - uMouse;
          float angle = -0.5 * dist * uTime;
          mat2 rot = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
          vec2 swirledCenter = uMouse + rot * dir;
          
          // Blend layers
          vec4 layerColor = texture2D(uTexture, swirledCenter);
          finalColor = mix(layerColor, finalColor, influence);
      }
      
      gl_FragColor = finalColor;
  }
  `
);

extend({ PixelatedImage });

declare module '@react-three/fiber' {
  interface ThreeElements {
    pixelatedImage: Object3DNode<typeof PixelatedImage, InstanceType<typeof PixelatedImage>> & {
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
  const [seed, setSeed] = useState('9');
  const imageUrl = `https://picsum.photos/seed/${seed}/300/300`;
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

  const handleClick = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  return (
    <mesh onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <pixelatedImage
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