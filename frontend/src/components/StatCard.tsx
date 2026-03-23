/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import './styles/StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'green' | 'amber' | 'blue' | 'red';
  sub?: string;
}

export default function StatCard({ label, value, color = 'blue', sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
