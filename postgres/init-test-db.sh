#!/bin/bash

# MTSF — Multi-Tenant SaaS Framework
# Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
# All rights reserved.
#
# Licensed under the MTSF Licence. See LICENCE file in the project root.

set -e

# Create the test database if it doesn't already exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE mtsf_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mtsf_test')\gexec
EOSQL
