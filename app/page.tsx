"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ExtractedData {
  invoice_type: string | null // Added invoice type field
  name: string | null
  address: string | null
  phone_number: string | null
  email: string | null
  fuse_size: string | null
  grid_provider: string | null
  energy_company: string | null
}

export default function PDFExtractorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
      setExtractedData(null)
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
    setExtractedData(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Något gick fel vid extrahering")
      }

      setExtractedData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett oväntat fel inträffade")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setExtractedData(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">PDF Data Extractor</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Ladda upp svenska PDF-dokument för att extrahera strukturerad information
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ladda upp dokument</CardTitle>
            <CardDescription>
              Välj en PDF-fil för att extrahera namn, adress, kontaktinformation och energidata
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
                {(file || extractedData) && (
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

        {extractedData && (
          <Card>
            <CardHeader>
              <CardTitle>Extraherad information</CardTitle>
              <CardDescription>Data från ditt PDF-dokument</CardDescription>
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
                    <TableRow label="Fakturatyp (Invoice Type)" value={extractedData.invoice_type} />{" "}
                    {/* Added invoice type row */}
                    <TableRow label="Namn (Name)" value={extractedData.name} />
                    <TableRow label="Adress (Address)" value={extractedData.address} />
                    <TableRow label="Telefonnummer (Phone Number)" value={extractedData.phone_number} />
                    <TableRow label="E-post (Email)" value={extractedData.email} />
                    <TableRow label="Säkringsstorlek (Fuse Size)" value={extractedData.fuse_size} />
                    <TableRow label="Nätägare (Grid Provider)" value={extractedData.grid_provider} />
                    <TableRow label="Elbolag (Energy Company)" value={extractedData.energy_company} />
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
