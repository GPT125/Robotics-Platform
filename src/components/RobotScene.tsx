import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

function Rail({ position, rotation, length = 3.5 }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number }) {
  const holes = Array.from({ length: 16 }, (_, index) => -length / 2 + 0.16 + index * ((length - 0.32) / 15));
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[length, 0.16, 0.42]} />
        <meshStandardMaterial color="#b9c0c9" metalness={0.85} roughness={0.19} />
      </mesh>
      <mesh position={[0, 0.17, -0.16]}>
        <boxGeometry args={[length, 0.18, 0.08]} />
        <meshStandardMaterial color="#8f99a8" metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.17, 0.16]}>
        <boxGeometry args={[length, 0.18, 0.08]} />
        <meshStandardMaterial color="#8f99a8" metalness={0.8} roughness={0.22} />
      </mesh>
      {holes.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.255, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.018, 18]} />
            <meshStandardMaterial color="#252a32" metalness={0.2} roughness={0.45} />
          </mesh>
          <mesh position={[x, 0.255, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.018, 18]} />
            <meshStandardMaterial color="#252a32" metalness={0.2} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -0.28, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.36, 0.36, 0.26, 64]} />
        <meshStandardMaterial color="#1f2933" roughness={0.55} />
      </mesh>
      {Array.from({ length: 10 }, (_, index) => (
        <mesh key={index} rotation={[0, 0, (Math.PI * 2 * index) / 10]}>
          <boxGeometry args={[0.08, 0.62, 0.28]} />
          <meshStandardMaterial color="#111827" roughness={0.65} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.03, 12, 48]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.265, 24]} />
        <meshStandardMaterial color="#ef4444" metalness={0.35} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Motor({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.62, 0.4, 0.44]} />
        <meshStandardMaterial color="#333842" metalness={0.25} roughness={0.38} />
      </mesh>
      <mesh position={[0.32, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 28]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[-0.12, 0.205, 0]}>
        <boxGeometry args={[0.2, 0.014, 0.26]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.25} />
      </mesh>
    </group>
  );
}

function V5Brain() {
  return (
    <group position={[0, 0.22, -0.2]}>
      <mesh>
        <boxGeometry args={[1.35, 0.44, 0.96]} />
        <meshStandardMaterial color="#171717" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.205, 0.02]}>
        <boxGeometry args={[0.92, 0.022, 0.52]} />
        <meshStandardMaterial color="#1d9bf0" emissive="#0e7490" emissiveIntensity={0.28} />
      </mesh>
      <Html position={[0, 0.48, 0]} className="pointer-events-none">
        <span className="robot-label brain">V5 Robot Brain 276-4810</span>
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
      <Motor position={[-1.05, 0.2, -0.58]} />
      <Motor position={[1.05, 0.2, 0.58]} />
      <V5Brain />

      <mesh position={[-0.1, 0.72, 0.82]}>
        <boxGeometry args={[1.5, 0.28, 0.52]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.32} />
      </mesh>
      <mesh position={[-0.62, 0.87, 0.82]}>
        <boxGeometry args={[0.18, 0.02, 0.28]} />
        <meshStandardMaterial color="#f8fafc" emissive="#e5e7eb" emissiveIntensity={0.2} />
      </mesh>

      <group position={[0.78, 0.78, 0]} rotation={[0, 0, -0.62]}>
        <Rail position={[0, 0, -0.12]} length={1.8} />
        <Rail position={[0, 0, 0.12]} length={1.8} />
      </group>
      <group position={[1.28, 1.42, 0]} rotation={[0, 0, -0.62]}>
        <Rail position={[0, 0, -0.12]} length={1.25} />
        <Rail position={[0, 0, 0.12]} length={1.25} />
      </group>
      <Motor position={[0.72, 0.56, -0.48]} />

      <mesh position={[-1.5, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 1.55, 32]} />
        <meshStandardMaterial color="#22c55e" roughness={0.45} />
      </mesh>
    </group>
  );
}

export function RobotScene() {
  return (
    <div className="robot-scene">
      <Canvas camera={{ position: [4.6, 3.2, 4.9], fov: 37 }}>
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
