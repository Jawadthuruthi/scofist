"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTableComponent from "@/components/DataTableComponent";

const AdvancedDataTableComponent = ({
  apiKey,
  tabsConfig = [],
  tablesConfig = [],
}) => {
  const [activeTab, setActiveTab] = useState(tabsConfig[0]?.value || "");

  const tabsCount = tabsConfig.length;
  const gridClass = tabsCount === 2 ? "grid grid-cols-2 w-full" : tabsCount === 3 ? "grid grid-cols-3 w-full" : "flex space-x-2";

  return (
    <div className="space-y-6">
      {tabsConfig.length > 0 && (
        <Tabs
          defaultValue={tabsConfig[0].value}
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList
            className={gridClass}
          >
            {tabsConfig.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="w-full">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabsConfig.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <DataTableComponent
                resource={tab.resource}
                apiKey={apiKey}
                initialData={[]}
                columnsConfig={tab.columnsConfig}
                filterConfig={tab.filterConfig}
                tableHeight={tab.tableHeight}
                readOnly={tab.readOnly}
                filterTitle={tab.filterTitle}
                filterDescription={tab.filterDescription}
                filterType={tab.filterType}
                apiEndpoint={tab.apiEndpoint}
                apiFilters={tab.apiFilters}
                printTitle={tab.printTitle}
                dateRangeInPopup={tab.dateRangeInPopup}
                enableMonthYearFilter={tab.enableMonthYearFilter}
                trailingToolbar={tab.trailingToolbar}
                highlightHighest={tab.highlightHighest}
                limit={tab.limit}
                defaultSorting={tab.defaultSorting}
                enableSearch={tab.enableSearch}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {tablesConfig.map((table, i) => (
        <DataTableComponent
          key={i}
          resource={table.resource}
          apiKey={apiKey}
          initialData={[]}
          columnsConfig={table.columnsConfig}
          filterConfig={table.filterConfig}
          tableHeight={table.tableHeight}
          readOnly={table.readOnly}
          filterTitle={table.filterTitle}
          filterDescription={table.filterDescription}
          filterType={table.filterType}
          apiEndpoint={table.apiEndpoint}
          apiFilters={table.apiFilters}
          printTitle={table.printTitle}
          dateRangeInPopup={table.dateRangeInPopup}
          enableMonthYearFilter={table.enableMonthYearFilter}
          trailingToolbar={table.trailingToolbar}
          highlightHighest={table.highlightHighest}
          limit={table.limit}
          defaultSorting={table.defaultSorting}
          enableSearch={table.enableSearch}
        />
      ))}
    </div>
  );
};

export default AdvancedDataTableComponent;
