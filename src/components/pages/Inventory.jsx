import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import SearchBar from "@/components/molecules/SearchBar";
import VaccineTable from "@/components/organisms/VaccineTable";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import Empty from "@/components/ui/Empty";
import Button from "@/components/atoms/Button";
import ApperIcon from "@/components/ApperIcon";
import { VaccineService } from "@/services/api/VaccineService";
import { formatDate, getExpirationStatus } from "@/utils/dateUtils";
import { getStockStatus } from "@/utils/vaccineUtils";

const Inventory = () => {
  const [vaccines, setVaccines] = useState([]);
  const [filteredVaccines, setFilteredVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadVaccines = async () => {
    setLoading(true);
    setError("");
    
try {
const data = await VaccineService.getAll();
// Filter out vaccines with zero quantity on hand
      const filterVaccinesWithStock = (vaccines) => vaccines.filter(vaccine => vaccine.quantityOnHand_c > 0);
      const vaccinesWithStock = filterVaccinesWithStock(data);
      setVaccines(vaccinesWithStock);
      setFilteredVaccines(vaccinesWithStock);
    } catch (err) {
      setError("Failed to load vaccine inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term) {
      setFilteredVaccines(vaccines);
      return;
    }
    
const filtered = vaccines.filter(vaccine => 
      vaccine.commercialName_c?.toLowerCase().includes(term) ||
      vaccine.genericName_c?.toLowerCase().includes(term) ||
      vaccine.lotNumber_c?.toLowerCase().includes(term)
    );
    
    setFilteredVaccines(filtered);
  };

  const handleUpdateVaccine = async (updatedVaccine) => {
try {
await VaccineService.update(updatedVaccine.Id, updatedVaccine);
      
      const updatedVaccines = vaccines.map(vaccine => 
vaccine.Id === updatedVaccine.Id ? updatedVaccine : vaccine
      );
      
// Filter out vaccines with zero quantity on hand
      const filterVaccinesWithStock = (vaccines) => vaccines.filter(vaccine => vaccine.quantityOnHand_c > 0);
      const vaccinesWithStock = filterVaccinesWithStock(updatedVaccines);
      setVaccines(vaccinesWithStock);
      setFilteredVaccines(
        searchTerm ? 
vaccinesWithStock.filter(vaccine => 
          vaccine.commercialName_c?.toLowerCase().includes(searchTerm) ||
          vaccine.genericName_c?.toLowerCase().includes(searchTerm) ||
          vaccine.lotNumber_c?.toLowerCase().includes(searchTerm)
        ) : vaccinesWithStock
      );
    } catch (err) {
setError("Failed to update vaccine. Please try again.");
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Generating PDF export...");
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let yPosition = margin;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Vaccine Inventory Report", margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${formatDate(new Date())}`, margin, yPosition);
      
      yPosition += 20;

      // Summary statistics
      const totalVaccines = filteredVaccines.length;
const lowStockVaccines = filteredVaccines.filter(v => getStockStatus(v.quantityOnHand_c) === 'Low Stock').length;
const expiredVaccines = filteredVaccines.filter(v => getExpirationStatus(v.expirationDate_c) === 'expired').length;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Statistics", margin, yPosition);
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Vaccines: ${totalVaccines}`, margin, yPosition);
      yPosition += 7;
      doc.text(`Low Stock Alerts: ${lowStockVaccines}`, margin, yPosition);
      yPosition += 7;
      doc.text(`Expired Vaccines: ${expiredVaccines}`, margin, yPosition);
      yPosition += 20;

      // Table header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Vaccine Inventory Details", margin, yPosition);
      yPosition += 15;

      // Table setup
      const tableHeaders = ["Vaccine Name", "Generic", "Lot #", "On Hand", "Administered", "Exp. Date", "Status"];
      const colWidths = [35, 30, 25, 20, 25, 25, 25];
      let xPosition = margin;

      // Draw table headers
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      tableHeaders.forEach((header, index) => {
        doc.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });

      yPosition += 10;
      doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

      // Table data
      doc.setFont("helvetica", "normal");
      filteredVaccines.forEach((vaccine) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        xPosition = margin;
        const rowData = [
vaccine.commercialName_c || vaccine.Name,
          vaccine.genericName_c || "",
          vaccine.lotNumber_c || "",
          vaccine.quantityOnHand_c?.toString() || "0",
          vaccine.administeredDoses_c?.toString() || "0",
          vaccine.expirationDate_c ? formatDate(vaccine.expirationDate_c) : "",
          getStockStatus(vaccine.quantityOnHand_c)
        ];

        rowData.forEach((data, index) => {
          const text = data.length > 12 ? data.substring(0, 12) + "..." : data;
          doc.text(text, xPosition, yPosition);
          xPosition += colWidths[index];
        });

        yPosition += 8;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, doc.internal.pageSize.height - 10);
      }

      // Save the PDF
      doc.save(`vaccine-inventory-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully!");

    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  };
const handleExportCSV = async () => {
    try {
      toast.info("Generating CSV export...");
      
      const { exportVaccinesToCSV } = await import('@/utils/vaccineUtils');
      exportVaccinesToCSV(filteredVaccines);
      
      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  };
  useEffect(() => {
    loadVaccines();
  }, []);
  if (loading) {
    return <Loading rows={8} />;
  }

  if (error) {
    return <Error message={error} onRetry={loadVaccines} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vaccine Inventory</h1>
          <p className="text-gray-600">Manage and monitor your vaccine stock levels</p>
        </div>
<div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 sm:items-center">
          <SearchBar
            placeholder="Search vaccines, generic names, or lot numbers..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full sm:w-80"
          />
          <div className="relative">
            <div className="flex gap-2">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <ApperIcon name="Download" size={16} />
                Export to PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <ApperIcon name="FileText" size={16} />
                Export to CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      {filteredVaccines.length === 0 && !loading ? (
        <Empty
          title="No vaccines found"
          message={searchTerm ? "No vaccines match your search criteria." : "No vaccine inventory data is available."}
          icon="Package"
          actionLabel="Clear Search"
          onAction={() => {
            setSearchTerm("");
            setFilteredVaccines(vaccines);
          }}
        />
      ) : (
<VaccineTable 
          vaccines={filteredVaccines} 
          onUpdateVaccine={handleUpdateVaccine}
          showAdministration={false}
        />
      )}
    </div>
  );
};

export default Inventory;