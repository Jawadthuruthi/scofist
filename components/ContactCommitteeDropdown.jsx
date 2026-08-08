"use client";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Phone, MessageCircle, User, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactCommitteeDropdown({ contacts, fallbackPhone }) {
  const [open, setOpen] = useState(false);
  const hasChairman = contacts?.chairman?.phone || contacts?.chairman?.whatsapp;
  const hasConvenor = contacts?.convenor?.phone || contacts?.convenor?.whatsapp;
  
  const chairmanPhone = contacts?.chairman?.phone?.replace(/\D/g, "");
  const chairmanWhatsapp = contacts?.chairman?.whatsapp?.replace(/\D/g, "");
  const convenorPhone = contacts?.convenor?.phone?.replace(/\D/g, "");
  const convenorWhatsapp = contacts?.convenor?.whatsapp?.replace(/\D/g, "");
  const fallback = fallbackPhone?.replace(/\D/g, "");

  if (!hasChairman && !hasConvenor && !fallback) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="h-10 px-4 gap-2 cursor-pointer font-medium" onClick={() => setOpen(true)}>
          <MessageCircle className="h-5 w-5 text-green-600" />
          <Phone className="h-5 w-5 text-blue-600" />
          <span className="hidden sm:inline text-sm">Contact</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-1">
            {hasChairman && (
              <Card>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div>
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Chairman
                    </h4>
                    {contacts.chairman.name && (
                      <p className="text-sm text-muted-foreground ml-6">{contacts.chairman.name}</p>
                    )}
                    {(contacts.chairman.phone || contacts.chairman.whatsapp) && (
                      <p className="text-sm text-muted-foreground ml-6 mt-1 font-medium">
                        {contacts.chairman.phone || contacts.chairman.whatsapp}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-6">
                    {chairmanPhone && (
                      <a href={`tel:${chairmanPhone}`} className={buttonVariants({ size: "sm", className: "flex-1 !bg-blue-600 hover:!bg-blue-700 text-white cursor-pointer" })}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </a>
                    )}
                    {chairmanWhatsapp && (
                      <a href={`https://wa.me/${chairmanWhatsapp}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", className: "flex-1 !bg-green-600 hover:!bg-green-700 text-white cursor-pointer" })}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasConvenor && (
              <Card>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div>
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Convenor
                    </h4>
                    {contacts.convenor.name && (
                      <p className="text-sm text-muted-foreground ml-6">{contacts.convenor.name}</p>
                    )}
                    {(contacts.convenor.phone || contacts.convenor.whatsapp) && (
                      <p className="text-sm text-muted-foreground ml-6 mt-1 font-medium">
                        {contacts.convenor.phone || contacts.convenor.whatsapp}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-6">
                    {convenorPhone && (
                      <a href={`tel:${convenorPhone}`} className={buttonVariants({ size: "sm", className: "flex-1 !bg-blue-600 hover:!bg-blue-700 text-white cursor-pointer" })}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </a>
                    )}
                    {convenorWhatsapp && (
                      <a href={`https://wa.me/${convenorWhatsapp}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", className: "flex-1 !bg-green-600 hover:!bg-green-700 text-white cursor-pointer" })}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fallback to institution if no committee contacts exist */}
            {!hasChairman && !hasConvenor && fallback && (
              <Card>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div>
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      Institution Contact
                    </h4>
                    <p className="text-sm text-muted-foreground ml-6 mt-1 font-medium">
                      {fallbackPhone}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-6">
                    <a href={`tel:${fallback}`} className={buttonVariants({ size: "sm", className: "flex-1 !bg-blue-600 hover:!bg-blue-700 text-white cursor-pointer" })}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </a>
                    <a href={`https://wa.me/${fallback}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", className: "flex-1 !bg-green-600 hover:!bg-green-700 text-white cursor-pointer" })}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
