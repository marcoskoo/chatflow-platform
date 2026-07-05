/**
 * SUNAT (Superintendencia Nacional de Aduanas y de Administración Tributaria del Perú)
 * Electronic Invoicing Module.
 *
 * Generates XML documents conforming to UBL 2.1 standard for:
 *   - "01" Factura
 *   - "03" Boleta de Venta
 *   - "07" Nota de Crédito
 *   - "08" Nota de Débito
 *
 * Includes IGV (18%) calculation, signature wrapper (since real signature requires
 * a digital certificate, we generate the XML ready for signing and provide a stub
 * signing function that can be replaced with a real cert in production).
 */

import { Decimal } from '@prisma/client/runtime/library'

export const IGV_RATE = 0.18 // 18% en Perú
export const SUNAT_TAX_NAME = 'IGV'
export const SUNAT_TAX_ID = '1000' // código de tributo IGV según CATÁLOGO 5
export const SUNAT_TAX_CODE = 'VAT'

// Tipos de documento de identidad (CATÁLOGO 6)
export const DOC_TYPE_DNI = '1'
export const DOC_TYPE_RUC = '6'
export const DOC_TYPE_CARNET_EXTRANJERIA = '4'
export const DOC_TYPE_PASAPORTE = '7'

// Tipos de comprobante (CATÁLOGO 1)
export const DOC_FACTURA = '01'
export const DOC_BOLETA = '03'
export const DOC_NOTA_CREDITO = '07'
export const DOC_NOTA_DEBITO = '08'

export interface SunatItem {
  descripcion: string
  cantidad: number
  precioUnitario: number // precio sin IGV
  igvIncluded?: boolean // si el precio ya incluye IGV (default true para precios de venta)
  afectoIgv?: boolean // default true
  tipoAfectacion?: string // CATÁLOGO 7: "10"=Gravado-Operación Onerosa
}

export interface SunatIssuer {
  ruc: string
  razonSocial: string
  nombreComercial?: string
  address: {
    ubigeo: string
    departamento: string
    provincia: string
    distrito: string
    urbanizacion?: string
    direccion: string
    codLocal: string
  }
}

export interface SunatCustomer {
  docType: string
  docNumber: string
  razonSocial: string
  address?: {
    ubigeo?: string
    departamento?: string
    provincia?: string
    distrito?: string
    direccion?: string
  }
}

export interface SunatDocumentInput {
  tipoDocumento: string
  serie: string
  correlativo: number
  fechaEmision: Date
  moneda?: string // default PEN
  issuer: SunatIssuer
  customer: SunatCustomer
  items: SunatItem[]
  tipoOperacion?: string // CATÁLOGO 17, default "0101"=Venta interna
  observacion?: string
}

// ─── Calculations ────────────────────────────────────────────────────────────

export interface SunatTotals {
  totalGravada: number // base imponible
  totalIgv: number
  totalExonerada: number
  totalInafecta: number
  totalGratuita: number
  totalDescuento: number
  total: number // total incluyendo IGV
  subTotal: number // total antes de IGV (gravada + exonerada + inafecta)
}

