import { OrbitControls, Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

function RobotModel() {
  return (
    <group rotation={[0, -0.45, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.8, 0.28, 2.4]} />
        <meshStandardMaterial color="#3B82F6" metalness={0.35} roughness={0.35} />
      </mesh>
      {[-1.15, 1.15].map((x) =>
        [-0.9, 0.9].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.28, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.2, 32]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        )),
      )}
      <mesh position={[0.78, 0.62, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.18, 1.8, 0.18]} />
        <meshStandardMaterial color="#FF7A18" />
      </mesh>
      <mesh position={[1.18, 1.35, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.22, 0.9, 0.18]} />
        <meshStandardMaterial color="#22D3EE" />
      </mesh>
      <Html position={[-1.25, 0.38, -0.9]} className="pointer-events-none">
        <span className="rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs text-white">leftDrive</span>
      </Html>
      <Html position={[1.2, 1.65, 0]} className="pointer-events-none">
        <span className="rounded border border-vex/40 bg-vex/20 px-2 py-1 text-xs text-white">armMotor</span>
      </Html>
    </group>
  );
}

export function RobotScene() {
  return (
    <div className="h-[320px] overflow-hidden rounded-lg border border-line bg-[#07101f]">
      <Canvas camera={{ position: [3.5, 2.8, 4], fov: 42 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 5, 6]} intensity={1.6} />
        <gridHelper args={[6, 12, '#24314F', '#16203a']} />
        <RobotModel />
        <OrbitControls makeDefault enablePan enableZoom />
      </Canvas>
    </div>
  );
}
