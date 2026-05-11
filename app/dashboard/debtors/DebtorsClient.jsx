"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { IndianRupee, Plus, Trash2, BadgeIndianRupee, X, Loader2, Filter, Printer, Edit, AlertCircle, Columns } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColor = (status) => {
  if (status === "Paid")    return "bg-green-100 text-green-700 border-green-300";
  if (status === "Partial") return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-red-100 text-red-700 border-red-300";
};

export default function DebtorsClient({ batches, classes, categories: initialCategories, apiKey }) {
  const [categories, setCategories]   = useState(initialCategories);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents]       = useState([]);
  const [debts, setDebts]             = useState([]);
  const [loading, setLoading]         = useState(false);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  
  // Local Filter State for Dialog
  const [tempBatch, setTempBatch] = useState("");
  const [tempClass, setTempClass] = useState("");
  const [tempStatus, setTempStatus] = useState("All");
  const [tempFromDate, setTempFromDate] = useState("");
  const [tempToDate, setTempToDate] = useState("");

  // Column Visibility
  const [visibleCols, setVisibleCols] = useState({
    student: true, category: true, year: true, total: true, paid: true, balance: true, status: true,
  });

  const handleOpenFilter = () => {
    setTempBatch(selectedBatch);
    setTempClass(selectedClass);
    setTempStatus(filterStatus);
    setTempFromDate(filterFromDate);
    setTempToDate(filterToDate);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setSelectedBatch(tempBatch);
    setSelectedClass(tempClass);
    setFilterStatus(tempStatus);
    setFilterFromDate(tempFromDate);
    setFilterToDate(tempToDate);
    setFilterOpen(false);
  };

  // Add Debt Dialog
  const [addOpen, setAddOpen]         = useState(false);
  const [addBatch, setAddBatch]       = useState("");
  const [addClass, setAddClass]       = useState("");
  const [addStudents, setAddStudents] = useState([]);
  const [addForm, setAddForm]         = useState({
    studentId: "", category: "", year: new Date().getFullYear().toString(),
    totalAmount: "", note: "",
  });
  const [saving, setSaving]           = useState(false);

  // Edit Debt Dialog
  const [editOpen, setEditOpen]       = useState(false);
  const [editForm, setEditForm]       = useState(null);
  const [editing, setEditing]         = useState(false);

  // Bulk Delete
  const [selectedDebts, setSelectedDebts] = useState([]);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // Pay Dialog
  const [payOpen, setPayOpen]         = useState(false);
  const [payDebt, setPayDebt]         = useState(null);
  const [payAmount, setPayAmount]     = useState("");
  const [payDate, setPayDate]         = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote]         = useState("");
  const [paying, setPaying]           = useState(false);

  // Fetch students for Main Table
  useEffect(() => {
    const sBatch = selectedBatch === "none" ? "" : selectedBatch;
    const sClass = selectedClass === "none" ? "" : selectedClass;
    if (!sBatch && !sClass) { setStudents([]); return; }
    
    const params = new URLSearchParams({ roles: "Student", projection: "id,name" });
    if (sBatch) params.append("batchId", sBatch);
    if (sClass) params.append("classId", sClass);
    if (sClass && !sBatch) params.append("status", "Active");

    fetch(`/api/users?${params.toString()}`, { headers: { "api-key": apiKey } })
      .then((r) => r.json())
      .then((d) => setStudents(d.users || d || []))
      .catch(() => setStudents([]));
  }, [selectedBatch, selectedClass, apiKey]);

  // Fetch students for Add Debt Popup
  useEffect(() => {
    const aBatch = addBatch === "none" ? "" : addBatch;
    const aClass = addClass === "none" ? "" : addClass;
    if (!aBatch && !aClass) { setAddStudents([]); return; }
    
    const params = new URLSearchParams({ roles: "Student", projection: "id,name" });
    if (aBatch) params.append("batchId", aBatch);
    if (aClass) params.append("classId", aClass);
    if (aClass && !aBatch) params.append("status", "Active");

    fetch(`/api/users?${params.toString()}`, { headers: { "api-key": apiKey } })
      .then((r) => r.json())
      .then((d) => setAddStudents(d.users || d || []))
      .catch(() => setAddStudents([]));
  }, [addBatch, addClass, apiKey]);

  // Fetch debts
  const fetchDebts = useCallback(async () => {
    const sBatch = selectedBatch === "none" ? "" : selectedBatch;
    const sClass = selectedClass === "none" ? "" : selectedClass;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sBatch) params.append("batchId", sBatch);
      if (sClass) params.append("classId", sClass);
      
      const res = await fetch(`/api/debtors?${params.toString()}`, { headers: { "api-key": apiKey } });
      const data = await res.json();
      setDebts(data.debts || []);
      setSelectedDebts([]); // reset selection
    } catch {
      toast.error("Failed to load debts");
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedClass, apiKey]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  // Add Debt Submit
  const handleAddDebt = async (e) => {
    e.preventDefault();
    const aBatch = addBatch === "none" ? "" : addBatch;
    const aClass = addClass === "none" ? "" : addClass;
    if (!addForm.studentId || !addForm.category || !addForm.totalAmount) {
      toast.error("Fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ ...addForm, batchId: aBatch, classId: aClass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Debt added");
        setAddOpen(false);
        setCategories((prev) => {
          if (!prev.some(c => c.name === addForm.category.toUpperCase())) {
            return [...prev, { _id: Date.now().toString(), name: addForm.category.toUpperCase() }];
          }
          return prev;
        });
        setAddForm({ studentId: "", category: "", year: new Date().getFullYear().toString(), totalAmount: "", note: "" });
        setAddBatch(""); setAddClass("");
        if (selectedBatch === addBatch && selectedClass === addClass) fetchDebts();
      } else {
        toast.error(data.error || "Failed to add debt");
      }
    } finally {
      setSaving(false);
    }
  };

  // Edit Debt Submit
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.category || !editForm.totalAmount) { toast.error("Fill required fields"); return; }
    setEditing(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          id: editForm._id,
          category: editForm.category.toUpperCase(),
          year: editForm.year,
          totalAmount: Number(editForm.totalAmount),
          note: editForm.note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Debt updated");
        setEditOpen(false);
        setCategories((prev) => {
          if (!prev.some(c => c.name === editForm.category.toUpperCase())) {
            return [...prev, { _id: Date.now().toString(), name: editForm.category.toUpperCase() }];
          }
          return prev;
        });
        setEditForm(null);
        fetchDebts();
      } else toast.error(data.error || "Failed to update debt");
    } finally { setEditing(false); }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ ids: selectedDebts }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Deleted successfully");
        setSelectedDebts([]);
        setDeleteOpen(false);
        fetchDebts();
      } else toast.error(data.error || "Failed to delete");
    } finally { setDeleting(false); }
  };

  // Pay Submit
  const handlePay = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          id: payDebt._id,
          payment: { amount: Number(payAmount), date: payDate, note: payNote },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Payment recorded");
        setPayOpen(false);
        setPayAmount(""); setPayNote("");
        fetchDebts();
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } finally {
      setPaying(false);
    }
  };

  const studentName = (id) => {
    let st = students.find((s) => (s._id || s.id) === id) || addStudents.find((s) => (s._id || s.id) === id);
    return st?.name || id;
  };

  const filteredDebts = debts.filter(d => {
    const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
    const status = paid >= d.totalAmount ? "Paid" : paid > 0 ? "Partial" : "Pending";
    
    if (filterStatus !== "All" && status !== filterStatus) return false;
    
    const dDate = d.createdAt ? d.createdAt.substring(0, 10) : null;
    if (filterFromDate && dDate && dDate < filterFromDate) return false;
    if (filterToDate && dDate && dDate > filterToDate) return false;
    
    return true;
  });

  return (
    <div className="p-2 space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap gap-3 items-end no-print">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="h-4 w-4 mr-1" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem
              className="font-bold border-b mb-1"
              checked={Object.values(visibleCols).every(Boolean)}
              onCheckedChange={(checked) => {
                const newCols = {};
                Object.keys(visibleCols).forEach(k => newCols[k] = checked);
                setVisibleCols(newCols);
              }}
            >
              Toggle All
            </DropdownMenuCheckboxItem>
            {Object.keys(visibleCols).map((k) => (
              <DropdownMenuCheckboxItem
                key={k}
                className="capitalize"
                checked={visibleCols[k]}
                onCheckedChange={(checked) => setVisibleCols((prev) => ({ ...prev, [k]: checked }))}
              >
                {k}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenFilter}>
              <Filter className="h-4 w-4 mr-1" /> Filter Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Filter Debts</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Batch</Label>
                <Select value={tempBatch} onValueChange={setTempBatch}>
                  <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches.map((b) => <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name} {b.startYear ? `(${b.startYear})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Class</Label>
                <Select value={tempClass} onValueChange={setTempClass}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {classes.map((c) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
                  <SelectTrigger><SelectValue placeholder="Any Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>From Date</Label>
                  <Input type="date" value={tempFromDate} onChange={e => setTempFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>To Date</Label>
                  <Input type="date" value={tempToDate} onChange={e => setTempToDate(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setFilterOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={applyFilter}>Apply</Button>
              </div>

              <Button variant="ghost" className="w-full text-xs" onClick={() => {
                setTempStatus("All"); setTempFromDate(""); setTempToDate("");
              }}>Clear Additional Filters</Button>
            </div>
          </DialogContent>
        </Dialog>

        {selectedDebts.length > 0 && (
           <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
             <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({selectedDebts.length})
           </Button>
        )}

        <div className="flex gap-2 ml-auto">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setAddOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Debt
          </Button>
          <Button variant="default" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>



      {/* Debts Table */}
      <div className="rounded-md border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center text-muted-foreground p-12">No debt records found matching your filters.</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12 no-print">
                  <Checkbox 
                    checked={selectedDebts.length === filteredDebts.length && filteredDebts.length > 0} 
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedDebts(filteredDebts.map(d => d._id));
                      else setSelectedDebts([]);
                    }} 
                  />
                </TableHead>
                {visibleCols.student && <TableHead>Student</TableHead>}
                {visibleCols.category && <TableHead>Category</TableHead>}
                {visibleCols.year && <TableHead>Year</TableHead>}
                {visibleCols.total && <TableHead className="text-right">Total</TableHead>}
                {visibleCols.paid && <TableHead className="text-right">Paid</TableHead>}
                {visibleCols.balance && <TableHead className="text-right">Balance</TableHead>}
                {visibleCols.status && <TableHead>Status</TableHead>}
                <TableHead className="no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.map((debt, i) => {
                const paid    = (debt.payments || []).reduce((s, p) => s + p.amount, 0);
                const balance = debt.totalAmount - paid;
                const status  = paid >= debt.totalAmount ? "Paid" : paid > 0 ? "Partial" : "Pending";
                return (
                  <TableRow key={debt._id} className="hover:bg-muted/30">
                    <TableCell className="no-print">
                      <Checkbox 
                        checked={selectedDebts.includes(debt._id)}
                        onCheckedChange={(c) => {
                          if (c) setSelectedDebts([...selectedDebts, debt._id]);
                          else setSelectedDebts(selectedDebts.filter(id => id !== debt._id));
                        }}
                      />
                    </TableCell>
                    {visibleCols.student && <TableCell className="font-medium">{studentName(debt.studentId)}</TableCell>}
                    {visibleCols.category && <TableCell>{debt.category}</TableCell>}
                    {visibleCols.year && <TableCell>{debt.year}</TableCell>}
                    {visibleCols.total && <TableCell className="text-right">₹{debt.totalAmount.toLocaleString()}</TableCell>}
                    {visibleCols.paid && <TableCell className="text-right text-green-600">₹{paid.toLocaleString()}</TableCell>}
                    {visibleCols.balance && <TableCell className="text-right font-bold text-red-600">₹{balance.toLocaleString()}</TableCell>}
                    {visibleCols.status && (
                      <TableCell>
                        <Badge variant="outline" className={statusColor(status)}>{status}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="flex gap-1 no-print">
                      {status !== "Paid" && (
                        <Button
                          size="sm" variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => { setPayDebt(debt); setPayOpen(true); }}
                        >
                          <BadgeIndianRupee className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      )}
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { setEditForm({ ...debt }); setEditOpen(true); }}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Debt Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Debt Record</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDebt} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <Label>Batch</Label>
                 <Select value={addBatch} onValueChange={setAddBatch}>
                   <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">None</SelectItem>
                     {batches.map((b) => <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name} {b.startYear ? `(${b.startYear})` : ""}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1">
                 <Label>Class</Label>
                 <Select value={addClass} onValueChange={setAddClass}>
                   <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">None</SelectItem>
                     {classes.map((c) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
            </div>
            <div className="space-y-1">
              <Label>Student *</Label>
              <Select value={addForm.studentId} onValueChange={(v) => setAddForm((p) => ({ ...p, studentId: v }))} disabled={(!addBatch || addBatch === "none") && (!addClass || addClass === "none")}>
                <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  {addStudents.map((s) => <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name} ({s._id || s.id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Input
                list="debt-categories"
                value={addForm.category}
                onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value.toUpperCase() }))}
                placeholder="Select or type Category"
                required
              />
              <datalist id="debt-categories">
                {categories.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Year *</Label>
                <Input value={addForm.year} onChange={(e) => setAddForm((p) => ({ ...p, year: e.target.value }))} placeholder="2024-25" required />
              </div>
              <div className="space-y-1">
                <Label>Total Amount *</Label>
                <Input type="number" min={1} value={addForm.totalAmount} onChange={(e) => setAddForm((p) => ({ ...p, totalAmount: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input value={addForm.note} onChange={(e) => setAddForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Debt Record</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input
                  list="debt-categories"
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Year *</Label>
                  <Input value={editForm.year} onChange={(e) => setEditForm((p) => ({ ...p, year: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Total Amount *</Label>
                  <Input type="number" min={1} value={editForm.totalAmount} onChange={(e) => setEditForm((p) => ({ ...p, totalAmount: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={editForm.note || ""} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editing}>
                  {editing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm text-center">
           <div className="flex flex-col items-center justify-center gap-4 py-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Delete {selectedDebts.length} Records?</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete the selected debt records? This action cannot be undone.
                </p>
              </div>
           </div>
           <DialogFooter className="sm:justify-center">
             <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
             <Button type="button" variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment — {studentName(payDebt?.studentId)}</DialogTitle>
          </DialogHeader>
          {payDebt && (
            <form onSubmit={handlePay} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Category: <span className="font-semibold text-foreground">{payDebt.category}</span> &nbsp;|&nbsp;
                Balance: <span className="font-bold text-red-600">
                  ₹{(payDebt.totalAmount - (payDebt.payments || []).reduce((s, p) => s + p.amount, 0)).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <Label>Amount *</Label>
                <Input type="number" min={1} max={payDebt.totalAmount - (payDebt.payments || []).reduce((s, p) => s + p.amount, 0)} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={paying} className="bg-green-600 hover:bg-green-700 text-white">
                  {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
