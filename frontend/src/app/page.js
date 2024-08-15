"use client";
import React, { useState } from 'react';
import MasterData from './masterdata';
import BillData from './billdata';
import Modal from './Modal';
import './globals.css';

function HomePage() {
  const [selectedMasterAccountId, setSelectedMasterAccountId] = useState('');
  const [hasBillAccounts, setHasBillAccounts] = useState(false);
  const [showBillAccounts, setShowBillAccounts] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleMasterAccountChange = (accountId) => {
    setSelectedMasterAccountId(accountId);
    setHasBillAccounts(false);
    setShowBillAccounts(false);
  };

  const handleBillAccountCheck = (hasBillAccounts) => {
    setHasBillAccounts(hasBillAccounts);
    if (!hasBillAccounts) {
      setShowBillAccounts(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSearchBillAccountsClick = () => {
    if (selectedMasterAccountId) {
      setHasBillAccounts(true);
      setShowBillAccounts(true);
    } else {
      console.log('No Master Account ID is selected');
    }
  };


  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <button onClick={handleOpenModal} className="open-modal-button">
        Open Account @ Glance
      </button>
  
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
          <div className="app">
            <div className="modal-content">
              <h1 className="header">Account @ Glance</h1>
              <MasterData onMasterAccountChange={handleMasterAccountChange} onBillAccountCheck={handleBillAccountCheck} />
              <button 
                onClick={handleSearchBillAccountsClick} 
                className='show-bill-accounts-button'
                disabled={!hasBillAccounts}>
                Show Bill Accounts
              </button>
              {selectedMasterAccountId && showBillAccounts && <BillData masterAccountId={selectedMasterAccountId} />}    
            </div>
          </div>
        </Modal>
      )}
    </>
  )
};

export default HomePage;