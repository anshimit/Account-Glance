"use client"
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const MasterData = ({ onMasterAccountChange, searchFlags, onBillAccountCheck }) => {
  const [data, setData] = useState([]);
  const [selectedMasterAccountId, setSelectedMasterAccountId] = useState('');
  const [showFlags, setShowFlags] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [flagNames, setFlagNames] = useState([]);
  const [enableDropdown, setEnableDropdown] = useState(false);
  const [addedFlags, setAddedFlags] = useState([]);

  useEffect(() => {
    if (selectedMasterAccountId && searchFlags && hasSearched) {
      fetchMasterData(selectedMasterAccountId);
    }
  }, [selectedMasterAccountId, searchFlags, hasSearched]);

  const fetchMasterData = async (accountId) => {
    if (accountId) {
      try {
        const response = await axios.get('http://localhost:3001/api/masterdata', {
          params: { ids: accountId }
        });

        if (!response.data || response.data.length === 0) {
          throw new Error('No data found');
        }
        setData(response.data);

        // Extract unique flag names from the fetched data
        const uniqueFlagNames = [...new Set(response.data.filter(item => item.TYPE === 'master flags').map(item => item.NAME))];
        setFlagNames(uniqueFlagNames);
        
        const billAccounts = await axios.get('http://localhost:3001/api/billtoids', {
          params: { masterAccountId: accountId }
        });
        if (billAccounts.data && billAccounts.data.length > 0) {
          onBillAccountCheck(true);
          setErrorMessage('');
        } else {
          onBillAccountCheck(false);
          setErrorMessage('No Bill Accounts found.');
        }
          // onBillAccountCheck(billAccounts.data.length > 0);
          // setErrorMessage(''); // Clear error message if data is fetched successfully
        } catch (error) {
          console.error('Error fetching data:', error);
          setErrorMessage('Please enter a valid Master Account ID');
          onBillAccountCheck(false);
        }
      } else {
        onBillAccountCheck(false);
        setErrorMessage('Please enter a Master Account ID');
      }
    };

  const handleSearch = () => {
    setHasSearched(true);
    setShowFlags(true); // Ensure flags are shown after searching
    onMasterAccountChange(selectedMasterAccountId);
    fetchMasterData(selectedMasterAccountId);
  };

  const getFlagStatus = (accountId, type, flagName = null) => {
    if (!data.length) {
      console.log("No data available");
      return { text: 'No Data', className: '' };
    }

    console.log('Data', data);
    const flagData = data.find(item => item.ACCOUNT_ID.toString() === accountId && item.TYPE === type && (!flagName || item.NAME === flagName));

    if (!flagData) {
      console.log('No flag data found for Type:', type, 'Account ID:', accountId);
      return { text: 'No Data', className: 'status-none' };
    }

    console.log('Flag Data:', flagData, 'Type:', type, 'Account ID:', accountId);

    switch (type) {
      case 'PO Required':
        if (!flagData.PO_TYPE || (flagData.PO_TYPE !== 'PO' && flagData.PO_TYPE !== 'POR')) {
          console.log('PO_TYPE data not available for Account ID:', accountId);
          return { text: 'Not Enlisted', className: 'status-none' };
        }
        const SearchPO = flagData.PO_TYPE === 'PO' || flagData.PO_TYPE === 'POR';
        return { text: SearchPO ? 'Yes' : 'No', className: SearchPO ? 'status-yes' : 'status-no' };

      case 'master flags':
        return { text: flagData.VALUE, className: flagData.VALUE === 'Y' ? 'status-yes' : 'status-no' };

      case 'Status Check':
        const statusMap = {
          'WIP': { text: 'Work In Progress', className: 'status-wip' },
          'ACT': { text: 'ACTIVE', className: 'status-active' },
          'INA': { text: 'INACTIVE', className: 'status-inactive' },
        };
        return {
          text: statusMap[flagData.STATUS]?.text || '--',
          className: statusMap[flagData.STATUS]?.className || 'status-none',
          division: flagData.DIVISION,
          fullName: flagData.FULL_NAME,
        };

      default:
        return { text: 'Invalid Type', className: 'status-error' };
    }
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
    const { text, className } = getFlagStatus(selectedMasterAccountId, 'master flags', flagName);
    return <span className={`flag-value ${className}`}>{text}</span>;
  };

  const toggleFlags = () => {
    setShowFlags(!showFlags);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const enableDropdownHandler = () => {
    setEnableDropdown(true);
  };

  return (
    <div className="data-container">
      <div className="account-flags">
        <div>
          <span className="flag-label">Enter Master Account ID:</span>
        </div>
        <div className="search-bar-container">
          <div className='search-bar'>
          <input
            type="text"
            className="search-input"
            value={selectedMasterAccountId}
            onChange={e => {
              setSelectedMasterAccountId(e.target.value);
              setHasSearched(false); // Reset search state when changing master account ID
              setErrorMessage('');
              setAddedFlags([]);
              onBillAccountCheck(false);
              handleSearch
            }}
            onKeyDown={handleKeyPress}
            placeholder="Search"
          />
          </div>
        </div>
        {errorMessage && <p className='error-message'>{errorMessage}</p>}

        {showFlags && hasSearched && data.length > 0 && (
          <>
            <div className='flag flag-account-status'>
              <span className="flag-label">Master Account Name:</span>
              {(() => {
                const { fullName } = getFlagStatus(selectedMasterAccountId, 'Status Check');
                return <div>{fullName}</div>;
              })()}
            </div>
            <div className='flag flag-account-status'>
              <span className="flag-label">Division:</span>
              {(() => {
                const {division } = getFlagStatus(selectedMasterAccountId, 'Status Check');
                return <div> {division}</div>;
              })()}
            </div>
            <div className='flag flag-account-status'>
              <span className="flag-label">Account Status:</span>
              {(() => {
                const { text, className } = getFlagStatus(selectedMasterAccountId, 'Status Check');
                return <span className={`flag-value ${className}`}>{text}</span>;
              })()}
            </div>
            <div className="flag">
              <span className="flag-label">EDI Flag:</span>
              {renderFlag('ediOnlyFlag')}
            </div>
            <div className="flag">
              <span className="flag-label">Budget Center Req:</span>
              {renderFlag('budgetCenterReq')}
            </div>
            <div className="flag">
              <span className="flag-label">Purchase Order Req:</span>
              {(() => {
                const { text, className } = getFlagStatus(selectedMasterAccountId, 'PO Required');
                return <span className={`flag-value ${className}`}>{text}</span>;
              })()}
            </div>
            <div className="flag">
              <span className="flag-label">Release Req:</span>
              {(() => {
                const { text, className } = getFlagStatus(selectedMasterAccountId, 'PO Required');
                return <span className={`flag-value ${className}`}>{text}</span>;
              })()}
            </div>
            {addedFlags.map((flagName, index) => (
              <div key={index} className="flag">
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
            <button onClick={enableDropdownHandler}>Add More Flags</button>
          </>
        )}
        <button onClick={toggleFlags}>
          {showFlags ? 'Hide Flags' : 'Show Flags'}
        </button>
      </div>
    </div>
  );
};

export default MasterData
