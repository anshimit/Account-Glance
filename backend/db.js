const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const dbConfig = {
    user: "ASC_APPL",
    password: "blue421jays",
    connectString: "acs04-gp-account-oracle-qe-0.az.staples.com:51521/ASCQA-AZ"
};

async function executeQuery(query, params = []) {
    let connection;
    try {

        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(query, params);

        return result.rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error closing connection:', error);
            }
        }
    }
}

module.exports = { executeQuery };