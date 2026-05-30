import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

function Rail({ position, rotation, length = 3.1 }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number }) {
  const holes = Array.from({ length: 12 }, (_, index) => -length / 2 + 0.18 + index * ((length - 0.36) / 11));
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[length, 0.12, 0.18]} />
        <meshStandardMaterial color="#b8c0cc" metalness={0.75} roughness={0.22} />
      </mesh>
      {holes.map((x) => (
        <mesh key={x} position={[x, 0.066, 0.092]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.012, 18]} />
          <meshStandardMaterial color="#252a32" metalness={0.2} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -0.28, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.34, 0.34, 0.24, 48]} />
        <meshStandardMaterial color="#1f2933" roughness={0.55} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.27, 0.028, 12, 36]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.265, 24]} />
        <meshStandardMaterial color="#ef4444" metalness={0.35} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Motor({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.46, 0.34, 0.34]} />
        <meshStandardMaterial color="#2f3540" metalness={0.25} roughness={0.42} />
      </mesh>
      <mesh position={[0.24, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.08, 24]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <Html position={[0, 0.34, 0]} className="pointer-events-none">
        <span className="robot-label">{label}</span>
      </Html>
    </group>
  );
}

function V5Brain() {
  return (
    <group position={[0, 0.22, -0.2]}>
      <mesh>
        <boxGeometry args={[1.05, 0.38, 0.72]} />
        <meshStandardMaterial color="#171717" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.205, 0.02]}>
        <boxGeometry args={[0.78, 0.02, 0.42]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0e7490" emissiveIntensity={0.35} />
      </mesh>
      <Html position={[0, 0.48, 0]} className="pointer-events-none">
        <span className="robot-label brain">V5 Brain</span>
      </Html>
    </group>
  );
}

function RobotModel() {
  return (
    <group rotation={[0, -0.58, 0]} position={[0, 0, 0]}>
      <Rail position={[0, 0, -1.12]} />
      <Rail position={[0, 0, 1.12]} />
      <Rail position={[-1.42, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={2.35} />
      <Rail position={[1.42, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={2.35} />
      <Rail position={[0, 0.32, -0.92]} length={2.6} />
      <Rail position={[0, 0.32, 0.92]} length={2.6} />

      {[-1.15, 1.15].map((x) => [-0.9, 0.9].map((z) => <Wheel key={`${x}-${z}`} x={x} z={z} />))}
      <Motor position={[-1.05, 0.2, -0.58]} label="leftFront 11W" />
      <Motor position={[1.05, 0.2, 0.58]} label="rightBack 11W" />
      <V5Brain />

      <mesh position={[-0.05, 0.68, 0.72]}>
        <boxGeometry args={[0.78, 0.24, 0.42]} />
        <meshStandardMaterial color="#dc2626" roughness={0.32} />
      </mesh>
      <Html position={[-0.05, 1.02, 0.72]} className="pointer-events-none">
        <span className="robot-label">V5 Battery</span>
      </Html>

      <group position={[0.78, 0.78, 0]} rotation={[0, 0, -0.62]}>
        <Rail position={[0, 0, -0.12]} length={1.8} />
        <Rail position={[0, 0, 0.12]} length={1.8} />
      </group>
      <group position={[1.28, 1.42, 0]} rotation={[0, 0, -0.62]}>
        <Rail position={[0, 0, -0.12]} length={1.25} />
        <Rail position={[0, 0, 0.12]} length={1.25} />
      </group>
      <Motor position={[0.72, 0.56, -0.48]} label="armMotor" />

      <mesh position={[-1.5, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 1.55, 32]} />
        <meshStandardMaterial color="#22c55e" roughness={0.45} />
      </mesh>
      <Html position={[-1.55, 0.58, 0]} className="pointer-events-none">
        <span className="robot-label intake">intake roller</span>
      </Html>
    </group>
  );
}

export function RobotScene() {
  return (
    <div className="robot-scene">
      <Canvas camera={{ position: [4.2, 3.1, 4.8], fov: 38 }}>
        <color attach="background" args={['#f6f7fb']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 7, 5]} intensity={2.2} />
        <directionalLight position={[-4, 3, -3]} intensity={0.7} />
        <gridHelper args={[6, 12, '#c7cbd1', '#e2e5ea']} />
        <RobotModel />
        <OrbitControls makeDefault enablePan enableZoom />
      </Canvas>
    </div>
  );
}