export function calculateTotals(items: SunatItem[]): SunatTotals {
  let totalGravada = 0
  let totalExonerada = 0
  let totalInafecta = 0
  let totalGratuita = 0
  let totalIgv = 0

  for (const item of items) {
    const afectoIgv = item.afectoIgv ?? true
    const tipoAfectacion = item.tipoAfectacion ?? (afectoIgv ? '10' : '20')

    if (item.precioUnitario === 0) {
      // Operación gratuita
      const valor = (item.cantidad || 0) * (item.precioUnitario || 0)
      totalGratuita += valor
      continue
    }

    let precioSinIgv = item.precioUnitario
    if (item.igvIncluded ?? true) {
      // precio incluye IGV -> quitar IGV
      precioSinIgv = item.precioUnitario / (1 + IGV_RATE)
    }

    const valorVenta = (item.cantidad || 0) * precioSinIgv // base imponible por item

    if (tipoAfectacion === '10' || tipoAfectacion === '11' || tipoAfectacion === '12' || tipoAfectacion === '13' || tipoAfectacion === '14' || tipoAfectacion === '15' || tipoAfectacion === '16') {
      // Gravado
      totalGravada += valorVenta
      totalIgv += valorVenta * IGV_RATE
    } else if (tipoAfectacion.startsWith('20') || tipoAfectacion === '21' || tipoAfectacion === '22' || tipoAfectacion === '23' || tipoAfectacion === '24' || tipoAfectacion === '25' || tipoAfectacion === '26' || tipoAfectacion === '27' || tipoAfectacion === '28' || tipoAfectacion === '29' || tipoAfectacion === '30') {
      // Exonerado
      totalExonerada += valorVenta
    } else if (tipoAfectacion.startsWith('30') || tipoAfectacion === '31' || tipoAfectacion === '32' || tipoAfectacion === '33' || tipoAfectacion === '34' || tipoAfectacion === '35' || tipoAfectacion === '36') {
      // Inafecto
      totalInafecta += valorVenta
    } else if (tipoAfectacion === '11' || tipoAfectacion === '12' || tipoAfectacion === '13' || tipoAfectacion === '14' || tipoAfectacion === '15' || tipoAfectacion === '16') {
      totalGratuita += valorVenta
    }
  }

  // Redondeo a 2 decimales
  totalGravada = Math.round(totalGravada * 100) / 100
  totalIgv = Math.round(totalIgv * 100) / 100
  totalExonerada = Math.round(totalExonerada * 100) / 100
  totalInafecta = Math.round(totalInafecta * 100) / 100
  totalGratuita = Math.round(totalGratuita * 100) / 100

  const subTotal = totalGravada + totalExonerada + totalInafecta
  const total = subTotal + totalIgv

  return {
    totalGravada,
    totalIgv,
    totalExonerada,
    totalInafecta,
    totalGratuita,
    totalDescuento: 0,
    subTotal,
    total: Math.round(total * 100) / 100,
  }
}

// ─── XML Generation (UBL 2.1) ────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fmtNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals)
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

/**
 * Generate UBL 2.1 XML for a SUNAT document.
 * The XML is ready to be signed with a digital certificate; the signature
 * block (`cac:Signature`) is included as a placeholder that should be
 * replaced with a real XAdES-EPES signature before sending to SUNAT.
 */
