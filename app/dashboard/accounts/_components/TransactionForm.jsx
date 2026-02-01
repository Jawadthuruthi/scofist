"use client";

import { useState, useMemo, useRef } from "react";
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

export default function TransactionForm({ apiKey, onSuccess, accountType = "College", existingCategories = [] }) {
    const [loading, setLoading] = useState(false);
    const { useAddItem } = useCrud("finance", apiKey || process.env.NEXT_PUBLIC_API_KEY);
    const addItem = useAddItem();

    const categoryOptions = useMemo(() => {
        const defaults = ["Stationary", "IT Lab", "Donation"];
        const allCategories = Array.from(new Set([...defaults, ...existingCategories]));
        return allCategories.map(cat => ({ value: cat, label: cat }));
    }, [existingCategories]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        type: "Income",
        invoiceNo: "",
        item: "",
        recipient: "",
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
                item: "",
                recipient: "",
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

    // Refs for sequential navigation
    const dateRef = useRef(null);
    const typeRef = useRef(null);
    const invoiceRef = useRef(null);
    const itemRef = useRef(null);
    const recipientRef = useRef(null);
    const categoryRef = useRef(null);
    const modeRef = useRef(null);
    const amountRef = useRef(null);
    const submitRef = useRef(null);

    const handleKeyDown = (e, nextRef) => {
        if (e.key === "Enter") {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-1">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            ref={dateRef}
                            onKeyDown={(e) => handleKeyDown(e, typeRef)}
                        />
                    </div>

                    <div className="space-y-2 col-span-1">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => handleSelectChange("type", value)}
                        >
                            <SelectTrigger
                                ref={typeRef}
                                onKeyDown={(e) => handleKeyDown(e, invoiceRef)}
                            >
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Income">Income</SelectItem>
                                <SelectItem value="Expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label htmlFor="invoiceNo">Invoice/Receipt No</Label>
                        <Input
                            id="invoiceNo"
                            name="invoiceNo"
                            placeholder="Enter Invoice No"
                            value={formData.invoiceNo}
                            onChange={handleChange}
                            required
                            ref={invoiceRef}
                            onKeyDown={(e) => handleKeyDown(e, itemRef)}
                        />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label htmlFor="item">Item</Label>
                        <Input
                            id="item"
                            name="item"
                            placeholder="Enter Item Description"
                            value={formData.item}
                            onChange={handleChange}
                            ref={itemRef}
                            onKeyDown={(e) => handleKeyDown(e, recipientRef)}
                        />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label htmlFor="recipient">Recipient</Label>
                        <Input
                            id="recipient"
                            name="recipient"
                            placeholder="Enter Recipient"
                            value={formData.recipient}
                            onChange={handleChange}
                            ref={recipientRef}
                            onKeyDown={(e) => handleKeyDown(e, categoryRef)}
                        />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1" onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            // For MultiSelect, we might want to allow default Enter behavior (selection)
                            // if the menu is open, but here we prioritize navigation if strictly requested.
                            // However, MultiSelect usually needs Enter to select.
                            // Let's try to detect if we should move.
                            // Simplest: If specific key (e.g. shift+enter) or just check context.
                            // BUT user said "each enter key should move next".
                            // Maybe we assume user selects with Mouse or other key, OR 
                            // we only move if value is set? 
                            // Let's just move focus for now as requested, 
                            // but capturing Enter on a custom component wrapper might be tricky.
                            // We'll attach ref to the container or component if possible.
                            e.preventDefault();
                            modeRef.current?.focus();
                        }
                    }}>
                        <Label htmlFor="category">Category</Label>
                        <div ref={categoryRef} tabIndex={-1}>
                            <MultiSelect
                                options={categoryOptions}
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
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">


                    <div className="space-y-2 col-span-1">
                        <Label htmlFor="mode">Mode</Label>
                        <Select
                            value={formData.mode}
                            onValueChange={(value) => handleSelectChange("mode", value)}
                        >
                            <SelectTrigger
                                ref={modeRef}
                                onKeyDown={(e) => handleKeyDown(e, amountRef)}
                            >
                                <SelectValue placeholder="Select Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank">Bank</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 col-span-1">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            ref={amountRef}
                            onKeyDown={(e) => handleKeyDown(e, submitRef)}
                        />
                    </div>

                    <div className="flex items-end col-span-2 md:col-span-1">
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                            disabled={loading}
                            ref={submitRef}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Entry
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
