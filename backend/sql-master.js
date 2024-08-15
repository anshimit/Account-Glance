const { executeQuery } = require('./db');

async function MasterData(masterAccountIds) {
    const idsString = masterAccountIds.map(id => `'${id}'`).join(',');

    const flagQuery = `SELECT a.ACCOUNT_ID, f.TARGET_OBJECT_ID, f.NAME, f.VALUE
                           FROM ASC_OWN.FLAGS f
                           JOIN ASC_OWN.ACCOUNTS a ON f.TARGET_OBJECT_ID = a.ID
                           WHERE f.TARGET_OBJECT_TYPE = 'masteracct' AND VALUE IS NOT NULL AND a.ACCOUNT_ID IN (${idsString})`;
    
    const poHeaderQuery = `SELECT a.ACCOUNT_ID, ph.TARGET_OBJECT_ID, ph.PO_TYPE, ph.TARGET_OBJECT_TYPE
                           FROM ASC_OWN.POHEADER ph
                           JOIN ASC_OWN.ACCOUNTS a ON ph.TARGET_OBJECT_ID = a.ID
                           WHERE ph.TARGET_OBJECT_TYPE = 'masteracct' AND a.ACCOUNT_ID IN (${idsString})`;
    const statusQuery = `SELECT a.ACCOUNT_ID, a.STATUS, d.DIVISION , c.FULL_NAME 
                            FROM ASC_OWN.ACCOUNTS a
                            JOIN ASC_OWN.CONTACTS c ON a.CONTACT_ID = c.ID 
                            JOIN ASC_OWN.DIVISIONS d ON a.DIVISION_ID = d.ID 
                            WHERE a.ACCOUNT_ID IN (${idsString})`;

    try {
        const [accountflagData, poHeaderData, statusData] = await Promise.all([
            executeQuery(flagQuery),
            executeQuery(poHeaderQuery),
            executeQuery(statusQuery)
        ]);

        const combinedData = [
            ...statusData.map(row => ({
                ACCOUNT_ID: row.ACCOUNT_ID,
                STATUS: row.STATUS,
                DIVISION: row.DIVISION,
                FULL_NAME: row.FULL_NAME,
                TYPE: 'Status Check'
            })),
            ...accountflagData.map(row => ({
                ACCOUNT_ID: row.ACCOUNT_ID,
                TARGET_OBJECT_ID: row.TARGET_OBJECT_ID,
                NAME: row.NAME,
                VALUE: row.VALUE,
                TYPE: 'master flags'
            })),
            ...poHeaderData.map(row => ({
                ACCOUNT_ID: row.ACCOUNT_ID,
                TARGET_OBJECT_ID: row.TARGET_OBJECT_ID,
                PO_TYPE: row.PO_TYPE,
                TARGET_OBJECT_TYPE: row.TARGET_OBJECT_TYPE,
                TYPE: 'PO Required'
            })),
        ];
        console.log('Combined Data', combinedData)
        return combinedData;

    } catch (error) {
        console.error('Error fetching combined data:', error);
        throw error;
    }
}

module.exports = { MasterData };