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
        backgroundColor: '#FFFFFF',
        textColor: '#5C4F3D',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(184, 134, 11, 0.1)' },
        horzLines: { color: 'rgba(184, 134, 11, 0.1)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#EEDBBB',
        textColor: '#5C4F3D',
      },
      timeScale: {
        borderColor: '#EEDBBB',
        textColor: '#5C4F3D',
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#047857',
      downColor: '#B91C1C',
      borderVisible: true,
      borderColor: '#047857',
      borderUpColor: '#047857',
      borderDownColor: '#B91C1C',
      wickUpColor: '#047857',
      wickDownColor: '#B91C1C',
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
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #EEDBBB',
        overflow: 'hidden'
      }} 
    />
  );
};

export default CandleStickChart;
