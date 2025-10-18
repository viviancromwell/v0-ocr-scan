"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ExtractedData {
  invoice_type: string | null
  name: string | null
  address: string | null
  phone_number: string | null
  email: string | null
  fuse_size: string | null
  grid_provider: string | null
  energy_company: string | null
  anlaggnings_id: string | null
  total_consumed_kwh_period: number | null
  expected_consumption_year_kwh: number | null
  expected_source: string | null
  historical_monthly_kwh: Array<{ month: string; kwh: number }> | null
  history_reason: string | null
}

interface CombinedData {
  invoice_type_1: string | null
  invoice_type_2: string | null
  name: string | null
  address: string | null
  phone_number: string | null
  email: string | null
  fuse_size: string | null
  grid_provider: string | null
  energy_company: string | null
  anlaggnings_id: string | null
  total_consumed_kwh_period: number | null
  expected_consumption_year_kwh: number | null
  expected_source: string | null
  historical_monthly_kwh: Array<{ month: string; kwh: number }> | null
  history_reason: string | null
}

export default function PDFExtractorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstBillData, setFirstBillData] = useState<ExtractedData | null>(null)
  const [secondBillData, setSecondBillData] = useState<ExtractedData | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Vänligen välj en giltig PDF-fil")
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Ingen fil vald")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      console.log("[v0] Extraction response:", data)
      console.log("[v0] Current step:", currentStep)

      if (!response.ok) {
        throw new Error(data.error || "Något gick fel vid extrahering")
      }

      if (currentStep === 1) {
        setFirstBillData(data)
        console.log("[v0] Set first bill data:", data)
        setFile(null)
      } else {
        setSecondBillData(data)
        console.log("[v0] Set second bill data:", data)
        setFile(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett oväntat fel inträffade")
      console.log("[v0] Error during extraction:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleNextBill = () => {
    console.log("[v0] Moving to step 2")
    setCurrentStep(2)
    setFile(null)
    setError(null)
  }

  const handleReset = () => {
    setFile(null)
    setFirstBillData(null)
    setSecondBillData(null)
    setCurrentStep(1)
    setError(null)
  }

  const getCombinedData = (): CombinedData => {
    const combined: CombinedData = {
      invoice_type_1: firstBillData?.invoice_type || null,
      invoice_type_2: secondBillData?.invoice_type || null,
      name: firstBillData?.name || secondBillData?.name || null,
      address: firstBillData?.address || secondBillData?.address || null,
      phone_number: firstBillData?.phone_number || secondBillData?.phone_number || null,
      email: firstBillData?.email || secondBillData?.email || null,
      fuse_size: firstBillData?.fuse_size || secondBillData?.fuse_size || null,
      grid_provider: firstBillData?.grid_provider || secondBillData?.grid_provider || null,
      energy_company: firstBillData?.energy_company || secondBillData?.energy_company || null,
      anlaggnings_id: firstBillData?.anlaggnings_id || secondBillData?.anlaggnings_id || null,
      total_consumed_kwh_period:
        firstBillData?.total_consumed_kwh_period || secondBillData?.total_consumed_kwh_period || null,
      expected_consumption_year_kwh:
        firstBillData?.expected_consumption_year_kwh || secondBillData?.expected_consumption_year_kwh || null,
      expected_source: firstBillData?.expected_source || secondBillData?.expected_source || null,
      historical_monthly_kwh: firstBillData?.historical_monthly_kwh || secondBillData?.historical_monthly_kwh || null,
      history_reason: firstBillData?.history_reason || secondBillData?.history_reason || null,
    }
    return combined
  }

  const combinedData = firstBillData || secondBillData ? getCombinedData() : null

  console.log("[v0] Render state - currentStep:", currentStep, "firstBillData:", !!firstBillData, "loading:", loading)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">PDF Data Extractor</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Ladda upp svenska PDF-dokument för att extrahera strukturerad information
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-4">
          <div
            className={`flex items-center gap-2 ${currentStep === 1 ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              1
            </div>
            <span>Dokument 1</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300" />
          <div
            className={`flex items-center gap-2 ${currentStep === 2 ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              2
            </div>
            <span>Dokument 2</span>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{currentStep === 1 ? "Ladda upp första dokumentet" : "Ladda upp andra dokumentet"}</CardTitle>
            <CardDescription>
              {currentStep === 1
                ? "Ladda upp valfri faktura - systemet identifierar automatiskt om det är en nät- eller energifaktura"
                : "Ladda upp den andra fakturan för att komplettera informationen"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileText className="w-12 h-12 mb-3 text-blue-500" />
                        <p className="mb-2 text-sm text-gray-700 dark:text-gray-300 font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Klicka för att ladda upp</span> eller dra och släpp
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF (MAX. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!file || loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extraherar...
                    </>
                  ) : (
                    "Extrahera data"
                  )}
                </Button>
                {currentStep === 1 && firstBillData && !loading && (
                  <Button onClick={handleNextBill} variant="default">
                    Nästa dokument
                  </Button>
                )}
                {(file || firstBillData || secondBillData) && (
                  <Button onClick={handleReset} variant="outline" disabled={loading}>
                    Återställ
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {combinedData && (
          <Card>
            <CardHeader>
              <CardTitle>Extraherad information</CardTitle>
              <CardDescription>
                {secondBillData
                  ? "Kombinerad data från båda dokumenten"
                  : "Data från första dokumentet - ladda upp andra dokumentet för att komplettera"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground bg-muted/30">
                        Fält
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground bg-muted/30">
                        Värde
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedData.invoice_type_1 && (
                      <TableRow label="Första dokumentet (First Document)" value={combinedData.invoice_type_1} />
                    )}
                    {combinedData.invoice_type_2 && (
                      <TableRow label="Andra dokumentet (Second Document)" value={combinedData.invoice_type_2} />
                    )}
                    <TableRow label="Namn (Name)" value={combinedData.name} />
                    <TableRow label="Adress (Address)" value={combinedData.address} />
                    <TableRow label="Telefonnummer (Phone Number)" value={combinedData.phone_number} />
                    <TableRow label="E-post (Email)" value={combinedData.email} />
                    <TableRow label="Säkringsstorlek (Fuse Size)" value={combinedData.fuse_size} />
                    <TableRow label="Nätägare (Grid Provider)" value={combinedData.grid_provider} />
                    <TableRow label="Elbolag (Energy Company)" value={combinedData.energy_company} />
                    <TableRow label="Anläggnings-ID (Installation ID)" value={combinedData.anlaggnings_id} />
                    <TableRow
                      label="Periodens förbrukning kWh (Period Consumption)"
                      value={
                        combinedData.total_consumed_kwh_period !== null
                          ? `${combinedData.total_consumed_kwh_period} kWh`
                          : null
                      }
                    />
                    <TableRow
                      label="Beräknad årsförbrukning kWh (Expected Annual Consumption)"
                      value={
                        combinedData.expected_consumption_year_kwh !== null
                          ? `${combinedData.expected_consumption_year_kwh} kWh`
                          : null
                      }
                    />
                    {combinedData.expected_source && combinedData.expected_source !== "not_available" && (
                      <TableRow
                        label="Förbrukningskälla (Consumption Source)"
                        value={
                          combinedData.expected_source === "beraknad_arsforbrukning"
                            ? "Beräknad årsförbrukning"
                            : "Verklig årsförbrukning (proxy)"
                        }
                      />
                    )}
                    {combinedData.historical_monthly_kwh && combinedData.historical_monthly_kwh.length > 0 && (
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-sm align-top">
                          Historisk månadsförbrukning (Monthly History)
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="space-y-1">
                            {combinedData.historical_monthly_kwh.map((item, idx) => (
                              <div key={idx}>
                                {item.month}: {item.kwh} kWh
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    {combinedData.history_reason && (
                      <TableRow
                        label="Historikorsak (History Reason)"
                        value={
                          combinedData.history_reason === "chart_only_no_numeric_values"
                            ? "Endast diagram utan numeriska värden"
                            : combinedData.history_reason
                        }
                      />
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function TableRow({ label, value }: { label: string; value: string | null }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="py-3 px-4 font-medium text-sm">{label}</td>
      <td className="py-3 px-4 text-sm">
        {value || <span className="text-muted-foreground italic">Ej tillgänglig</span>}
      </td>
    </tr>
  )
}
