-- Create databases for CSMS and OCPP services
CREATE DATABASE csms_stations;
CREATE DATABASE csms_billing;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE csms_stations TO postgres;
GRANT ALL PRIVILEGES ON DATABASE csms_billing TO postgres;