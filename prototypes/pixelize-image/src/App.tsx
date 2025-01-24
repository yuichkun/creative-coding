import { Canvas, Object3DNode, useThree, useLoader } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { TextureLoader } from 'three';
import type { Texture } from 'three';

// Define the shader material
const PixelizedImage = shaderMaterial(
  {
    uTexture: null,
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
    void main() {
      vec4 texColor = texture2D(uTexture, vUv);
      gl_FragColor = texColor;
    }
  `
);

extend({ PixelizedImage });

declare module '@react-three/fiber' {
  interface ThreeElements {
    pixelizedImage: Object3DNode<typeof PixelizedImage, typeof PixelizedImage> & {
      uTexture?: Texture;
    };
  }
}

const ShaderPlane = () => {
  const { viewport } = useThree();
  const imageUrl = 'https://picsum.photos/1024';
  const texture = useLoader(TextureLoader, imageUrl);

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <pixelizedImage uTexture={texture} />
    </mesh>
  );
};

const App = () => (
  <Canvas orthographic style={{ width: '100vw', height: '100vh' }}>
    <ShaderPlane />
  </Canvas>
);

export default App;