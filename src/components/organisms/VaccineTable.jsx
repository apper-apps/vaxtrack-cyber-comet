import React, { useState } from "react";
import { toast } from "react-toastify";
import { formatDate, getDaysUntilExpiration, getExpirationStatus } from "@/utils/dateUtils";
import { getStockStatus } from "@/utils/vaccineUtils";
import { cn } from "@/utils/cn";
import ApperIcon from "@/components/ApperIcon";
import TableHeader from "@/components/molecules/TableHeader";
import Input from "@/components/atoms/Input";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Card from "@/components/atoms/Card";

const VaccineTable = ({ 
  vaccines = [], 
  onUpdateVaccine, 
  showAdministration = false,
  className 
}) => {
const [sortBy, setSortBy] = useState("commercialName");
  const [sortOrder, setSortOrder] = useState("asc");
  const [adminDoses, setAdminDoses] = useState({});
const [fieldEdits, setFieldEdits] = useState({});
  const [passwordPrompt, setPasswordPrompt] = useState({ 
    show: false, 
    vaccineId: null, 
    fieldType: null, 
    fieldName: null, 
    currentValue: null 
  });
  const [passwordInput, setPasswordInput] = useState('');
const handleFieldEdit = (vaccineId, fieldName, currentValue) => {
    const fieldLabels = {
      'lotNumber': 'Lot Number',
      'expirationDate': 'Expiration Date', 
      'receivedDate': 'Received Date',
      'quantityOnHand': 'Quantity On Hand'
    };

    setPasswordPrompt({
      show: true,
      vaccineId: vaccineId,
      fieldType: fieldName,
      fieldName: fieldLabels[fieldName] || fieldName,
      currentValue: currentValue
    });
  };

  const handleFieldChange = (vaccineId, fieldName, value) => {
    const fieldKey = `${vaccineId}-${fieldName}`;
    
    let processedValue = value;
    if (fieldName === 'quantityOnHand') {
      processedValue = parseInt(value) || 0;
    }
    
    setFieldEdits(prev => ({
      ...prev,
      [fieldKey]: processedValue
    }));
  };

  const handleSaveField = (vaccine, fieldName) => {
    const fieldKey = `${vaccine.Id}-${fieldName}`;
    const newValue = fieldEdits[fieldKey];
    
    // Field-specific validation
    if (fieldName === 'quantityOnHand' && newValue < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }
    
    if ((fieldName === 'expirationDate' || fieldName === 'receivedDate') && newValue) {
      try {
        new Date(newValue).toISOString();
      } catch (error) {
        toast.error("Please enter a valid date");
        return;
      }
    }

    const updatedVaccine = {
      ...vaccine,
      [fieldName]: newValue
    };

    onUpdateVaccine(updatedVaccine);
    setFieldEdits(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
    
    const fieldLabels = {
      'lotNumber': 'lot number',
      'expirationDate': 'expiration date', 
      'receivedDate': 'received date',
      'quantityOnHand': 'quantity'
    };
    
    toast.success(`Updated ${fieldLabels[fieldName]} for ${vaccine.commercialName}`);
  };

  const handleCancelField = (vaccineId, fieldName) => {
    const fieldKey = `${vaccineId}-${fieldName}`;
    setFieldEdits(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  const isFieldEditing = (vaccineId, fieldName) => {
    const fieldKey = `${vaccineId}-${fieldName}`;
    return fieldEdits.hasOwnProperty(fieldKey);
  };

  const getFieldValue = (vaccineId, fieldName) => {
    const fieldKey = `${vaccineId}-${fieldName}`;
    return fieldEdits[fieldKey];
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === "Office6700$#") {
      const fieldKey = `${passwordPrompt.vaccineId}-${passwordPrompt.fieldType}`;
      setFieldEdits(prev => ({
        ...prev,
        [fieldKey]: passwordPrompt.currentValue
      }));
      setPasswordPrompt({ 
        show: false, 
        vaccineId: null, 
        fieldType: null, 
        fieldName: null, 
        currentValue: null 
      });
      setPasswordInput('');
      toast.success(`Password verified. You can now edit the ${passwordPrompt.fieldName}.`);
    } else {
      toast.error("Invalid password. Access denied.");
      setPasswordInput('');
    }
  };

  const handlePasswordCancel = () => {
    setPasswordPrompt({ 
      show: false, 
      vaccineId: null, 
      fieldType: null, 
      fieldName: null, 
      currentValue: null 
    });
    setPasswordInput('');
  };
const columns = [
    { key: "commercialName", label: "Vaccine Name", sortable: true },
    { key: "genericName", label: "Generic Name", sortable: true },
    { key: "lotNumber", label: "Lot Number", sortable: true },
    { key: "expirationDate", label: "Expiration Date", sortable: true },
    { key: "receivedDate", label: "Received Date", sortable: true },
    { key: "quantityOnHand", label: "Quantity On Hand", sortable: true },
    ...(showAdministration ? [{ key: "administration", label: "Administer", sortable: false }] : [])
  ];

  const handleSort = (key, order) => {
    setSortBy(key);
    setSortOrder(order);
  };

  const handleAdminChange = (vaccineId, value) => {
    const numValue = parseInt(value) || 0;
    setAdminDoses(prev => ({
      ...prev,
      [vaccineId]: numValue
    }));
  };

  const handleAdminister = (vaccine) => {
    const dosesToAdmin = adminDoses[vaccine.Id] || 0;
    
    if (dosesToAdmin <= 0) {
      toast.error("Please enter a valid number of doses to administer");
      return;
    }
    
    if (dosesToAdmin > vaccine.quantityOnHand) {
      toast.error("Cannot administer more doses than available in stock");
      return;
    }

    const updatedVaccine = {
      ...vaccine,
      quantityOnHand: vaccine.quantityOnHand - dosesToAdmin,
      administeredDoses: (vaccine.administeredDoses || 0) + dosesToAdmin
    };

    onUpdateVaccine(updatedVaccine);
    setAdminDoses(prev => ({
      ...prev,
      [vaccine.Id]: 0
    }));
    
    toast.success(`Successfully administered ${dosesToAdmin} doses of ${vaccine.commercialName}`);
  };

const sortedVaccines = [...vaccines].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
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

  const getStatusBadge = (vaccine) => {
    const expirationStatus = getExpirationStatus(vaccine.expirationDate);
    const stockStatus = getStockStatus(vaccine.quantityOnHand);
    
    if (expirationStatus === "expired") {
      return <Badge variant="expired">Expired</Badge>;
    } else if (expirationStatus === "expiring") {
      const daysLeft = getDaysUntilExpiration(vaccine.expirationDate);
      return <Badge variant="expiring">Expires in {daysLeft} days</Badge>;
    } else if (stockStatus === "out-of-stock") {
      return <Badge variant="out-of-stock">Out of Stock</Badge>;
    } else if (stockStatus === "low-stock") {
      return <Badge variant="low-stock">Low Stock</Badge>;
    } else {
      return <Badge variant="good">Good</Badge>;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 medical-table">
          <TableHeader 
            columns={columns}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <tbody className="bg-white divide-y divide-gray-200">
{sortedVaccines.map((vaccine) => (
              <tr key={vaccine.Id} className="group hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {vaccine.commercialName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {vaccine.genericName}
                </td>
<td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
{isFieldEditing(vaccine.Id, 'lotNumber') ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        value={getFieldValue(vaccine.Id, 'lotNumber')}
                        onChange={(e) => handleFieldChange(vaccine.Id, 'lotNumber', e.target.value)}
                        className="w-32 text-sm"
                        size="sm"
                      />
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleSaveField(vaccine, 'lotNumber')}
                      >
                        <ApperIcon name="Check" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelField(vaccine.Id, 'lotNumber')}
                      >
                        <ApperIcon name="X" className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 group">
                      <span className="text-gray-600">{vaccine.lotNumber}</span>
                      <Button
                        variant="ghost"
                        size="sm"
onClick={() => handleFieldEdit(vaccine.Id, 'lotNumber', vaccine.lotNumber)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ApperIcon name="Edit2" className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
<td className="px-6 py-4 whitespace-nowrap">
{isFieldEditing(vaccine.Id, 'expirationDate') ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="date"
                        value={getFieldValue(vaccine.Id, 'expirationDate')}
                        onChange={(e) => handleFieldChange(vaccine.Id, 'expirationDate', e.target.value)}
                        className="w-36 text-sm"
                        size="sm"
                      />
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleSaveField(vaccine, 'expirationDate')}
                      >
                        <ApperIcon name="Check" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelField(vaccine.Id, 'expirationDate')}
                      >
                        <ApperIcon name="X" className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 group">
                      <span className="text-gray-600">{formatDate(vaccine.expirationDate)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
onClick={() => handleFieldEdit(vaccine.Id, 'expirationDate', vaccine.expirationDate)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ApperIcon name="Edit2" className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
<td className="px-6 py-4 whitespace-nowrap">
{isFieldEditing(vaccine.Id, 'receivedDate') ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="date"
                        value={getFieldValue(vaccine.Id, 'receivedDate')}
                        onChange={(e) => handleFieldChange(vaccine.Id, 'receivedDate', e.target.value)}
                        className="w-36 text-sm"
                        size="sm"
                      />
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleSaveField(vaccine, 'receivedDate')}
                      >
                        <ApperIcon name="Check" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelField(vaccine.Id, 'receivedDate')}
                      >
                        <ApperIcon name="X" className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 group">
                      <span className="text-gray-600">{formatDate(vaccine.receivedDate)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
onClick={() => handleFieldEdit(vaccine.Id, 'receivedDate', vaccine.receivedDate)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ApperIcon name="Edit2" className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
<td className="px-6 py-4 whitespace-nowrap">
{isFieldEditing(vaccine.Id, 'quantityOnHand') ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        value={getFieldValue(vaccine.Id, 'quantityOnHand')}
                        onChange={(e) => handleFieldChange(vaccine.Id, 'quantityOnHand', e.target.value)}
                        className="w-20 text-center"
                        size="sm"
                      />
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleSaveField(vaccine, 'quantityOnHand')}
                      >
                        <ApperIcon name="Check" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelField(vaccine.Id, 'quantityOnHand')}
                      >
                        <ApperIcon name="X" className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 group">
                      <span className={cn(
                        "font-medium",
                        vaccine.quantityOnHand === 0 ? "text-red-600" :
                        vaccine.quantityOnHand <= 5 ? "text-orange-600" : "text-green-600"
                      )}>
                        {vaccine.quantityOnHand}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
onClick={() => handleFieldEdit(vaccine.Id, 'quantityOnHand', vaccine.quantityOnHand)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ApperIcon name="Edit2" className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
</td>
                {showAdministration && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vaccine.quantityOnHand > 0 ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max={vaccine.quantityOnHand}
                          value={adminDoses[vaccine.Id] || ""}
                          onChange={(e) => handleAdminChange(vaccine.Id, e.target.value)}
                          placeholder="0"
                          className="w-20 text-center"
                          size="sm"
                        />
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleAdminister(vaccine)}
                          disabled={!adminDoses[vaccine.Id] || adminDoses[vaccine.Id] <= 0}
                        >
                          <ApperIcon name="Syringe" className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Out of stock</span>
                    )}
                  </td>
                )}
              </tr>
))}
          </tbody>
        </table>
      </div>
      
      {sortedVaccines.length === 0 && (
        <div className="text-center py-12">
          <ApperIcon name="Package" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vaccines found</h3>
          <p className="text-gray-500">No vaccine inventory data is available.</p>
        </div>
      )}

{/* Password Prompt Dialog */}
      {passwordPrompt.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Password Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please enter the password to edit {passwordPrompt.fieldName}:
            </p>
            <Input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handlePasswordCancel}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={handlePasswordSubmit}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VaccineTable;