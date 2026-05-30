import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

function CChannel({ position, rotation, length = 3.8 }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number }) {
  const holeCount = Math.max(6, Math.round(length / 0.24));
  const holes = Array.from({ length: holeCount }, (_, index) => -length / 2 + 0.18 + index * ((length - 0.36) / (holeCount - 1)));
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[length, 0.08, 0.48]} />
        <meshStandardMaterial color="#c6cbd2" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.18, -0.2]}>
        <boxGeometry args={[length, 0.36, 0.08]} />
        <meshStandardMaterial color="#aeb6c0" metalness={0.92} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.18, 0.2]}>
        <boxGeometry args={[length, 0.36, 0.08]} />
        <meshStandardMaterial color="#aeb6c0" metalness={0.92} roughness={0.22} />
      </mesh>
      {holes.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.012, 24]} />
            <meshStandardMaterial color="#2b3138" roughness={0.5} />
          </mesh>
          <mesh position={[x, 0.23, -0.245]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.012, 18]} />
            <meshStandardMaterial color="#2b3138" roughness={0.5} />
          </mesh>
          <mesh position={[x, 0.23, 0.245]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.012, 18]} />
            <meshStandardMaterial color="#2b3138" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function OmniWheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.36, 0.36, 0.24, 64]} />
        <meshStandardMaterial color="#111315" roughness={0.58} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.29, 0.035, 12, 64]} />
        <meshStandardMaterial color="#d8dde4" metalness={0.65} roughness={0.28} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh key={index} rotation={[0, 0, (Math.PI * 2 * index) / 12]}>
          <boxGeometry args={[0.07, 0.58, 0.28]} />
          <meshStandardMaterial color="#20242a" roughness={0.7} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.11, 0.11, 0.27, 32]} />
        <meshStandardMaterial color="#d9232e" metalness={0.25} roughness={0.35} />
      </mesh>
    </group>
  );
}

function V5Motor({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.74, 0.42, 0.46]} />
        <meshStandardMaterial color="#2d333c" roughness={0.38} />
      </mesh>
      <mesh position={[0.39, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.12, 32]} />
        <meshStandardMaterial color="#c8102e" roughness={0.32} />
      </mesh>
      <mesh position={[-0.08, 0.218, 0]}>
        <boxGeometry args={[0.28, 0.016, 0.28]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[-0.34, -0.02, 0.24]}>
        <boxGeometry args={[0.16, 0.1, 0.06]} />
        <meshStandardMaterial color="#111315" roughness={0.45} />
      </mesh>
    </group>
  );
}

function V5Brain() {
  return (
    <group position={[0, 0.48, -0.12]}>
      <mesh>
        <boxGeometry args={[1.48, 0.46, 0.98]} />
        <meshStandardMaterial color="#101114" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.235, 0.03]}>
        <boxGeometry args={[0.94, 0.026, 0.54]} />
        <meshStandardMaterial color="#1d9bf0" emissive="#0ea5e9" emissiveIntensity={0.28} roughness={0.18} />
      </mesh>
      <mesh position={[-0.62, 0.25, 0.36]}>
        <boxGeometry args={[0.18, 0.035, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.12} />
      </mesh>
      <Html position={[0.1, 0.66, 0.02]} className="pointer-events-none">
        <span className="robot-label brain">V5 Robot Brain 276-4810</span>
      </Html>
    </group>
  );
}

function V5Battery() {
  return (
    <group position={[-0.95, 0.43, 0.68]} rotation={[0, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.24, 0.34, 0.42]} />
        <meshStandardMaterial color="#20242a" roughness={0.42} />
      </mesh>
      <mesh position={[0.48, 0.18, 0]}>
        <boxGeometry args={[0.18, 0.025, 0.28]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function IntakeRoller() {
  return (
    <group position={[1.92, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 1.75, 32]} />
        <meshStandardMaterial color="#22c55e" roughness={0.48} />
      </mesh>
      {[-0.58, 0, 0.58].map((z) => (
        <mesh key={z} position={[0, z, 0]}>
          <torusGeometry args={[0.2, 0.025, 10, 28]} />
          <meshStandardMaterial color="#111315" roughness={0.5} />
        </mesh>
      ))}
      <Html position={[0, 0.98, 0.22]} className="pointer-events-none">
        <span className="robot-label intake">front intake roller</span>
      </Html>
    </group>
  );
}

function RobotModel() {
  return (
    <group rotation={[0, -0.55, 0]} position={[0, -0.05, 0]}>
      <CChannel position={[0, 0, -1.16]} length={3.9} />
      <CChannel position={[0, 0, 1.16]} length={3.9} />
      <CChannel position={[-1.62, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={2.34} />
      <CChannel position={[1.62, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={2.34} />
      <CChannel position={[0, 0.34, -0.72]} length={3.05} />
      <CChannel position={[0, 0.34, 0.72]} length={3.05} />
      <CChannel position={[0, 0.62, 0]} rotation={[0, Math.PI / 2, 0]} length={1.8} />

      {[-1.32, 0, 1.32].map((x) => (
        <group key={x}>
          <OmniWheel key={`${x}-left`} position={[x, -0.28, -1.28]} />
          <OmniWheel key={`${x}-right`} position={[x, -0.28, 1.28]} />
        </group>
      ))}

      <V5Motor position={[-1.36, 0.3, -0.62]} />
      <V5Motor position={[1.36, 0.3, 0.62]} rotation={[0, Math.PI, 0]} />
      <V5Motor position={[0.18, 0.78, -0.82]} rotation={[0, Math.PI / 2, 0]} />
      <V5Brain />
      <V5Battery />
      <IntakeRoller />

      <group position={[0.72, 0.88, 0]} rotation={[0, 0, -0.72]}>
        <CChannel position={[0, 0, -0.18]} length={2.12} />
        <CChannel position={[0, 0, 0.18]} length={2.12} />
      </group>
      <group position={[1.44, 1.56, 0]} rotation={[0, 0, -0.72]}>
        <CChannel position={[0, 0, -0.18]} length={1.42} />
        <CChannel position={[0, 0, 0.18]} length={1.42} />
      </group>
      <mesh position={[1.86, 1.84, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.95, 32]} />
        <meshStandardMaterial color="#d8dde4" metalness={0.82} roughness={0.22} />
      </mesh>

      <mesh position={[0.08, 0.76, 0.76]}>
        <boxGeometry args={[1.32, 0.12, 0.38]} />
        <meshStandardMaterial color="#c8102e" roughness={0.32} />
      </mesh>
      <mesh position={[-0.42, 0.84, 0.76]}>
        <boxGeometry args={[0.2, 0.022, 0.2]} />
        <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.12} />
      </mesh>

      <mesh position={[0, 1.45, -0.95]} rotation={[0.9, 0, 0]}>
        <torusGeometry args={[0.72, 0.025, 8, 64, Math.PI]} />
        <meshStandardMaterial color="#111315" roughness={0.42} />
      </mesh>
    </group>
  );
}

export function RobotScene() {
  return (
    <div className="robot-scene">
      <Canvas camera={{ position: [5.2, 3.4, 4.8], fov: 36 }}>
        <color attach="background" args={['#f6f7fb']} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[4, 7, 5]} intensity={2.35} />
        <directionalLight position={[-4, 3, -3]} intensity={0.8} />
        <gridHelper args={[7, 14, '#c7cbd1', '#e2e5ea']} />
        <RobotModel />
        <OrbitControls makeDefault enablePan enableZoom />
      </Canvas>
    </div>
  );
}
