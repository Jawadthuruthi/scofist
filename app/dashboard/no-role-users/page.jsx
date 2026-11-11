'use client';

import React, { useState, useEffect, useCallback, Component } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  UserX,
  UserCheck,
  Search,
  Loader2,
  RefreshCw,
  Info,
  Plus,
  Trash2,
  Pencil,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  List,
  X,
} from 'lucide-react';

const AVAILABLE_ROLES = [
  'College Admin',
  'Org Admin',
  'Teacher',
  'Student',
  'Program Committee',
  'Program Leader',
  'Finance',
  'Literary Leader',
  'Spark Admin',
  'Library Manager',
  'Librarian',
  'Judge',
];

// ─── Error Boundary ──────────────────────────────────────────────────────────
class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TabErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 text-center my-4 border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="font-semibold text-lg text-foreground">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {this.state.error?.message || 'An error occurred while displaying user roles.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry?.();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ─── Safe Helpers ────────────────────────────────────────────────────────────
function normalizeRoles(roles) {
  if (!roles) return [];
  if (Array.isArray(roles)) {
    return roles
      .filter((r) => r !== null && r !== undefined)
      .map((r) => (typeof r === 'string' ? r.trim() : String(r?.name || r).trim()))
      .filter(Boolean);
  }
  if (typeof roles === 'string') {
    const trimmed = roles.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function normalizeMembers(members) {
  if (!members || !Array.isArray(members)) return [];
  return members
    .filter(Boolean)
    .map((m) => {
      if (typeof m === 'string') {
        const trimmed = m.trim();
        return { email: trimmed, name: trimmed, id: trimmed };
      }
      return {
        email: typeof m.email === 'string' ? m.email.trim() : (m.email ? String(m.email).trim() : ''),
        name: typeof m.name === 'string' ? m.name.trim() : (m.name ? String(m.name).trim() : ''),
        id: m._id || m.id || '',
      };
    })
    .filter((m) => m.email || m.name);
}

// ─── Confirmation Dialog ────────────────────────────────────────────────────
function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, loading, confirmText = "Confirm Delete" }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl flex flex-col gap-0">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
          <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0 text-destructive">
              {title}
            </DialogTitle>
            <DialogDescription className="m-0 text-sm text-muted-foreground pt-1">
              {description}
            </DialogDescription>
          </div>
          <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" disabled={loading}>
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>
        <DialogFooter className="p-4 sm:p-5 border-t bg-muted/20 flex flex-row justify-between gap-3 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1 mt-0">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ADMIN USERS TAB ─────────────────────────────────────────────────────────
function AdminUsersTab({ users, customRoles, loading, refresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter for Admin view (excludes Teacher/Student from standard list)
  const adminFilteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const roles = normalizeRoles(u.roles);
    if (roles.length === 0) return true;
    return !roles.some((r) => r === 'Teacher' || r === 'Student');
  });

  const filteredUsers = adminFilteredUsers.filter((u) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = String(u?.name || '').toLowerCase();
    const email = String(u?.email || '').toLowerCase();
    const id = String(u?._id || u?.id || '').toLowerCase();
    const contact = String(u?.contactNumber || '').toLowerCase();

    return name.includes(search) || email.includes(search) || id.includes(search) || contact.includes(search);
  });

  // Helper to find custom roles for a specific user
  const getUserCustomRoles = (email) => {
    if (!email || !Array.isArray(customRoles)) return [];
    const emailLower = String(email).trim().toLowerCase();
    return customRoles
      .filter((role) => {
        if (!role) return false;
        const members = normalizeMembers(role.members);
        return members.some((m) => m.email && m.email.toLowerCase() === emailLower);
      })
      .map((role) => (role.name ? String(role.name) : ''))
      .filter(Boolean);
  };

