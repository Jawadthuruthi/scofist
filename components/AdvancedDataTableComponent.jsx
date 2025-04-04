"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTableComponent from "@/components/DataTableComponent";
const AdvancedDataTableComponent = ({ token, tabsConfig = [] }) => {
  const [activeTab, setActiveTab] = useState(tabsConfig[0]?.value || "");

  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default AdvancedDataTableComponent;
