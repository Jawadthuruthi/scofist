"use client";

import { Menu, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";

import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function Topbar({ user }) {
  const { toggleSidebar } = useSidebar();

  const handleLogout = async () => {
    await fetch("/api/auth/logout");
    window.location.reload();
  };
  return (
    <header className="fixed top-0 left-0 w-full h-14 bg-white border-b shadow-sm flex items-center px-4 justify-between">
      {/* Sidebar Toggle Button */}
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="w-5 h-5" />
      </Button>

      {/* Brand / Title */}
      <h1 className="text-lg font-semibold">Dashboard</h1>

      {/* User Profile / Actions */}
      <div>
        <Button variant="ghost" size="icon">
          <Moon className="w-5 h-5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 rounded-xl mr-4 mt-4">
            <Card>
              <CardHeader className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={user.profilePic} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