  const toggleRole = (role) =>
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );

  const handleAssign = (user) => {
    setSelectedUser(user);
    setSelectedRoles(normalizeRoles(user?.roles));
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRoles.length) {
      toast.error('Select at least one role');
      return;
    }
    const userId = selectedUser?._id || selectedUser?.id;
    if (!userId) {
      toast.error('User identifier not found');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [userId], roles: selectedRoles }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update roles');
      }
      toast.success(`Roles assigned to ${selectedUser.name || 'user'}!`);
      setIsDialogOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to assign roles');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Shows users with no roles or admin-only roles. Teacher/Student users are
          managed on their dedicated pages.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center justify-between">
            USER LIST
            <Badge variant="secondary">{filteredUsers.length} users</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UserCheck className="mx-auto h-10 w-10 mb-3" />
              {searchTerm ? 'No users match your search.' : 'All users have roles assigned.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Roles</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const userRoles = normalizeRoles(user.roles);
                    const uCustomRoles = getUserCustomRoles(user.email);
                    const userId = user._id || user.id || Math.random().toString();
                    return (
                      <TableRow key={userId}>
                        <TableCell className="font-medium">{user.name ? String(user.name) : 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {user.email ? String(user.email) : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {/* Standard Roles */}
                            {userRoles.map((r) => (
                              <Badge key={r} variant="secondary" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                            {/* Custom Roles */}
                            {uCustomRoles.map((cr) => (
                              <Badge key={cr} variant="default" className="text-xs bg-primary/80">
                                {cr}
                              </Badge>
                            ))}
                            {/* No Roles Placeholder */}
                            {(!userRoles.length && !uCustomRoles.length) && (
                              <Badge variant="outline" className="text-xs">
                                No Roles
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleAssign(user)} className="text-xs">
                            {userRoles.length ? 'Edit Roles' : 'Assign Roles'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl flex flex-col gap-0 max-h-[85vh]">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">Assign Roles</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Select roles to assign to <strong>{selectedUser?.name || 'user'}</strong>.
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 sm:p-5 overflow-y-auto">
            {AVAILABLE_ROLES.map((role) => (
              <div
                key={role}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedRoles.includes(role)
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-accent'
                  }`}
                onClick={() => toggleRole(role)}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center ${selectedRoles.includes(role)
                    ? 'bg-primary border-primary'
                    : 'border-input'
                    }`}
                >
                  {selectedRoles.includes(role) && (
                    <UserCheck className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{role}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40 flex justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ROLE SUMMARY TAB (Role-centric view) ──────────────────────────────────
function RoleSummaryTab({ users, customRoles, loading, refresh }) {
  // --- Member Management ---
  const [addRole, setAddRole] = useState(null); // { name, type, id }
  const [memberEmail, setMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState(null); // { roleName, roleType, userEmail, userId, customRoleId }
  const [removing, setRemoving] = useState(false);

  // --- Role Management (Custom Roles only) ---
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editing, setEditing] = useState(false);

  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState(null);
  const [deletingRole, setDeletingRole] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Aggregate memberships safely
  const roleGroups = [];

  // Standard Roles
  const allStandardRoles = [...new Set([
    ...AVAILABLE_ROLES,
    ...(users || []).flatMap((u) => normalizeRoles(u?.roles))
  ])]
    .filter((role) => typeof role === 'string' && role !== 'Teacher' && role !== 'Student' && role !== 'Stationary' && role !== 'IT Lab' && role !== 'Finance' && role !== 'Library Manager')
    .sort((a, b) => String(a).localeCompare(String(b)));

  allStandardRoles.forEach((roleName) => {
    const members = (users || []).filter((u) => u && normalizeRoles(u.roles).includes(roleName));
    roleGroups.push({
      name: roleName,
      type: 'Standard',
      members: members.map((m) => ({
        email: String(m?.email || ''),
        name: String(m?.name || m?.email || 'N/A'),
        id: m?._id || m?.id || '',
      })),
      total: members.length,
    });
  });

  // Custom Roles
  (customRoles || []).forEach((role) => {
    if (!role) return;
    const members = normalizeMembers(role.members);
    roleGroups.push({
      name: String(role.name || 'Unnamed Role'),
      type: 'Custom',
      id: role._id || role.id,
      members: members,
      total: members.length,
    });
  });

  // Sort by type then name
  roleGroups.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'Standard' ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    const cleanEmail = memberEmail.trim();
    try {
      setAdding(true);
      if (addRole.type === 'Custom') {
        const res = await fetch(`/api/custom-roles/${addRole.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to add member to custom role');
      } else {
        const user = (users || []).find((u) => u && String(u.email || '').toLowerCase() === cleanEmail.toLowerCase());
        if (!user) throw new Error('User not found. They must exist in the system first.');
        const userRoles = normalizeRoles(user.roles);
        if (userRoles.includes(addRole.name)) throw new Error('User already has this role');
        const newRoles = [...userRoles, addRole.name];
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [user._id || user.id], roles: newRoles }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to update system role');
        }
      }
      toast.success('Member added successfully!');
      setAddRole(null);
      setMemberEmail('');
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    try {
      setRemoving(true);
      if (confirmRemove.roleType === 'Custom') {
        const res = await fetch(
          `/api/custom-roles/${confirmRemove.customRoleId}/members?email=${encodeURIComponent(confirmRemove.userEmail)}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to remove member');
        }
      } else {
        const user = (users || []).find((u) => u && (u._id === confirmRemove.userId || u.id === confirmRemove.userId));
        if (!user) throw new Error('User not found');
        const newRoles = normalizeRoles(user.roles).filter((r) => r !== confirmRemove.roleName);
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [user._id || user.id], roles: newRoles }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to update user roles');
        }
      }
      toast.success('Member removed');
      setConfirmRemove(null);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  // ── Role Handlers ────────────────────────────────────────────────────────
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/custom-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDesc.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to create role');
      toast.success('Role created!');
      setCreateOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const handleEditRole = async () => {
    if (!editName.trim()) {
      toast.error('Role name is required');
      return;
    }
    const roleId = editRole?._id || editRole?.id;
    if (!roleId) {
      toast.error('Role ID missing');
      return;
    }
    try {
      setEditing(true);
      const res = await fetch(`/api/custom-roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update role');
      toast.success('Role updated!');
      setEditOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteRole = async () => {
    const roleId = deleteRoleConfirm?._id || deleteRoleConfirm?.id;
    if (!roleId) return;
    try {
      setDeletingRole(true);
      const res = await fetch(`/api/custom-roles/${roleId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete role');
      toast.success('Role deleted!');
      setDeleteRoleConfirm(null);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setDeletingRole(false);
    }
  };

  const openEdit = (roleId) => {
    const role = (customRoles || []).find((r) => r && (r._id === roleId || r.id === roleId));
    if (!role) return;
    setEditRole(role);
    setEditName(role.name || '');
    setEditDesc(role.description || '');
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
          <CardTitle className="text-base font-bold">Role Summary</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-7 text-xs px-2">
              <Plus className="mr-1 h-3 w-3" />
              ADD ROLE
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-8 hover:bg-transparent border-b">
                  <TableHead className="text-[10px] h-8 py-0 font-bold">Role Name</TableHead>
                  <TableHead className="text-[10px] h-8 py-0 font-bold">Type</TableHead>
                  <TableHead className="text-[10px] h-8 py-0 font-bold">Members</TableHead>
                  <TableHead className="text-right text-[10px] h-8 py-0 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      No roles with members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  roleGroups.map((group) => (
                    <TableRow key={`${group.type}-${group.name}`} className="group/row">
                      <TableCell className="font-semibold py-3">
                        <div className="flex items-center gap-2">
                          {group.type === 'Custom' ? (
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{group.name}</span>
                          {group.type === 'Custom' && (
                            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(group.id)} className="text-muted-foreground hover:text-primary p-1" title="Edit role">
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setDeleteRoleConfirm({ _id: group.id, name: group.name, members: group.members })}
                                className="text-muted-foreground hover:text-destructive p-1"
                                title="Delete role"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={group.type === 'Custom' ? 'default' : 'secondary'} className="text-[10px]">
                          {group.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[400px] min-w-[200px]">
                          {group.members.map((m, idx) => (
                            <Badge key={m.email || idx} variant="outline" className="text-[10px] font-normal whitespace-nowrap flex items-center gap-1 group/badge pr-1">
                              {m.name || m.email || 'Member'}
                              <button
                                onClick={() => setConfirmRemove({
                                  roleName: group.name,
                                  roleType: group.type,
                                  userEmail: m.email,
                                  userId: m.id,
                                  customRoleId: group.id
                                })}
                                className="opacity-40 hover:opacity-100 hover:text-destructive transition-all"
                                title="Remove member"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold text-sm bg-accent px-2 py-1 rounded min-w-[30px] text-center">
                            {group.total}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAddRole({ name: group.name, type: group.type, id: group.id })}
                            title="Add member"
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Add Member Dialog ── */}
      <Dialog open={!!addRole} onOpenChange={(o) => !o && setAddRole(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl flex flex-col gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Add to {addRole?.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                {addRole?.type === 'Standard'
                  ? "Enter email to assign the system role."
                  : "Enter an email to add a new member to this custom role group."}
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 px-4 sm:px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="member-email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="member-email"
                placeholder="user@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40 flex justify-end">
            <Button variant="outline" onClick={() => setAddRole(null)} disabled={adding} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={adding} className="w-full sm:w-auto">
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {addRole?.type === 'Standard' ? 'Assign Role' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirm ── */}
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title="Remove Member?"
        description={`Are you sure you want to remove "${confirmRemove?.userEmail}" from the role "${confirmRemove?.roleName}"? This action is effective immediately.`}
        onConfirm={handleRemoveMember}
        loading={removing}
        confirmText="Confirm Removal"
      />

      {/* ── Create Role Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl flex flex-col gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">Create New Role</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Define a custom role name.
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 px-4 sm:px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-role-name" className="text-sm font-medium">Role Name *</Label>
              <Input
                id="new-role-name"
                placeholder="e.g. Sports Committee"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-role-desc" className="text-sm font-medium">Description</Label>
              <Input
                id="new-role-desc"
                placeholder="Optional description"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40 flex justify-end">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={creating} className="w-full sm:w-auto">
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl flex flex-col gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">Edit Role</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Update details for <strong>{editRole?.name}</strong>.
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 px-4 sm:px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-name" className="text-sm font-medium">Role Name *</Label>
              <Input
                id="edit-role-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEditRole()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-desc" className="text-sm font-medium">Description</Label>
              <Input
                id="edit-role-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40 flex justify-end">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={editing} className="w-full sm:w-auto">
              {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Role Confirm ── */}
      <ConfirmDialog
        open={!!deleteRoleConfirm}
        onOpenChange={(o) => !o && setDeleteRoleConfirm(null)}
        title={`Delete "${deleteRoleConfirm?.name}"?`}
        description={`This will permanently delete the role and remove all ${deleteRoleConfirm?.members?.length ?? 0} member(s). This cannot be undone.`}
        onConfirm={handleDeleteRole}
        loading={deletingRole}
      />
    </div>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, customRolesRes] = await Promise.all([
        fetch('/api/users?projection=_id,name,email,roles,contactNumber&limit=2000'),
        fetch('/api/custom-roles')
      ]);

      if (!usersRes.ok || !customRolesRes.ok) throw new Error('Failed to fetch data');

      const usersData = await usersRes.json().catch(() => ({}));
      const customRolesData = await customRolesRes.json().catch(() => ({}));

      const allUsers = Array.isArray(usersData.users) ? usersData.users : [];
      const allRoles = Array.isArray(customRolesData.roles) ? customRolesData.roles : [];

      setUsers(allUsers);
      setCustomRoles(allRoles);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load dashboard data');
      setUsers([]);
      setCustomRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const props = { users, customRoles, loading, refresh: fetchData };

  return (
    <div className="container mx-auto p-0 pt-4 md:pt-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-xl md:text-2xl text-foreground uppercase">ADMIN USERS</h1>
        <h3 className="text-muted-foreground">Manage user roles and custom role groups</h3>
      </div>

      <Tabs defaultValue="admin-users">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="admin-users" className="flex items-center gap-2">
            <UserX className="h-4 w-4" />
            ADMIN USERS
          </TabsTrigger>
          <TabsTrigger value="role-summary" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            ROLE SUMMARY
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin-users" className="mt-4">
          <TabErrorBoundary onRetry={fetchData}>
            <AdminUsersTab {...props} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="role-summary" className="mt-4">
          <TabErrorBoundary onRetry={fetchData}>
            <RoleSummaryTab {...props} />
          </TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
