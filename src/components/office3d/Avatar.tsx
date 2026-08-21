'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AvatarState } from '@/types'

interface AvatarProps {
  position: [number, number, number]
  color: string
  state: AvatarState
  rotation?: number
}

export function Avatar({ position, color, state, rotation = 0 }: AvatarProps) {
  const groupRef  = useRef<THREE.Group>(null)
  const headRef   = useRef<THREE.Mesh>(null)
  const armLRef   = useRef<THREE.Group>(null)
  const armRRef   = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (state === 'WAITING') {
      // Idle — slight head bob, no typing
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(t * 0.8) * 0.04
        headRef.current.rotation.y = Math.sin(t * 0.5) * 0.08
      }
      if (armLRef.current) armLRef.current.rotation.x = -0.3
      if (armRRef.current) armRRef.current.rotation.x = -0.3
    } else if (state === 'IDLE') {
      // Relaxed lean back
      if (groupRef.current) groupRef.current.rotation.x = -0.05
      if (headRef.current) headRef.current.rotation.x = Math.sin(t * 0.4) * 0.03
    } else {
      // Typing animation — arms move up/down
      if (headRef.current) {
        headRef.current.rotation.x = -0.1 + Math.sin(t * 1.2) * 0.03
      }
      if (armLRef.current) {
        armLRef.current.rotation.x = -0.6 + Math.sin(t * 4 + 0.5) * 0.12
      }
      if (armRRef.current) {
        armRRef.current.rotation.x = -0.6 + Math.sin(t * 4) * 0.12
      }
    }
  })

  const skinColor  = '#F5CBA7'
  const pantsColor = '#374151'

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Torso / shirt */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Pants */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.26, 0.18, 0.17]} />
        <meshStandardMaterial color={pantsColor} roughness={0.9} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </mesh>

      {/* Hair cap */}
      <mesh position={[0, 0.555, 0]}>
        <boxGeometry args={[0.23, 0.07, 0.23]} />
        <meshStandardMaterial color="#1F1F1F" roughness={1} />
      </mesh>

      {/* Left arm */}
      <group ref={armLRef} position={[-0.18, 0.28, 0.04]}>
        <mesh position={[0, -0.1, 0.06]} castShadow>
          <boxGeometry args={[0.09, 0.22, 0.09]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.22, 0.1]}>
          <boxGeometry args={[0.08, 0.07, 0.08]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={armRRef} position={[0.18, 0.28, 0.04]}>
        <mesh position={[0, -0.1, 0.06]} castShadow>
          <boxGeometry args={[0.09, 0.22, 0.09]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.22, 0.1]}>
          <boxGeometry args={[0.08, 0.07, 0.08]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.08, -0.12, 0]} castShadow>
        <boxGeometry args={[0.1, 0.14, 0.14]} />
        <meshStandardMaterial color={pantsColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.08, -0.12, 0]} castShadow>
        <boxGeometry args={[0.1, 0.14, 0.14]} />
        <meshStandardMaterial color={pantsColor} roughness={0.9} />
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.08, -0.21, 0.02]}>
        <boxGeometry args={[0.1, 0.06, 0.16]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, -0.21, 0.02]}>
        <boxGeometry args={[0.1, 0.06, 0.16]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
    </group>
  )
}
