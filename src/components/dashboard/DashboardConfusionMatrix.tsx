"use client";

import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([HeatmapChart, TitleComponent, TooltipComponent, GridComponent, VisualMapComponent, CanvasRenderer]);

export interface ConfusionData {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

function buildOption(data: ConfusionData, dark: boolean): echarts.EChartsCoreOption {
  const xLabels = ['Predicted\nNegative', 'Predicted\nPositive'];
  const yLabels = ['Actual\nPositive', 'Actual\nNegative'];
  const textColor = dark ? '#e5e7eb' : '#1f2937';
  const labelColor = dark ? '#d1d5db' : '#374151';
  const lineColor = dark ? '#374151' : '#d1d5db';
  const cellBorder = dark ? '#111827' : '#ffffff';
  const cellTextColor = dark ? '#e5e7eb' : '#1f2937';

  const heatmapData = [
    [0, 1, data.tn],
    [1, 1, data.fp],
    [0, 0, data.fn],
    [1, 0, data.tp],
  ];

  const maxVal = Math.max(data.tp, data.fp, data.fn, data.tn, 1);

  return {
    title: { text: 'Confusion Matrix (LLM vs Human)', left: 'center', textStyle: { fontSize: 13, fontWeight: 600, color: textColor } },
    tooltip: {
      formatter: (params: { data: number[] }) => {
        const [x, y, val] = params.data;
        const label = y === 1
          ? (x === 0 ? 'TN' : 'FP')
          : (x === 0 ? 'FN' : 'TP');
        return `${label}: ${val}`;
      },
    },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { color: labelColor, fontSize: 11 },
      axisLine: { lineStyle: { color: lineColor } },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      axisLabel: { color: labelColor, fontSize: 11 },
      axisLine: { lineStyle: { color: lineColor } },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: false,
      show: false,
      inRange: {
        color: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
      },
    },
    series: [{
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: true,
        fontSize: 16,
        fontWeight: 'bold',
        color: cellTextColor,
        formatter: (params: { data: number[] }) => `${params.data[2]}`,
      },
      itemStyle: { borderColor: cellBorder, borderWidth: 2 },
    }],
  };
}

export const SAMPLE_DATA: ConfusionData = { tp: 12, fp: 3, fn: 5, tn: 20 };

interface Props {
  data: ConfusionData;
  dark?: boolean;
}

export default function DashboardConfusionMatrix({ data, dark = true }: Props) {
  return <ReactEChartsCore echarts={echarts} option={buildOption(data, dark)} style={{ width: '100%', height: '100%' }} />;
}
