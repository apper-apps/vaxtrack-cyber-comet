import { toast } from "react-toastify";

export const DatabaseExportService = {
  // Import database from JSON file
  async importDatabaseFromJSON(file) {
    try {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        return {
          success: false,
          error: "Please select a valid JSON file"
        };
      }

      // Read file content
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });

      // Parse JSON
      let importData;
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        return {
          success: false,
          error: "Invalid JSON format. Please check the file and try again."
        };
      }

      // Validate structure
      if (!importData.tables || typeof importData.tables !== 'object') {
        return {
          success: false,
          error: "Invalid database export format. Missing or invalid tables structure."
        };
      }

      // Initialize ApperClient
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const results = {};
      let totalImported = 0;
      let totalFailed = 0;

      // Import data for each table
for (const [tableName, tableData] of Object.entries(importData.tables)) {
        if (!tableData.records || !Array.isArray(tableData.records)) {
          results[tableName] = {
            success: false,
            error: "Invalid records format for table " + tableName
          };
          continue;
        }

        if (tableData.records.length === 0) {
          results[tableName] = {
            success: true,
            imported: 0,
            message: "No records to import"
          };
          continue;
        }

        try {
          // Prepare records for import (remove system fields)
          const recordsToImport = tableData.records.map(record => {
            const cleanRecord = { ...record };
            // Remove system fields that shouldn't be imported
            delete cleanRecord.Id;
            delete cleanRecord.CreatedOn;
            delete cleanRecord.CreatedBy;
            delete cleanRecord.ModifiedOn;
            delete cleanRecord.ModifiedBy;
            delete cleanRecord.Owner;
            return cleanRecord;
          });

          // Import records in batches of 100
          const batchSize = 100;
          let imported = 0;
          let failed = 0;

          for (let i = 0; i < recordsToImport.length; i += batchSize) {
            const batch = recordsToImport.slice(i, i + batchSize);
            
            const response = await apperClient.createRecord(tableName, {
              records: batch
            });

            if (response.success && response.results) {
              const successful = response.results.filter(r => r.success);
              const failedRecords = response.results.filter(r => !r.success);
              
              imported += successful.length;
              failed += failedRecords.length;

              if (failedRecords.length > 0) {
                console.error(`Failed to import ${failedRecords.length} records for ${tableName}:`, failedRecords);
              }
            } else {
              failed += batch.length;
              console.error(`Batch import failed for ${tableName}:`, response.message);
            }
          }

          results[tableName] = {
            success: imported > 0,
            imported,
            failed,
            total: recordsToImport.length
          };

          totalImported += imported;
          totalFailed += failed;

        } catch (tableError) {
          console.error(`Error importing table ${tableName}:`, tableError);
          results[tableName] = {
            success: false,
            error: tableError.message || "Failed to import table data"
          };
          totalFailed += tableData.records.length;
        }
      }

      // Generate summary
      const summary = `${totalImported} records imported successfully${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`;

      return {
        success: totalImported > 0,
        results,
        summary,
        totalImported,
        totalFailed
      };

    } catch (error) {
      console.error('Database import error:', error);
      return {
        success: false,
        error: error.message || "Failed to process import file"
      };
    }
  },
  async exportAllData() {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const exportData = {};
      const tableConfigs = [
        {
name: 'vaccine_c',
          fields: [
            { field: { Name: "Name" } },
            { field: { Name: "Tags" } },
            { field: { Name: "commercialName_c" } },
            { field: { Name: "genericName_c" } },
            { field: { Name: "lotNumber_c" } },
            { field: { Name: "quantity_c" } },
            { field: { Name: "expirationDate_c" } },
            { field: { Name: "receivedDate_c" } },
            { field: { Name: "quantityOnHand_c" } },
            { field: { Name: "administeredDoses_c" } },
            { field: { Name: "editPassword_c" } },
            { field: { Name: "CreatedOn" } },
            { field: { Name: "ModifiedOn" } }
          ]
        },
        {
          name: 'report',
          fields: [
            { field: { Name: "Name" } },
            { field: { Name: "Tags" } },
            { field: { Name: "reportType" } },
            { field: { Name: "vaccine" } },
            { field: { Name: "organization" } },
            { field: { Name: "CreatedOn" } },
            { field: { Name: "ModifiedOn" } }
          ]
        },
        {
          name: 'databaseStatus',
          fields: [
            { field: { Name: "Name" } },
            { field: { Name: "Tags" } },
            { field: { Name: "status" } },
            { field: { Name: "lastCheckTime" } },
            { field: { Name: "connectionCount" } },
            { field: { Name: "availableStorage" } },
            { field: { Name: "uptime" } },
            { field: { Name: "CreatedOn" } },
            { field: { Name: "ModifiedOn" } }
          ]
        },
        {
          name: 'organization',
          fields: [
            { field: { Name: "Name" } },
            { field: { Name: "Tags" } },
            { field: { Name: "CreatedOn" } },
            { field: { Name: "ModifiedOn" } }
          ]
        },
        {
          name: 'databaseExport_c',
          fields: [
            { field: { Name: "Name" } },
            { field: { Name: "Tags" } },
            { field: { Name: "exportConfigurations_c" } },
            { field: { Name: "lastExportDate_c" } },
            { field: { Name: "CreatedOn" } },
            { field: { Name: "ModifiedOn" } }
          ]
        }
      ];

      // Fetch data from each table
      for (const tableConfig of tableConfigs) {
        try {
          const params = {
            fields: tableConfig.fields,
            orderBy: [
              {
                fieldName: "Id",
                sorttype: "ASC"
              }
            ],
            pagingInfo: {
              limit: 1000,
              offset: 0
            }
          };

          const response = await apperClient.fetchRecords(tableConfig.name, params);

          if (!response.success) {
            console.error(`Error fetching ${tableConfig.name} data:`, response.message);
            exportData[tableConfig.name] = {
              data: [],
              error: response.message,
              count: 0
            };
          } else {
            exportData[tableConfig.name] = {
              data: response.data || [],
              count: response.data?.length || 0,
              success: true
            };
          }
        } catch (error) {
          console.error(`Error fetching ${tableConfig.name} data:`, error.message);
          exportData[tableConfig.name] = {
            data: [],
            error: error.message,
            count: 0
          };
        }
      }

      return {
        success: true,
        data: exportData,
        metadata: {
          exportDate: new Date().toISOString(),
          totalTables: tableConfigs.length,
          exportVersion: "1.0"
        }
      };

    } catch (error) {
      console.error("Error during database export:", error.message);
      toast.error("Failed to export database. Please try again.");
      return {
        success: false,
        error: error.message
      };
    }
}
};