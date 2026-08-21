'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useOfficeStore } from '@/store'
import { getDeskConfig } from '@/lib/visualStateMapper'
import { Avatar } from './Avatar'
import type { DeskInfo } from '@/types'

// Avatar shirt colors per desk
const AVATAR_COLORS = ['#7C3AED','#059669','#DC2626','#2563EB','#D97706','#0891B2','#7C3AED']

interface WorkstationProps {
  desk:     DeskInfo
  position: [number, number, number]
  index:    number
}

function lerpColor(c: THREE.Color, t: THREE.Color, a: number) {
  c.r += (t.r - c.r) * a
  c.g += (t.g - c.g) * a
  c.b += (t.b - c.b) * a
}

export function Workstation({ desk, position, index }: WorkstationProps) {
  const deskRef   = useRef<THREE.Mesh>(null)
  const screenRef = useRef<THREE.Mesh>(null)
  const glowRef   = useRef<THREE.Mesh>(null)
  const alertRef  = useRef<THREE.Mesh>(null)

  const visualStates = useOfficeStore(s => s.visualStates)
  const vs = visualStates[desk.taskId]
  const cfg = getDeskConfig(vs?.deskState ?? 'DIM')

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const target = new THREE.Color(cfg.meshColor)
    if (deskRef.current) {
      lerpColor((deskRef.current.material as THREE.MeshStandardMaterial).color, target, 0.05)
    }

    // Screen glow
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial
      const isOn      = vs?.screenState === 'ON'
      const isWarning = vs?.screenState === 'WARNING'
      const emTarget  = new THREE.Color(isOn ? cfg.glowColor : isWarning ? '#EF4444' : '#000000')
      lerpColor(mat.emissive, emTarget, 0.06)
      mat.emissiveIntensity = isOn || isWarning
        ? Math.min((mat.emissiveIntensity || 0) + delta * 2, 1.2)
        : Math.max((mat.emissiveIntensity || 0) - delta * 2, 0)
    }

    // Alert pulse
    if (cfg.pulseAnim && alertRef.current) {
      alertRef.current.scale.setScalar(0.8 + Math.sin(t * 5) * 0.2)
      ;(alertRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 5) * 0.4
    }

    // Glow halo pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = cfg.pulseAnim ? 0.15 + Math.sin(t * 3) * 0.1 : 0.06
    }
  })

  const alertColor = vs?.alertState === 'RED' ? '#EF4444' : vs?.alertState === 'YELLOW' ? '#F59E0B' : null
  const shirtColor = AVATAR_COLORS[index % AVATAR_COLORS.length]

  return (
    <group position={position}>
      {/* Desk surface — dark wood style */}
      <mesh ref={deskRef} position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.06, 0.85]} />
        <meshStandardMaterial color={cfg.meshColor} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Desk legs — metal */}
      {([-0.62, 0.62] as number[]).flatMap(x =>
        ([-0.35, 0.35] as number[]).map(z => (
          <mesh key={`${x}-${z}`} position={[x, 0.3, z]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* Monitor body */}
      <mesh position={[0, 1.12, -0.28]} castShadow>
        <boxGeometry args={[0.9, 0.56, 0.05]} />
        <meshStandardMaterial color="#1F2937" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Monitor screen — glowing */}
      <mesh ref={screenRef} position={[0, 1.12, -0.25]}>
        <boxGeometry args={[0.82, 0.48, 0.01]} />
        <meshStandardMaterial
          color="#0A0A1A"
          emissive={new THREE.Color(cfg.glowColor)}
          emissiveIntensity={vs?.screenState === 'OFF' ? 0 : 0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Screen glow light */}
      <pointLight
        position={[0, 1.1, -0.1]}
        color={cfg.glowColor}
        intensity={vs?.screenState === 'OFF' ? 0 : 0.4}
        distance={1.5}
      />

      {/* Monitor stand */}
      <mesh position={[0, 0.8, -0.26]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.65, -0.24]}>
        <boxGeometry args={[0.2, 0.02, 0.15]} />
        <meshStandardMaterial color="#374151" metalness={0.7} />
      </mesh>

      {/* Keyboard */}
      <mesh position={[0, 0.66, 0.1]}>
        <boxGeometry args={[0.55, 0.02, 0.2]} />
        <meshStandardMaterial color="#1F2937" roughness={0.8} />
      </mesh>

      {/* Mouse */}
      <mesh position={[0.38, 0.66, 0.12]}>
        <boxGeometry args={[0.08, 0.02, 0.12]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>

      {/* Status indicator light on desk */}
      <mesh position={[-0.55, 0.67, 0.3]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial
          color={cfg.glowColor}
          emissive={cfg.glowColor}
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Alert dot above monitor */}
      {alertColor && (
        <mesh ref={alertRef} position={[0.5, 1.42, -0.28]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color={alertColor} emissive={alertColor} emissiveIntensity={1} />
        </mesh>
      )}

      {/* Glow halo on floor */}
      <mesh ref={glowRef} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial
          color={cfg.glowColor} transparent opacity={0.08} depthWrite={false}
        />
      </mesh>

      {/* Avatar sitting at desk */}
      <Avatar
        position={[0, 0.62, 0.52]}
        color={shirtColor}
        state={vs?.avatarState ?? 'IDLE'}
        rotation={Math.PI}
      />
    </group>
  )
}
