'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calculator, CheckCircle2, CreditCard, FileText, Loader2 } from 'lucide-react'
import { formatAOA } from '@/config/angola'
import { FormField, SelectInput, TextInput } from '@/components/ui/field'
import type {
  AgriculturalCampaign,
  CropType,
  FarmProperty,
  InsurancePolicy,
  InsuranceProduct,
  InsuranceSimulation,
} from '@/types/domain'

interface SimulatorWorkspaceProps {
  farms: FarmProperty[]
  crops: CropType[]
  campaigns: AgriculturalCampaign[]
  products: InsuranceProduct[]
}

/**
 * Fluxo completo de Simulação, Aceitação de Condições, Subscrição e Pagamento Simulado do Prémio.
 * Todos os produtos, regras e cálculos são obtidos e processados exclusivamente no backend.
 */
export function SimulatorWorkspace({
  farms,
  crops,
  campaigns,
  products,
}: SimulatorWorkspaceProps) {
  const router = useRouter()
  const [farmId, setFarmId] = useState(farms[0]?.id || '')
  const [cropId, setCropId] = useState(farms[0]?.primaryCropId || crops[0]?.id || '')
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || '')
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [insuredCapitalAoa, setInsuredCapitalAoa] = useState('1500000')

  const [simulating, setSimulating] = useState(false)
  const [simulation, setSimulation] = useState<InsuranceSimulation | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [createdPolicy, setCreatedPolicy] = useState<InsurancePolicy | null>(null)
  const [paymentChannel, setPaymentChannel] = useState<
    'multicaixa_express_sim' | 'bai_directo_sim' | 'unitel_money_sim'
  >('multicaixa_express_sim')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = products.find((p) => p.id === productId)
  const selectedFarm = farms.find((f) => f.id === farmId)

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    setSimulating(true)
    setError(null)
    setSimulation(null)
    setCreatedPolicy(null)
    setTermsAccepted(false)

    try {
      const res = await fetch('/api/insurance/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          cropId,
          campaignId,
          productId,
          insuredCapitalAoa: Number(insuredCapitalAoa),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao executar simulação.')
      } else {
        setSimulation(data.simulation)
      }
    } catch {
      setError('Falha de comunicação com o motor de simulação.')
    } finally {
      setSimulating(false)
    }
  }

  async function handleCreatePolicy() {
    if (!simulation || !termsAccepted) return
    setSubscribing(true)
    setError(null)
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId: simulation.id,
          termsAccepted: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Não foi possível criar a apólice.')
      } else {
        setCreatedPolicy(data.policy)
      }
    } catch {
      setError('Erro ao subscrever apólice.')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleSimulatePremiumPayment(simulateOutcome: 'successful' | 'failed') {
    if (!createdPolicy) return
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'premium',
          policyId: createdPolicy.id,
          channel: paymentChannel,
          simulateOutcome,
          idempotencyKey: `prem-${createdPolicy.id}-${Date.now()}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao simular pagamento.')
      } else if (data.payment?.status === 'failed') {
        setError(data.payment.failureReason || 'Pagamento simulado falhou.')
      } else {
        router.push(`/dashboard/policies/${createdPolicy.id}`)
        router.refresh()
      }
    } catch {
      setError('Erro de ligação durante a simulação de pagamento.')
    } finally {
      setPaying(false)
    }
  }

  if (farms.length === 0) {
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-6 text-center">
        <p className="text-sm font-medium text-[#171717]">
          Registe primeiro uma propriedade agrícola para poder simular o seu seguro.
        </p>
        <Link
          href="/dashboard/farms/new"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8]"
        >
          Registar Propriedade
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Formulário de entrada da simulação */}
      <form
        onSubmit={handleSimulate}
        className="space-y-4 rounded-lg border border-[#E5E7EB] bg-white p-6 lg:col-span-6"
      >
        <div className="border-b border-[#E5E7EB] pb-4">
          <h2 className="text-base font-semibold text-[#171717]">
            1. Parâmetros da Cobertura
          </h2>
          <p className="mt-1 text-xs text-[#737373]">
            Seleccione a lavra, cultura e o produto configurado pela NOSSA Seguros.
          </p>
        </div>

        <FormField label="Propriedade Agrícola" htmlFor="sim-farm">
          <SelectInput
            id="sim-farm"
            value={farmId}
            onChange={(e) => {
              setFarmId(e.target.value)
              const f = farms.find((x) => x.id === e.target.value)
              if (f) setCropId(f.primaryCropId)
            }}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.province} ({f.areaHectares} ha)
              </option>
            ))}
          </SelectInput>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Cultura Segurada" htmlFor="sim-crop">
            <SelectInput
              id="sim-crop"
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Campanha Agrícola" htmlFor="sim-camp">
            <SelectInput
              id="sim-camp"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>

        <FormField label="Produto Paramétrico (Seca / Excesso de Chuva)" htmlFor="sim-prod">
          <SelectInput
            id="sim-prod"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.coverageType === 'drought' ? 'Seca' : 'Excesso Chuva'})
              </option>
            ))}
          </SelectInput>
        </FormField>

        {selectedProduct && (
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-3 text-xs text-[#525252] space-y-1">
            <p>
              <strong className="text-[#171717]">Indicador:</strong>{' '}
              Precipitação acumulada em{' '}
              <span className="font-mono">{selectedProduct.observationWindowDays} dias</span>{' '}
              (gatilho:{' '}
              <span className="font-mono font-semibold">
                {selectedProduct.coverageType === 'drought' ? '< ' : '> '}
                {selectedProduct.triggerThresholdMm} mm
              </span>
              )
            </p>
            <p>
              <strong className="text-[#171717]">Províncias elegíveis:</strong>{' '}
              {selectedProduct.supportedProvinces.join(', ')}
            </p>
          </div>
        )}

        <FormField
          label="Capital Segurado Pretendido (AOA)"
          htmlFor="sim-capital"
          hint={
            selectedProduct
              ? `Limites: ${formatAOA(selectedProduct.minCapitalAoa)} até ${formatAOA(selectedProduct.maxCapitalAoa)}`
              : undefined
          }
        >
          <TextInput
            id="sim-capital"
            type="number"
            min="50000"
            step="50000"
            required
            value={insuredCapitalAoa}
            onChange={(e) => setInsuredCapitalAoa(e.target.value)}
          />
        </FormField>

        {selectedFarm &&
          selectedProduct &&
          !selectedProduct.supportedProvinces.includes(selectedFarm.province) && (
            <p className="text-xs font-medium text-[#D97706]">
              Nota: A província {selectedFarm.province} não está na lista deste produto. Escolha outro produto compatível.
            </p>
          )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={simulating}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          {simulating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          <span>{simulating ? 'A calcular no servidor...' : 'Calcular Prémio e Simular'}</span>
        </button>
      </form>

      {/* Painel de resultado detalhado + subscrição + pagamento */}
      <div className="space-y-6 lg:col-span-6">
        {!simulation ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-8 text-center">
            <Calculator className="h-8 w-8 text-[#737373]" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-[#171717]">
              Resultado da Simulação
            </h3>
            <p className="mt-1 max-w-sm text-sm text-[#737373]">
              Preencha os parâmetros à esquerda para obter o detalhamento exacto do prémio, taxa efectiva e gatilho contratual.
            </p>
          </div>
        ) : (
          <div className="space-y-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
            <div className="border-b border-[#E5E7EB] pb-4">
              <p className="text-xs font-medium text-[#16A34A]">
                Simulação Calculada no Servidor
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs text-[#737373]">Prémio Estimado</p>
                  <p className="font-mono text-2xl font-bold text-[#171717] tabular-nums">
                    {formatAOA(simulation.estimatedPremiumAoa)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#737373]">Indemnização Máxima (100%)</p>
                  <p className="font-mono text-lg font-semibold text-[#2563EB] tabular-nums">
                    {formatAOA(simulation.maxPossibleIndemnityAoa)}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhamento transparente do cálculo actuarial */}
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-[#171717]">
                Decomposição do Cálculo Actuarial
              </p>
              <div className="flex justify-between text-[#737373]">
                <span>Taxa Base do Produto</span>
                <span className="font-mono text-[#171717] tabular-nums">
                  {(simulation.breakdown.baseRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-[#737373]">
                <span>Factor Provincial ({simulation.province})</span>
                <span className="font-mono text-[#171717] tabular-nums">
                  × {simulation.breakdown.provinceMultiplier.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#737373]">
                <span>Factor da Cultura ({simulation.cropName})</span>
                <span className="font-mono text-[#171717] tabular-nums">
                  × {simulation.breakdown.cropMultiplier.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#737373]">
                <span>Taxa Efectiva Aplicada</span>
                <span className="font-mono font-semibold text-[#171717] tabular-nums">
                  {(simulation.breakdown.effectiveRate * 100).toFixed(2)}%
                </span>
              </div>
              <p className="pt-2 text-[11px] leading-relaxed text-[#737373]">
                {simulation.breakdown.assumptionsNote}
              </p>
            </div>

            {/* Passo 2: Aceitar condições e criar apólice */}
            {!createdPolicy ? (
              <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
                <label className="flex items-start gap-2.5 text-xs text-[#525252] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] accent-[#2563EB]"
                  />
                  <span>
                    Li e aceito as{' '}
                    <Link href="/terms" className="text-[#2563EB] underline">
                      condições paramétricas
                    </Link>
                    : o gatilho de{' '}
                    <strong className="text-[#171717]">
                      {simulation.triggerThresholdMm} mm em {simulation.observationWindowDays} dias
                    </strong>{' '}
                    baseia-se exclusivamente em fontes climáticas externas e representa uma simulação de demonstração.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!termsAccepted || subscribing}
                  onClick={handleCreatePolicy}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#16A34A] px-4 text-sm font-medium text-white hover:bg-[#15803D] disabled:opacity-50"
                >
                  {subscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>
                    {subscribing
                      ? 'A gerar apólice...'
                      : 'Aceitar Condições e Subscrever Apólice'}
                  </span>
                </button>
              </div>
            ) : (
              /* Passo 3: Pagamento simulado do prémio para activar a apólice */
              <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
                <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#15803D]">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Apólice {createdPolicy.policyNumber} criada (Aguarda Pagamento)</span>
                  </div>
                  <p className="mt-1">
                    Conclua o pagamento simulado de {formatAOA(createdPolicy.premiumAoa)} para emitir e activar a cobertura.
                  </p>
                </div>

                <FormField label="Canal de Pagamento (Modo Simulado)" htmlFor="pay-channel">
                  <SelectInput
                    id="pay-channel"
                    value={paymentChannel}
                    onChange={(e) =>
                      setPaymentChannel(
                        e.target.value as
                          | 'multicaixa_express_sim'
                          | 'bai_directo_sim'
                          | 'unitel_money_sim'
                      )
                    }
                  >
                    <option value="multicaixa_express_sim">Multicaixa Express (Simulado)</option>
                    <option value="bai_directo_sim">BAI Directo (Simulado)</option>
                    <option value="unitel_money_sim">Unitel Money (Simulado)</option>
                  </SelectInput>
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={paying}
                    onClick={() => handleSimulatePremiumPayment('successful')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {paying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    <span>Simular Pagamento com Sucesso</span>
                  </button>
                  <button
                    type="button"
                    disabled={paying}
                    onClick={() => handleSimulatePremiumPayment('failed')}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-50"
                  >
                    Testar Falha de Pagamento
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
