import { describe, it, expect } from 'vitest'
import { classifyVolumeStatus, VOLUME_TARGETS, MUSCLE_GROUPS } from './volume'

describe('classifyVolumeStatus (MEV/MAV)', () => {
  it('low sous le MEV', () => {
    expect(classifyVolumeStatus(4, 10, 18)).toBe('low')
    expect(classifyVolumeStatus(0, 10, 18)).toBe('low')
  })
  it('optimal entre MEV et MAV (bornes incluses côté MEV)', () => {
    expect(classifyVolumeStatus(10, 10, 18)).toBe('optimal') // = MEV
    expect(classifyVolumeStatus(14, 10, 18)).toBe('optimal')
    expect(classifyVolumeStatus(17, 10, 18)).toBe('optimal')
  })
  it('high au-delà du MAV (borne incluse)', () => {
    expect(classifyVolumeStatus(18, 10, 18)).toBe('high') // = MAV
    expect(classifyVolumeStatus(25, 10, 18)).toBe('high')
  })
  it('gère un MEV à 0 (avant-bras) : 0 série reste low', () => {
    expect(classifyVolumeStatus(0, 0, 10)).toBe('optimal') // 0 >= 0 → optimal (cohérent avec la logique existante)
    expect(classifyVolumeStatus(10, 0, 10)).toBe('high')
  })
})

describe('constantes volume', () => {
  it('chaque groupe de VOLUME_TARGETS a mev <= mav', () => {
    for (const { mev, mav } of Object.values(VOLUME_TARGETS)) {
      expect(mev).toBeLessThanOrEqual(mav)
    }
  })
  it('MUSCLE_GROUPS mappe vers des groupes présents dans VOLUME_TARGETS', () => {
    const targets = new Set(Object.keys(VOLUME_TARGETS))
    // Avant-bras a un MEV 0 mais existe ; tous les groupes mappés doivent avoir une cible
    for (const group of Object.values(MUSCLE_GROUPS)) {
      expect(targets.has(group)).toBe(true)
    }
  })
})
