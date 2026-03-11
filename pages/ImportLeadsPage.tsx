import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, ArrowRight, Play, Lightbulb, Download, FileText, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { AppView } from '../constants';

interface ImportLeadsPageProps {
    onNavigate?: (view: AppView) => void;
}

export const ImportLeadsPage: React.FC<ImportLeadsPageProps> = ({ onNavigate }) => {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<'upload' | 'processing' | 'success'>('upload');
    const [progress, setProgress] = useState(0);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importHistory, setImportHistory] = useState<any[]>([]);
    const [importStatus, setImportStatus] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const history = localStorage.getItem('@LeadsPremium:importHistory');
        if (history) {
            setImportHistory(JSON.parse(history));
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const fileName = selectedFile.name.toLowerCase();

        if (fileName.endsWith('.csv')) {
            // Handle CSV with PapaParse
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim(),
                complete: (results) => {
                    processResults(results.data, results.meta.fields || []);
                },
                error: (error) => {
                    console.error('Papa.parse error:', error);
                    alert(`Erro ao processar o arquivo CSV: ${error.message}`);
                }
            });
        } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
            // Handle Excel with xlsx library
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (json.length > 0) {
                    const headers = (json[0] as string[]).map(h => String(h).trim());
                    const rows = json.slice(1).map(row => {
                        const obj: any = {};
                        headers.forEach((h, i) => {
                            obj[h] = (row as any)[i];
                        });
                        return obj;
                    });
                    processResults(rows, headers);
                } else {
                    alert('O arquivo Excel está vazio.');
                }
            };
            reader.onerror = (err) => {
                console.error('FileReader error:', err);
                alert('Erro ao ler o arquivo Excel.');
            };
            reader.readAsArrayBuffer(selectedFile);
        } else {
            alert('Formato de arquivo não suportado. Use CSV ou Excel (.xls, .xlsx)');
        }
    };

    const processResults = (data: any[], fields: string[]) => {
        if (!fields || fields.length === 0) {
            alert('Nenhuma coluna encontrada no arquivo. Verifique se o cabeçalho está correto.');
            return;
        }

        setCsvHeaders(fields);
        setCsvData(data);
        
        setCsvHeaders(fields);
        setCsvData(data);
        
        // No longer need mapping state, logic is now inside handleProcess
        setStep('processing');
    };

    // Trigger handleProcess automatically when in processing step and data is ready
    useEffect(() => {
        if (step === 'processing' && csvData.length > 0 && progress === 0) {
            handleProcess();
        }
    }, [step, csvData.length]);

    const parseNumericValue = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        
        // Convert Brazilian format "R$ 1.234,56" or "1.234,56" to "1234.56"
        const clean = String(val)
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^-0-9.]/g, '')
            .trim();
            
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleProcess = async () => {
        setStep('processing');
        setProgress(0);
        setImportStatus('Iniciando...');
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada. Por favor, faça login novamente.');
            
            const user = session.user;
            const total = csvData.length;
            if (total === 0) throw new Error('Nenhum dado para importar.');

            setImportStatus(`Preparando ${total} leads...`);

            let successCount = 0;
            
            const batchSize = 10;
            for (let i = 0; i < total; i += batchSize) {
                const batch = csvData.slice(i, i + batchSize);
                
                const formattedBatch = batch.map((row: any) => {
                    const mappedRow: any = {
                        user_id: user.id,
                        status: 'new', // default status
                        created_at: new Date().toISOString()
                    };
                    
                    // User Rule: 1=Name, 2=Email, 3=Phone, 4=Patrimonio
                    csvHeaders.forEach((header, index) => {
                        const value = row[header];
                        if (value === undefined || value === null) return;

                        if (index === 0) mappedRow.name = value;
                        else if (index === 1) mappedRow.email = value;
                        else if (index === 2) mappedRow.phone = value;
                        else if (index === 3) mappedRow.value = parseNumericValue(value);
                        else if (index === 4) mappedRow.company = value;
                    });
                    
                    if (!mappedRow.name) mappedRow.name = 'Lead Sem Nome';
                    
                    return mappedRow;
                });

                console.log(`Enviando lote ${Math.floor(i/batchSize) + 1}...`);
                setImportStatus(`Enviando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(total/batchSize)}...`);
                
                const { error } = await supabase.from('leads').insert(formattedBatch);
                if (error) {
                    console.error('Erro no Supabase durante o insert:', error);
                    throw new Error(`Erro no banco de dados: ${error.message} (Código: ${error.code})`);
                }
                successCount += formattedBatch.length;
                
                setProgress(Math.round(((i + batchSize) / total) * 100));
            }
            
            setProgress(100);
            
            // Add to history
            const newHistoryItem = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                fileName: file?.name || 'importacao.csv',
                count: successCount,
                status: successCount === total ? 'success' : 'warning'
            };
            
            const updatedHistory = [newHistoryItem, ...importHistory];
            setImportHistory(updatedHistory);
            localStorage.setItem('@LeadsPremium:importHistory', JSON.stringify(updatedHistory));
            
            setTimeout(() => setStep('success'), 500);
            
        } catch (error: any) {
            console.error('Import error:', error);
            alert(`Erro ao importar leads: ${error.message || 'Tente novamente.'}`);
            setStep('upload');
            setFile(null);
            setProgress(0);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 h-full bg-background-light dark:bg-background-dark">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Importar Leads</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Carregue sua base de contatos para iniciar o fluxo de atendimento.</p>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        Ver Tutorial
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border ${step === 'upload' ? 'border-primary dark:border-primary' : 'border-slate-200 dark:border-slate-800'} p-6 md:p-8 transition-colors`}>
                            {step === 'upload' ? (
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        type="file" 
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                        onChange={handleFileChange}
                                    />
                                    <div className="border-2 border-dashed border-primary/30 group-hover:border-primary/60 dark:border-primary/20 dark:group-hover:border-primary/50 bg-primary/5 dark:bg-primary/5 rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            {file ? <FileText className="text-3xl text-primary" /> : <UploadCloud className="text-3xl text-primary" />}
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                                            {file ? file.name : 'Arraste seu arquivo CSV ou Excel aqui'}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                            Clique para selecionar do seu computador
                                        </p>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            Máx. 10MB (CSV, XLS, XLSX)
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <FileText className="text-primary" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">{file?.name}</h3>
                                                <p className="text-xs text-slate-500">{csvData.length} leads identificados</p>
                                            </div>
                                        </div>
                                        {step === 'success' ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                <CheckCircle size={14} className="mr-1" /> Concluído
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary animate-pulse">
                                                Importando...
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">{importStatus}</span>
                                            <span className="text-primary font-bold text-lg">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <div 
                                                className={`h-full transition-all duration-500 ease-out ${step === 'success' ? 'bg-emerald-500' : 'bg-primary'}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {step === 'success' ? (
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button 
                                                onClick={() => onNavigate?.('leads')}
                                                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={20} />
                                                Ver Leads Importados
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setStep('upload');
                                                    setFile(null);
                                                    setProgress(0);
                                                    setCsvData([]);
                                                }}
                                                className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                            >
                                                Nova Importação
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0"></div>
                                            <p className="text-xs text-primary font-medium">
                                                Estamos processando seu arquivo seguindo a ordem: Nome, Email, Telefone e Patrimônio. Não feche esta janela.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sticky top-6">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Lightbulb className="text-orange-500" size={18} />
                                Instruções
                            </h3>
                            <ul className="space-y-4 mb-6">
                                <li className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">O arquivo deve estar no formato <span className="font-medium text-slate-900 dark:text-white">CSV</span> ou <span className="font-medium text-slate-900 dark:text-white">Excel</span>.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">A primeira linha deve conter o <span className="font-medium text-slate-900 dark:text-white">cabeçalho</span> das colunas.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">Use codificação <span className="font-medium text-slate-900 dark:text-white">UTF-8</span> para evitar erros.</p>
                                </li>
                            </ul>
                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-xs text-slate-500 mb-3">Precisa de um exemplo?</p>
                                <button className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-primary/40 text-primary hover:bg-primary/5 rounded-lg font-medium text-sm transition-colors">
                                    <Download size={18} />
                                    Baixar Modelo.xlsx
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Histórico de Importações</h3>
                        <button className="text-primary hover:text-primary-dark text-sm font-medium">Ver todos</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Arquivo</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd. Leads</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {importHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Nenhuma importação realizada ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    importHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                <FileText size={16} className="text-slate-400" />
                                                {item.fileName}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{item.count}</td>
                                            <td className="px-6 py-4">
                                                {item.status === 'success' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                                                        Sucesso
                                                    </span>
                                                ) : item.status === 'warning' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
                                                        Parcial
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                                                        Erro
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm"><button className="text-primary font-medium">Detalhes</button></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
