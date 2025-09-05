import React from "react";
import Error from "@/components/ui/Error";
export const getStockStatus = (quantityOnHand, lowStockThreshold = 5) => {
  if (quantityOnHand === 0) return "out-of-stock";
  if (quantityOnHand <= lowStockThreshold) return "low-stock";
  return "in-stock";
};

export const calculateTotalDoses = (vaccines) => {
  return vaccines.reduce((total, vaccine) => total + (vaccine.quantityOnHand || 0), 0);
};

export const calculateAdministeredDoses = (vaccines) => {
  return vaccines.reduce((total, vaccine) => total + (vaccine.administeredDoses || 0), 0);
};

export const getExpiringVaccines = (vaccines, daysThreshold = 30) => {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);
  
  return vaccines.filter(vaccine => {
    if (!vaccine.expirationDate) return false;
    const expDate = new Date(vaccine.expirationDate);
    return expDate > today && expDate <= thresholdDate;
  });
};

export const getExpiredVaccines = (vaccines) => {
  const today = new Date();
  return vaccines.filter(vaccine => {
    if (!vaccine.expirationDate) return false;
    const expDate = new Date(vaccine.expirationDate);
    return expDate < today;
  });
};

export const getLowStockVaccines = (vaccines, threshold = 5) => {
  // First aggregate vaccines by name, then filter by stock threshold
  const aggregatedVaccines = aggregateVaccinesByName(vaccines);
  return aggregatedVaccines.filter(vaccine => 
    vaccine.quantityOnHand > 0 && vaccine.quantityOnHand <= threshold
  );
};

export const getOutOfStockVaccines = (vaccines) => {
  // First aggregate vaccines by name to combine quantities across lot numbers
  const aggregatedVaccines = aggregateVaccinesByName(vaccines);
  
  // Then filter for vaccines with zero total quantity
  return aggregatedVaccines.filter(vaccine => vaccine.quantityOnHand === 0);
};

export const sortVaccines = (vaccines, sortBy, sortOrder = "asc") => {
  return [...vaccines].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle different data types
    if (sortBy === "expirationDate" || sortBy === "receivedDate") {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue ? bValue.toLowerCase() : "";
    } else if (typeof aValue === "number") {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }
    
    if (sortOrder === "desc") {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
});
};

export const searchVaccines = (vaccines, searchTerm) => {
  if (!searchTerm.trim()) return [];
  
  const term = searchTerm.toLowerCase();
  return vaccines.filter(vaccine => 
    vaccine.commercialName?.toLowerCase().includes(term) ||
    vaccine.genericName?.toLowerCase().includes(term)
  );
};

