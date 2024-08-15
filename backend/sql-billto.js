const { executeQuery } = require('./db'); // Adjust the path as needed

const recognizedFlagNames = [
  'approve_off_contract_items',
  'enable_online_budgeting',
  'edi_available',
];

async function BillData(masterAccountId, billtoId = null) {
  console.log('BillData function called with masterAccountId:', masterAccountId, 'and billtoId:', billtoId);

  const params = { masterAccountId };

  let billtoCondition = '';
  if (billtoId) {
    billtoCondition = 'AND b.BILLTO_ID = :billtoId';
    params.billtoId = billtoId;
  }

  const poHeaderQuery = `SELECT b.BILLTO_ID, a.ACCOUNT_ID , ph.PO_TYPE, ph.TARGET_OBJECT_TYPE 
                          FROM ASC_OWN.POHEADER ph
                          JOIN ASC_OWN.BILLTO b ON ph.TARGET_OBJECT_ID = b.ID 
                          JOIN ASC_OWN.ACCOUNTS a ON b.ACCOUNT_ID = a.ID
                          WHERE ph.TARGET_OBJECT_TYPE = 'billto'
                          AND a.ACCOUNT_ID = :masterAccountId
                          ${billtoCondition}`;
  
  const invoiceQuery = `SELECT b.BILLTO_ID, a.ACCOUNT_ID , b.INVOICE_FREQUENCY 
                          FROM ASC_OWN.BILLTO b
                          JOIN ASC_OWN.ACCOUNTS a ON b.ACCOUNT_ID = a.ID
                          WHERE a.ACCOUNT_ID = :masterAccountId
                          ${billtoCondition}`;
  
  const flagsQuery = `SELECT b.BILLTO_ID, a.ACCOUNT_ID, f.NAME, f.VALUE, f.TARGET_OBJECT_TYPE
                          FROM ASC_OWN.FLAGS f
                          JOIN ASC_OWN.BILLTO b ON f.TARGET_OBJECT_ID = b.ID 
                          JOIN ASC_OWN.ACCOUNTS a ON b.ACCOUNT_ID = a.ID
                          WHERE f.TARGET_OBJECT_TYPE = 'billto'
                          AND a.ACCOUNT_ID = :masterAccountId
                          ${billtoCondition}`;

  const paymentQuery = `SELECT b.BILLTO_ID, a.ACCOUNT_ID, b.PAYMENT_TERMS 
                          FROM ASC_OWN.BILLTO b
                          JOIN ASC_OWN.ACCOUNTS a ON b.ACCOUNT_ID = a.ID
                          WHERE b.PAYMENT_TERMS IS NOT NULL
                          AND a.ACCOUNT_ID = :masterAccountId
                          ${billtoCondition}`;

  const taxQuery = `SELECT s.SHIPTO_ID, s.TAX_EXEMPT_TYPE, b.BILLTO_ID, a.ACCOUNT_ID
                          FROM ASC_OWN.SHIPTO s  
                          JOIN ASC_OWN.BILLTO b ON b.ID = s.BILLTO_ID
                          JOIN ASC_OWN.ACCOUNTS a ON b.ACCOUNT_ID = a.ID 
                          WHERE a.ACCOUNT_ID = :masterAccountId
                          ${billtoCondition}`;
  
  try {
    const [poResult, invoiceResult, flagsResult, paymentResult, taxResult] = await Promise.all([
      executeQuery(poHeaderQuery, params),
      executeQuery(invoiceQuery, params),
      executeQuery(flagsQuery, params),
      executeQuery(paymentQuery, params),
      executeQuery(taxQuery, params)
    ]);

    const combinedBillData = [
      ...poResult.map(row => ({
        ACCOUNT_ID: row.ACCOUNT_ID,
        BILLTO_ID: row.BILLTO_ID,
        NAME: row.PO_TYPE,
        TARGET_OBJECT_TYPE: row.TARGET_OBJECT_TYPE,
        TYPE: 'poheader'
      })), 
      ...invoiceResult.map(row => ({
        ACCOUNT_ID: row.ACCOUNT_ID,
        BILLTO_ID: row.BILLTO_ID,
        NAME: row.INVOICE_FREQUENCY,
        TYPE: 'invoice'
      })),
      ...flagsResult.map(row => ({
        ACCOUNT_ID: row.ACCOUNT_ID,
        BILLTO_ID: row.BILLTO_ID,
        NAME: row.NAME,
        VALUE: row.VALUE,
        TARGET_OBJECT_TYPE: row.TARGET_OBJECT_TYPE,
        TYPE: 'flag table'
      })),
      ...paymentResult.map(row => ({
        ACCOUNT_ID: row.ACCOUNT_ID,
        BILLTO_ID: row.BILLTO_ID,
        NAME: row.PAYMENT_TERMS,
        TYPE: 'payment'
      })),
      ...taxResult.map(row => ({
        ACCOUNT_ID: row.ACCOUNT_ID,
        BILLTO_ID: row.BILLTO_ID,
        SHIPTO_ID: row.SHIPTO_ID,
        TAX_EXEMPT: row.TAX_EXEMPT_TYPE,
        TYPE: 'ship to'
      }))
    ];

    console.log(`Fetched Bill Ids for ${masterAccountId}: ${billtoId}`, combinedBillData);

    const analysis = analyzeDifferences(combinedBillData, recognizedFlagNames);

    return { combinedBillData, analysis };

  } catch (error) {
    console.error('Error fetching all Bill data:', error);
    throw error;
  }
}

