"use client";

import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([RadarChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const LABELS = ['Unambiguous', 'Completeness', 'Atomicity', 'Verifiable', 'Conforming'];
const KEYS = ['unambiguous', 'completeness', 'atomicity', 'verifiable', 'conforming'];

interface RadarData {
  llm: Record<string, number> | null;
  human: Record<string, number> | null;
}

function buildOption(data: RadarData, dark: boolean): echarts.EChartsCoreOption {
  const hasHuman = data.human !== null;
  const textColor = dark ? '#e5e7eb' : '#1f2937';
  const subTextColor = dark ? '#9ca3af' : '#6b7280';
  const labelColor = dark ? '#d1d5db' : '#374151';
  const lineColor = dark ? '#374151' : '#d1d5db';

  const series: echarts.EChartsCoreOption[] = [];

  if (data.llm) {
    series.push({
      name: 'LLM-as-judge',
      type: 'radar',
      data: [{
        value: KEYS.map((k) => data.llm![k] ?? 0),
        name: 'LLM-as-judge',
        label: { show: true, formatter: '{c}', fontSize: 10, color: labelColor },
      }],
      lineStyle: { color: '#3730a3', width: 2 },
      itemStyle: { color: '#3730a3' },
      areaStyle: { color: 'rgba(55, 48, 163, 0.35)' },
    });
  }

  if (hasHuman) {
    series.push({
      name: 'Human',
      type: 'radar',
      data: [{
        value: KEYS.map((k) => data.human![k] ?? 0),
        name: 'Human',
        label: { show: true, formatter: '{c}', fontSize: 10, color: labelColor },
      }],
      lineStyle: { color: '#a5b4fc', width: 2 },
      itemStyle: { color: '#a5b4fc' },
      areaStyle: { color: 'rgba(165, 180, 252, 0.2)' },
    });
  }

  return {
    title: { text: 'Average Quality Scores', left: 'center', textStyle: { fontSize: 13, fontWeight: 600, color: textColor } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, data: hasHuman ? ['LLM-as-judge', 'Human'] : ['LLM-as-judge'], textStyle: { color: subTextColor } },
    radar: {
      indicator: LABELS.map((name) => ({ name, max: 5 })),
      axisName: { color: labelColor, fontSize: 11 },
      shape: 'polygon',
      radius: '55%',
      splitArea: { areaStyle: { color: 'transparent' } },
      splitLine: { lineStyle: { color: lineColor } },
      axisLine: { lineStyle: { color: lineColor } },
    },
    series,
  };
}

export const SAMPLE_DATA: RadarData = {
  llm: { unambiguous: 3.8, completeness: 4.2, atomicity: 2.5, verifiable: 3.6, conforming: 4.0, overall_score: 3.62 },
  human: { unambiguous: 4.0, completeness: 3.9, atomicity: 3.0, verifiable: 3.8, conforming: 4.2, overall_score: 3.78 },
};

interface Props {
  data: RadarData;
  dark?: boolean;
}

export default function DashboardRadarChart({ data, dark = true }: Props) {
  const option = buildOption(data, dark);
  const subTextColor = dark ? '#9ca3af' : '#6b7280';

  const overallParts: string[] = [];
  if (data.llm) overallParts.push(`LLM: ${data.llm.overall_score}`);
  if (data.human) overallParts.push(`Human: ${data.human.overall_score}`);

  return (
    <div className="flex flex-col h-full">
      <ReactEChartsCore echarts={echarts} option={option} style={{ flex: 1, minHeight: 0 }} />
      {overallParts.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: subTextColor, marginTop: 2 }}>
          Overall Score: {overallParts.join(' / ')}
        </p>
      )}
    </div>
  );
}
