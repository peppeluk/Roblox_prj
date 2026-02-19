import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

function RedditivitaTrendChart({ labels, targetSeries, projectedSeries, actualSeries }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Target",
            data: targetSeries,
            borderColor: "#0f172a",
            backgroundColor: "rgba(15, 23, 42, 0.08)",
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 2
          },
          {
            label: "Proiezione",
            data: projectedSeries,
            borderColor: "#0369a1",
            backgroundColor: "rgba(3, 105, 161, 0.08)",
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 2
          },
          {
            label: "Reale YTD",
            data: actualSeries,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22, 163, 74, 0.08)",
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 2,
            spanGaps: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return `${Math.round(value).toLocaleString("it-IT")} EUR`;
              }
            }
          }
        },
        plugins: {
          legend: {
            position: "top"
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [labels, targetSeries, projectedSeries, actualSeries]);

  return (
    <div className="h-72 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

export default RedditivitaTrendChart;
