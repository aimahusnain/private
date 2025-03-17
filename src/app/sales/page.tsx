"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { format } from "date-fns"
import { AppSidebar } from "@/components/ui/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Moon,
  Sun,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  MinusSquare,
  CheckSquare,
  Square,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toaster } from "sonner"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

// Add note to the Sale type
type Sale = {
  id: string
  date: string
  clientId: string
  clientName: string
  amount: number
  method: string
  note?: string
}

// Define the Client type for dropdown
type Client = {
  id: string
  clientName: string
}

// Define upload status type
type UploadStatus = "idle" | "selecting" | "uploading" | "processing" | "success" | "error"

export default function SalesPage() {
  const { theme, setTheme } = useTheme()
  const [sales, setSales] = useState<Sale[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState("")
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Initialize formData with default values
  const initialFormData = {
    date: format(new Date(), "yyyy-MM-dd"),
    clientId: "",
    amount: "",
    method: "Cash",
    note: "",
  }

  // Use useState with the initialFormData
  const [formData, setFormData] = useState(initialFormData)

  // Fetch sales and clients
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch sales
      const salesResponse = await fetch("/api/sales")
      const salesData = await salesResponse.json()
      setSales(salesData)

      // Fetch clients
      const clientsResponse = await fetch("/api/clients")
      const clientsData = await clientsResponse.json()
      setClients(clientsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to fetch data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Reset upload state when dialog closes
  useEffect(() => {
    if (!isUploadDialogOpen) {
      setSelectedFile(null)
      setUploadStatus("idle")
      setUploadProgress(0)
      setUploadMessage("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [isUploadDialogOpen])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "amount" ? value.replace(/[^0-9.]/g, "") : value,
    })
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Add a new API route for adding clients
  const addNewClient = async (clientName: string) => {
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName,
          rate: 1, // Default rate
          noOfStaff: 1, // Default staff count
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add client")
      }

      const newClient = await response.json()
      return newClient
    } catch (error) {
      console.error("Failed to add client:", error)
      throw error
    }
  }

  // Handle file selection
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus("selecting")
      setUploadMessage(`Selected file: ${file.name}`)
    } else {
      setSelectedFile(null)
      setUploadStatus("idle")
      setUploadMessage("")
    }
  }

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      // Update status to uploading
      setUploadStatus("uploading")
      setUploadProgress(10)
      setUploadMessage("Uploading file...")

      const response = await fetch("/api/sales/upload", {
        method: "POST",
        body: formData,
      })

      // Update status to processing
      setUploadProgress(50)
      setUploadStatus("processing")
      setUploadMessage("Processing data...")

      const result = await response.json()

      if (response.ok) {
        setUploadProgress(80)
        setUploadMessage("Finalizing import...")

        // Check if there are new clients that need to be added
        if (result.newClients && result.newClients.length > 0) {
          // Ask user if they want to add the new clients
          const confirmAdd = window.confirm(
            `Found ${result.newClients.length} new clients in the CSV that don't exist in the database. Would you like to add them?`,
          )

          if (confirmAdd) {
            setUploadMessage(`Adding ${result.newClients.length} new clients...`)
            // Add each new client
            for (const client of result.newClients) {
              try {
                await addNewClient(client.clientName)
              } catch (error) {
                console.error(`Failed to add client ${client.clientName}:`, error)
                toast.error(`Failed to add client ${client.clientName}`)
              }
            }
            toast.success(`Added ${result.newClients.length} new clients`)
          } else {
            toast.info(`Skipped ${result.newClients.length} rows with unknown clients`)
          }
        }

        if (result.skippedRows && result.skippedRows.length > 0) {
          toast.info(`Skipped rows: ${result.skippedRows.join(", ")}`)
        }

        // Update status to success
        setUploadProgress(100)
        setUploadStatus("success")
        setUploadMessage(`Successfully imported ${result.count} sales records`)

        // Refresh data and close dialog after a short delay
        setTimeout(() => {
          fetchData()
          setIsUploadDialogOpen(false)
        }, 1500)

        toast.success(`Successfully imported ${result.count} sales records`)
      } else {
        throw new Error(result.error || "Failed to upload CSV")
      }
    } catch (error) {
      console.error("CSV upload error:", error)
      setUploadStatus("error")
      setUploadProgress(100)
      setUploadMessage(error instanceof Error ? error.message : "Failed to import CSV data")
      toast.error(error instanceof Error ? error.message : "Failed to import CSV data")
    }
  }

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/sales/export")

      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales-export-${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Sales data exported successfully")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export sales data")
    } finally {
      setLoading(false)
    }
  }

  // Update the handleAddSale function to include note
  const handleAddSale = async () => {
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date,
          clientId: formData.clientId,
          amount: Number.parseFloat(formData.amount),
          method: formData.method,
          note: formData.note,
        }),
      })

      if (response.ok) {
        setIsAddDialogOpen(false)
        setFormData(initialFormData)
        fetchData()
        toast.success("Sale added successfully")
      } else {
        throw new Error("Failed to add sale")
      }
    } catch (error) {
      console.error("Failed to add sale:", error)
      toast.error("Failed to add sale. Please try again.")
    }
  }

  // Update the handleUpdateSale function to include note
  const handleUpdateSale = async () => {
    if (!selectedSale) return

    try {
      const response = await fetch(`/api/sales?id=${selectedSale.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date,
          clientId: formData.clientId,
          amount: Number.parseFloat(formData.amount),
          method: formData.method,
          note: formData.note,
        }),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setSelectedSale(null)
        fetchData()
        toast.success("Sale updated successfully")
      } else {
        throw new Error("Failed to update sale")
      }
    } catch (error) {
      console.error("Failed to update sale:", error)
      toast.error("Failed to update sale. Please try again.")
    }
  }

  // Delete a sale
  const handleDeleteSale = async () => {
    if (!selectedSale) return

    try {
      const response = await fetch(`/api/sales?id=${selectedSale.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setIsDeleteDialogOpen(false)
        setSelectedSale(null)
        fetchData()
        toast.success("Sale deleted successfully")
      } else {
        throw new Error("Failed to delete sale")
      }
    } catch (error) {
      console.error("Failed to delete sale:", error)
      toast.error("Failed to delete sale. Please try again.")
    }
  }

  // Update the openEditDialog function to include note
  const openEditDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setFormData({
      date: new Date(sale.date).toISOString().split("T")[0],
      clientId: sale.clientId,
      amount: sale.amount.toString(),
      method: sale.method,
      note: sale.note || "",
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDeleteDialogOpen(true)
  }

  // Handle template download
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/sales/template")

      if (!response.ok) {
        throw new Error("Failed to download template")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "sales-import-template.csv"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Template downloaded successfully")
    } catch (error) {
      console.error("Template download error:", error)
      toast.error("Failed to download template")
    }
  }

  // Render upload status UI
  const renderUploadStatus = () => {
    if (uploadStatus === "idle") {
      return null
    }

    let statusColor = "bg-blue-500"
    let statusIcon = <RefreshCw className="h-4 w-4 animate-spin" />

    if (uploadStatus === "success") {
      statusColor = "bg-green-500"
      statusIcon = <CheckCircle2 className="h-4 w-4 text-green-500" />
    } else if (uploadStatus === "error") {
      statusColor = "bg-red-500"
      statusIcon = <AlertCircle className="h-4 w-4 text-red-500" />
    }

    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={uploadStatus === "error" ? "text-red-500" : ""}>{uploadMessage}</span>
        </div>
        <Progress value={uploadProgress} className={statusColor} />
      </div>
    )
  }

  // Handle row selection
  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = sales.map((sale) => sale.id)
      setSelectedRows(new Set(allIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return

    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedRows.size} selected sales?`)
    if (!confirmDelete) return

    setLoading(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Delete each selected row
      for (const id of selectedRows) {
        try {
          const response = await fetch(`/api/sales?id=${id}`, {
            method: "DELETE",
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          console.error(`Error deleting sale ${id}:`, error)
          errorCount++
        }
      }
    } catch (error) {
      console.error("Bulk delete error:", error)
      toast.error("An error occurred during bulk delete")
    }

    // Show results
    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} sales`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} sales`)
    }

    // Clear selection and refresh data
    setSelectedRows(new Set())
    fetchData()
  }

  // Add this effect to clear selections when data changes
  useEffect(() => {
    setSelectedRows(new Set())
  }, [sales])

  // Get selection state for header checkbox
  const getSelectionState = () => {
    if (selectedRows.size === 0) return "none"
    if (selectedRows.size === sales.length) return "all"
    return "partial"
  }

  // Render the appropriate checkbox icon based on selection state
  const renderHeaderCheckbox = () => {
    const selectionState = getSelectionState()

    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0"
        onClick={() => handleSelectAll(selectionState !== "all")}
      >
        {selectionState === "none" && <Square className="h-4 w-4" />}
        {selectionState === "partial" && <MinusSquare className="h-4 w-4" />}
        {selectionState === "all" && <CheckSquare className="h-4 w-4" />}
      </Button>
    )
  }

  return (
    <SidebarProvider>
      <Toaster position="top-right" />
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Sales Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {/* Sales Table */}
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales</CardTitle>
                <CardDescription>Manage your sales records</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedRows.size > 0 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleBulkDelete}
                    title={`Delete ${selectedRows.size} selected items`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>

                {/* CSV Upload Dialog */}
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Import CSV</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Sales Data</DialogTitle>
                      <DialogDescription>
                        Upload a CSV file with your sales data. The file should have headers: date, client, amount,
                        method, and note.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs">
                          <Download className="h-3 w-3 mr-1" />
                          Download Template
                        </Button>
                      </div>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileSelection}
                        disabled={uploadStatus === "uploading" || uploadStatus === "processing"}
                      />

                      {renderUploadStatus()}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(false)}
                        disabled={uploadStatus === "uploading" || uploadStatus === "processing"}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleFileUpload}
                        disabled={
                          !selectedFile ||
                          uploadStatus === "uploading" ||
                          uploadStatus === "processing" ||
                          uploadStatus === "success"
                        }
                        className={uploadStatus === "selecting" ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        {uploadStatus === "uploading" || uploadStatus === "processing" ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : uploadStatus === "success" ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Export CSV Button */}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleExportCSV}
                  disabled={loading || sales.length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>

                {/* Add Sale Dialog */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 cursor-pointer text-white hover:bg-blue-500">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Sale
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Sale</DialogTitle>
                      <DialogDescription>Enter the details for the new sale.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="clientId">Client</Label>
                        <Select
                          value={formData.clientId}
                          onValueChange={(value) => handleSelectChange("clientId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.clientName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input id="amount" name="amount" value={formData.amount} onChange={handleInputChange} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="method">Payment Method</Label>
                        <Select value={formData.method} onValueChange={(value) => handleSelectChange("method", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Debit Card">Debit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="note">Note</Label>
                        <Input id="note" name="note" value={formData.note} onChange={handleInputChange} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" onClick={handleAddSale}>
                        Add Sale
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Sale Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Sale</DialogTitle>
                      <DialogDescription>Edit the details for the selected sale.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="clientId">Client</Label>
                        <Select
                          value={formData.clientId}
                          onValueChange={(value) => handleSelectChange("clientId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.clientName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input id="amount" name="amount" value={formData.amount} onChange={handleInputChange} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="method">Payment Method</Label>
                        <Select value={formData.method} onValueChange={(value) => handleSelectChange("method", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Debit Card">Debit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="note">Note</Label>
                        <Input id="note" name="note" value={formData.note} onChange={handleInputChange} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" onClick={handleUpdateSale}>
                        Update Sale
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete Sale Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Sale</DialogTitle>
                      <DialogDescription>Are you sure you want to delete this sale?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteSale}>
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading sales data...
                </div>
              ) : (
                <div className="relative max-h-[calc(100vh-220px)] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-[50px] text-center">
                          <div className="flex justify-center">{renderHeaderCheckbox()}</div>
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id} className={selectedRows.has(sale.id) ? "bg-muted/50" : ""}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedRows.has(sale.id)}
                              onCheckedChange={(checked) => handleRowSelect(sale.id, checked === true)}
                              aria-label={`Select sale for ${sale.clientName}`}
                            />
                          </TableCell>
                          <TableCell>{format(new Date(sale.date), "yyyy-MM-dd")}</TableCell>
                          <TableCell>{sale.clientName}</TableCell>
                          <TableCell>${sale.amount.toFixed(2)}</TableCell>
                          <TableCell>{sale.method}</TableCell>
                          <TableCell>{sale.note}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(sale)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDeleteDialog(sale)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sales.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            No sales records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

