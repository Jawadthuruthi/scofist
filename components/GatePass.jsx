'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Search, Scan, LogIn, LogOut, History, User, Shield, Clock, CheckCircle2, AlertCircle, X, UserCheck, Trash2 } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import Image from 'next/image'

export default function GatePass({ activeRole, currentUser }) {
    const [studentId, setStudentId] = useState('')
    const [student, setStudent] = useState(null)
    const [loading, setLoading] = useState(false)
    const [reason, setReason] = useState('')
    const [logs, setLogs] = useState([])
    const [fetchingLogs, setFetchingLogs] = useState(false)

    // Teachers state
    const [teachers, setTeachers] = useState([])
    const [selectedTeacher, setSelectedTeacher] = useState('')

    // Confirmation State
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [confirmedPass, setConfirmedPass] = useState(null)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [manualConfirmId, setManualConfirmId] = useState('')
    const [confirmingManual, setConfirmingManual] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchLogs = useCallback(async () => {
        setFetchingLogs(true)
        try {
            const res = await fetch('/api/gate-pass')
            const data = await res.json()
            if (res.ok) {
                setLogs(data.logs || [])
            }
        } catch (error) {
            console.error('Error fetching logs:', error)
        } finally {
            setFetchingLogs(false)
        }
    }, [])

    const fetchTeachers = useCallback(async () => {
        try {
            const res = await fetch('/api/users?roles=Teacher&projection=name')
            const data = await res.json()
            if (res.ok) {
                setTeachers(data.users || [])
            }
        } catch (error) {
            console.error('Error fetching teachers:', error)
        }
    }, [])

    useEffect(() => {
        fetchLogs()
        fetchTeachers()

        // If active role is Teacher, set the selected teacher to current user
        if (activeRole === 'Teacher' && currentUser?._id) {
            setSelectedTeacher(currentUser._id)
        }

        // Poll for updates every minute to handle 15-min expiry cleanup
        const interval = setInterval(fetchLogs, 60000)
        return () => clearInterval(interval)
    }, [fetchLogs, fetchTeachers, activeRole, currentUser])

    const handleSearch = async (e) => {
        if (e) e.preventDefault()
        if (!studentId) return

        setLoading(true)
        try {
            const res = await fetch(`/api/users?_id=${studentId.toUpperCase()}&roles=Student`)
            const data = await res.json()

            if (res.ok && data.users && data.users.length > 0) {
                setStudent(data.users[0])
                setReason('')
            } else {
                toast.error('Student not found')
                setStudent(null)
            }
        } catch (error) {
            toast.error('Error searching student')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const setPermission = async (type) => {
        if (!student) return
        if (!selectedTeacher) {
            toast.error('Please select the teacher who allowed the pass')
            return
        }

        try {
            const res = await fetch('/api/gate-pass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: student._id,
                    type,
                    reason,
                    allowedBy: selectedTeacher,
                    action: 'set'
                })
            })

            if (res.ok) {
                toast.success(`Permission set for ${student.name}. Valid for 15 minutes.`)
                setStudent(null)
                setStudentId('')
                setReason('')
                setSelectedTeacher('')
                fetchLogs()
            } else {
                const data = await res.json()
                toast.error(data.message || 'Failed to set permission')
            }
        } catch (error) {
            toast.error('Error setting permission')
        }
    }

    const handleDelete = async (id) => {
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/gate-pass?id=${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                toast.success('Record deleted successfully')
                fetchLogs()
                setDeletingId(null)
            } else {
                const data = await res.json()
                toast.error(data.message || 'Failed to delete record')
            }
        } catch (error) {
            toast.error('Error deleting record')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleScan = async (result) => {
        if (!result) return

        try {
            const res = await fetch('/api/gate-pass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: result,
                    action: 'confirm'
                })
            })

            const data = await res.json()

            if (res.ok) {
                // Play success sound
                const audio = new Audio('/success-chime.mp3')
                audio.play().catch(e => console.log('Audio play failed:', e))

                setConfirmedPass(data.pass)
                setShowConfirmation(true)
                setManualConfirmId('')
                fetchLogs()
                // Auto-close confirmation after 5 seconds
                setTimeout(() => setShowConfirmation(false), 5000)
            } else {
                toast.error(data.message || 'Scan failed')
            }
        } catch (error) {
            toast.error('Error confirming scan')
        }
    }

    return (
        <div className="space-y-6 relative">
            <div className={`grid grid-cols-1 ${activeRole !== 'Gate Keeper' ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'} gap-6`}>
                {/* Step 1: Set Permission */}
                {activeRole !== 'Gate Keeper' && (
                    <Card className="border-primary/10 shadow-lg">
                        <CardHeader className="bg-primary/5 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Set Gate Permission
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    placeholder="Search Student ID"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="uppercase"
                                />
                                <Button type="submit" size="icon" disabled={loading}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </form>

                            {loading ? (
                                <div className="flex justify-center p-8 animate-pulse">
                                    <Clock className="w-8 h-8 animate-spin text-primary/40" />
                                </div>
                            ) : student ? (
                                <div className="bg-muted/30 p-4 rounded-lg border border-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-4">
                                        <div className="relative w-24 h-28 rounded border bg-muted shrink-0 overflow-hidden">
                                            {student.profilePic?.url ? (
                                                <Image src={student.profilePic.url} alt={student.name} fill className="object-cover" />
                                            ) : (
                                                <User className="w-full h-full p-6 text-muted-foreground/30" />
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-lg">{student.name}</p>
                                            <p className="text-sm font-semibold text-primary">{student._id}</p>
                                            <p className="text-xs text-muted-foreground">{student.className || 'No Class'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground ml-1">AUTHORIZED BY (TEACHER)</p>
                                            <Select
                                                value={selectedTeacher}
                                                onValueChange={setSelectedTeacher}
                                                disabled={activeRole === 'Teacher'}
                                            >
                                                <SelectTrigger className="w-full bg-background">
                                                    <SelectValue placeholder="Select Teacher" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {/* Ensure current teacher is in list even if not fetched yet */}
                                                    {activeRole === 'Teacher' && currentUser && !teachers.find(t => t._id === currentUser._id) && (
                                                        <SelectItem key={currentUser._id} value={currentUser._id}>{currentUser.name}</SelectItem>
                                                    )}
                                                    {teachers.map(teacher => (
                                                        <SelectItem key={teacher._id} value={teacher._id}>{teacher.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground ml-1">REASON</p>
                                            <Input
                                                placeholder="Optional reason for pass"
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 h-10"
                                                onClick={() => setPermission('IN')}
                                            >
                                                <LogIn className="w-4 h-4 mr-2" /> Allow IN
                                            </Button>
                                            <Button
                                                className="flex-1 bg-red-600 hover:bg-red-700 h-10"
                                                onClick={() => setPermission('OUT')}
                                            >
                                                <LogOut className="w-4 h-4 mr-2" /> Allow OUT
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-12 border-2 border-dashed rounded-lg border-muted/50 text-muted-foreground">
                                    <p className="text-sm">Search student to identify and set permission</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Confirmation Scanner */}
                <Card className="border-primary/10 shadow-lg">
                    <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Scan className="w-5 h-5 text-primary" />
                            Gate Pass Scanner
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 h-full flex flex-col space-y-6">
                        <div className="flex flex-col items-center justify-center min-h-[160px] bg-muted/20 rounded-lg border-2 border-dashed border-muted relative group">
                            {!isScannerOpen ? (
                                <div className="flex flex-col items-center space-y-3 p-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Scan className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                                    </div>
                                    <Button
                                        onClick={() => setIsScannerOpen(true)}
                                        variant="secondary"
                                        size="sm"
                                    >
                                        Open Camera Scanner
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full max-w-[280px] bg-black rounded overflow-hidden shadow-2xl">
                                    <BarcodeScanner onScan={(res) => {
                                        handleScan(res)
                                        setIsScannerOpen(false)
                                    }} onClose={() => setIsScannerOpen(false)} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-px bg-muted flex-1" />
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">OR ENTER ID MANUALLY</span>
                                <div className="h-px bg-muted flex-1" />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Manual Student ID"
                                    value={manualConfirmId}
                                    onChange={(e) => setManualConfirmId(e.target.value)}
                                    className="uppercase font-semibold"
                                    onKeyDown={(e) => e.key === 'Enter' && handleScan(manualConfirmId)}
                                />
                                <Button
                                    onClick={() => handleScan(manualConfirmId)}
                                    disabled={!manualConfirmId || confirmingManual}
                                    className="bg-slate-900"
                                >
                                    Confirm
                                </Button>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground italic">
                                Permission must have been set within the last 15 minutes.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Overlay */}
            {showConfirmation && confirmedPass && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md shadow-2xl border-green-500/50 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-green-600 p-6 lg:p-4 flex flex-col items-center justify-center text-white space-y-4 lg:space-y-2">
                            <div className="bg-white/20 p-4 rounded-full animate-bounce">
                                <CheckCircle2 className="w-16 h-16 lg:w-12 lg:h-12" />
                            </div>
                            <h2 className="text-3xl lg:text-2xl font-black tracking-tight uppercase">Confirmed!</h2>
                            <div className="bg-white/10 px-4 py-1 rounded-full text-sm font-bold tracking-wider">
                                {confirmedPass.type === 'IN' ? 'ENTRY PERMITTED' : 'EXIT PERMITTED'}
                            </div>
                        </div>
                        <CardContent className="p-8 lg:p-6 space-y-6 lg:space-y-4 text-center">
                            <div className="flex justify-center">
                                <div className="relative w-32 h-40 lg:w-28 lg:h-36 rounded-lg overflow-hidden border-4 border-muted shadow-lg">
                                    {confirmedPass.studentId?.profilePic?.url ? (
                                        <Image src={confirmedPass.studentId.profilePic.url} alt="" fill className="object-cover" />
                                    ) : (
                                        <User className="w-full h-full p-8 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    {confirmedPass.studentId?.name}
                                </p>
                                <div className="flex justify-center gap-2">
                                    <Badge variant="outline">{confirmedPass.studentId?._id}</Badge>
                                    <Badge variant="outline">{confirmedPass.studentId?.className || 'Class N/A'}</Badge>
                                </div>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center gap-3">
                                <UserCheck className="w-5 h-5 text-green-600" />
                                <div className="text-left">
                                    <p className="text-[10px] text-muted-foreground leading-none">AUTHORIZED BY</p>
                                    <p className="font-semibold text-sm">{confirmedPass.allowedBy?.name || 'Authorized'}</p>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground italic">
                                Timestamp: {new Date(confirmedPass.confirmedAt).toLocaleString()}
                            </p>
                            <Button onClick={() => setShowConfirmation(false)} className="w-full bg-slate-900 h-10">
                                DISMISS
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm shadow-2xl border-destructive/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="bg-destructive/5 pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                <AlertCircle className="w-5 h-5" />
                                Confirm Deletion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete this activity record? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setDeletingId(null)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => handleDelete(deletingId)}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Activity Table */}
            {activeRole !== 'Gate Keeper' && (
                <Card className="border-primary/10 shadow-lg overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-4 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            Activity Log
                        </CardTitle>
                        <Badge variant="outline" className="bg-background">Last 15 Records</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center">Sl No</TableHead>
                                        <TableHead>Student ID</TableHead>
                                        <TableHead>Full Name</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Authorized By</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead className="w-[80px] text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fetchingLogs ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell colSpan={7} className="h-14 bg-muted/5" />
                                            </TableRow>
                                        ))
                                    ) : logs.length > 0 ? (
                                        logs.map((log, index) => {
                                            const isPending = log.status === 'Pending'
                                            const timeToDisplay = isPending ? log.createdAt : log.confirmedAt
                                            const isExpired = isPending && new Date(log.expiresAt) <= new Date()

                                            if (isExpired) return null

                                            return (
                                                <TableRow
                                                    key={log._id}
                                                    className={`transition-colors ${isPending ? 'bg-yellow-100 hover:bg-yellow-200/50' : 'hover:bg-muted/10'}`}
                                                >
                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {(index + 1).toString().padStart(2, '0')}
                                                    </TableCell>
                                                    <TableCell className="font-semibold">{log.studentId?._id}</TableCell>
                                                    <TableCell className="font-bold">{log.studentId?.name || 'User'}</TableCell>
                                                    <TableCell>{log.studentId?.className || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <UserCheck className="w-3 h-3 text-primary" />
                                                            </div>
                                                            <span className="text-xs font-medium">{log.allowedBy?.name || '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={isPending ? 'secondary' : (log.type === 'IN' ? 'outline' : 'destructive')}
                                                            className={!isPending && log.type === 'IN' ? 'text-green-600 border-green-600' : ''}
                                                        >
                                                            {log.type === 'IN' ? 'ENTRY' : 'EXIT'} {isPending && '(PENDING)'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs">
                                                            <span className="font-semibold">
                                                                {new Date(timeToDisplay || log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {new Date(timeToDisplay || log.timestamp || log.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {activeRole === 'College Admin' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeletingId(log._id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                                                <div className="flex flex-col items-center space-y-2 opacity-50">
                                                    <AlertCircle className="w-10 h-10" />
                                                    <p>No confirmed activity recorded yet</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
