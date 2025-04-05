"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTableComponent from "@/components/DataTableComponent";
const AdvancedDataTableComponent = ({
  token,
  tabsConfig = [],
  tablesConfig = [],
}) => {
  const [activeTab, setActiveTab] = useState(tabsConfig[0]?.value || "");

  return (
    <div className="space-y-6">
      {tabsConfig?.length > 0 && (
        <Tabs
          defaultValue={tabsConfig[0]?.value}
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            {tabsConfig.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="w-full">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabsConfig.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <DataTableComponent
                    resource={tab.resource}
                    token={token}
                    initialData={[]}
                    columnsConfig={tab.columnsConfig}
                    filterConfig={tab.filterConfig}
                    tableHeight={tab.tableHeight}
                    readOnly={tab.readOnly}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
      {tablesConfig?.map((table) => (
        <Card key={table.id}>
          <CardContent className="pt-6">
            <DataTableComponent
              resource={table?.resource}
              token={token}
              initialData={[]}
              columnsConfig={table?.columnsConfig}
              filterConfig={table?.filterConfig}
              tableHeight={table?.tableHeight}
              readOnly={table?.readOnly}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdvancedDataTableComponent;