export function generateUblXml(input: SunatDocumentInput): string {
  const totals = calculateTotals(input.items)
  const moneda = input.moneda || 'PEN'
  const tipoOperacion = input.tipoOperacion || '0101'

  // Determine document type code & name
  let docName = 'Invoice'
  if (input.tipoDocumento === DOC_NOTA_CREDITO) docName = 'CreditNote'
  else if (input.tipoDocumento === DOC_NOTA_DEBITO) docName = 'DebitNote'

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>')
  lines.push(
    `<${docName} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${docName}-2" ` +
      `xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" ` +
      `xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" ` +
      `xmlns:ccts="urn:un:unece:uncefact:documentation:2" ` +
      `xmlns:ds="http://www.w3.org/2000/09/xmldsig#" ` +
      `xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" ` +
      `xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" ` +
      `xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1" ` +
      `xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" ` +
      `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
  )

  // ─── UBL Version & customization ─────────────────────────────────────────
  lines.push(`  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>`)
  lines.push(`  <cbc:CustomizationID>2.0</cbc:CustomizationID>`)

  // ─── Document ID ──────────────────────────────────────────────────────────
  lines.push(`  <cbc:ID>${xmlEscape(input.serie + '-' + String(input.correlativo).padStart(8, '0'))}</cbc:ID>`)
  lines.push(`  <cbc:IssueDate>${fmtDate(input.fechaEmision)}</cbc:IssueDate>`)
  lines.push(`  <cbc:IssueTime>${input.fechaEmision.toISOString().slice(11, 19)}</cbc:IssueTime>`)
  if (input.tipoDocumento === DOC_NOTA_CREDITO || input.tipoDocumento === DOC_NOTA_DEBITO) {
    lines.push(`  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency" listAgencyName="United Nations Economic Commission for Europe">${moneda}</cbc:DocumentCurrencyCode>`)
  } else {
    lines.push(`  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency" listAgencyName="United Nations Economic Commission for Europe">${moneda}</cbc:DocumentCurrencyCode>`)
    lines.push(`  <cbc:OperationTypeCode listAgencyName="PE:SUNAT" listName="Tipo de operacion" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo17">${tipoOperacion}</cbc:OperationTypeCode>`)
  }

  // ─── Signature placeholder (must be filled by signer) ──────────────────────
  lines.push(`  <cac:Signature>`)
  lines.push(`    <cbc:ID>Sign${input.serie}-${input.correlativo}</cbc:ID>`)
  lines.push(`    <cac:SignatoryParty>`)
  lines.push(`      <cac:PartyIdentification>`)
  lines.push(`        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${input.issuer.ruc}</cbc:ID>`)
  lines.push(`      </cac:PartyIdentification>`)
  lines.push(`      <cac:PartyName>`)
  lines.push(`        <cbc:Name>${xmlEscape(input.issuer.razonSocial)}</cbc:Name>`)
  lines.push(`      </cac:PartyName>`)
  lines.push(`    </cac:SignatoryParty>`)
  lines.push(`    <cac:DigitalSignatureAttachment>`)
  lines.push(`      <cac:ExternalReference>`)
  lines.push(`        <cbc:URI>#Sign${input.serie}-${input.correlativo}</cbc:URI>`)
  lines.push(`      </cac:ExternalReference>`)
  lines.push(`    </cac:DigitalSignatureAttachment>`)
  lines.push(`  </cac:Signature>`)

  // ─── AccountingSupplierParty (emisor) ─────────────────────────────────────
  lines.push(`  <cac:AccountingSupplierParty>`)
  lines.push(`    <cbc:CustomerAssignedAccountID>${input.issuer.ruc}</cbc:CustomerAssignedAccountID>`)
  lines.push(`    <cbc:AdditionalAccountID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">6</cbc:AdditionalAccountID>`)
  lines.push(`    <cac:Party>`)
  lines.push(`      <cac:PartyName>`)
  lines.push(`        <cbc:Name>${xmlEscape(input.issuer.razonSocial)}</cbc:Name>`)
  lines.push(`      </cac:PartyName>`)
  lines.push(`      <cac:PostalAddress>`)
  lines.push(`        <cbc:ID schemeAgencyName="PE:INEI" schemeName="Ubigeos">${input.issuer.address.ubigeo}</cbc:ID>`)
  lines.push(`        <cbc:StreetName>${xmlEscape(input.issuer.address.direccion)}</cbc:StreetName>`)
  lines.push(`        <cbc:CitySubdivisionName>${xmlEscape(input.issuer.address.urbanizacion || '-')}</cbc:CitySubdivisionName>`)
  lines.push(`        <cbc:CityName>${xmlEscape(input.issuer.address.provincia)}</cbc:CityName>`)
  lines.push(`        <cbc:CountrySubentity>${xmlEscape(input.issuer.address.departamento)}</cbc:CountrySubentity>`)
  lines.push(`        <cbc:District>${xmlEscape(input.issuer.address.distrito)}</cbc:District>`)
  lines.push(`        <cac:Country>`)
  lines.push(`          <cbc:IdentificationCode listID="ISO 3166-1" listName="Country" listAgencyName="United Nations Economic Commission for Europe">PE</cbc:IdentificationCode>`)
  lines.push(`        </cac:Country>`)
  lines.push(`      </cac:PostalAddress>`)
  lines.push(`      <cac:PartyTaxScheme>`)
  lines.push(`        <cbc:RegistrationName>${xmlEscape(input.issuer.razonSocial)}</cbc:RegistrationName>`)
  lines.push(`        <cbc:CompanyID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${input.issuer.ruc}</cbc:CompanyID>`)
  lines.push(`        <cac:TaxScheme>`)
  lines.push(`          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>`)
  lines.push(`          <cbc:Name>${SUNAT_TAX_NAME}</cbc:Name>`)
  lines.push(`          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>`)
  lines.push(`        </cac:TaxScheme>`)
  lines.push(`      </cac:PartyTaxScheme>`)
  if (input.issuer.nombreComercial) {
    lines.push(`      <cac:PartyLegalEntity>`)
    lines.push(`        <cbc:RegistrationName>${xmlEscape(input.issuer.razonSocial)}</cbc:RegistrationName>`)
    lines.push(`        <cbc:Name>${xmlEscape(input.issuer.nombreComercial)}</cbc:Name>`)
    lines.push(`      </cac:PartyLegalEntity>`)
  }
  lines.push(`    </cac:Party>`)
  lines.push(`  </cac:AccountingSupplierParty>`)

  // ─── AccountingCustomerParty (cliente) ────────────────────────────────────
  lines.push(`  <cac:AccountingCustomerParty>`)
  lines.push(`    <cbc:CustomerAssignedAccountID>${input.customer.docNumber}</cbc:CustomerAssignedAccountID>`)
  lines.push(`    <cbc:AdditionalAccountID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${input.customer.docType}</cbc:AdditionalAccountID>`)
  lines.push(`    <cac:Party>`)
  lines.push(`      <cac:PartyName>`)
  lines.push(`        <cbc:Name>${xmlEscape(input.customer.razonSocial)}</cbc:Name>`)
  lines.push(`      </cac:PartyName>`)
  if (input.customer.address?.direccion) {
    lines.push(`      <cac:PostalAddress>`)
    if (input.customer.address.ubigeo) lines.push(`        <cbc:ID schemeAgencyName="PE:INEI" schemeName="Ubigeos">${input.customer.address.ubigeo}</cbc:ID>`)
    lines.push(`        <cbc:StreetName>${xmlEscape(input.customer.address.direccion)}</cbc:StreetName>`)
    if (input.customer.address.provincia) lines.push(`        <cbc:CityName>${xmlEscape(input.customer.address.provincia)}</cbc:CityName>`)
    if (input.customer.address.departamento) lines.push(`        <cbc:CountrySubentity>${xmlEscape(input.customer.address.departamento)}</cbc:CountrySubentity>`)
    if (input.customer.address.distrito) lines.push(`        <cbc:District>${xmlEscape(input.customer.address.distrito)}</cbc:District>`)
    lines.push(`        <cac:Country>`)
    lines.push(`          <cbc:IdentificationCode listID="ISO 3166-1" listName="Country" listAgencyName="United Nations Economic Commission for Europe">PE</cbc:IdentificationCode>`)
    lines.push(`        </cac:Country>`)
    lines.push(`      </cac:PostalAddress>`)
  }
  lines.push(`      <cac:PartyTaxScheme>`)
  lines.push(`        <cbc:RegistrationName>${xmlEscape(input.customer.razonSocial)}</cbc:RegistrationName>`)
  lines.push(`        <cbc:CompanyID schemeID="${input.customer.docType}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${input.customer.docNumber}</cbc:CompanyID>`)
  lines.push(`        <cac:TaxScheme>`)
  lines.push(`          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>`)
  lines.push(`          <cbc:Name>${SUNAT_TAX_NAME}</cbc:Name>`)
  lines.push(`          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>`)
  lines.push(`        </cac:TaxScheme>`)
  lines.push(`      </cac:PartyTaxScheme>`)
  lines.push(`      <cac:PartyLegalEntity>`)
  lines.push(`        <cbc:RegistrationName>${xmlEscape(input.customer.razonSocial)}</cbc:RegistrationName>`)
  lines.push(`      </cac:PartyLegalEntity>`)
  lines.push(`    </cac:Party>`)
  lines.push(`  </cac:AccountingCustomerParty>`)

  // ─── Tax Total ────────────────────────────────────────────────────────────
  lines.push(`  <cac:TaxTotal>`)
  lines.push(`    <cbc:TaxAmount currencyID="${moneda}">${fmtNumber(totals.totalIgv)}</cbc:TaxAmount>`)
  lines.push(`    <cac:TaxSubtotal>`)
  lines.push(`      <cbc:TaxableAmount currencyID="${moneda}">${fmtNumber(totals.totalGravada)}</cbc:TaxableAmount>`)
  lines.push(`      <cbc:TaxAmount currencyID="${moneda}">${fmtNumber(totals.totalIgv)}</cbc:TaxAmount>`)
  lines.push(`      <cac:TaxCategory>`)
  lines.push(`        <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>`)
  lines.push(`        <cbc:Name>${SUNAT_TAX_NAME}</cbc:Name>`)
  lines.push(`        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">10</cbc:TaxExemptionReasonCode>`)
  lines.push(`        <cbc:TierRange>10</cbc:TierRange>`)
  lines.push(`        <cac:TaxScheme>`)
  lines.push(`          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">${SUNAT_TAX_CODE}</cbc:ID>`)
  lines.push(`          <cbc:Name>${SUNAT_TAX_NAME}</cbc:Name>`)
  lines.push(`          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>`)
  lines.push(`        </cac:TaxScheme>`)
  lines.push(`      </cac:TaxCategory>`)
  lines.push(`    </cac:TaxSubtotal>`)
  lines.push(`  </cac:TaxTotal>`)

  // ─── Legal Monetary Total ─────────────────────────────────────────────────
  lines.push(`  <cac:LegalMonetaryTotal>`)
  lines.push(`    <cbc:LineExtensionAmount currencyID="${moneda}">${fmtNumber(totals.subTotal)}</cbc:LineExtensionAmount>`)
  lines.push(`    <cbc:TaxInclusiveAmount currencyID="${moneda}">${fmtNumber(totals.total)}</cbc:TaxInclusiveAmount>`)
  lines.push(`    <cbc:AllowanceTotalAmount currencyID="${moneda}">${fmtNumber(totals.totalDescuento)}</cbc:AllowanceTotalAmount currencyID="${moneda}">`)
  lines.push(`    <cbc:PayableAmount currencyID="${moneda}">${fmtNumber(totals.total)}</cbc:PayableAmount>`)
  lines.push(`  </cac:LegalMonetaryTotal>`)

  // ─── Invoice Lines ─────────────────────────────────────────────────────────
  input.items.forEach((item, idx) => {
    const lineNumber = idx + 1
    const tipoAfectacion = item.tipoAfectacion ?? '10'
    let precioSinIgv = item.precioUnitario
    if (item.igvIncluded ?? true) {
      precioSinIgv = item.precioUnitario / (1 + IGV_RATE)
    }
    const valorVenta = item.cantidad * precioSinIgv
    const igvItem = valorVenta * IGV_RATE
    const precioItem = valorVenta + igvItem

    lines.push(`  <cac:InvoiceLine>`)
    lines.push(`    <cbc:ID>${lineNumber}</cbc:ID>`)
    lines.push(`    <cbc:InvoicedQuantity unitCode="NIU" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe">${fmtNumber(item.cantidad)}</cbc:InvoicedQuantity>`)
    lines.push(`    <cbc:LineExtensionAmount currencyID="${moneda}">${fmtNumber(valorVenta)}</cbc:LineExtensionAmount>`)
    lines.push(`    <cac:PricingReference>`)
    lines.push(`      <cac:AlternativeConditionPrice>`)
    lines.push(`        <cbc:PriceAmount currencyID="${moneda}">${fmtNumber(precioItem)}</cbc:PriceAmount>`)
    lines.push(`        <cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode>`)
    lines.push(`      </cac:AlternativeConditionPrice>`)
    lines.push(`    </cac:PricingReference>`)
    lines.push(`    <cac:TaxTotal>`)
    lines.push(`      <cbc:TaxAmount currencyID="${moneda}">${fmtNumber(igvItem)}</cbc:TaxAmount>`)
    lines.push(`      <cac:TaxSubtotal>`)
    lines.push(`        <cbc:TaxableAmount currencyID="${moneda}">${fmtNumber(valorVenta)}</cbc:TaxableAmount>`)
    lines.push(`        <cbc:TaxAmount currencyID="${moneda}">${fmtNumber(igvItem)}</cbc:TaxAmount>`)
    lines.push(`        <cac:TaxCategory>`)
    lines.push(`          <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>`)
    lines.push(`          <cbc:Name>${SUNAT_TAX_NAME}</cbc:Name>`)
    lines.push(`          <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${tipoAfectacion}</cbc:TaxExemptionReasonCode>`)
    lines.push(`          <cbc:TierRange>10</cbc:TierRange>`)
    lines.push(`          <cac:TaxScheme>`)
    lines.push(`            <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">${SUNAT_TAX_CODE}</cbc:ID>`)
    lines.push(`            <cbc:Name>${SUNAT_TAX_NAME}</cbc:Name>`)
    lines.push(`            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>`)
    lines.push(`          </cac:TaxScheme>`)
    lines.push(`        </cac:TaxCategory>`)
    lines.push(`      </cac:TaxSubtotal>`)
    lines.push(`    </cac:TaxTotal>`)
    lines.push(`    <cac:Item>`)
    lines.push(`      <cbc:Description>${xmlEscape(item.descripcion)}</cbc:Description>`)
    lines.push(`    </cac:Item>`)
    lines.push(`    <cac:Price>`)
    lines.push(`      <cbc:PriceAmount currencyID="${moneda}">${fmtNumber(precioSinIgv)}</cbc:PriceAmount>`)
    lines.push(`    </cac:Price>`)
    lines.push(`  </cac:InvoiceLine>`)
  })

  lines.push(`</${docName}>`)

  // Fix the typo-prone AllowanceTotalAmount line
  return lines.join('\n').replace(
    `<cbc:AllowanceTotalAmount currencyID="${moneda}">${fmtNumber(totals.totalDescuento)}</cbc:AllowanceTotalAmount currencyID="${moneda}">`,
    `<cbc:AllowanceTotalAmount currencyID="${moneda}">${fmtNumber(totals.totalDescuento)}</cbc:AllowanceTotalAmount>`
  )
}