export const getUniqueVaccinesByName = (vaccines) => {
  const uniqueMap = new Map();
  
  vaccines.forEach(vaccine => {
    const key = `${vaccine.commercialName}-${vaccine.genericName}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, vaccine);
    }
  });
  
  return Array.from(uniqueMap.values());
};

export const aggregateVaccinesByName = (vaccines) => {
  const aggregatedMap = new Map();
  
  vaccines.forEach(vaccine => {
    const key = `${vaccine.commercialName}-${vaccine.genericName}`;
    
    if (aggregatedMap.has(key)) {
      const existing = aggregatedMap.get(key);
      existing.quantityOnHand += vaccine.quantityOnHand || 0;
      existing.administeredDoses += vaccine.administeredDoses || 0;
    } else {
aggregatedMap.set(key, {
        Id: vaccine.Id, // Include Id for compatibility with AlertBanner
        commercialName: vaccine.commercialName,
        genericName: vaccine.genericName,
        quantityOnHand: vaccine.quantityOnHand || 0,
        administeredDoses: vaccine.administeredDoses || 0
      });
    }
  });
  
return Array.from(aggregatedMap.values());
};

export const getVaccinesToOrder = (vaccines, threshold = 7) => {
  // Aggregate vaccines by commercial name to get total quantities
  const aggregatedVaccines = aggregateVaccinesByName(vaccines);
  
  // Filter for vaccines with total quantity less than the threshold
  return aggregatedVaccines.filter(vaccine => vaccine.quantityOnHand < threshold);
};

export const formatVaccineDisplayName = (vaccine) => {
  return `${vaccine.commercialName} (${vaccine.genericName})`;
};

export const findVaccineByNames = (vaccines, commercialName, genericName) => {
  return vaccines.find(vaccine => 
    vaccine.commercialName?.toLowerCase() === commercialName?.toLowerCase() &&
    vaccine.genericName?.toLowerCase() === genericName?.toLowerCase()
  );
};

export const hasExactMatch = (vaccines, searchTerm) => {
  const term = searchTerm.toLowerCase();
  return vaccines.some(vaccine => 
    vaccine.commercialName?.toLowerCase() === term ||
    vaccine.genericName?.toLowerCase() === term ||
    `${vaccine.commercialName} (${vaccine.genericName})`.toLowerCase() === term
  );
};

export const exportVaccinesToCSV = (vaccines) => {
  try {
    // Define CSV headers
    const headers = [
      'Vaccine Name',
      'Generic Name', 
      'Lot Number',
      'Quantity On Hand',
      'Administered Doses',
      'Expiration Date',
      'Received Date',
      'Stock Status'
    ];

    // Convert vaccines data to CSV rows
    const csvRows = vaccines.map(vaccine => {
      const expirationDate = vaccine.expirationDate ? new Date(vaccine.expirationDate).toLocaleDateString() : '';
      const receivedDate = vaccine.receivedDate ? new Date(vaccine.receivedDate).toLocaleDateString() : '';
      const stockStatus = getStockStatus(vaccine.quantityOnHand);
      
      return [
`"${vaccine.commercialName_c || vaccine.Name || ''}"`,
        `"${vaccine.genericName_c || ''}"`,
        `"${vaccine.lotNumber || ''}"`,
        vaccine.quantityOnHand || 0,
        vaccine.administeredDoses || 0,
        `"${expirationDate}"`,
        `"${receivedDate}"`,
        `"${stockStatus}"`
      ].join(',');
    });

    // Combine headers and data rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vaccine-inventory-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
};

export const getSearchSuggestions = (vaccines, searchTerm, limit = 10) => {
  if (!searchTerm.trim()) return [];
  
  const term = searchTerm.toLowerCase();
  const exactMatches = [];
  const partialMatches = [];
  
  vaccines.forEach(vaccine => {
    const commercialName = vaccine.commercialName?.toLowerCase() || '';
    const genericName = vaccine.genericName?.toLowerCase() || '';
    const fullName = `${vaccine.commercialName} (${vaccine.genericName})`.toLowerCase();
    
    if (commercialName === term || genericName === term || fullName === term) {
      exactMatches.push(vaccine);
    } else if (commercialName.includes(term) || genericName.includes(term)) {
      partialMatches.push(vaccine);
    }
  });
  
return [...exactMatches, ...partialMatches].slice(0, limit);
};

export const exportDatabaseToJSON = (exportResult) => {
  try {
    if (!exportResult.success) {
      throw new Error(exportResult.error || 'Export failed');
    }

    // Create the export structure
    const exportStructure = {
      metadata: exportResult.metadata,
      tables: {}
    };

    // Process each table's data
    Object.keys(exportResult.data).forEach(tableName => {
      const tableData = exportResult.data[tableName];
      exportStructure.tables[tableName] = {
        recordCount: tableData.count,
        success: tableData.success || false,
        records: tableData.data || [],
        ...(tableData.error && { error: tableData.error })
      };
    });

    // Convert to JSON string with formatting
    const jsonString = JSON.stringify(exportStructure, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `vaxtrack-database-export-${timestamp}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
}

    return true;
  } catch (error) {
    console.error('Error generating database export file:', error);
    throw error;
  }
};