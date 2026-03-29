import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

const CandleStickChart = ({ data }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Handle initialization width
    const handleWidth = chartContainerRef.current.clientWidth || 600;

    const chart = createChart(chartContainerRef.current, {
      width: handleWidth,
      height: 400,
      layout: {
        backgroundColor: '#111827',
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    if (data && data.length > 0) {
      series.setData(data);
      chart.timeScale().fitContent();
    }
    
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  return (
    <div 
      ref={chartContainerRef} 
      style={{ 
        width: '100%', 
        height: '400px', 
        position: 'relative',
        backgroundColor: '#111827',
        borderRadius: '8px' 
      }} 
    />
  );
};

export default CandleStickChart;
