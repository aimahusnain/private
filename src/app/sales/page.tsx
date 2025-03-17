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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Moon, Sun, Plus, MoreHorizontal, Pencil, Trash2, RefreshCw, Upload, Download, FileUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toaster } from "sonner"
import { toast } from "sonner"
// Remove this line: import { toast } from "@/components/ui/use-toast"

// Define the Sale type based on your Prisma schema
type Sale = {
  id: string
  date: string
  clientId: string
  clientName: string
  amount: number
  method: string
}

// Define the Client type for dropdown
type Client = {
  id: string
  clientName: string
}

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

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    clientId: "",
    amount: "",
    method: "Cash",
  })

  // Fetch sales and clients
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch sales
      const salesResponse = await fetch("/api/sales")
      const salesData = await salesResponse.json()
      setSales(salesData)

      // Fetch clients
      const clientsResponse = await fetch("/api/get-clients")
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

  // Add a new sale
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
        }),
      })

      if (response.ok) {
        setIsAddDialogOpen(false)
        setFormData({
          date: format(new Date(), "yyyy-MM-dd"),
          clientId: "",
          amount: "",
          method: "Cash",
        })
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

  // Update a sale
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

  // Open edit dialog and set form data
  const openEditDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setFormData({
      date: new Date(sale.date).toISOString().split("T")[0],
      clientId: sale.clientId,
      amount: sale.amount.toString(),
      method: sale.method,
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDeleteDialogOpen(true)
  }

  // Handle CSV upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      setLoading(true)
      const response = await fetch("/api/sales/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        fetchData()
        setIsUploadDialogOpen(false)
        toast.success("Sales data imported successfully")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to upload CSV")
      }
    } catch (error) {
      console.error("CSV upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import CSV data")
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
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
                        Upload a CSV file with your sales data. The file should have headers: date, clientId, amount,
                        method.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Label htmlFor="csv-file">CSV File</Label>
                      <Input id="csv-file" type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                        Cancel
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
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                            <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleAddSale}
                        disabled={!formData.clientId || !formData.amount}
                      >
                        Add Sale
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="animate-spin text-blue-500">
                    <RefreshCw className="h-8 w-8" />
                  </div>
                </div>
              ) : sales.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-muted-foreground">No sales found</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                      <FileUp className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add your first sale
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Amount ($)</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{format(new Date(sale.date), "MMM d, yyyy")}</TableCell>
                          <TableCell>{sale.clientName}</TableCell>
                          <TableCell>${sale.amount.toFixed(2)}</TableCell>
                          <TableCell>{sale.method}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditDialog(sale)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(sale)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>Update the sale details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-clientId">Client</Label>
              <Select value={formData.clientId} onValueChange={(value) => handleSelectChange("clientId", value)}>
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
              <Label htmlFor="edit-amount">Amount ($)</Label>
              <Input id="edit-amount" name="amount" value={formData.amount} onChange={handleInputChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-method">Payment Method</Label>
              <Select value={formData.method} onValueChange={(value) => handleSelectChange("method", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleUpdateSale}
              disabled={!formData.clientId || !formData.amount}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sale? This action cannot be undone.
            </DialogDescription>
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
    </SidebarProvider>
  )
}

