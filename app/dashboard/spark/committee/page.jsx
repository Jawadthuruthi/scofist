import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { Users } from "lucide-react";

const columnsConfig = [
    {
        accessorKey: "photo",
        header: "Photo",
        type: ["avatar"],
        width: 80,
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "designation", header: "Designation" },
];

const formFields = [
    {
        name: "photo",
        label: "Photo",
        type: "object",
        inputType: "image",
        placeholder: "Member Photo",
        defaultValue: {},
        className: "col-span-2",
        maxFileSize: 2 * 1024 * 1024,
    },
    {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Member Name",
        required: true,
    },
    {
        name: "designation",
        label: "Designation",
        type: "text",
        placeholder: "Designation (e.g. Chairman)",
    },
];

export default async function SparkCommitteePage() {
    try {
        const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;

        return (
            <div className="flex flex-col space-y-2">
                <Header
                    title="SPARK COMMITTEE"
                    subTitle="Manage Committee Members"
                    icon={<Users className="h-5 w-5 text-muted-foreground" />}
                />
                <DataTableComponent
                    resource="sparkCommitteeMembers"
                    initialData={[]}
                    columnsConfig={columnsConfig}
                    formFields={formFields}
                    apiKey={apiKey}
                    createFormTitle="Add Committee Member"
                    editFormTitle="Edit Member"
                    deleteFormTitle="Delete Member"
                    limit={20}
                    filterType="api" // Assume simple API fetch
                />
            </div>
        );
    } catch (error) {
        console.error("Error loading committee:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="Failed to load committee members."
            />
        );
    }
}
