"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Moon, Sun, Plus, MoreHorizontal, Pencil, Trash2, RefreshCw, DollarSign, Users, TrendingUp } from "lucide-react"

// Define the Rate type based on your Prisma schema
type Rate = {
  id: string
  date: string
  clientName: string
  rate: number
  noOfStaff: number
}

export default function Page() {
  const { theme, setTheme } = useTheme()
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: "",
    clientName: "",
    rate: "",
    noOfStaff: "",
  })

  // Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    averageRate: 0,
    highestRate: 0,
  })

  // Fetch rates
  const fetchRates = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/rates")
      const data = await response.json()
      setRates(data)

      // Calculate stats
      const uniqueClients = new Set(data.map((rate: Rate) => rate.clientName)).size
      const avgRate = data.length > 0 ? data.reduce((sum: number, rate: Rate) => sum + rate.rate, 0) / data.length : 0
      const highestRate = data.length > 0 ? Math.max(...data.map((rate: Rate) => rate.rate)) : 0

      setStats({
        totalClients: uniqueClients,
        averageRate: avgRate,
        highestRate: highestRate,
      })
    } catch (error) {
      console.error("Failed to fetch rates:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "rate" ? value.replace(/[^0-9.]/g, "") : value,
    })
  }

  // Add a new rate
  const handleAddRate = async () => {
    try {
      const response = await fetch("/api/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date || new Date().toISOString(),
          clientName: formData.clientName,
          rate: Number.parseFloat(formData.rate),
          noOfStaff: Number.parseInt(formData.noOfStaff) || 0,
        }),
      })

      if (response.ok) {
        setIsAddDialogOpen(false)
        setFormData({ date: "", clientName: "", rate: "", noOfStaff: "" })
        fetchRates()
      }
    } catch (error) {
      console.error("Failed to add rate:", error)
    }
  }

  // Update a rate
  const handleUpdateRate = async () => {
    if (!selectedRate) return

    try {
      const response = await fetch(`/api/rates?id=${selectedRate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date,
          clientName: formData.clientName,
          rate: Number.parseFloat(formData.rate),
          noOfStaff: Number.parseInt(formData.noOfStaff) || 0,
        }),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setSelectedRate(null)
        fetchRates()
      }
    } catch (error) {
      console.error("Failed to update rate:", error)
    }
  }

  // Delete a rate
  const handleDeleteRate = async () => {
    if (!selectedRate) return

    try {
      const response = await fetch(`/api/rates?id=${selectedRate.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setIsDeleteDialogOpen(false)
        setSelectedRate(null)
        fetchRates()
      }
    } catch (error) {
      console.error("Failed to delete rate:", error)
    }
  }

  // Open edit dialog and set form data
  const openEditDialog = (rate: Rate) => {
    setSelectedRate(rate)
    setFormData({
      date: new Date(rate.date).toISOString().split("T")[0],
      clientName: rate.clientName,
      rate: rate.rate.toString(),
      noOfStaff: rate.noOfStaff?.toString() || "0",
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (rate: Rate) => {
    setSelectedRate(rate)
    setIsDeleteDialogOpen(true)
  }

  return (
    <SidebarProvider>
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
                  <BreadcrumbPage>Rates Management</BreadcrumbPage>
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
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-lime-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.totalClients}</div>
                  <div className="rounded-full bg-lime-500/10 p-2 text-lime-500">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-lime-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">${stats.averageRate.toFixed(2)}</div>
                  <div className="rounded-full bg-lime-500/10 p-2 text-lime-500">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-lime-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Highest Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">${stats.highestRate.toFixed(2)}</div>
                  <div className="rounded-full bg-lime-500/10 p-2 text-lime-500">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-lime-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {rates.reduce((sum, rate) => sum + (rate.noOfStaff || 0), 0)}
                  </div>
                  <div className="rounded-full bg-lime-500/10 p-2 text-lime-500">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rates Table */}
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rates</CardTitle>
                <CardDescription>Manage your client rates</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={fetchRates}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-lime-600 cursor-pointer text-white hover:bg-lime-500">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Rate</DialogTitle>
                      <DialogDescription>Enter the details for the new client rate.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="clientName">Client Name</Label>
                        <Input
                          id="clientName"
                          name="clientName"
                          value={formData.clientName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="rate">Rate ($)</Label>
                        <Input id="rate" name="rate" value={formData.rate} onChange={handleInputChange} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="noOfStaff">No. of Staff</Label>
                        <Input
                          id="noOfStaff"
                          name="noOfStaff"
                          type="number"
                          min="0"
                          value={formData.noOfStaff}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-lime-600 hover:bg-lime-700"
                        onClick={handleAddRate}
                        disabled={!formData.clientName || !formData.rate}
                      >
                        Add Rate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="animate-spin text-lime-500">
                    <RefreshCw className="h-8 w-8" />
                  </div>
                </div>
              ) : rates.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-muted-foreground">No rates found</p>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first rate
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Rate ($)</TableHead>
                        <TableHead>No. of Staff</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell>{format(new Date(rate.date), "MMM d, yyyy")}</TableCell>
                          <TableCell>{rate.clientName}</TableCell>
                          <TableCell>${rate.rate.toFixed(2)}</TableCell>
                          <TableCell>{rate.noOfStaff || 0}</TableCell>
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
                                <DropdownMenuItem onClick={() => openEditDialog(rate)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(rate)}
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
            <DialogTitle>Edit Rate</DialogTitle>
            <DialogDescription>Update the rate details for {selectedRate?.clientName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-clientName">Client Name</Label>
              <Input id="edit-clientName" name="clientName" value={formData.clientName} onChange={handleInputChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rate">Rate ($)</Label>
              <Input id="edit-rate" name="rate" value={formData.rate} onChange={handleInputChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-noOfStaff">No. of Staff</Label>
              <Input
                id="edit-noOfStaff"
                name="noOfStaff"
                type="number"
                min="0"
                value={formData.noOfStaff}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-lime-600 hover:bg-lime-700"
              onClick={handleUpdateRate}
              disabled={!formData.clientName || !formData.rate}
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
            <DialogTitle>Delete Rate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the rate for {selectedRate?.clientName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRate}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

