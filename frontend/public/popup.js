import React, { useState } from 'react';
import MasterData from '../src/app/masterdata'; // Adjust the path if necessary
import BillData from '../src/app/billdata';   // Adjust the path if necessary
import Head from 'next/head';
import '../public/popup.css'; // Import the CSS for the popup

const PopupContent = () => {
  const [selectedMasterAccountId, setSelectedMasterAccountId] = useState('');

  const handleMasterAccountChange = (accountId) => {
    setSelectedMasterAccountId(accountId);
  };

  return (
    <>
      <Head>
        <title>Popup</title>
        <link rel="stylesheet" href="/popup.css" />
      </Head>
      <div className="popup-container">
        <h1 className="header">Account @ Glance</h1>
        <MasterData onMasterAccountChange={handleMasterAccountChange} />
        {selectedMasterAccountId && <BillData masterAccountId={selectedMasterAccountId} />}
      </div>
    </>
  );
};

export default PopupContent;
