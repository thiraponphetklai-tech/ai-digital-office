// src/components/office3d/OfficeScene.tsx
// Main 3D canvas — wraps Canvas + camera + lights + zones + robot

'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Grid } from '@react-three/drei'
import { useOfficeStore } from '@/store'
import { ProjectZone } from './ProjectZone'
import { AIRobot } from './AIRobot'

export function OfficeScene() {
  const { zones, viewMode } = useOfficeStore()

  // Space zones evenly on X axis
  const totalZones = zones.length
  const spacing    = 5.5
  const startX     = -((totalZones - 1) * spacing) / 2

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{
          position: [0, 8, 12],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>

          {/* ── Lighting ─────────────────────────────────────── */}
          <ambientLight intensity={0.7} color="#EEF2FF" />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.2}
            color="#ffffff"
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-4, 6, -4]} intensity={0.4} color="#C7D2FE" />
          <pointLight position={[4, 4, 4]}  intensity={0.3} color="#ECFDF5" />

          {/* ── Ground grid ──────────────────────────────────── */}
          <Grid
            position={[0, -0.04, 0]}
            args={[24, 24]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#E0E7FF"
            sectionSize={4}
            sectionThickness={1}
            sectionColor="#C7D2FE"
            fadeDistance={20}
            fadeStrength={1}
            infiniteGrid
          />

          {/* ── Office floor ─────────────────────────────────── */}
          <mesh position={[0, -0.05, 0]} receiveShadow>
            <boxGeometry args={[24, 0.1, 14]} />
            <meshStandardMaterial color="#F8FAFF" roughness={0.9} />
          </mesh>

          {/* ── Project Zones ─────────────────────────────────── */}
          {zones.map((zone, i) => {
            const hasIssue = zone.desks.some(
              d => d.status === 'BLOCKED' || d.status === 'AT_RISK'
            )
            const dimmed = viewMode === 'attention' && !hasIssue

            return (
              <ProjectZone
                key={zone.id}
                zone={zone}
                position={[startX + i * spacing, 0, 0]}
                dimmed={dimmed}
              />
            )
          })}

          {/* ── AI Robot ─────────────────────────────────────── */}
          <AIRobot />

          {/* ── Camera controls ──────────────────────────────── */}
          <OrbitControls
            enablePan={false}
            minDistance={6}
            maxDistance={20}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.5}
            target={[0, 0, 0]}
          />

          {/* ── Environment ──────────────────────────────────── */}
          <Environment preset="city" />

        </Suspense>
      </Canvas>
    </div>
  )
}
