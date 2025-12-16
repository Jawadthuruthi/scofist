"use client";

import Header from "@/components/Header";
import { Briefcase } from "lucide-react";

export default function SparkPage() {
    return (
        <div className="flex flex-col space-y-4">
            <Header
                title="SPARK"
                subTitle="Alumni Network & Opportunities"
                icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
            />
            <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">Spark Module Coming Soon</h3>
                    <p className="text-muted-foreground mt-2">
                        This section will contain features for alumni networking and opportunities.
                    </p>
                </div>
            </div>
        </div>
    );
}
