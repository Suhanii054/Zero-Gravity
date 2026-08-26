'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ModelKey } from '@/types/energy';
import { getModelOption } from '@/utils/mock-energy';

type Vec3 = [number, number, number];

const nodePositions: Vec3[] = [
  [-2.4, -0.7, -0.8],
  [-1.4, 0.8, 0.9],
  [-0.3, -0.25, -1.1],
  [0.8, 0.95, 0.7],
  [2.2, -0.45, -0.4],
  [0.1, 1.9, -0.2],
  [-1.9, 1.8, -0.5],
  [1.8, 1.75, 0.35],
];

const edges: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 5],
  [5, 7],
  [6, 5],
  [0, 2],
  [3, 7],
  [2, 5],
];

function EnergyNode({ position, intensity, speed, color, index }: { position: Vec3; intensity: number; speed: number; color: string; index: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4 * speed + index) * 0.12 * intensity;
    ref.current?.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.12 + intensity * 0.08, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35 + intensity * 0.85}
        metalness={0.12}
        roughness={0.42}
        toneMapped={false}
      />
    </mesh>
  );
}

function FlowPulse({ from, to, intensity, speed, color, phase }: { from: Vec3; to: Vec3; intensity: number; speed: number; color: string; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useMemo(() => new THREE.Vector3(...from), [from]);
  const end = useMemo(() => new THREE.Vector3(...to), [to]);

  useFrame(({ clock }) => {
    const t = (Math.sin(clock.elapsedTime * (0.8 + intensity) * speed + phase) + 1) / 2;
    ref.current?.position.lerpVectors(start, end, t);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.035 + intensity * 0.025, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function GridNetwork({ intensity, speed, model }: { intensity: number; speed: number; model: ModelKey }) {
  const group = useRef<THREE.Group>(null);
  const color = getModelOption(model).accent;

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.18 * speed;
      group.current.rotation.x = Math.sin(clock.elapsedTime * 0.25 * speed) * 0.08;
    }
  });

  return (
    <group ref={group}>
      {edges.map(([from, to], index) => (
        <group key={`${from}-${to}`}>
          <Line
            points={[nodePositions[from], nodePositions[to]]}
            color={index % 2 === 0 ? '#0A78A7' : color}
            lineWidth={0.8 + intensity * 1.2}
            transparent
            opacity={0.22 + intensity * 0.34}
          />
          <FlowPulse from={nodePositions[from]} to={nodePositions[to]} intensity={intensity} speed={speed} color={index % 2 === 0 ? '#0A78A7' : color} phase={index} />
        </group>
      ))}
      {nodePositions.map((position, index) => (
        <EnergyNode key={index} position={position} intensity={intensity} speed={speed} color={index % 2 === 0 ? color : '#0A78A7'} index={index} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <circleGeometry args={[3.4, 96]} />
        <meshBasicMaterial color="#7B55AD" transparent opacity={0.035 + intensity * 0.04} />
      </mesh>
    </group>
  );
}

export default function EnergyGridScene({ intensity, speed = 1, model }: { intensity: number; speed?: number; model: ModelKey }) {
  return (
    <div className="h-[305px] w-full">
      <Canvas camera={{ position: [0, 2.8, 6.2], fov: 50 }} dpr={[1, 1.8]}>
        <color attach="background" args={['#EEF8FB']} />
        <fog attach="fog" args={['#EEF8FB', 5, 11]} />
        <ambientLight intensity={1.05} />
        <pointLight position={[2, 3, 4]} intensity={1 + intensity * 1.4} color="#0A78A7" />
        <pointLight position={[-3, 2, -2]} intensity={0.8 + intensity} color={getModelOption(model).accent} />
        <Stars radius={16} depth={20} count={180} factor={1.2} saturation={0} fade speed={0.35} />
        <GridNetwork intensity={intensity} speed={speed} model={model} />
        <OrbitControls enablePan={false} minDistance={4.2} maxDistance={8} autoRotate autoRotateSpeed={0.35 * speed} />
      </Canvas>
    </div>
  );
}
