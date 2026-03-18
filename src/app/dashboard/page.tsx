"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageTitle from '@/components/ui/PageTitle';
import { X, Maximize2 } from 'lucide-react';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import DashboardRadarChart, { SAMPLE_DATA as RADAR_SAMPLE } from '@/components/dashboard/DashboardRadarChart';
import DashboardBoxplotChart, { SAMPLE_DATA as BOXPLOT_SAMPLE } from '@/components/dashboard/DashboardBoxplotChart';
import type { BoxplotData } from '@/components/dashboard/DashboardBoxplotChart';
import DashboardConfusionMatrix, { SAMPLE_DATA as CONFUSION_SAMPLE } from '@/components/dashboard/DashboardConfusionMatrix';
import type { ConfusionData } from '@/components/dashboard/DashboardConfusionMatrix';
import DashboardMetricsChart, { SAMPLE_DATA as METRICS_SAMPLE } from '@/components/dashboard/DashboardMetricsChart';
import type { MetricsData } from '@/components/dashboard/DashboardMetricsChart';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RadarData {
  llm: Record<string, number> | null;
  human: Record<string, number> | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);

  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [boxplotData, setBoxplotData] = useState<BoxplotData | null>(null);
  const [confusionData, setConfusionData] = useState<ConfusionData | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);

  const headers = { Authorization: `Bearer ${user?.id || ''}` };

  const fetchDashboard = useCallback(async (pid: string) => {
    setLoading(true);
    setRadarData(null);
    setBoxplotData(null);
    setConfusionData(null);
    setMetricsData(null);

    try {
      const [radar, boxplot, confusion, metrics] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/radar/${pid}`, { headers }).then((r) => r.json()),
        fetch(`${API_URL}/api/dashboard/boxplot/${pid}`, { headers }).then((r) => r.json()),
        fetch(`${API_URL}/api/dashboard/confusion-matrix/${pid}`, { headers }).then((r) => r.json()),
        fetch(`${API_URL}/api/dashboard/classification-metrics/${pid}`, { headers }).then((r) => r.json()),
      ]);

      setRadarData(radar);
      setBoxplotData(boxplot);
      setConfusionData(confusion);
      setMetricsData(metrics);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (projectId) fetchDashboard(projectId);
  }, [projectId, fetchDashboard]);

  const noProject = !projectId;

  return (
    <AppLayout>
      <PageTitle title="Dashboard" />
      <DashboardToolbar selectedProjectId={projectId} onProjectChange={setProjectId} />

      <div className="grid grid-cols-2 gap-4">
        <ChartCard dark={isDarkMode} noProject={noProject} loading={loading} loaded={!!radarData}>
          {() => noProject
            ? <DashboardRadarChart data={RADAR_SAMPLE} dark={isDarkMode} />
            : radarData && <DashboardRadarChart data={radarData} dark={isDarkMode} />}
        </ChartCard>

        <ChartCard dark={isDarkMode} noProject={noProject} loading={loading} loaded={!!boxplotData}>
          {() => noProject
            ? <DashboardBoxplotChart data={BOXPLOT_SAMPLE} dark={isDarkMode} />
            : boxplotData && <DashboardBoxplotChart data={boxplotData} dark={isDarkMode} />}
        </ChartCard>

        <ChartCard dark={isDarkMode} noProject={noProject} loading={loading} loaded={!!confusionData}>
          {() => noProject
            ? <DashboardConfusionMatrix data={CONFUSION_SAMPLE} dark={isDarkMode} />
            : confusionData && <DashboardConfusionMatrix data={confusionData} dark={isDarkMode} />}
        </ChartCard>

        <ChartCard dark={isDarkMode} noProject={noProject} loading={loading} loaded={!!metricsData}>
          {() => noProject
            ? <DashboardMetricsChart data={METRICS_SAMPLE} dark={isDarkMode} />
            : metricsData && <DashboardMetricsChart data={metricsData} dark={isDarkMode} />}
        </ChartCard>
      </div>
    </AppLayout>
  );
}

function ChartCard({
  children,
  dark,
  noProject,
  loading,
  loaded,
}: {
  children: (size: 'sm' | 'lg') => React.ReactNode;
  dark: boolean;
  noProject: boolean;
  loading: boolean;
  loaded: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const canOpen = !noProject && loaded;

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowModal(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal]);

  const bg = dark ? '#111827' : '#ffffff';
  const border = dark ? '#374151' : '#e5e7eb';
  const iconColor = dark ? '#6b7280' : '#9ca3af';

  return (
    <>
      <div
        className="relative overflow-hidden"
        onClick={canOpen ? () => setShowModal(true) : undefined}
        style={{
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: 10,
          height: 360,
          cursor: canOpen ? 'pointer' : 'default',
        }}
      >
        <div style={{ position: 'absolute', top: 8, right: 8, color: iconColor, opacity: canOpen ? 1 : 0 }}>
          <Maximize2 size={14} />
        </div>
        <div className="w-full h-full p-3" style={{ pointerEvents: 'none' }}>{children('sm')}</div>

        {noProject && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)' }}>
            <span style={{ color: dark ? '#9ca3af' : '#6b7280', fontSize: 14, fontWeight: 500 }}>Select a project</span>
          </div>
        )}

        {!noProject && loading && !loaded && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }}>
            <Spinner size="lg" />
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          style={{ backgroundColor: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 720,
              height: 520,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: 20,
              backgroundColor: bg,
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                color: dark ? '#9ca3af' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                zIndex: 1,
              }}
            >
              <X size={18} />
            </button>
            <div className="w-full h-full">{children('lg')}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
