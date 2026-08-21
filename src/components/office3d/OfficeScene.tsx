'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useOfficeStore } from '@/store'
import { ProjectZone } from './ProjectZone'
import { AIRobot } from './AIRobot'

function SceneContent() {
  const { zones, viewMode, visualStates } = useOfficeStore()
  const spacing = 5.8
  const startX  = -((zones.length - 1) * spacing) / 2

  return (
    <>
      {/* Fog — dark office atmosphere */}
      <fog attach="fog" args={['#111827', 14, 38]} />

      {/* Ambient — dim */}
      <ambientLight intensity={0.4} color="#8B9FC0" />

      {/* Main overhead lights — like office ceiling panels */}
      <rectAreaLight position={[0, 4.5, 0]} width={12} height={8}
        intensity={3} color="#E0E7FF" rotation={[-Math.PI / 2, 0, 0]} />
      <rectAreaLight position={[-6, 4.5, 0]} width={6} height={6}
        intensity={2} color="#C7D2FE" rotation={[-Math.PI / 2, 0, 0]} />
      <rectAreaLight position={[6, 4.5, 0]} width={6} height={6}
        intensity={2} color="#C7D2FE" rotation={[-Math.PI / 2, 0, 0]} />

      {/* Ceiling light strips */}
      {[-5, 0, 5].map(x => (
        <mesh key={x} position={[x, 4.2, 0]}>
          <boxGeometry args={[0.2, 0.05, 8]} />
          <meshStandardMaterial color="#E0E7FF" emissive="#C7D2FE" emissiveIntensity={2} />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh position={[0, 4.4, 0]} receiveShadow>
        <boxGeometry args={[28, 0.15, 16]} />
        <meshStandardMaterial color="#0F172A" roughness={1} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 2.2, -7]} receiveShadow>
        <boxGeometry args={[28, 4.8, 0.15]} />
        <meshStandardMaterial color="#0D1526" roughness={0.95} />
      </mesh>
      <mesh position={[-12, 2.2, 0]} receiveShadow>
        <boxGeometry args={[0.15, 4.8, 16]} />
        <meshStandardMaterial color="#0D1526" roughness={0.95} />
      </mesh>
      <mesh position={[12, 2.2, 0]} receiveShadow>
        <boxGeometry args={[0.15, 4.8, 16]} />
        <meshStandardMaterial color="#0D1526" roughness={0.95} />
      </mesh>

      {/* Floor — dark reflective */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 16]} />
        <meshStandardMaterial
          color="#111827" roughness={0.15} metalness={0.4}
        />
      </mesh>

      {/* Floor grid lines */}
      {Array.from({ length: 11 }, (_, i) => i - 5).map(x => (
        <mesh key={`gx-${x}`} position={[x * 1.4, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.01, 16]} />
          <meshStandardMaterial color="#1E3A5F" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Zone label sign on back wall */}
      {zones.map((zone, i) => {
        const x = startX + i * spacing
        return (
          <group key={zone.id} position={[x, 3.2, -6.8]}>
            <mesh>
              <boxGeometry args={[3.2, 0.5, 0.08]} />
              <meshStandardMaterial color="#1E293B" roughness={0.5} />
            </mesh>
            {/* Glow edge */}
            <mesh position={[0, -0.27, 0]}>
              <boxGeometry args={[3.2, 0.04, 0.09]} />
              <meshStandardMaterial
                color="#4F46E5" emissive="#4F46E5" emissiveIntensity={2}
              />
            </mesh>
          </group>
        )
      })}

      {/* Zones */}
      {zones.map((zone, i) => {
        const hasIssue = zone.desks.some(desk => {
          const state = visualStates[desk.taskId]
          return state?.deskState === 'BLOCKED' || state?.deskState === 'RISK'
        })
        const dimmed   = viewMode === 'attention' && !hasIssue
        return (
          <ProjectZone
            key={zone.id}
            zone={zone}
            position={[startX + i * spacing, 0, 0]}
            dimmed={dimmed}
          />
        )
      })}

      {/* AI Robot */}
      <AIRobot />

      {/* Camera */}
      <OrbitControls
        enablePan
        minDistance={5}
        maxDistance={20}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.4}
        target={[0, 1, 0]}
      />
    </>
  )
}

export function OfficeScene() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [0, 5, 11], fov: 55, near: 0.1, far: 60 }}
        gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.2 }}
        style={{ background: '#0F172A', display: 'block' }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
