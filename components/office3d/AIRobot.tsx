// src/components/office3d/AIRobot.tsx
// AI Agent robot — animates when aiRobotActive

'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useOfficeStore } from '@/store'

export function AIRobot() {
  const active   = useOfficeStore(s => s.aiRobotActive)
  const groupRef = useRef<THREE.Group>(null)
  const eyeL     = useRef<THREE.Mesh>(null)
  const eyeR     = useRef<THREE.Mesh>(null)
  const auraRef  = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current) return

    if (active) {
      // Hover up/down when scanning
      groupRef.current.position.y = 0.15 + Math.sin(t * 2) * 0.08
      groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.4
    } else {
      // Idle — gentle float
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.04
      groupRef.current.rotation.y += 0.002
    }

    // Eye glow pulse
    const eyeIntensity = active ? 0.6 + Math.sin(t * 6) * 0.4 : 0.3
    if (eyeL.current) (eyeL.current.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity
    if (eyeR.current) (eyeR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity

    // Aura pulse
    if (auraRef.current) {
      const s = active ? 1 + Math.sin(t * 3) * 0.15 : 1
      auraRef.current.scale.setScalar(s)
      ;(auraRef.current.material as THREE.MeshStandardMaterial).opacity = active ? 0.25 + Math.sin(t * 3) * 0.1 : 0.08
    }
  })

  const bodyColor = active ? '#4F46E5' : '#6B7280'
  const eyeColor  = active ? '#60A5FA' : '#9CA3AF'

  return (
    <group ref={groupRef} position={[3.2, 0.6, 0]}>
      {/* Aura ring */}
      <mesh ref={auraRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 8, 32]} />
        <meshStandardMaterial color={active ? '#4F46E5' : '#9CA3AF'} transparent opacity={0.1} />
      </mesh>

      {/* Body */}
      <RoundedBox args={[0.5, 0.6, 0.3]} radius={0.06} position={[0, 0, 0]}>
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.5}
          emissive={active ? '#312E81' : '#000000'} emissiveIntensity={active ? 0.3 : 0} />
      </RoundedBox>

      {/* Head */}
      <RoundedBox args={[0.38, 0.32, 0.28]} radius={0.05} position={[0, 0.46, 0]}>
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.5} />
      </RoundedBox>

      {/* Eyes */}
      <Sphere ref={eyeL} args={[0.06, 16, 16]} position={[-0.1, 0.48, 0.14]}>
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.3} />
      </Sphere>
      <Sphere ref={eyeR} args={[0.06, 16, 16]} position={[0.1, 0.48, 0.14]}>
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.3} />
      </Sphere>

      {/* Antenna */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <Sphere args={[0.04, 8, 8]} position={[0, 0.78, 0]}>
        <meshStandardMaterial color={active ? '#60A5FA' : '#9CA3AF'}
          emissive={active ? '#3B82F6' : '#000000'} emissiveIntensity={active ? 1 : 0} />
      </Sphere>

      {/* Arms */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.32, 0.05, 0]} rotation={[0, 0, side * 0.3]}>
          <cylinderGeometry args={[0.04, 0.04, 0.36, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}
