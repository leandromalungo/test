import type { ClimateProviderAdapter, ClimateFetchRequest, ClimateProviderFetchResult } from './types'
import { openMeteoAdapter } from './open-meteo'
import { nasaPowerAdapter } from './nasa-power'
import type { ClimateProviderConfig } from '@/types/domain'

/**
 * Adaptadores documentados para integrações futuras ou institucionais em Angola e Europa.
 * Não fabricam dados reais quando credenciais ou endpoints institucionais não estão disponíveis.
 */
function createPlannedAdapter(
  code: ClimateProviderConfig['code'],
  name: string,
  endpointUrl: string,
  note: string
): ClimateProviderAdapter {
  return {
    code,
    name,
    isLiveExternal: false,
    async fetchDailyPrecipitation(
      _req: ClimateFetchRequest
    ): Promise<ClimateProviderFetchResult> {
      return {
        providerCode: code,
        providerName: name,
        sourceUrl: endpointUrl,
        isSimulatedData: false,
        observations: [],
        rawHash: '',
        error: note,
      }
    },
  }
}

export const chirpsAdapter = createPlannedAdapter(
  'chirps',
  'CHIRPS v2.0 (UCSB)',
  'https://data.chc.ucsb.edu/products/CHIRPS-2.0/',
  'Adaptador CHIRPS requer pipeline de extracção raster NetCDF/GeoTIFF em servidor dedicado.'
)

export const inametAdapter = createPlannedAdapter(
  'inamet',
  'INAMET (Estações Oficiais de Angola)',
  'https://inamet.gov.ao',
  'Integração institucional com o INAMET pendente de credenciais e protocolo de dados.'
)

export const ggpenAdapter = createPlannedAdapter(
  'ggpen',
  'GGPEN (Observação Espacial Nacional)',
  'https://ggpen.gov.ao',
  'Integração institucional com o GGPEN pendente de acordo técnico.'
)

export const copernicusAdapter = createPlannedAdapter(
  'copernicus',
  'Copernicus Climate Data Store (CDS)',
  'https://cds.climate.copernicus.eu/api',
  'Integração Copernicus CDS requer variável de ambiente CDS_API_KEY configurada.'
)

export function getClimateProviderAdapter(
  code: ClimateProviderConfig['code']
): ClimateProviderAdapter {
  switch (code) {
    case 'open_meteo_era5':
      return openMeteoAdapter
    case 'nasa_power':
      return nasaPowerAdapter
    case 'chirps':
      return chirpsAdapter
    case 'inamet':
      return inametAdapter
    case 'ggpen':
      return ggpenAdapter
    case 'copernicus':
      return copernicusAdapter
  }
}
