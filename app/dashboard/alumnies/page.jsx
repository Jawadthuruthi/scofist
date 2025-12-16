"use client";

import Header from "@/components/Header";
import { GraduationCap } from "lucide-react";

export default function AlumniesPage() {
    return (
        <div className="flex flex-col space-y-4">
            <Header
                title="ALUMNIES"
                subTitle="Alumni Network & Directory"
                icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />}
            />
            <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">Alumnies Module Coming Soon</h3>
                    <p className="text-muted-foreground mt-2">
                        This section will contain the alumni directory and related features.
                    </p>
                </div>
            </div>
        </div>
    );
}
