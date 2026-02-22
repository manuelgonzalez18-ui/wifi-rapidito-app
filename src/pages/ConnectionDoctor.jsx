import { useState } from 'react';
import api from '../api/client';
import useAuthStore from '../auth/authStore';

const ConnectionDoctor = () => {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const addLog = (msg, type = 'info') => {
        setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    const runDiagnostics = async () => {
        setLogs([]);
        setLoading(true);
        addLog('🚀 Starting Diagnostics...', 'info');

        try {
            // TEST 1: Ping Production via Proxy
            addLog('📡 Test 1: Pinging API via Proxy...', 'info');
            const pingRes = await api.get('/clientes/?limit=1');
            if (pingRes.status === 200) {
                addLog('✅ API Connection: OK', 'success');
                addLog(`ℹ️ Data Sample: ${JSON.stringify(pingRes.data).substring(0, 100)}...`, 'info');
            } else {
                addLog(`❌ API Error: ${pingRes.status}`, 'error');
            }

            if (!user) {
                addLog('⚠️ No User Logged In. Skipping user-specific tests.', 'warning');
                setLoading(false);
                return;
            }

            // TEST 2: Search by User Cedula
            addLog(`🔍 Test 2: Searching Invoice by Cedula: ${user.cedula}`, 'info');
            const cedulaRes = await api.get(`/facturas/?buscar=${user.cedula}`);
            const cedulaResults = cedulaRes.data.results || cedulaRes.data;
            if (Array.isArray(cedulaResults) && cedulaResults.length > 0) {
                addLog(`✅ Found ${cedulaResults.length} invoices by Cedula`, 'success');
            } else {
                addLog('❌ No invoices found by Cedula', 'error');
            }

            // TEST 3: Search by Username
            if (user.usuario) {
                addLog(`👤 Test 3: Searching Invoice by Username: ${user.usuario}`, 'info');
                const userRes = await api.get(`/facturas/?buscar=${user.usuario}`);
                const userResults = userRes.data.results || userRes.data;
                if (Array.isArray(userResults) && userResults.length > 0) {
                    addLog(`✅ Found ${userResults.length} invoices by Username`, 'success');
                    addLog(`📄 Sample: ${JSON.stringify(userResults[0])}`, 'info');
                } else {
                    addLog('❌ No invoices found by Username', 'error');
                }
            }

            // TEST 4: Service ID Check
            addLog(`🆔 Test 4: Checking Service ID: ${user.id_servicio}`, 'info');
            const ticketsRes = await api.get(`/tickets/?servicio=${user.id_servicio}`);
            if (ticketsRes.status === 200) {
                addLog('✅ Tickets Endpoint access OK', 'success');
            }

        } catch (error) {
            addLog(`💀 CRITICAL ERROR: ${error.message}`, 'error');
            if (error.response) {
                addLog(`Response Status: ${error.response.status}`, 'error');
                addLog(`Response Data: ${JSON.stringify(error.response.data)}`, 'error');
            }
        } finally {
            setLoading(false);
            addLog('🏁 Diagnostics Complete', 'info');
        }
    };

    return (
        <div className="p-8 text-white max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-red-400">🚑 Connection Doctor</h1>
            <div className="glass-panel p-6 rounded-xl border border-white/10">
                <p className="mb-4 text-slate-400">
                    User: <strong className="text-white">{user?.name || 'Not Logged In'}</strong><br />
                    Cedula: <strong className="text-white">{user?.cedula}</strong><br />
                    Username: <strong className="text-white">{user?.usuario}</strong>
                </p>
                <button
                    onClick={runDiagnostics}
                    disabled={loading}
                    className={`px-6 py-3 rounded-lg font-bold ${loading ? 'bg-slate-700' : 'bg-red-500 hover:bg-red-400'} transition-colors`}
                >
                    {loading ? 'Running Tests...' : 'Run Diagnostics'}
                </button>
            </div>

            <div className="bg-black/80 p-4 rounded-xl font-mono text-sm h-96 overflow-y-auto border border-white/10">
                {logs.length === 0 ? (
                    <span className="text-slate-600">Waiting to start...</span>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    log.type === 'warning' ? 'text-amber-400' :
                                        'text-blue-300'
                            }`}>
                            <span className="text-slate-500">[{log.time}]</span> {log.msg}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ConnectionDoctor;
