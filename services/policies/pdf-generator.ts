import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatAOA } from '@/config/angola'
import type { InsurancePolicy } from '@/types/domain'

/**
 * Gera no servidor um documento PDF oficial de apólice de seguro paramétrico agrícola.
 * Utiliza `pdf-lib` (100% TypeScript puro, sem dependências nativas) e identifica
 * explicitamente o documento como apólice de demonstração simulada quando aplicável.
 *
 * @param policy Dados completos da apólice e termos contratuais imutáveis.
 * @returns Buffer binário PDF pronto para descarga HTTP.
 */
export async function generatePolicyPdfBytes(
  policy: InsurancePolicy
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { height, width } = page.getSize()
  const marginX = 48
  let cursorY = height - 48

  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
    color = rgb(0.09, 0.09, 0.09)
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : fontRegular,
      color,
    })
  }

  // Cabeçalho institucional
  page.drawRectangle({
    x: marginX,
    y: cursorY - 36,
    width: width - marginX * 2,
    height: 46,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.89, 0.91, 0.93),
    borderWidth: 1,
  })
  drawText('NOSSA SEGUROS — SEGURO AGRICOLA PARAMETRICO', marginX + 14, cursorY - 12, 12, true, rgb(0.145, 0.388, 0.922))
  drawText(`Certificado Digital de Apolice N.o ${policy.policyNumber}`, marginX + 14, cursorY - 27, 9, false, rgb(0.45, 0.45, 0.45))

  cursorY -= 58

  // Faixa de aviso explícito de simulação
  if (policy.contractTerms.isSimulatedDemonstration) {
    page.drawRectangle({
      x: marginX,
      y: cursorY - 18,
      width: width - marginX * 2,
      height: 22,
      color: rgb(1, 0.97, 0.92),
      borderColor: rgb(0.85, 0.47, 0.02),
      borderWidth: 0.8,
    })
    drawText(
      'DOCUMENTO DE DEMONSTRACAO — APOLICE SIMULADA SEM VALOR CONTRATUAL REAL',
      marginX + 12,
      cursorY - 11,
      8.5,
      true,
      rgb(0.72, 0.35, 0.02)
    )
    cursorY -= 34
  }

  const drawSectionTitle = (title: string) => {
    drawText(title, marginX, cursorY, 10.5, true, rgb(0.145, 0.388, 0.922))
    page.drawLine({
      start: { x: marginX, y: cursorY - 4 },
      end: { x: width - marginX, y: cursorY - 4 },
      thickness: 0.7,
      color: rgb(0.89, 0.91, 0.93),
    })
    cursorY -= 18
  }

  const drawRow = (label: string, value: string) => {
    drawText(label, marginX, cursorY, 9.5, true, rgb(0.35, 0.35, 0.35))
    drawText(value, marginX + 185, cursorY, 9.5, false, rgb(0.09, 0.09, 0.09))
    cursorY -= 15
  }

  drawSectionTitle('1. Identificacao da Seguradora e Emissao')
  drawRow('Entidade Emissora:', 'NOSSA Seguros S.A. (Mercado Angolano - MVP)')
  drawRow('Numero da Apolice:', policy.policyNumber)
  drawRow('Estado Actual:', policy.status.toUpperCase())
  drawRow('Data de Emissao:', policy.issuedAt ? policy.issuedAt.slice(0, 10) : 'Pendente de Pagamento')
  drawRow('Versao do Produto:', `v${policy.contractTerms.productVersionNumber} (${policy.contractTerms.termsVersion})`)

  cursorY -= 8
  drawSectionTitle('2. Segurado e Propriedade Agricola')
  drawRow('Produtor / Segurado:', policy.customerName)
  drawRow('Propriedade:', policy.farmName)
  drawRow('Localizacao:', `${policy.municipality}, Provincia de ${policy.province}, Angola`)
  drawRow('Coordenadas GPS:', `Lat ${policy.latitude.toFixed(4)} / Lon ${policy.longitude.toFixed(4)}`)
  drawRow('Cultura Coberta:', policy.cropName)
  drawRow('Campanha Agricola:', policy.campaignName)

  cursorY -= 8
  drawSectionTitle('3. Parametros Financeiros e Periodo de Cobertura')
  drawRow('Produto Contratado:', policy.productName)
  drawRow('Periodo de Vigencia:', `${policy.startDate} ate ${policy.endDate}`)
  drawRow('Capital Segurado:', formatAOA(policy.insuredCapitalAoa))
  drawRow('Premio da Apolice:', formatAOA(policy.premiumAoa))

  cursorY -= 8
  drawSectionTitle('4. Indicador Climaticos e Gatilhos Contratuais')
  drawRow('Tipo de Cobertura:', policy.contractTerms.coverageType === 'drought' ? 'Seca (Defice Hidrico)' : 'Excesso Pluviometrico')
  drawRow('Indicador Meteorologico:', policy.contractTerms.climateIndicator)
  drawRow('Gatilho Contratual:', `${policy.contractTerms.triggerThresholdMm.toFixed(1)} mm em ${policy.contractTerms.observationWindowDays} dias`)
  drawRow('Qualidade Minima Exigida:', `${policy.contractTerms.minDataCompletenessPercent}% de observacoes validas`)
  drawRow('Divergencia Max. Fontes:', `${policy.contractTerms.maxSourceDisagreementPercent}% entre fonte primaria e confirmacao`)

  cursorY -= 8
  drawSectionTitle('5. Tabela de Faixas de Severidade e Indemnizacao')
  for (const band of policy.contractTerms.severityBands) {
    const rangeLabel =
      band.maxDeviationPercent === null
        ? `>= ${band.minDeviationPercent}% de desvio`
        : `${band.minDeviationPercent}% a ${band.maxDeviationPercent}% de desvio`
    drawRow(`${band.label}:`, `${rangeLabel} -> ${band.payoutPercentage}% do Capital Segurado`)
  }

  cursorY -= 12
  drawText(
    'Nota sobre Risco de Base: O pagamento e activado exclusivamente pelo indicador climatico medido por fontes',
    marginX,
    cursorY,
    8,
    false,
    rgb(0.45, 0.45, 0.45)
  )
  drawText(
    'externas verificaveis nas coordenadas da propriedade, podendo diferir da perda agronomica individual em campo.',
    marginX,
    cursorY - 11,
    8,
    false,
    rgb(0.45, 0.45, 0.45)
  )

  return await pdfDoc.save()
}
