import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './App.css';

export default function App() {
  const [imported, setImported] = useState(false);
  const [chartData, setChartData] = useState<any>(null);

  const importCsv = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5172';
    try {
      const res = await fetch(`${API_BASE_URL}/api/project/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: 'sales.csv' })
      });
      if (res.ok) {
        setImported(true);
        loadChart();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to import CSV");
    }
  };

  const loadChart = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5172';
    try {
      const res = await fetch(`${API_BASE_URL}/api/chart/line`);
      const data = await res.json();
      setChartData(data);
    } catch (e) {
      console.error(e);
      alert("Failed to load chart data");
    }
  };

  const exportExcel = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5172';
    try {
      const res = await fetch(`${API_BASE_URL}/api/export/line/download`);
      const data = await res.json();
      if (data.download_url) {
        // Remove file:// for typical browser download, though it won't work perfectly in a browser unless served
        // For Milestone 1, just opening the URL will show the path or we can alert it
        alert(`Exported to: ${data.download_url}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to export Excel");
    }
  };

  const chartOptions = useMemo(() => {
    if (!chartData || !chartData.theme_metadata || !chartData.theme_metadata.data) return {};

    const meta = chartData.theme_metadata;
    const xAxisData = meta.data.map((row: any) => row[meta.xAxis]);
    const seriesData = meta.data.map((row: any) => Number(row[meta.yAxis[0]]));

    return {
      title: {
        text: meta.title,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: xAxisData
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: seriesData,
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.2
          }
        }
      ]
    };
  }, [chartData]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>LightBI Milestone 1</h1>
      <p>Proving the first visible analytics slice.</p>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={importCsv} 
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          Import sales.csv
        </button>

        {imported && (
          <button 
            onClick={exportExcel}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Export to Excel
          </button>
        )}
      </div>

      {chartData && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <ReactECharts option={chartOptions} style={{ height: '400px' }} />
        </div>
      )}

      {/* KPI Card */}
      {chartData && chartData.theme_metadata && chartData.theme_metadata.data && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
          <h3>Total Revenue Records</h3>
          <h2 style={{ fontSize: '3rem', margin: 0, color: '#2c3e50' }}>{chartData.theme_metadata.data.length}</h2>
        </div>
      )}
    </div>
  );
}
