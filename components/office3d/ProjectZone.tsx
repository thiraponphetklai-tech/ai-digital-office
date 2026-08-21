// src/components/office3d/ProjectZone.tsx
// Zone floor + label + workstations

'use client'
import { Text } from '@react-three/drei'
import { useOfficeStore } from '@/store'
import { Workstation } from './Workstation'
import type { OfficeZone } from '@/types'

interface ProjectZoneProps {
  zone:     OfficeZone
  position: [number, number, number]
  dimmed:   boolean
}

const ZONE_COLORS: Record<string, string> = {
  product:    '#EEF2FF',
  technology: '#F0FDF4',
  operations: '#FFF7ED',
}

export function ProjectZone({ zone, position, dimmed }: ProjectZoneProps) {
  const floorColor = ZONE_COLORS[zone.id] ?? '#F9FAFB'
  const deskCount  = zone.desks.length
  const zoneWidth  = deskCount * 1.6 + 0.6

  return (
    <group position={position} visible={true}>
      {/* Fade group via opacity trick using userData */}
      <group userData={{ dimmed }}>

        {/* Zone floor tile */}
        <mesh position={[0, -0.01, 0]} receiveShadow>
          <boxGeometry args={[zoneWidth, 0.06, 2.2]} />
          <meshStandardMaterial
            color={floorColor}
            roughness={0.9}
            opacity={dimmed ? 0.15 : 1}
            transparent
          />
        </mesh>

        {/* Zone label */}
        <Text
          position={[0, 0.05, 1.2]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color={dimmed ? '#D1D5DB' : '#6366F1'}
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          {zone.label.toUpperCase()}
        </Text>

        {/* Workstations */}
        {zone.desks.map((desk, i) => {
          const offsetX = (i - (deskCount - 1) / 2) * 1.6
          return (
            <group
              key={desk.id}
              opacity={dimmed ? 0.15 : 1}
            >
              <Workstation
                desk={desk}
                position={[offsetX, 0.1, 0]}
              />
            </group>
          )
        })}

        {/* Zone border line */}
        <lineSegments position={[0, 0.04, 0]}>
          <edgesGeometry args={[new (require('three').BoxGeometry)(zoneWidth, 0.001, 2.2)]} />
          <lineBasicMaterial color={dimmed ? '#E5E7EB' : '#C7D2FE'} />
        </lineSegments>

      </group>
    </group>
  )
}
