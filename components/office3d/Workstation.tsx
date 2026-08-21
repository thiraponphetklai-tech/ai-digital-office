// src/components/office3d/Workstation.tsx
// Desk + screen + alert indicator — reads from officeStore.visualStates

'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useOfficeStore } from '@/store'
import { getDeskConfig } from '@/lib/visualStateMapper'
import type { DeskInfo } from '@/types'

interface WorkstationProps {
  desk: DeskInfo
  position: [number, number, number]
  onClick?: () => void
}

export function Workstation({ desk, position, onClick }: WorkstationProps) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const alertRef = useRef<THREE.Mesh>(null)

  const visualStates = useOfficeStore(s => s.visualStates)
  const vs     = visualStates[desk.taskId]
  const cfg    = getDeskConfig(desk.status)

  // Pulse animation for BLOCKED / AT_RISK
  useFrame(({ clock }) => {
    if (!cfg.pulseAnim) return
    const t = clock.getElapsedTime()
    const pulse = 0.7 + Math.sin(t * 3) * 0.3
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity = pulse * 0.4
    }
    if (alertRef.current) {
      alertRef.current.scale.setScalar(0.9 + Math.sin(t * 4) * 0.1)
    }
  })

  const deskColor   = cfg.meshColor
  const glowColor   = cfg.glowColor
  const alertColor  = vs?.alertState === 'RED' ? '#EF4444' : vs?.alertState === 'YELLOW' ? '#F59E0B' : null

  return (
    <group position={position} onClick={onClick}>
      {/* Desk base */}
      <RoundedBox args={[1.2, 0.12, 0.8]} radius={0.04} position={[0, 0, 0]}>
        <meshStandardMaterial color={deskColor} roughness={0.4} metalness={0.3} />
      </RoundedBox>

      {/* Screen */}
      <RoundedBox args={[0.8, 0.55, 0.04]} radius={0.02} position={[0, 0.38, -0.25]}>
        <meshStandardMaterial
          color={vs?.screenState === 'OFF' ? '#1F2937' : vs?.screenState === 'WARNING' ? '#7F1D1D' : '#1E3A5F'}
          emissive={vs?.screenState === 'ON' ? '#1D4ED8' : vs?.screenState === 'WARNING' ? '#991B1B' : '#000000'}
          emissiveIntensity={vs?.screenState === 'OFF' ? 0 : 0.4}
          roughness={0.1} metalness={0.6}
        />
      </RoundedBox>

      {/* Screen stand */}
      <mesh position={[0, 0.14, -0.22]}>
        <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Glow halo under desk */}
      <mesh ref={glowRef} position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial
          color={glowColor} transparent opacity={cfg.pulseAnim ? 0.3 : 0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Alert dot (top of screen) */}
      {alertColor && (
        <mesh ref={alertRef} position={[0.44, 0.68, -0.25]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={alertColor} emissive={alertColor} emissiveIntensity={0.8} />
        </mesh>
      )}

      {/* Task name label */}
      <Text
        position={[0, -0.22, 0.42]}
        fontSize={0.13}
        color={cfg.label}
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        {desk.name}
      </Text>
    </group>
  )
}
