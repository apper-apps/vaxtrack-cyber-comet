import React, { useState, useEffect } from "react";
import SearchBar from "@/components/molecules/SearchBar";
import VaccineTable from "@/components/organisms/VaccineTable";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import Empty from "@/components/ui/Empty";
import { VaccineService } from "@/services/api/VaccineService";

const RecordAdministration = () => {
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
      // Filter to show only vaccines with stock > 0
      const availableVaccines = data.filter(vaccine => vaccine.quantityOnHand_c > 0);
      setVaccines(availableVaccines);
      setFilteredVaccines(availableVaccines);
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
      vaccine.commercialName?.toLowerCase().includes(term) ||
      vaccine.genericName?.toLowerCase().includes(term) ||
      vaccine.lotNumber?.toLowerCase().includes(term)
    );
    
    setFilteredVaccines(filtered);
  };

  const handleUpdateVaccine = async (updatedVaccine) => {
    try {
      await VaccineService.update(updatedVaccine.Id, updatedVaccine);
      
      // Update the vaccine in our state
const updatedVaccines = vaccines.map(vaccine => 
        vaccine.Id === updatedVaccine.Id ? updatedVaccine : vaccine
      ).filter(vaccine => vaccine.quantityOnHand_c > 0); // Keep only vaccines with stock
      
      setVaccines(updatedVaccines);
      
      // Update filtered vaccines
      const updatedFiltered = (searchTerm ? 
        updatedVaccines.filter(vaccine => 
          vaccine.commercialName_c?.toLowerCase().includes(searchTerm) ||
          vaccine.genericName_c?.toLowerCase().includes(searchTerm) ||
          vaccine.lotNumber_c?.toLowerCase().includes(searchTerm)
        ) : updatedVaccines
      );
      
      setFilteredVaccines(updatedFiltered);
    } catch (err) {
      setError("Failed to update vaccine administration. Please try again.");
    }
  };

  useEffect(() => {
    loadVaccines();
  }, []);

  if (loading) {
    return <Loading rows={6} />;
  }

  if (error) {
    return <Error message={error} onRetry={loadVaccines} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Record Administration</h1>
          <p className="text-gray-600">Update administered doses for your vaccine inventory</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <SearchBar
            placeholder="Search available vaccines..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full sm:w-80"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How to record administration</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>Enter the number of doses administered in the input field and click the syringe button to update the inventory. Only vaccines with available stock are shown.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Administration Table */}
      {filteredVaccines.length === 0 && !loading ? (
        <Empty
          title="No vaccines available"
          message={searchTerm ? "No vaccines match your search criteria." : "No vaccines with available stock for administration."}
          icon="Syringe"
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
          showAdministration={true}
        />
      )}
    </div>
  );
};

export default RecordAdministration;