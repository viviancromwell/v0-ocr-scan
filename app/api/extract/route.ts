import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting PDF extraction request")
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Ingen fil uppladdad" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Endast PDF-filer är tillåtna" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY saknas i miljövariabler" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString("base64")

    console.log("[v0] Sending PDF to Gemini API")

    const prompt = `Du är en AI-assistent som extraherar strukturerad information från svenska PDF-dokument.

Extrahera följande information från dokumentet:

VIKTIGT - Fakturatyp (invoice_type):
- "Nätfaktura" = Faktura från nätägare/nätbolag (grid operator) som ansvarar för elnätet och infrastrukturen. Dessa fakturor innehåller ofta säkringsstorlek, nätavgifter, och överföringsavgifter.
- "Energifaktura" = Faktura från elhandelsbolag (energy retailer) som säljer själva elenergin. Dessa fakturor innehåller ofta elförbrukning, elpris per kWh, och energikostnader.

Om dokumentet innehåller säkringsstorlek (t.ex. 16A, 20A, 25A) är det troligen en Nätfaktura.
Om dokumentet fokuserar på elförbrukning och elpris är det troligen en Energifaktura.

Extrahera:
- Fakturatyp (invoice_type) - "Energifaktura" eller "Nätfaktura"
- Namn (name) - kundens namn
- Adress (address) - kundens adress
- Telefonnummer (phone_number) - ENDAST kundens telefonnummer, INTE företagets eller Kundcenters nummer
- E-post (email) - ENDAST kundens e-postadress, INTE företagets eller Kundcenters e-post
- Säkringsstorlek (fuse_size) - lägg alltid till 'A' suffix om det saknas (t.ex. "25" blir "25A")
- Nätleverantör (grid_provider) - namnet på nätbolaget/nätägaren
- Energibolag (energy_company) - namnet på elhandelsbolaget

NYA FÄLT - Anläggnings-ID och förbrukning:
- Anläggnings-ID (anlaggnings_id) - Sök efter "Anläggnings-ID", "Anl id", "Anläggningsid", "EAN", eller "GS1". Detta är en unik identifierare för kundens elanslutning.
- Periodens förbrukning (total_consumed_kwh_period) - Den fakturerade periodens totala kWh-förbrukning. Sök efter rader med "Förbrukning … kWh", "kWh … för perioden", eller "Avstämd period … kWh". Returnera endast siffran (t.ex. 450.5).
- Beräknad årsförbrukning (expected_consumption_year_kwh) - Sök efter "Beräknad årsförbrukning" eller liknande prognoser. Om endast "Verklig årsförbrukning" finns, använd det värdet. Returnera endast siffran.
- Förbrukningskälla (expected_source) - Om du använder "Beräknad årsförbrukning", sätt till "beraknad_arsforbrukning". Om du använder "Verklig årsförbrukning", sätt till "verklig_arsforbrukning_proxy". Om ingen årsförbrukning finns, sätt till "not_available".
- Historisk månadsförbrukning (historical_monthly_kwh) - Om PDF:en innehåller numeriska månadsvärden i text (t.ex. "Jan: 350 kWh, Feb: 420 kWh"), returnera en array med objekt: [{"month": "YYYY-MM", "kwh": number}]. Om det endast finns ett stapeldiagram utan numeriska etiketter, returnera null och sätt history_reason till "chart_only_no_numeric_values". Försök INTE att OCR:a staplar.
- Historikorsak (history_reason) - Om historical_monthly_kwh är null, förklara varför (t.ex. "chart_only_no_numeric_values", "no_historical_data", "data_not_readable").

VIKTIGT: Om du hittar telefonnummer eller e-postadresser som tillhör företaget, Kundcenter, eller kundtjänst, ignorera dem. Extrahera ENDAST kundens personliga kontaktinformation.

Svara ENDAST med ett JSON-objekt i följande format:
{
  "invoice_type": "Energifaktura eller Nätfaktura",
  "name": "extraherat namn eller null",
  "address": "extraherad adress eller null",
  "phone_number": "extraherat telefonnummer eller null",
  "email": "extraherat e-post eller null",
  "fuse_size": "extraherad säkringsstorlek eller null",
  "grid_provider": "extraherad nätleverantör eller null",
  "energy_company": "extraherat energibolag eller null",
  "anlaggnings_id": "extraherat anläggnings-ID eller null",
  "total_consumed_kwh_period": number eller null,
  "expected_consumption_year_kwh": number eller null,
  "expected_source": "beraknad_arsforbrukning eller verklig_arsforbrukning_proxy eller not_available",
  "historical_monthly_kwh": [{"month": "YYYY-MM", "kwh": number}] eller null,
  "history_reason": "förklaring om historical_monthly_kwh är null, annars null"
}

Om ett fält inte hittas, använd null. Svara ENDAST med JSON, ingen annan text.`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data,
        },
      },
      prompt,
    ])

    const response = await result.response
    const text = response.text()
    console.log("[v0] Gemini response:", text)

    // Parse JSON from response
    let extractedData
    try {
      // Remove markdown code blocks if present
      const jsonText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      extractedData = JSON.parse(jsonText)

      if (extractedData.fuse_size && typeof extractedData.fuse_size === "string") {
        const fuseSize = extractedData.fuse_size.trim()
        if (fuseSize && !fuseSize.toUpperCase().endsWith("A")) {
          extractedData.fuse_size = fuseSize + "A"
        }
      }
    } catch (parseError) {
      console.error("[v0] Failed to parse JSON:", text)
      return NextResponse.json(
        {
          error: "Fel vid tolkning av svar från Gemini",
          details: text.substring(0, 200),
        },
        { status: 500 },
      )
    }

    return NextResponse.json(extractedData)
  } catch (error) {
    console.error("[v0] Error processing PDF:", error)
    return NextResponse.json(
      {
        error: "Fel vid bearbetning av PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
