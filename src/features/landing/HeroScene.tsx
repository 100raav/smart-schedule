import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 5.2], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      className="!bg-transparent"
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} color="#7c8cff" />
      <SceneContent />
    </Canvas>
  );
}

function SceneContent() {
  const group = useRef<THREE.Group>(null);
  const papers = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (papers.current) {
      papers.current.rotation.y = Math.sin(t * 0.35) * 0.22;
      papers.current.rotation.x = Math.cos(t * 0.28) * 0.05;
    }
    if (group.current) {
      group.current.position.y = Math.sin(t * 1.1) * 0.06;
    }
  });

  return (
    <group ref={group}>
      <group ref={papers}>
        <PaperSheet
          position={[0, 0.02, 0]}
          color="#ffffff"
          rotation={[0, 0, -0.012]}
          gridLines={true}
        />
        <PaperSheet
          position={[0, -0.045, -0.16]}
          color="#fbfbfd"
          rotation={[0.015, 0, 0.024]}
          offset
        />
        <PaperSheet
          position={[0, -0.09, -0.3]}
          color="#f5f6fa"
          rotation={[0, 0, 0.008]}
          offset
        />
        <Pen position={[0.86, 0.3, 0.2]} rotation={[0, 0, -0.62]} />
        <CoffeeMug position={[-1.05, 0.22, 0.42]} />
      </group>
    </group>
  );
}

function PaperSheet({
  position,
  color,
  rotation,
  gridLines,
  offset,
}: {
  position: [number, number, number];
  color: string;
  rotation: [number, number, number];
  gridLines?: boolean;
  offset?: boolean;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const w = 2.1;
    const h = 2.75;
    const r = 0.03;
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }, []);

  const geometry = useMemo(() => new THREE.ShapeGeometry(shape), [shape]);

  const lines = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    const w = 1.9;
    const start = -1.2;
    const step = 0.18;
    let y = start;
    let n = 0;
    while (y < 1.2 && n < 26) {
      pts.push(-w / 2 - 0.02, y, 0.01, w / 2 + 0.02, y, 0.01);
      y += step;
      n++;
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {offset && (
        <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
        </mesh>
      )}
      {gridLines && (
        <lineSegments geometry={lines}>
          <lineBasicMaterial color="#c7cede" transparent opacity={0.7} />
        </lineSegments>
      )}
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.92} metalness={0} />
      </mesh>
    </group>
  );
}

function Pen({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.045, 1.5, 24]} />
        <meshStandardMaterial color="#3d4568" roughness={0.3} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 24]} />
        <meshStandardMaterial color="#c9d2f0" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.82, 0]}>
        <cylinderGeometry args={[0.02, 0.035, 0.14, 16]} />
        <meshStandardMaterial color="#f6c34a" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.885, 0]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color="#2b3350" roughness={0.35} />
      </mesh>
    </group>
  );
}

function CoffeeMug({ position }: { position: [number, number, number]; }) {
  return (
    <group position={position} rotation={[0, 0.2, 0]}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.17, 0.5, 32, 1, false, 0, Math.PI * 1.6]} />
        <meshStandardMaterial color="#fa7d5b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.02, 32]} />
        <meshStandardMaterial color="#3c2f2f" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.14, 0.035, 12, 24]} />
        <meshStandardMaterial color="#fa7d5b" roughness={0.5} />
      </mesh>
    </group>
  );
}