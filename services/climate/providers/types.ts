import crypto from 'node:crypto'
import type { ClimateObservation, ClimateProviderConfig } from '@/types/domain'

export interface ClimateFetchRequest {
  latitude: number
  longitude: number
  startDate: string
  endDate: string
}

export interface ClimateProviderFetchResult {
  providerCode: ClimateProviderConfig['code']
  providerName: string
  sourceUrl: string
  isSimulatedData: boolean
  observations: ClimateObservation[]
  rawHash: string
  error?: string
}

export interface ClimateProviderAdapter {
  code: ClimateProviderConfig['code']
  name: string
  isLiveExternal: boolean
  fetchDailyPrecipitation(
    req: ClimateFetchRequest
  ): Promise<ClimateProviderFetchResult>
}

export function hashPayload(raw: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(raw))
    .digest('hex')
    .slice(0, 16)
}
