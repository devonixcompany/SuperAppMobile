-- Create separate databases for each microservice
CREATE DATABASE superapp_users;
CREATE DATABASE superapp_auth;
CREATE DATABASE superapp_stations;
CREATE DATABASE superapp_drivers;
CREATE DATABASE superapp_billing;
CREATE DATABASE superapp_monitoring;
CREATE DATABASE superapp_charge_points;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE superapp_users TO postgres;
GRANT ALL PRIVILEGES ON DATABASE superapp_auth TO postgres;
GRANT ALL PRIVILEGES ON DATABASE superapp_stations TO postgres;
GRANT ALL PRIVILEGES ON DATABASE superapp_drivers TO postgres;
GRANT ALL PRIVILEGES ON DATABASE superapp_billing TO postgres;
GRANT ALL PRIVILEGES ON DATABASE superapp_monitoring TO postgres;
GRANT ALL PRIVILEGES ON DATABASE superapp_charge_points TO postgres;