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
- Fakturatyp (invoice_type) - identifiera om detta är en "Energifaktura" eller "Nätfaktura"
- Namn (name) - kundens namn
- Adress (address) - kundens adress
- Telefonnummer (phone_number) - ENDAST kundens telefonnummer, INTE företagets eller Kundcenters nummer
- E-post (email) - ENDAST kundens e-postadress, INTE företagets eller Kundcenters e-post
- Säkringsstorlek (fuse_size) - lägg alltid till 'A' suffix om det saknas (t.ex. "25" blir "25A")
- Nätleverantör (grid_provider)
- Energibolag (energy_company)

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
  "energy_company": "extraherat energibolag eller null"
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