function analyzeDifferences(combinedBillData, recognizedFlagNames) {
  const criticalNotes = [];
  const maps = {
    payment: {},
    purchase: {},
    release: {},
    invoice: {},
    onlineBudgeting: {},
    approveContract: {},
    edi: {},
    shipto: {}
  };

  const uniqueBillAccounts = new Set();
  const typePresenceMap = new Map();
  const shipToMap = new Map();

  // Pass 1: Track presence of each type
  combinedBillData.forEach(row => {
    uniqueBillAccounts.add(row.BILLTO_ID);

    if (!typePresenceMap.has(row.BILLTO_ID)) {
      typePresenceMap.set(row.BILLTO_ID, {
        payment: false,
        purchase: false,
        release: false,
        invoice: false,
        onlineBudgeting: false,
        approveContract: false,
        edi: false,
        shipto: false
      });
    }

    const presence = typePresenceMap.get(row.BILLTO_ID);

    if (recognizedFlagNames.includes(row.NAME)) {
      switch (row.NAME) {
        case 'approve_off_contract_items':
          presence.approveContract = true;
          break;
        case 'enable_online_budgeting':
          presence.onlineBudgeting = true;
          break;
        case 'edi_available':
          presence.edi = true;
          break;
      }
    } else {
      switch (row.TYPE) {
        case 'payment':
          presence.payment = true;
          maps.payment[row.NAME] = maps.payment[row.NAME] || [];
          maps.payment[row.NAME].push(row.BILLTO_ID);
          break;
        case 'poheader':
          if (row.NAME === 'PO') {
            presence.purchase = true;
            maps.purchase[row.NAME] = maps.purchase[row.NAME] || [];
            maps.purchase[row.NAME].push(row.BILLTO_ID);
          } else if (row.NAME === 'POR') {
            presence.release = true;
            maps.release[row.NAME] = maps.release[row.NAME] || [];
            maps.release[row.NAME].push(row.BILLTO_ID);
          }
          break;
        case 'invoice':
          presence.invoice = true;
          maps.invoice[row.NAME] = maps.invoice[row.NAME] || [];
          maps.invoice[row.NAME].push(row.BILLTO_ID);
          break;
        case 'ship to':
          presence.shipto = true;
          if (!shipToMap.has(row.BILLTO_ID)) {
            shipToMap.set(row.BILLTO_ID, []);
          }
          shipToMap.get(row.BILLTO_ID).push(row.SHIPTO_ID);
          break;
      }
    }
  });

  // Skip analysis if there is only one BILLTO_ID
  if (uniqueBillAccounts.size <= 1) {
    return [{
      ACCOUNT_ID: '',
      TYPE: '',
      VALUE: '',
      NOTE: 'No Critical Notes available'
    }];
  }

  // Check if all unique bill accounts have the same features
  const featureSet = new Set();
  typePresenceMap.forEach(presence => {
    featureSet.add(JSON.stringify(presence));
  });

  if (featureSet.size === 1) {
    // All bill accounts have the same features
    return [{
      ACCOUNT_ID: '',
      TYPE: '',
      VALUE: '',
      NOTE: 'No Critical Notes available'
    }];
  }

  // Pass 2: Identify missing types where exactly one account is missing
  const allTypes = Object.keys(typePresenceMap.values().next().value);
  const typeCount = allTypes.reduce((acc, type) => {
    acc[type] = { count: 0, missingFrom: [] };
    return acc;
  }, {});

  uniqueBillAccounts.forEach(billtoId => {
    const presence = typePresenceMap.get(billtoId);
    allTypes.forEach(type => {
      if (!presence[type]) {
        typeCount[type].count++;
        typeCount[type].missingFrom.push(billtoId);
      }
    });
  });

  Object.entries(typeCount).forEach(([type, { count, missingFrom }]) => {
    if (count === 1) {  // Only report if exactly one account is missing the type
      criticalNotes.push({
        ACCOUNT_ID: missingFrom[0],
        TYPE: type,
        VALUE: 'N/A',
        NOTE: `BILLTO_ID ${missingFrom[0]} does not have ${getTypeDescription(type)} defined.`
      });
    }
  });

  // Pass 3: Analyze ShipTo IDs
  let maxShipToCount = 0;
  let maxShipToBilltoId = null;

  shipToMap.forEach((shiptoIds, billtoId) => {
    const shipToCount = shiptoIds.length;
    if (shipToCount > maxShipToCount) {
      maxShipToCount = shipToCount;
      maxShipToBilltoId = billtoId;
    }
  });

  if (maxShipToBilltoId !== null) {
    criticalNotes.push({
      ACCOUNT_ID: maxShipToBilltoId,
      TYPE: 'ship to',
      VALUE: `Number of ShipTo IDs: ${maxShipToCount}`,
      NOTE: `BILLTO_ID ${maxShipToBilltoId} has the highest number of ShipTo IDs: ${maxShipToCount}.`
    });
  }

  // Pass 4: Analyze Other Types
  Object.entries(maps).forEach(([type, map]) => {
    for (const [value, accounts] of Object.entries(map)) {
      if (accounts.length === 1) {  // Only one account with this unique value
        criticalNotes.push({
          ACCOUNT_ID: accounts[0],
          TYPE: type,
          VALUE: value,
          NOTE: `BILLTO_ID ${accounts[0]} has unique ${getTypeDescription(type)}: ${value}`
        });
      }
    }
  });

  return criticalNotes;
}

function getTypeDescription(type) {
  switch (type) {
    case 'payment':
      return 'payment terms';
    case 'purchase':
      return 'purchase order requirement';
    case 'release':
      return 'release requirement';
    case 'invoice':
      return 'invoice frequency';
    case 'onlineBudgeting':
      return 'online budgeting';
    case 'approveContract':
      return 'approval of contract';
    case 'edi':
      return 'edi flag';
    case 'shipto':
      return 'ShipTo IDs';
    default:
      return 'value';
  }
}


async function getBilltoIds(masterAccountId) {
  const query = `SELECT b.BILLTO_ID, a.ACCOUNT_ID
                  FROM ASC_OWN.BILLTO b 
                  JOIN ASC_OWN.ACCOUNTS a ON b.ACCOUNT_ID = a.ID
                  WHERE a.ACCOUNT_ID = :masterAccountId`;
  try {
    const result = await executeQuery(query, { masterAccountId });
    return result;
  } catch (error) {
    console.error('Error fetching billto ids:', error);
    throw error;
  }
}

module.exports = { BillData, getBilltoIds };
