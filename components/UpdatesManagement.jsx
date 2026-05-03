"use client";
import * as React from "react";
import FormComponent from "./FormComponent";
import useCrud from "@/hooks/use-crud";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Edit2, Plus, Calendar as CalendarIcon } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const formFields = [
  {
    name: "image",
    label: "Featured Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
  },
  {
    name: "heading",
    label: "Heading",
    placeholder: "Enter update heading",
    required: true,
    className: "col-span-2",
  },
  {
    name: "date",
    label: "Date",
    type: "date",
    defaultValue: new Date().toISOString().split("T")[0],
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "news",
    label: "News Content",
    inputType: "textarea",
    placeholder: "Enter news content",
    rows: 5,
    className: "col-span-2",
  },
];

export default function UpdatesManagement({ apiKey, initialUpdates = [] }) {
  const { useFetchItems, useDeleteItem } = useCrud("updates", apiKey);
  const { data: updatesData, isLoading } = useFetchItems(0, 100, {}, {
    initialData: { updates: initialUpdates },
  });
  const deleteItem = useDeleteItem();
  const [editingItem, setEditingItem] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const updates = updatesData?.updates || [];

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this update?")) {
      await deleteItem.mutateAsync({ ids: [id] });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Latest Updates</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Update" : "Add New Update"}</DialogTitle>
            </DialogHeader>
            <FormComponent
              formFields={formFields}
              apiKey={apiKey}
              resource="updates"
              data={editingItem}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingItem(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 max-w-3xl">
        {updates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
            <p className="text-gray-500">No updates found. Start by adding one!</p>
          </div>
        ) : (
          updates.map((update) => (
            <Card key={update._id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                {update.image?.url && (
                  <div className="relative w-full md:w-48 h-48 md:h-auto">
                    <Image
                      src={update.image.url}
                      alt={update.heading}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-4 md:p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {update.heading}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem({
                            ...update,
                            date: update.date ? new Date(update.date).toISOString().split("T")[0] : "",
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(update._id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 font-medium">
                    <CalendarIcon className="w-4 h-4" />
                    {update.date ? format(new Date(update.date), "PPP") : "No date"}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-3 whitespace-pre-wrap">
                    {update.news}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
