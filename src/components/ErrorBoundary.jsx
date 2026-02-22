import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-red-500/50 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-red-500/20 rounded-full">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Algo salió mal</h1>
                                <p className="text-slate-400">La aplicación ha encontrado un error inesperado.</p>
                            </div>
                        </div>

                        <div className="bg-black/50 rounded-xl p-4 mb-6 overflow-auto max-h-64 border border-white/10">
                            <p className="text-red-400 font-mono font-bold mb-2">
                                {this.state.error && this.state.error.toString()}
                            </p>
                            <pre className="text-slate-500 text-xs font-mono whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Recargar Página
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = '/login';
                                }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/10"
                            >
                                Cerrar Sesión (Reset)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
