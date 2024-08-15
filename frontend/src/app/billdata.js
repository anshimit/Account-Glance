"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './billdata.css';

const recognizedFlagNames = [
  'approve_off_contract_items',
  'enable_online_budgeting',
  'edi_available',
];

const BillData = ({ masterAccountId, hasSearched }) => {
  const [billtoID, setBilltoID] = useState([]);
  const [selectedBillAccountId, setSelectedBillAccountId] = useState('');
  const [selectedBillData, setSelectedBillData] = useState([]);
  const [showFlags, setShowFlags] = useState(false);
  const [criticalNotes, setCriticalNotes] = useState([]);
  const [selectedShipToId, setSelectedShipToId] = useState('');
  const [taxExemptType, setTaxExemptType] = useState('');
  const [flagNames, setFlagNames] = useState([]);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [addedFlags, setAddedFlags] = useState([]);
  const [enableDropdown, setEnableDropdown] = useState(false);

  useEffect(() => {
    if (masterAccountId) {
      fetchAccountIds(masterAccountId);
      fetchBillData(masterAccountId);
      setShowFlags(false);  // Hide flags when a new masterAccountId is set
      setSelectedBillAccountId(''); // Reset the dropdown select to "--Select--"
      setCriticalNotes([]); // Reset critical notes
      setSelectedBillData([]); // Reset selected bill data
      setAddedFlags([]); // Reset added flags
      setFlagNames([]); // Reset flag names
    }
  }, [masterAccountId]);

  useEffect(() => {
    if (selectedBillAccountId) {
      fetchBillData(masterAccountId, selectedBillAccountId);
      setShowFlags(true);
    }
  }, [selectedBillAccountId]);

  useEffect(() => {
    if (hasSearched) {
      setCriticalNotes([]); // Clear critical notes when a search is performed
    }
  }, [hasSearched]);

  const fetchAccountIds = async (masterAccountId) => {
    try {
      console.log('Fetching billto ids for master account ID:', masterAccountId);
      const response = await axios.get('http://localhost:3001/api/billtoids', {
        params: { masterAccountId }
      });
      console.log('Fetched billto ids:', response.data);
      setBilltoID(response.data || []);
    } catch (error) {
      console.error('Error fetching billto ids:', error);
    }
  };

  const fetchBillData = async (masterAccountId, billtoId = null) => {
    try {
      console.log('Fetching bill data for master account ID and billto ID:', masterAccountId, billtoId);
      const response = await axios.get('http://localhost:3001/api/billdata', {
        params: { masterAccountId, billtoId }
      });
      console.log('Fetched bill data:', response.data);

      if (billtoId) {
        setSelectedBillData(response.data.combinedBillData || []);
      } else {
        setSelectedBillData(response.data.combinedBillData || []);
        setCriticalNotes(response.data.analysis || []);
        const uniqueFlagNames = [...new Set(response.data.combinedBillData.filter(item => item.TYPE === 'flag table').map(item => item.NAME))];
        setFlagNames(uniqueFlagNames);
      }
    } catch (error) {
      console.error('Error fetching bill data:', error);
    }
  };

  const handleBillAccountChange = (e) => {
    const selectedBillAccountId = e.target.value;
    console.log(`Selected Bill Account ID: ${selectedBillAccountId}`);
    setSelectedBillAccountId(selectedBillAccountId);

    // Reset Ship to ID and Tax Exempt Type when new Bill Account ID is selected
    setSelectedShipToId('');
    setTaxExemptType('');

    if (!selectedBillAccountId) {
      setSelectedBillData([]);
      setShowFlags(false);
    } else {
      fetchBillData(masterAccountId, selectedBillAccountId);
    }
  };

  const handleShipToChange = (e) => {
    const shipToId = e.target.value;
    setSelectedShipToId(shipToId);
    const selectedShipTo = selectedBillData.find(shipItem => shipItem.SHIPTO_ID === shipToId);
    setTaxExemptType(selectedShipTo ? selectedShipTo.TAX_EXEMPT : 'None');
  };

  const toggleFlags = () => {
    setShowFlags(!showFlags);
  };

  const handleFlagChange = (event) => {
    setSelectedFlag(event.target.value);
  };

  const addFlag = () => {
    if (selectedFlag && !addedFlags.includes(selectedFlag)) {
      setAddedFlags([...addedFlags, selectedFlag]);
    }
    setEnableDropdown(false); // Hide the dropdown after adding the flag
    setSelectedFlag(null); // Reset the selected flag
  };

  const renderFlag = (flagName) => {
    const flagData = selectedBillData.find(item => item.TYPE === 'flag table' && item.NAME === flagName);
    if (flagData) {
      return <span className={`flag-value ${flagData.VALUE === 'Y' ? 'status-yes' : 'status-no'}`}>{flagData.VALUE === 'Y' ? 'Yes' : 'No'}</span>;
    }
    return null;
  };

  const filteredData = selectedBillData.filter(
    item =>
      recognizedFlagNames.includes(item.NAME) ||
      item.TYPE === 'poheader' ||
      item.TYPE === 'invoice' ||
      item.TYPE === 'payment'
  );

  // Aggregate ShipTo IDs
  const shipToData = selectedBillData
    .filter(item => item.TYPE === 'ship to')
    .reduce((acc, item) => {
      if (!acc[item.BILLTO_ID]) {
        acc[item.BILLTO_ID] = [];
      }
      acc[item.BILLTO_ID].push(item);
      return acc;
    }, {});

  console.log('Filtered Data:', filteredData);

  return (
    <div className="content-container">
      <div className="account-flags">
        <div className="analysis-section">
          <h3>Individual Account Notes</h3>
          {criticalNotes.length > 0 ? (
            criticalNotes.map((note, index) => (
              <div className="analysis-note" key={index}>
                <span className="analysis-name">{note.NOTE}</span>
              </div>
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
        <div className="select-container">
          <span className="flag-label">Select Bill Account ID:</span>
          <select onChange={handleBillAccountChange} value={selectedBillAccountId}>
            <option value="">-- Select --</option>
            {billtoID.length > 0 ? (
              billtoID.map((bill, index) => (
                <option key={bill.BILLTO_ID || index} value={bill.BILLTO_ID}>
                  {bill.BILLTO_ID}
                </option>
              ))
            ) : (
              <option value="">No BillTo IDs Available</option>
            )}
          </select>
        </div>

        {selectedBillAccountId && selectedBillData.length > 0 && (
          <>
            {showFlags && (
              <>
                {filteredData.map((item, index) => (
                  <div className="bill-flag" key={`${item.TYPE}-${index}`}>
                    {item.TYPE === 'poheader' && item.NAME === 'PO' && (
                      <>
                        <span className="flag-label">Purchase Order Req:</span>
                        <span className="flag-value">{item.NAME || 'No'}</span>
                      </>
                    )}
                    {item.TYPE === 'poheader' && item.NAME === 'POR' && (
                      <>
                        <span className="flag-label">Release Req:</span>
                        <span className="flag-value">{item.NAME || 'No'}</span>
                      </>
                    )}
                    {item.TYPE === 'invoice' && (
                      <>
                        <span className="flag-label">Invoice Frequency:</span>
                        <span className="flag-value">{item.NAME || 'No'}</span>
                      </>
                    )}
                    {item.TYPE === 'payment' && (
                      <>
                        <span className="flag-label">Payment Terms:</span>
                        <span className="flag-value">{item.NAME || 'No'}</span>
                      </>
                    )}
                    {item.TYPE === 'flag table' && recognizedFlagNames.includes(item.NAME) && (
                      <>
                        <span className="flag-label">{item.NAME}</span>
                        <span className="flag-value">{item.VALUE === 'Y' ? 'Yes' : 'No'}</span>
                      </>
                    )}
                  </div>
                ))}
                {/* Render ShipTo Data in one box */}
                {Object.entries(shipToData).map(([billtoId, items]) => (
                  <div className="bill-flag ship-to-flag" key={billtoId}>
                    <span className="flag-label">Tax Exempt Type:</span>
                    <select onChange={handleShipToChange} value={selectedShipToId}>
                      <option value="">-- Select --</option>
                      {items.map((item, index) => (
                        <option key={item.SHIPTO_ID || index} value={item.SHIPTO_ID}>
                          {item.SHIPTO_ID}
                        </option>
                      ))}
                    </select>
                    {selectedShipToId && (
                      <span className="flag-value">
                        {taxExemptType}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
            {addedFlags.map((flagName, index) => (
              <div key={index} className="bill-flag">
                <span className="flag-label">{flagName}:</span>
                {renderFlag(flagName)}
              </div>
            ))}
            {enableDropdown && (
              <div className="flag-selector">
                <label htmlFor="flag-select">Select a flag: </label>
                <select id="flag-select" onChange={handleFlagChange} value={selectedFlag}>
                  <option value="">--Select a flag--</option>
                  {flagNames.map((flagName, index) => (
                    <option key={index} value={flagName}>
                      {flagName}
                    </option>
                  ))}
                </select>
                <button onClick={addFlag} disabled={!selectedFlag}>Add Flag</button>
              </div>
            )}
            <button onClick={() => setEnableDropdown(true)}>Add More Flags</button>
            <button onClick={toggleFlags}>
              {showFlags ? 'Hide Flags' : 'Show Flags'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BillData;