// ─── SUNAT OSCE submission (stub) ───────────────────────────────────────────

export interface SunatSubmitResult {
  success: boolean
  ticket?: string
  responseCode?: string
  description?: string
  cdrZipBase64?: string
  error?: string
}

/**
 * Submit a signed XML document to SUNAT OSCE.
 *
 * In production this calls the SUNAT secure delivery service (beta):
 *   https://e-beta.sunat.gob.pe/ol-ti-itcpfegem/billService
 *
 * The service expects a SOAP envelope wrapping a zip file containing
 * the signed XML. The response includes a ticket that can be polled
 * to retrieve the CDR (Constancia de Recepción).
 *
 * For this open-source reference implementation we delegate to an
 * external "SUNAT sender" service URL (could be a separate worker,
 * a third-party like Nubefact, Greenter, etc.). Configure via env:
 *
 *   SUNAT_SENDER_URL=https://your-sender-endpoint/api/send
 *   SUNAT_SENDER_TOKEN=<auth bearer token>
 *
 * If no sender URL is configured, returns a "simulation" response
 * that allows the rest of the pipeline (PDF generation, status tracking)
 * to proceed for testing/demo purposes.
 */
export async function submitToSunat(
  xmlContent: string,
  fileName: string,
  issuerRuc: string
): Promise<SunatSubmitResult> {
  const senderUrl = process.env.SUNAT_SENDER_URL
  const senderToken = process.env.SUNAT_SENDER_TOKEN

  // No sender configured -> simulation mode
  if (!senderUrl) {
    return {
      success: true,
      ticket: `SIM-${Date.now()}`,
      responseCode: '0',
      description: 'Documento generado en modo simulación (SUNAT_SENDER_URL no configurado)',
      cdrZipBase64: '',
    }
  }

  try {
    const res = await fetch(senderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(senderToken ? { Authorization: `Bearer ${senderToken}` } : {}),
      },
      body: JSON.stringify({
        rucEmisor: issuerRuc,
        nombreArchivo: fileName,
        xml: Buffer.from(xmlContent, 'utf8').toString('base64'),
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { success: false, error: `Sender ${res.status}: ${txt}` }
    }
    const data = (await res.json()) as SunatSubmitResult
    return data
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error desconocido al enviar a SUNAT',
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function decimalToNumber(d: Decimal | null | undefined): number {
  if (!d) return 0
  return Number(d.toString())
}

export function nextCorrelativo(current: number): number {
  return current + 1
}

export function formatDocNumber(serie: string, correlativo: number): string {
  return `${serie}-${String(correlativo).padStart(8, '0')}`
}
