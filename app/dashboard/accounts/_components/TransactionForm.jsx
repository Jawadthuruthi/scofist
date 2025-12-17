"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import useCrud from "@/hooks/use-crud";

export default function TransactionForm({ apiKey, onSuccess, accountType = "College" }) {
    const [loading, setLoading] = useState(false);
    const { useAddItem } = useCrud("finance", apiKey || process.env.NEXT_PUBLIC_API_KEY);
    const addItem = useAddItem();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        type: "Income",
        invoiceNo: "",
        category: "",
        amount: "",
        mode: "Cash", // Default as per requirements
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.date || !formData.type || !formData.category || formData.amount === "" || !formData.mode || !formData.invoiceNo) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...formData,
                amount: Number(formData.amount),
                accountType,
            };

            await addItem.mutateAsync(payload);
            toast.success("Transaction added successfully");

            // Reset form
            setFormData({
                date: new Date().toISOString().split("T")[0],
                type: "Income",
                invoiceNo: "",
                category: "",
                amount: "",
                mode: "Cash",
            });

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error adding transaction:", error);
            const errorMessage = error?.response?.data?.error || error?.message || "Failed to add transaction";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => handleSelectChange("type", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Income">Income</SelectItem>
                                <SelectItem value="Expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="invoiceNo">Invoice/Receipt No</Label>
                        <Input
                            id="invoiceNo"
                            name="invoiceNo"
                            placeholder="Enter Invoice No"
                            value={formData.invoiceNo}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <MultiSelect
                            options={[
                                { value: "Stationary", label: "Stationary" },
                                { value: "IT Lab", label: "IT Lab" },
                                { value: "Donation", label: "Donation" },
                            ]}
                            value={formData.category}
                            onValueChange={(val) => handleSelectChange("category", val)}
                            placeholder="Select or type category"
                            variant="default"
                            animation={2}
                            maxCount={1}
                            multiSelect={false}
                            freeSolo={true}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="mode">Mode</Label>
                        <Select
                            value={formData.mode}
                            onValueChange={(value) => handleSelectChange("mode", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank">Bank</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Entry
                    </Button>
                </div>
            </form>
        </div>
    );
}
