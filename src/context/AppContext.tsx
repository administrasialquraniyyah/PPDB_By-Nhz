'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AcademicYearItem {
  id: string;
  name: string;
  isActive: boolean;
  _count?: {
    students: number;
    expenses: number;
  };
}

export interface DbStatusInfo {
  status: 'connected' | 'disconnected' | 'checking';
  latencyMs: number;
  database: string;
  timestamp: string;
  error?: string;
  message?: string;
}

interface AppContextType {
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  selectedYearName: string;
  academicYears: AcademicYearItem[];
  refreshYears: () => Promise<void>;
  dbStatus: DbStatusInfo;
  checkDbConnection: () => Promise<void>;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusInfo>({
    status: 'checking',
    latencyMs: 0,
    database: '',
    timestamp: '',
  });

  const checkDbConnection = async () => {
    setDbStatus((prev) => ({ ...prev, status: 'checking' }));
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (res.ok && data.status === 'connected') {
        setDbStatus({
          status: 'connected',
          latencyMs: data.latencyMs || 0,
          database: data.database || 'postgres',
          timestamp: data.timestamp || new Date().toISOString(),
          message: data.message,
        });
      } else {
        setDbStatus({
          status: 'disconnected',
          latencyMs: data.latencyMs || 0,
          database: '',
          timestamp: new Date().toISOString(),
          error: data.error || 'Gagal terhubung ke database',
        });
      }
    } catch (err: any) {
      setDbStatus({
        status: 'disconnected',
        latencyMs: 0,
        database: '',
        timestamp: new Date().toISOString(),
        error: err.message || 'Koneksi gagal',
      });
    }
  };

  const refreshYears = async () => {
    try {
      const res = await fetch('/api/academic-years');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAcademicYears(json.data);
        if (!selectedYearId && json.data.length > 0) {
          const active = json.data.find((y: AcademicYearItem) => y.isActive);
          setSelectedYearId(active ? active.id : json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  };

  useEffect(() => {
    checkDbConnection();
    refreshYears();

    // Check DB status every 60 seconds
    const interval = setInterval(checkDbConnection, 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedYear = academicYears.find((y) => y.id === selectedYearId);
  const selectedYearName = selectedYear ? selectedYear.name : '2026/2027';

  return (
    <AppContext.Provider
      value={{
        selectedYearId,
        setSelectedYearId,
        selectedYearName,
        academicYears,
        refreshYears,
        dbStatus,
        checkDbConnection,
        isMobileNavOpen,
        setIsMobileNavOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
