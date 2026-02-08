"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { UserX, UserCheck, Search, Loader2, RefreshCw, Info } from "lucide-react";

const AVAILABLE_ROLES = [
  "College Admin",
  "Org Admin",
  "Teacher",
  "Student",
  "Program Committee",
  "Program Leader",
  "Finance",
  "Literary Leader",
  "Stationary",
  "IT Lab",
  "Spark Admin",
  "Library Manager",
  "Librarian",
];

export default function NoRoleUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch users excluding ONLY Teachers and Students
  const fetchFilteredUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users?limit=1000");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      // Filter users:
      // 1. Users with no roles at all
      // 2. Users who DON'T have Teacher or Student roles AT ALL
      const filteredUsers = (data.users || []).filter((user) => {
        // Include users with no roles
        if (!user.roles || user.roles.length === 0) {
          return true;
        }

        // Exclude users who have Teacher OR Student role (even with other roles)
        const hasTeacherOrStudent = user.roles.some(
          (role) => role === "Teacher" || role === "Student"
        );

        return !hasTeacherOrStudent;
      });

      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchFilteredUsers();
  }, []);

  // Open dialog to assign roles
  const handleAssignRoles = (user) => {
    setSelectedUser(user);
    // Pre-select existing roles
    setSelectedRoles(user.roles || []);
    setIsDialogOpen(true);
  };

  // Toggle role selection
  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Submit role assignment
  const handleSubmit = async () => {
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: [selectedUser._id],
          roles: selectedRoles,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }

      toast.success(`Roles assigned successfully to ${selectedUser.name}!`);
      setIsDialogOpen(false);
      fetchFilteredUsers(); // Refresh the list
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to assign roles");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contactNumber?.includes(searchTerm)
  );

  // Helper to display user roles
  const getDisplayRoles = (roles) => {
    if (!roles || roles.length === 0) return [];
    return roles;
  };

  // Check if user will have Teacher/Student only after changes
  const willBeTeacherStudentOnly = () => {
    if (selectedRoles.length === 0) return false;
    return selectedRoles.every((role) => role === "Teacher" || role === "Student");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Admin Users
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all user roles
          </p>
        </div>
        <Button
          onClick={fetchFilteredUsers}
          disabled={loading}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          This page shows users with no roles or admin roles. Users with only Teacher/Student roles are managed on their dedicated pages.
        </AlertDescription>
      </Alert>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              Total Users
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Need role assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              Filtered
            </CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {filteredUsers.length}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Matching search
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">User List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-base md:text-lg font-semibold mb-2">
                {searchTerm ? "No users found" : "No users need roles"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search"
                  : "All users have roles assigned"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden md:table-cell">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="hidden xl:table-cell">Roles</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const displayRoles = getDisplayRoles(user.roles);
                    return (
                      <TableRow key={user._id}>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {user._id}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div>{user.name || "N/A"}</div>
                          <div className="text-xs text-muted-foreground lg:hidden">
                            {user.email || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {user.email || "N/A"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {user.contactNumber || "N/A"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {displayRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {displayRoles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No Roles
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleAssignRoles(user)}
                            className="text-xs"
                          >
                            {displayRoles.length > 0 ? "Edit" : "Assign"}
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
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Assign Roles</DialogTitle>
            <DialogDescription className="text-sm">
              Select roles for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {willBeTeacherStudentOnly() && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Note: If you only assign Teacher/Student roles, this user will no longer appear on this page. Use the dedicated Teacher/Student pages to manage them.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Available Roles</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_ROLES.map((role) => (
                  <div
                    key={role}
                    className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${selectedRoles.includes(role)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-accent"
                      }`}
                    onClick={() => toggleRole(role)}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedRoles.includes(role)
                          ? "bg-primary border-primary"
                          : "border-input"
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
            </div>

            {selectedRoles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  Selected Roles ({selectedRoles.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => toggleRole(role)}
                    >
                      {role} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Roles"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
