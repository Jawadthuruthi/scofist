"use client";

import { useMemo, useState } from "react";
import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { getStudentColumns } from "@/components/table-configs/studentColumns";

export default function BatchDetailsClient({ batch, classes, apiKey }) {
    const [activeTab, setActiveTab] = useState("GB"); // 'GB' or 'Alumni'
    const router = useRouter();

    const columnsConfig = getStudentColumns({
        classes,
        pageTitle: `${batch.name} - ${activeTab === "GB" ? "GB Members" : "Alumni Members"}`,
        onNameClick: null,
        excludeColumns: ["select", "batchName", "className", "liabilities"]
    });

    const apiFilters = useMemo(() => {
        const filters = {
            roles: "Student",
            batchId: batch._id,
        };

        if (activeTab === "GB") {
            // For GB Members, we want Active OR Graduated
            filters.status = "Active,Graduated";
        } else {
            // For Alumni Members, we want Dropped Out
            filters.status = "Dropped Out";
        }

        return filters;
    }, [batch._id, activeTab]);

    return (
        <div className="flex flex-col space-y-2">
            <Header
                title={`${batch.name} (${batch.academicYear})`}
                subTitle={
                    activeTab === "GB"
                        ? `${batch.gbMembers} Members`
                        : `${batch.alumniMembers} Members`
                }
            />

            <Tabs defaultValue="GB" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="GB">GB Members</TabsTrigger>
                    <TabsTrigger value="Alumni">Alumni Members</TabsTrigger>
                </TabsList>
            </Tabs>

            <DataTableComponent
                resource="users"
                initialData={[]}
                columnsConfig={columnsConfig}
                apiKey={apiKey}
                createFormTitle="Add New Student"
                editFormTitle="Edit Student"
                deleteFormTitle="Delete Student"
                filterConfig={[]}
                limit={20}
                apiFilters={apiFilters}
                filterTitle="Students"
                printTitle={`${batch.name} - ${activeTab === "GB" ? "GB Members" : "Alumni Members"}`}
                filterType="api"
                readOnly={true}
                enableCreate={false}
            />
        </div>
    );
}
