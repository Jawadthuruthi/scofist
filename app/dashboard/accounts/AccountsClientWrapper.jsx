"use client";

import nextDynamic from "next/dynamic";

const AccountsClient = nextDynamic(() => import("./AccountsClient"), {
    ssr: false,
    loading: () => (
        <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg col-span-2 md:col-span-1" />
            </div>
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
        </div>
    ),
});

export default function AccountsClientWrapper(props) {
    return <AccountsClient {...props} />;
}
