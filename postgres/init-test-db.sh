#!/bin/bash
set -e

# Create the test database if it doesn't already exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE mtsf_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mtsf_test')\gexec
EOSQL
