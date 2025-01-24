import { Canvas, Object3DNode, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Define the shader material
const PixelizedImage = shaderMaterial(
  {
  }, // Uniforms (empty for now)
  /* glsl */ `
  varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `, // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(vUv, 0.0, 1.0); // Red color
    }
  ` // Fragment Shader
);

// Extend the material so it can be used as a JSX component
extend({ PixelizedImage });

declare module '@react-three/fiber' {
  interface ThreeElements {
    pixelizedImage: Object3DNode<typeof PixelizedImage, typeof PixelizedImage>;
  }
}

const ShaderPlane = () => {
  const { viewport } = useThree();
  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <pixelizedImage />
    </mesh>
  );
};

const App = () => (
  <Canvas orthographic style={{ width: '100vw', height: '100vh' }}>
    <ShaderPlane />
  </Canvas>
);

export default App;
