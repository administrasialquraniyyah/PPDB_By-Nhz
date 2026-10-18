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
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize sidebar collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ppdb_sidebar_collapsed');
        if (saved !== null) {
          setIsSidebarCollapsed(saved === 'true');
        }
      } catch (e) {}
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ppdb_sidebar_collapsed', String(next));
        } catch (e) {}
      }
      return next;
    });
  };
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

  const handleSetSelectedYearId = (id: string) => {
    setSelectedYearId(id);
    if (typeof window !== 'undefined' && id) {
      try {
        localStorage.setItem('ppdb_selected_year_id', id);
      } catch (e) {}
    }
  };

  const refreshYears = async () => {
    try {
      const res = await fetch('/api/academic-years');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAcademicYears(json.data);

        // Determine the best year selection
        let savedId: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            savedId = localStorage.getItem('ppdb_selected_year_id');
          } catch (e) {}
        }

        setSelectedYearId((prevId) => {
          const existsCurrent = prevId && json.data.some((y: AcademicYearItem) => y.id === prevId);
          if (existsCurrent) return prevId;

          const existsSaved = savedId && json.data.some((y: AcademicYearItem) => y.id === savedId);
          if (existsSaved) return savedId!;

          if (json.data.length > 0) {
            const active = json.data.find((y: AcademicYearItem) => y.isActive);
            const fallbackId = active ? active.id : json.data[0].id;
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('ppdb_selected_year_id', fallbackId);
              } catch (e) {}
            }
            return fallbackId;
          }
          return '';
        });
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
        setSelectedYearId: handleSetSelectedYearId,
        selectedYearName,
        academicYears,
        refreshYears,
        dbStatus,
        checkDbConnection,
        isMobileNavOpen,
        setIsMobileNavOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
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
