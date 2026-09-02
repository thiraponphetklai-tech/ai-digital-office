'use client'

import { useEffect } from 'react'
import { useOfficeStore, usePrefsStore, useProjectStore, useResourceStore, useTaskStore } from '@/store'
import type { Project, Resource, Task } from '@/types'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`)
  return response.json() as Promise<T>
}

export function ApiDataHydrator() {
  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const [projects, resources] = await Promise.all([
          fetchJson<Project[]>('/api/projects'),
          fetchJson<Resource[]>('/api/resources'),
        ])
        const taskGroups = await Promise.all(projects.map(project => fetchJson<Task[]>(`/api/projects/${encodeURIComponent(project.id)}/tasks`)))
        if (cancelled) return

        useProjectStore.getState().setProjects(projects)
        useResourceStore.getState().setResources(resources)
        useTaskStore.getState().setTasks(taskGroups.flat())

        const { prefs, setActiveProject } = usePrefsStore.getState()
        if (projects.length > 0 && !projects.some(project => project.id === prefs.activeProjectId)) {
          setActiveProject(projects[0].id)
        }
      } catch (error) {
        console.error('Unable to load workspace data from the API', error)
      }
    }

    void hydrate()
    return () => { cancelled = true }
  }, [])

  return null
}
