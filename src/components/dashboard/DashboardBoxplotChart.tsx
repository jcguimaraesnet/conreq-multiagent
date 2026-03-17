"use client";

import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BoxplotChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BoxplotChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

export interface BoxplotAttempt {
  attempt: number;
  type: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface BoxplotData {
  attempts: BoxplotAttempt[];
  has_human: boolean;
}

const LLM_COLORS: Record<number, { fill: string; border: string }> = {
  1: { fill: '#c7d2fe', border: '#a5b4fc' },
  2: { fill: '#6366f1', border: '#818cf8' },
  3: { fill: '#3730a3', border: '#4f46e5' },
};

const HUMAN_COLORS: Record<number, { fill: string; border: string }> = {
  1: { fill: '#d1fae5', border: '#6ee7b7' },
  2: { fill: '#34d399', border: '#10b981' },
  3: { fill: '#065f46', border: '#047857' },
};

function buildOption(data: BoxplotData, dark: boolean): echarts.EChartsCoreOption {
  const hasHuman = data.has_human;
  const attempts = [...new Set(data.attempts.map((a) => a.attempt))].sort();
  const textColor = dark ? '#e5e7eb' : '#1f2937';
  const labelColor = dark ? '#d1d5db' : '#374151';
  const lineColor = dark ? '#374151' : '#d1d5db';
  const splitColor = dark ? '#1f2937' : '#f3f4f6';

  const categories: string[] = [];
  const boxData: any[] = [];

  for (const att of attempts) {
    const llm = data.attempts.find((a) => a.attempt === att && a.type === 'llm');
    const human = data.attempts.find((a) => a.attempt === att && a.type === 'human');

    if (hasHuman) {
      categories.push(`Att ${att} LLM`);
      boxData.push(
        llm
          ? { value: [llm.min, llm.q1, llm.median, llm.q3, llm.max], itemStyle: { color: LLM_COLORS[att]?.fill ?? '#6366f1', borderColor: LLM_COLORS[att]?.border ?? '#818cf8' } }
          : { value: [0, 0, 0, 0, 0], itemStyle: { color: 'transparent', borderColor: 'transparent' } }
      );
      categories.push(`Att ${att} Human`);
      boxData.push(
        human
          ? { value: [human.min, human.q1, human.median, human.q3, human.max], itemStyle: { color: HUMAN_COLORS[att]?.fill ?? '#34d399', borderColor: HUMAN_COLORS[att]?.border ?? '#10b981' } }
          : { value: [0, 0, 0, 0, 0], itemStyle: { color: 'transparent', borderColor: 'transparent' } }
      );
    } else {
      categories.push(`Attempt ${att}`);
      boxData.push(
        llm
          ? { value: [llm.min, llm.q1, llm.median, llm.q3, llm.max], itemStyle: { color: LLM_COLORS[att]?.fill ?? '#6366f1', borderColor: LLM_COLORS[att]?.border ?? '#818cf8' } }
          : { value: [0, 0, 0, 0, 0], itemStyle: { color: 'transparent', borderColor: 'transparent' } }
      );
    }
  }

  return {
    title: { text: 'Score Distribution by Attempt', left: 'center', textStyle: { fontSize: 13, fontWeight: 600, color: textColor } },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const v = params.value ?? params.data?.value;
        if (!v) return '';
        const name = params.name || categories[params.dataIndex] || '';
        return `${name}<br/>Max: ${v[4]}<br/>Q3: ${v[3]}<br/>Median: ${v[2]}<br/>Q1: ${v[1]}<br/>Min: ${v[0]}`;
      },
    },
    grid: { left: 50, right: 20, top: 50, bottom: 40 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: labelColor, fontSize: 10, rotate: hasHuman ? 20 : 0 },
      axisLine: { lineStyle: { color: lineColor } },
    },
    yAxis: {
      type: 'value',
      min: 1,
      max: 5,
      axisLabel: { color: labelColor },
      axisLine: { lineStyle: { color: lineColor } },
      splitLine: { lineStyle: { color: splitColor } },
    },
    series: [{
      name: 'Overall Score',
      type: 'boxplot',
      data: boxData,
    }],
  };
}

export const SAMPLE_DATA: BoxplotData = {
  attempts: [
    { attempt: 1, type: 'llm', min: 1.4, q1: 2.0, median: 2.6, q3: 3.2, max: 4.0 },
    { attempt: 1, type: 'human', min: 1.6, q1: 2.2, median: 2.8, q3: 3.4, max: 4.2 },
    { attempt: 2, type: 'llm', min: 2.0, q1: 2.8, median: 3.4, q3: 4.0, max: 4.6 },
    { attempt: 2, type: 'human', min: 2.2, q1: 3.0, median: 3.6, q3: 4.2, max: 4.8 },
    { attempt: 3, type: 'llm', min: 2.6, q1: 3.4, median: 3.8, q3: 4.4, max: 5.0 },
    { attempt: 3, type: 'human', min: 2.8, q1: 3.6, median: 4.0, q3: 4.6, max: 5.0 },
  ],
  has_human: true,
};

interface Props {
  data: BoxplotData;
  dark?: boolean;
}

export default function DashboardBoxplotChart({ data, dark = true }: Props) {
  return <ReactEChartsCore echarts={echarts} option={buildOption(data, dark)} style={{ width: '100%', height: '100%' }} />;
}
