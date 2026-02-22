import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';

const TrafficGraph = ({ maxSpeed = 20 }) => {
    // We store 30 seconds of history
    const [data, setData] = useState(Array(60).fill({ rx: 0, tx: 0 }));
    const [currentSpeed, setCurrentSpeed] = useState({ rx: 0, tx: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            // SIMULATION: Scaled to User Plan
            // Fluctuate between 0 and 80% of Plan Speed
            const newRx = Math.random() * (maxSpeed * 0.8);
            const newTx = Math.random() * (maxSpeed * 0.3);

            setCurrentSpeed({ rx: newRx.toFixed(1), tx: newTx.toFixed(1) });

            setData(prev => {
                const newData = [...prev.slice(1), { rx: newRx, tx: newTx }];
                return newData;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Canvas/Graph Dimensions
    const height = 200;
    const width = 100; // using percentages for SVG viewBox width (conceptually 100%)

    // Helper to converting data to SVG path 'd' string
    // We map data index 0..59 to x=0..100
    // We map value 0..Max to y=height..0
    const maxVal = maxSpeed; // Dynamic scale

    const createPath = (key) => {
        let path = `M 0 ${height} `;

        data.forEach((point, i) => {
            const x = (i / (data.length - 1)) * 1000; // Scale to 1000 units width
            const val = point[key];
            const y = height - (Math.min(val, maxVal) / maxVal) * height;
            path += `L ${x} ${y} `;
        });

        // return path;
        return path;
    };

    const createArea = (key) => {
        let path = createPath(key);
        path += `L 1000 ${height} L 0 ${height} Z`;
        return path;
    };

    return (
        <div className="w-full glass-panel rounded-3xl border border-white/5 p-6 relative overflow-hidden flex flex-col h-[350px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 z-10">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display">
                        <span className="w-2 h-6 bg-primary-500 rounded-full inline-block"></span>
                        Consumo en Tiempo Real
                    </h3>
                    <p className="text-slate-400 text-sm ml-4">Monitor de tráfico (Byte Graph)</p>
                </div>

                {/* Stats Badge */}
                <div className="flex gap-4 bg-black/20 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="text-right px-2 border-r border-white/10">
                        <p className="text-[10px] uppercase text-green-400 font-bold tracking-wider mb-1">Descarga (Rx)</p>
                        <p className="text-white font-mono text-xl font-bold flex items-center justify-end gap-1">
                            {currentSpeed.rx} <span className="text-xs text-slate-500">Mbps</span>
                        </p>
                    </div>
                    <div className="text-right px-2">
                        <p className="text-[10px] uppercase text-blue-400 font-bold tracking-wider mb-1">Subida (Tx)</p>
                        <p className="text-white font-mono text-xl font-bold flex items-center justify-end gap-1">
                            {currentSpeed.tx} <span className="text-xs text-slate-500">Mbps</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Graph Container */}
            <div className="flex-1 relative w-full bg-[#050b1d] rounded-xl border border-white/5 overflow-hidden shadow-inner">
                {/* Custom Grid */}
                <div className="absolute inset-0 z-0" style={{
                    backgroundImage: 'linear-gradient(#ffffff05 1px, transparent 1px), linear-gradient(90deg, #ffffff05 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}></div>

                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                    {/* Definitions for Gradients */}
                    <defs>
                        <linearGradient id="gradRx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Download (Rx) - Green */}
                    <motion.path
                        d={createArea('rx')}
                        fill="url(#gradRx)"
                        stroke="none"
                        animate={{ d: createArea('rx') }}
                        transition={{ ease: "linear", duration: 0.2 }}
                    />
                    <motion.path
                        d={createPath('rx')}
                        fill="none"
                        stroke="#4ade80" // green-400
                        strokeWidth="2"
                        animate={{ d: createPath('rx') }}
                        transition={{ ease: "linear", duration: 0.2 }}
                    />

                    {/* Upload (Tx) - Blue */}
                    <motion.path
                        d={createArea('tx')}
                        fill="url(#gradTx)"
                        stroke="none"
                        animate={{ d: createArea('tx') }}
                        transition={{ ease: "linear", duration: 0.2 }}
                    />
                    <motion.path
                        d={createPath('tx')}
                        fill="none"
                        stroke="#60a5fa" // blue-400
                        strokeWidth="2"
                        animate={{ d: createPath('tx') }}
                        transition={{ ease: "linear", duration: 0.2 }}
                    />
                </svg>

                {/* Y-Axis Labels (Overlay) */}
                <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[10px] text-slate-500 font-mono pointer-events-none">
                    <span>{maxVal} Mbps</span>
                    <span>{(maxVal * 0.75).toFixed(0)} Mbps</span>
                    <span>{(maxVal * 0.5).toFixed(0)} Mbps</span>
                    <span>{(maxVal * 0.25).toFixed(0)} Mbps</span>
                    <span>0 Mbps</span>
                </div>
            </div>
        </div>
    );
};

export default TrafficGraph;
