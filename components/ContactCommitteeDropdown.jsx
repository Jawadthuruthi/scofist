"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Phone, MessageCircle, User, Building, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactCommitteeDropdown({ contacts, fallbackPhone }) {
  const [open, setOpen] = useState(false);
  const [fetchedContacts, setFetchedContacts] = useState(null);

  // Fetch settings dynamically if contacts not passed or empty
  useEffect(() => {
    if (!contacts || Object.keys(contacts).length === 0) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings?.festival?.committeeContacts) {
            setFetchedContacts(data.settings.festival.committeeContacts);
          } else if (data?.settings?.committeeContacts) {
            setFetchedContacts(data.settings.committeeContacts);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch settings contacts:", err);
        });
    }
  }, [contacts]);

  const activeContacts = contacts || fetchedContacts;

  const contactList = useMemo(() => {
    if (!activeContacts) return [];

    if (Array.isArray(activeContacts)) {
      return activeContacts.filter(
        (c) => c && (c.position || c.name || c.phone)
      );
    }

    const list = [];

    // Process contact1, contact2, contact3, contact4 from settings
    ["contact1", "contact2", "contact3", "contact4"].forEach((key) => {
      const c = activeContacts[key];
      if (c && (c.position || c.name || c.phone)) {
        list.push({
          position: c.position || "",
          name: c.name || "",
          phone: c.phone || "",
        });
      }
    });

    // Support legacy chairman / convenor formats if present and not already added
    if (
      activeContacts.chairman &&
      (activeContacts.chairman.name ||
        activeContacts.chairman.phone ||
        activeContacts.chairman.whatsapp)
    ) {
      const p =
        activeContacts.chairman.phone || activeContacts.chairman.whatsapp || "";
      if (!list.some((item) => item.phone === p && p !== "")) {
        list.push({
          position: activeContacts.chairman.position || "Chairman",
          name: activeContacts.chairman.name || "",
          phone: p,
        });
      }
    }

    if (
      activeContacts.convenor &&
      (activeContacts.convenor.name ||
        activeContacts.convenor.phone ||
        activeContacts.convenor.whatsapp)
    ) {
      const p =
        activeContacts.convenor.phone || activeContacts.convenor.whatsapp || "";
      if (!list.some((item) => item.phone === p && p !== "")) {
        list.push({
          position: activeContacts.convenor.position || "Convenor",
          name: activeContacts.convenor.name || "",
          phone: p,
        });
      }
    }

    return list;
  }, [activeContacts]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="h-10 px-4 gap-2 cursor-pointer font-medium hover:bg-muted/80"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-5 w-5 text-green-600" />
          <Phone className="h-5 w-5 text-blue-600" />
          <span className="hidden sm:inline text-sm">Contact</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl border shadow-xl flex flex-col gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-xl font-bold m-0 text-foreground truncate">
                Contact Information
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground m-0">
                Program committee contacts
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-3.5 max-h-[68vh] overflow-y-auto">
            {contactList.length > 0 ? (
              contactList.map((contact, idx) => {
                const cleanPhone = contact.phone.replace(/\D/g, "");
                return (
                  <Card
                    key={idx}
                    className="overflow-hidden border border-border/70 shadow-sm bg-card rounded-xl hover:border-primary/40 transition-colors"
                  >
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="space-y-1.5">
                        {contact.position && (
                          <div>
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 uppercase tracking-wider">
                              {contact.position}
                            </span>
                          </div>
                        )}
                        {contact.name && (
                          <h4 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            {contact.name}
                          </h4>
                        )}
                        {contact.phone && (
                          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {contact.phone}
                          </p>
                        )}
                      </div>

                      {contact.phone && (
                        <div className="flex gap-2 pt-2 border-t border-border/50">
                          {cleanPhone && (
                            <>
                              <a
                                href={`tel:${cleanPhone}`}
                                className={buttonVariants({
                                  size: "sm",
                                  className:
                                    "flex-1 !bg-blue-600 hover:!bg-blue-700 text-white cursor-pointer h-9 rounded-lg font-medium",
                                })}
                              >
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                              </a>
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({
                                  size: "sm",
                                  className:
                                    "flex-1 !bg-green-600 hover:!bg-green-700 text-white cursor-pointer h-9 rounded-lg font-medium",
                                })}
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                WhatsApp
                              </a>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : fallbackPhone ? (
              <Card className="overflow-hidden border border-border/70 shadow-sm bg-card rounded-xl">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <div>
                      <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 uppercase tracking-wider">
                        Institution Contact
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                      {fallbackPhone}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <a
                      href={`tel:${fallbackPhone.replace(/\D/g, "")}`}
                      className={buttonVariants({
                        size: "sm",
                        className:
                          "flex-1 !bg-blue-600 hover:!bg-blue-700 text-white cursor-pointer h-9 rounded-lg font-medium",
                      })}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${fallbackPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        size: "sm",
                        className:
                          "flex-1 !bg-green-600 hover:!bg-green-700 text-white cursor-pointer h-9 rounded-lg font-medium",
                      })}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <Phone className="h-8 w-8 mx-auto opacity-40" />
                <p className="text-sm">No committee contacts available.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
