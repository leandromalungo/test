import { z } from 'zod'
import { hashPayload, type ClimateFetchRequest, type ClimateProviderAdapter, type ClimateProviderFetchResult } from './types'
import type { ClimateObservation } from '@/types/domain'

const openMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  daily: z.object({
    time: z.array(z.string()),
    precipitation_sum: z.array(z.number().nullable()),
  }),
})

/**
 * Adaptador real para a API histórica Open-Meteo (ERA5 / ERA5-Land).
 * Endpoint público documentado sem necessidade de chave de API para fins de investigação e MVP.
 * Normaliza todas as leituras de precipitação para milímetros (mm) e preserva valores nulos
 * sem os converter indevidamente para zero.
 */
export const openMeteoAdapter: ClimateProviderAdapter = {
  code: 'open_meteo_era5',
  name: 'Open-Meteo ERA5 / ERA5-Land',
  isLiveExternal: true,

  async fetchDailyPrecipitation(
    req: ClimateFetchRequest
  ): Promise<ClimateProviderFetchResult> {
    const baseUrl =
      process.env.OPEN_METEO_ARCHIVE_URL ||
      'https://archive-api.open-meteo.com/v1/archive'
    const url = new URL(baseUrl)
    url.searchParams.set('latitude', req.latitude.toFixed(4))
    url.searchParams.set('longitude', req.longitude.toFixed(4))
    url.searchParams.set('start_date', req.startDate)
    url.searchParams.set('end_date', req.endDate)
    url.searchParams.set('daily', 'precipitation_sum')
    url.searchParams.set('timezone', 'Africa/Luanda')

    const sourceUrl = url.toString()
    const retrievedAt = new Date().toISOString()

    try {
      const response = await fetch(sourceUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {
          providerCode: 'open_meteo_era5',
          providerName: 'Open-Meteo ERA5 / ERA5-Land',
          sourceUrl,
          isSimulatedData: false,
          observations: [],
          rawHash: '',
          error: `Open-Meteo respondeu com HTTP ${response.status}`,
        }
      }

      const rawJson: unknown = await response.json()
      const parsed = openMeteoResponseSchema.safeParse(rawJson)
      if (!parsed.success) {
        return {
          providerCode: 'open_meteo_era5',
          providerName: 'Open-Meteo ERA5 / ERA5-Land',
          sourceUrl,
          isSimulatedData: false,
          observations: [],
          rawHash: '',
          error: 'Estrutura de resposta inesperada recebida do Open-Meteo.',
        }
      }

      const rawHash = hashPayload(rawJson)
      const { time, precipitation_sum } = parsed.data.daily

      const observations: ClimateObservation[] = time.map((obsDate, index) => {
        const value = precipitation_sum[index] ?? null
        const invalid = value !== null && (value < 0 || value > 500)
        return {
          id: `obs-om-${req.latitude.toFixed(2)}-${req.longitude.toFixed(2)}-${obsDate}`,
          providerCode: 'open_meteo_era5',
          providerName: 'Open-Meteo ERA5 / ERA5-Land',
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          observationDate: obsDate,
          precipitationMm: value,
          unit: 'mm',
          retrievedAt,
          sourceUrl,
          spatialResolution: '~9 km (ERA5-Land)',
          qualityStatus:
            value === null
              ? 'insufficient'
              : invalid
                ? 'invalid_values'
                : 'valid',
          isSimulatedData: false,
          rawPayloadReference: `open-meteo:${rawHash}:${obsDate}`,
          validationNotes:
            value === null
              ? ['Valor nulo na resposta Open-Meteo (mantido como em falta).']
              : invalid
                ? [`Valor fora do intervalo admissível: ${value} mm`]
                : ['Leitura validada directamente da API Open-Meteo ERA5.'],
        }
      })

      return {
        providerCode: 'open_meteo_era5',
        providerName: 'Open-Meteo ERA5 / ERA5-Land',
        sourceUrl,
        isSimulatedData: false,
        observations,
        rawHash,
      }
    } catch (error) {
      return {
        providerCode: 'open_meteo_era5',
        providerName: 'Open-Meteo ERA5 / ERA5-Land',
        sourceUrl,
        isSimulatedData: false,
        observations: [],
        rawHash: '',
        error:
          error instanceof Error
            ? `Falha na ligação ao Open-Meteo: ${error.message}`
            : 'Erro desconhecido ao consultar Open-Meteo.',
      }
    }
  },
}
