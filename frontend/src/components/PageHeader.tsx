/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import './styles/PageHeader.css';

interface PageHeaderProps {
  title: string;
  timestamp?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, timestamp, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {timestamp && <div className="timestamp">{timestamp}</div>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}
