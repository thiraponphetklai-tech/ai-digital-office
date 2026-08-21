'use client'
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useOfficeStore } from '@/store'

const ZONE_X: Record<string, number> = {
  product: -5.8, technology: 0, operations: 5.8,
}
const HUB = new THREE.Vector3(8, 1.5, 0)

export function AIRobot() {
  const active = useOfficeStore(s => s.aiRobotActive)
  const zones = useOfficeStore(s => s.zones)
  const visualStates = useOfficeStore(s => s.visualStates)
  const riskZones = useMemo(
    () => zones.filter(zone => zone.desks.some(desk => {
      const state = visualStates[desk.taskId]
      return state?.deskState === 'BLOCKED' || state?.deskState === 'RISK'
    })),
    [zones, visualStates]
  )
  const groupRef = useRef<THREE.Group>(null)
  const eyeL     = useRef<THREE.Mesh>(null)
  const eyeR     = useRef<THREE.Mesh>(null)
  const bodyRef  = useRef<THREE.Mesh>(null)
  const beamRef  = useRef<THREE.Mesh>(null)

  const targetPos = useRef(new THREE.Vector3(8, 1.5, 0))
  const scanIdx   = useRef(0)
  const scanTimer = useRef(0)

  useEffect(() => {
    if (active) {
      scanIdx.current   = 0
      scanTimer.current = 0
      if (riskZones.length > 0) targetPos.current.set(ZONE_X[riskZones[0].id] ?? 0, 1.5, 1.5)
    } else {
      targetPos.current.copy(HUB)
    }
  }, [active, riskZones])

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    // Move toward target
    groupRef.current.position.lerp(targetPos.current, delta * 1.6)

    // Float
    groupRef.current.position.y = targetPos.current.y + Math.sin(t * (active ? 3 : 1)) * 0.08

    // Face target direction
    const dir = targetPos.current.clone().sub(groupRef.current.position)
    if (dir.length() > 0.3) {
      const angle = Math.atan2(dir.x, dir.z)
      groupRef.current.rotation.y += (angle - groupRef.current.rotation.y) * delta * 3
    }

    // Scan next zone
    if (active) {
      scanTimer.current += delta
      if (scanTimer.current > 2.8) {
        scanTimer.current = 0
        scanIdx.current++
        if (scanIdx.current < riskZones.length) {
          targetPos.current.set(ZONE_X[riskZones[scanIdx.current].id] ?? 0, 1.5, 1.5)
        } else {
          targetPos.current.copy(HUB)
        }
      }
    }

    // Eye glow
    const ei = active ? 0.8 + Math.sin(t * 8) * 0.2 : 0.2
    if (eyeL.current) (eyeL.current.material as THREE.MeshStandardMaterial).emissiveIntensity = ei
    if (eyeR.current) (eyeR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = ei

    // Body pulse
    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = active ? 0.2 + Math.sin(t * 3) * 0.1 : 0.05
    }

    // Scan beam
    if (beamRef.current) {
      beamRef.current.visible = active
      beamRef.current.rotation.z = t * 2
      const mat = beamRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.08 + Math.sin(t * 4) * 0.04
    }
  })

  const bodyColor = active ? '#4F46E5' : '#374151'
  const eyeColor  = active ? '#60A5FA' : '#6B7280'

  return (
    <group ref={groupRef} position={[8, 1.5, 0]}>
      {/* Scan beam */}
      <mesh ref={beamRef} position={[0, -0.8, 0.5]} rotation={[0.5, 0, 0]} visible={false}>
        <coneGeometry args={[0.5, 1.5, 6, 1, true]} />
        <meshStandardMaterial color="#60A5FA" transparent opacity={0.1}
          depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Body */}
      <mesh ref={bodyRef} castShadow>
        <boxGeometry args={[0.52, 0.65, 0.32]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3}
          emissive={active ? '#312E81' : '#1E3A5F'} emissiveIntensity={0.05} />
      </mesh>

      {/* Chest panel */}
      <mesh position={[0, 0.05, 0.17]}>
        <boxGeometry args={[0.3, 0.25, 0.02]} />
        <meshStandardMaterial color="#0F172A" emissive={active ? '#4F46E5' : '#1E3A5F'}
          emissiveIntensity={active ? 1 : 0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.4, 0.34, 0.3]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Visor */}
      <mesh position={[0, 0.53, 0.16]}>
        <boxGeometry args={[0.32, 0.12, 0.02]} />
        <meshStandardMaterial color="#0A0A1A" emissive={eyeColor}
          emissiveIntensity={active ? 0.8 : 0.2} />
      </mesh>

      {/* Eyes */}
      <mesh ref={eyeL} position={[-0.1, 0.53, 0.16]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={eyeR} position={[0.1, 0.53, 0.16]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.3} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color={active ? '#60A5FA' : '#9CA3AF'}
          emissive={active ? '#3B82F6' : '#000'} emissiveIntensity={active ? 2 : 0} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.34, 0.08, 0]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.12, 0.42, 0.14]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.34, 0.08, 0]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.12, 0.42, 0.14]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}
