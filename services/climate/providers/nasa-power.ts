import { z } from 'zod'
import { hashPayload, type ClimateFetchRequest, type ClimateProviderAdapter, type ClimateProviderFetchResult } from './types'
import type { ClimateObservation } from '@/types/domain'

const nasaPowerResponseSchema = z.object({
  geometry: z
    .object({
      coordinates: z.array(z.number()),
    })
    .optional(),
  properties: z.object({
    parameter: z.object({
      PRECTOTCORR: z.record(z.string(), z.number()),
    }),
  }),
})

/**
 * Adaptador real para a API NASA POWER Daily Agroclimatology (parâmetro PRECTOTCORR em mm/dia).
 * Funciona como fonte secundária independente de confirmação para detecção de discordâncias.
 * Converte o valor sentinela oficial da NASA (-999) para `null` (nunca para 0 mm).
 */
export const nasaPowerAdapter: ClimateProviderAdapter = {
  code: 'nasa_power',
  name: 'NASA POWER Daily Agroclimatology',
  isLiveExternal: true,

  async fetchDailyPrecipitation(
    req: ClimateFetchRequest
  ): Promise<ClimateProviderFetchResult> {
    const baseUrl =
      process.env.NASA_POWER_DAILY_URL ||
      'https://power.larc.nasa.gov/api/temporal/daily/point'
    const startCompact = req.startDate.replaceAll('-', '')
    const endCompact = req.endDate.replaceAll('-', '')

    const url = new URL(baseUrl)
    url.searchParams.set('parameters', 'PRECTOTCORR')
    url.searchParams.set('community', 'AG')
    url.searchParams.set('longitude', req.longitude.toFixed(4))
    url.searchParams.set('latitude', req.latitude.toFixed(4))
    url.searchParams.set('start', startCompact)
    url.searchParams.set('end', endCompact)
    url.searchParams.set('format', 'JSON')

    const sourceUrl = url.toString()
    const retrievedAt = new Date().toISOString()

    try {
      const response = await fetch(sourceUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      })

      if (!response.ok) {
        return {
          providerCode: 'nasa_power',
          providerName: 'NASA POWER Daily Agroclimatology',
          sourceUrl,
          isSimulatedData: false,
          observations: [],
          rawHash: '',
          error: `NASA POWER respondeu com HTTP ${response.status}`,
        }
      }

      const rawJson: unknown = await response.json()
      const parsed = nasaPowerResponseSchema.safeParse(rawJson)
      if (!parsed.success) {
        return {
          providerCode: 'nasa_power',
          providerName: 'NASA POWER Daily Agroclimatology',
          sourceUrl,
          isSimulatedData: false,
          observations: [],
          rawHash: '',
          error: 'Estrutura inesperada devolvida pela NASA POWER API.',
        }
      }

      const rawHash = hashPayload(rawJson)
      const entries = Object.entries(parsed.data.properties.parameter.PRECTOTCORR)

      const observations: ClimateObservation[] = entries.map(([ymd, rawVal]) => {
        const obsDate = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
        // A NASA utiliza -999 (ou < -900) para indicar dado ausente
        const isMissingSentinel = rawVal <= -900
        const value = isMissingSentinel ? null : rawVal
        const invalid = value !== null && (value < 0 || value > 500)

        return {
          id: `obs-np-${req.latitude.toFixed(2)}-${req.longitude.toFixed(2)}-${obsDate}`,
          providerCode: 'nasa_power',
          providerName: 'NASA POWER Daily Agroclimatology',
          latitude: req.latitude,
          longitude: req.longitude,
          observationDate: obsDate,
          precipitationMm: value,
          unit: 'mm',
          retrievedAt,
          sourceUrl,
          spatialResolution: '~50 km (0.5° × 0.625°)',
          qualityStatus:
            value === null
              ? 'insufficient'
              : invalid
                ? 'invalid_values'
                : 'valid',
          isSimulatedData: false,
          rawPayloadReference: `nasa-power:${rawHash}:${obsDate}`,
          validationNotes:
            value === null
              ? ['Sentinela -999 recebida da NASA POWER (dado em falta, mantido como null).']
              : invalid
                ? [`Valor fora do intervalo admissível: ${value} mm`]
                : ['Leitura validada directamente da NASA POWER API.'],
        }
      })

      return {
        providerCode: 'nasa_power',
        providerName: 'NASA POWER Daily Agroclimatology',
        sourceUrl,
        isSimulatedData: false,
        observations,
        rawHash,
      }
    } catch (error) {
      return {
        providerCode: 'nasa_power',
        providerName: 'NASA POWER Daily Agroclimatology',
        sourceUrl,
        isSimulatedData: false,
        observations: [],
        rawHash: '',
        error:
          error instanceof Error
            ? `Falha na ligação à NASA POWER: ${error.message}`
            : 'Erro desconhecido ao consultar NASA POWER.',
      }
    }
  },
}
