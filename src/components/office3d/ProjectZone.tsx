'use client'
import { Workstation } from './Workstation'
import type { OfficeZone } from '@/types'

interface ProjectZoneProps {
  zone:     OfficeZone
  position: [number, number, number]
  dimmed:   boolean
}

export function ProjectZone({ zone, position, dimmed }: ProjectZoneProps) {
  const deskCount = zone.desks.length
  const zoneW     = deskCount * 1.9 + 0.8
  const opacity   = dimmed ? 0.18 : 1

  return (
    <group position={position}>
      {/* Zone carpet / mat on floor */}
      <mesh position={[0, 0.003, 0.3]} receiveShadow>
        <boxGeometry args={[zoneW, 0.006, 4.2]} />
        <meshStandardMaterial
          color="#1E293B" roughness={0.95}
          transparent opacity={opacity * 0.9}
        />
      </mesh>

      {/* Zone border glow strip */}
      <mesh position={[0, 0.005, -1.8]}>
        <boxGeometry args={[zoneW, 0.01, 0.04]} />
        <meshStandardMaterial
          color="#4F46E5" emissive="#4F46E5"
          emissiveIntensity={dimmed ? 0.3 : 1.5}
          transparent opacity={opacity}
        />
      </mesh>

      {/* Workstations */}
      {zone.desks.map((desk, i) => {
        const offsetX = (i - (deskCount - 1) / 2) * 1.9
        return (
          <Workstation
            key={desk.id}
            desk={desk}
            position={[offsetX, 0, 0]}
            index={i}
          />
        )
      })}
    </group>
  )
}
