import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { VaccineService } from "@/services/api/VaccineService";
import ApperIcon from "@/components/ApperIcon";
import FormField from "@/components/molecules/FormField";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import Inventory from "@/components/pages/Inventory";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Card from "@/components/atoms/Card";
import { formatDate, getExpirationStatus } from "@/utils/dateUtils";
import { aggregateVaccinesByName, getStockStatus, sortVaccines } from "@/utils/vaccineUtils";
const Reports = () => {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportType, setReportType] = useState("current-inventory");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState("");
  const loadVaccines = async () => {
    setLoading(true);
    setError("");
    
    try {
      const data = await VaccineService.getAll();
      setVaccines(data);
    } catch (err) {
      setError("Failed to load vaccine data for reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
    loadVaccines();
  }, []);

  useEffect(() => {
    const updateReport = async () => {
      const { data, title } = await generateReport();
      setReportData(data);
      setReportTitle(title);
    };
    
    updateReport();
  }, [vaccines, reportType]);
const generateReport = async () => {
    let reportData = [];
    let reportTitle = "";
    
switch (reportType) {
case "current-inventory":
        reportData = sortVaccines(vaccines, "commercialName", "asc");
        reportTitle = "Current Inventory Report";
        break;
      case "expiring-soon":
        reportData = sortVaccines(vaccines.filter(vaccine => {
          const status = getExpirationStatus(vaccine.expirationDate);
          return status === "expiring";
        }), "commercialName", "asc");
        reportTitle = "Vaccines Expiring Soon (30 Days)";
        break;
      case "expired":
        reportData = sortVaccines(vaccines.filter(vaccine => {
          const status = getExpirationStatus(vaccine.expirationDate);
          return status === "expired";
        }), "commercialName", "asc");
        reportTitle = "Expired Vaccines Report";
        break;
      case "low-stock":
        reportData = sortVaccines(vaccines.filter(vaccine => {
          const status = getStockStatus(vaccine.quantityOnHand);
          return status === "low-stock" || status === "out-of-stock";
        }), "commercialName", "asc");
        reportTitle = "Low Stock Report";
        break;
      case "out-of-stock":
        reportData = sortVaccines(vaccines.filter(vaccine => vaccine.quantityOnHand === 0), "commercialName", "asc");
        reportTitle = "Out of Stock Report";
        break;
      case "orders":
        const { aggregateVaccinesByName } = await import("@/utils/vaccineUtils");
        const aggregatedVaccines = aggregateVaccinesByName(vaccines);
        reportData = sortVaccines(aggregatedVaccines.filter(vaccine => {
          const status = getStockStatus(vaccine.quantityOnHand);
          return status === "low-stock" || status === "out-of-stock";
        }), "commercialName", "asc");
        reportTitle = "Orders Report - Low/Out of Stock";
        break;
      case "vaccines-to-order":
const { getVaccinesToOrder } = await import("@/utils/vaccineUtils");
        reportData = sortVaccines(getVaccinesToOrder(vaccines), "commercialName", "asc");
        reportTitle = "Vaccines to Order (Less than 7 units)";
        break;
      case "administration-summary":
        reportData = sortVaccines(vaccines.filter(vaccine => vaccine.administeredDoses > 0), "commercialName", "asc");
        reportTitle = "Administration Summary Report";
        break;
      case "vaccine-inventory-template":
        // Create template data with only commercial and generic names, other fields empty
        const { getUniqueVaccinesByName } = await import("@/utils/vaccineUtils");
        const uniqueVaccines = getUniqueVaccinesByName(vaccines);
        reportData = sortVaccines(uniqueVaccines.map(vaccine => ({
commercialName: vaccine.commercialName_c || vaccine.Name || '',
          genericName: vaccine.genericName_c || '',
          lotNumber: '',
          expirationDate: '',
          receivedDate: '',
          quantityOnHand: 0,
          administeredDoses: 0
        })), "commercialName", "asc");
        reportTitle = "Vaccine Inventory Template";
        reportTitle = "Vaccine Inventory Template";
        break;
      default:
        reportData = sortVaccines(vaccines, "commercialName", "asc");
        reportTitle = "Vaccine Inventory Report";
    }
    return { data: reportData, title: reportTitle };
  };

const exportToCSV = async () => {
    const { data, title } = await generateReport();
    
const isOrdersReport = reportType === "orders";
    const isTemplateReport = reportType === "vaccine-inventory-template";
    
    const headers = isOrdersReport ? [
      "Commercial Name",
      "Generic Name", 
      "Total Quantity On Hand",
      "Total Administered Doses",
      "Stock Status"
    ] : [
      "Commercial Name",
      "Generic Name", 
      "Lot Number",
      "Expiration Date",
      "Received Date",
      "Quantity On Hand",
      "Administered Doses",
      "Status"
    ];
    
    const csvContent = [
      headers.join(","),
      ...data.map(vaccine => {
        if (isOrdersReport) {
          return [
            `"${vaccine.commercialName}"`,
            `"${vaccine.genericName}"`,
            vaccine.quantityOnHand,
            vaccine.administeredDoses || 0,
            `"${getStockStatus(vaccine.quantityOnHand)}"`
          ].join(",");
        } else if (isTemplateReport) {
          return [
            `"${vaccine.commercialName}"`,
            `"${vaccine.genericName}"`,
            `""`, // Empty lot number
            `""`, // Empty expiration date
            `""`, // Empty received date
            `""`, // Empty quantity
            `""`, // Empty administered doses
            `""` // Empty status
          ].join(",");
        } else {
          return [
            `"${vaccine.commercialName}"`,
            `"${vaccine.genericName}"`,
            `"${vaccine.lotNumber}"`,
            formatDate(vaccine.expirationDate),
            formatDate(vaccine.receivedDate),
            vaccine.quantityOnHand,
            vaccine.administeredDoses || 0,
            `"${getExpirationStatus(vaccine.expirationDate)}"`
          ].join(",");
        }
      })
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const exportToPDF = async () => {
    const { data, title } = await generateReport();
    
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, 25);
      
      // Add metadata
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on: ${format(new Date(), "PPP")}`, 20, 35);
      doc.text(`Total Records: ${data.length}`, 20, 42);
      
// Prepare table data
const isOrdersReport = reportType === "orders";
      const isTemplateReport = reportType === "vaccine-inventory-template";
      
      const headers = isOrdersReport ? [
        "Commercial Name",
        "Generic Name",
        "Total Qty On Hand", 
        "Total Administered",
        "Stock Status"
      ] : [
        "Commercial Name",
        "Generic Name", 
        "Lot Number",
        "Expiration Date",
        "Qty On Hand",
        "Administered",
        "Status"
      ];
      
      const tableData = (isTemplateReport ? data : data.filter(vaccine => vaccine.quantityOnHand > 0))
        .map(vaccine => {
          if (isOrdersReport) {
            return [
              vaccine.commercialName || '',
              vaccine.genericName || '',
              vaccine.quantityOnHand?.toString() || '0',
              (vaccine.administeredDoses || 0).toString(),
              getStockStatus(vaccine.quantityOnHand)
            ];
          } else if (isTemplateReport) {
            return [
              vaccine.commercialName || '',
              vaccine.genericName || '',
              '', // Empty lot number
              '', // Empty expiration date
              '', // Empty quantity
              '', // Empty administered
              '' // Empty status
            ];
          } else {
            return [
              vaccine.commercialName || '',
              vaccine.genericName || '',
              vaccine.lotNumber || '',
              formatDate(vaccine.expirationDate),
              vaccine.quantityOnHand?.toString() || '0',
              (vaccine.administeredDoses || 0).toString(),
              getExpirationStatus(vaccine.expirationDate)
            ];
          }
        });
      // Add table
      let yPosition = 55;
      const cellHeight = 8;
      const colWidths = [35, 35, 25, 25, 20, 20, 25];
      let xPosition = 15;
      
      // Draw headers
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      headers.forEach((header, index) => {
        doc.rect(xPosition, yPosition, colWidths[index], cellHeight);
        doc.text(header, xPosition + 2, yPosition + 5.5);
        xPosition += colWidths[index];
      });
      
      yPosition += cellHeight;
      
      // Draw data rows
      doc.setFont(undefined, 'normal');
      tableData.forEach((row, rowIndex) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        xPosition = 15;
        row.forEach((cell, cellIndex) => {
          doc.rect(xPosition, yPosition, colWidths[cellIndex], cellHeight);
          const text = cell.toString();
          const maxWidth = colWidths[cellIndex] - 4;
          const lines = doc.splitTextToSize(text, maxWidth);
          doc.text(lines[0] || '', xPosition + 2, yPosition + 5.5);
          xPosition += colWidths[cellIndex];
        });
        
        yPosition += cellHeight;
      });
      
      // Save the PDF
      const fileName = `${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const getStatusBadge = (vaccine) => {
    const expirationStatus = getExpirationStatus(vaccine.expirationDate);
    const stockStatus = getStockStatus(vaccine.quantityOnHand);
    
    if (expirationStatus === "expired") {
      return <Badge variant="expired">Expired</Badge>;
    } else if (expirationStatus === "expiring") {
      return <Badge variant="expiring">Expiring Soon</Badge>;
    } else if (stockStatus === "out-of-stock") {
      return <Badge variant="out-of-stock">Out of Stock</Badge>;
    } else if (stockStatus === "low-stock") {
      return <Badge variant="low-stock">Low Stock</Badge>;
    } else {
      return <Badge variant="good">Good</Badge>;
    }
  };

  if (loading) {
    return <Loading rows={5} />;
  }

  if (error) {
    return <Error message={error} onRetry={loadVaccines} />;
}



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Generate and export vaccine inventory reports</p>
      </div>

      {/* Report Configuration */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<FormField label="Report Type">
<select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
<option value="current-inventory">Current Inventory</option>
              <option value="expiring-soon">Expiring Soon (30 Days)</option>
              <option value="expired">Expired Vaccines</option>
              <option value="low-stock">Low Stock Alert</option>
              <option value="out-of-stock">Out of Stock Report</option>
              <option value="orders">Orders</option>
              <option value="vaccines-to-order">Vaccines to Order</option>
              <option value="administration-summary">Administration Summary</option>
              <option value="vaccine-inventory-template">Vaccine Inventory Template</option>
            </select>
          </FormField>
          
          <FormField label="Date From (Optional)">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </FormField>
          
          <FormField label="Date To (Optional)">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </FormField>
        </div>
<div className="mt-4 flex justify-end space-x-3">
          <Button 
            variant="primary" 
            onClick={exportToCSV}
            className="inline-flex items-center"
          >
            <ApperIcon name="Download" className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
          <Button 
            variant="primary" 
            onClick={exportToPDF}
            className="inline-flex items-center"
          >
            <ApperIcon name="FileText" className="h-4 w-4 mr-2" />
            Export to PDF
          </Button>
        </div>
      </Card>

      {/* Report Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{reportTitle}</h2>
          <Badge variant="primary">{reportData.length} records</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vaccine Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generic Name
                </th>
                {reportType !== "orders" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lot Number
                  </th>
                )}
                {reportType !== "orders" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration Date
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {reportType === "orders" ? "Total Qty On Hand" : "Qty On Hand"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {reportType === "orders" ? "Total Administered" : "Administered"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
{reportData.map((vaccine, index) => (
                <tr key={vaccine.Id || `${vaccine.commercialName}-${vaccine.genericName}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
<div className="font-medium text-gray-900">{vaccine.commercialName_c || vaccine.Name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {vaccine.genericName_c}
                  </td>
                  {reportType !== "orders" && (
<td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">
                      {vaccine.lotNumber_c}
                    </td>
                  )}
                  {reportType !== "orders" && (
<td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(vaccine.expirationDate_c)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      vaccine.quantityOnHand === 0 ? "text-red-600" :
                      vaccine.quantityOnHand <= 5 ? "text-orange-600" : "text-green-600"
                    }`}>
{vaccine.quantityOnHand_c}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
{vaccine.administeredDoses_c || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reportType === "orders" ? (
                      <Badge variant={
                        vaccine.quantityOnHand === 0 ? "error" : 
                        vaccine.quantityOnHand <= 5 ? "warning" : "success"
                      }>
                        {getStockStatus(vaccine.quantityOnHand).replace("-", " ").toUpperCase()}
                      </Badge>
                    ) : (
                      getStatusBadge(vaccine)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {reportData.length === 0 && (
          <div className="text-center py-8">
            <ApperIcon name="FileText" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
            <p className="text-gray-500">No records match the selected report criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;