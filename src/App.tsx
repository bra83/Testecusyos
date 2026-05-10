/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  Package, 
  Target, 
  Settings2,
  Info,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Search,
  Calculator,
  LayoutDashboard,
  Scale,
  Table,
  X,
  AlertTriangle,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CATEGORIES, 
  AdType, 
  Category, 
  SHIPPING_RATES, 
  ML_FIXED_FEE_AMOUNT, 
  ML_FIXED_FEE_LIMIT,
  Marketplace,
  AMAZON_CATEGORIES,
  AMAZON_FBA_TIERS
} from './constants';
import { calculatePrice, PricingInput, PricingResult } from './lib/pricing-engine';

interface SKUItem {
  id: string;
  name: string;
  cost: number;
  categoryId: string;
  adType: AdType;
  adsPercent: number;
  fulfillment: number;
  taxPercent: number;
  targetMarginPercent: number;
  shipping: number;
  marketplace: Marketplace;
  amazonTierId?: string;
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<Marketplace>('mercadolivre');
  const location = useLocation();
  
  // Normalizing pathname for HashRouter sub-routes if needed
  const currentPath = location.pathname;
  
  const [skus, setSkus] = useState<SKUItem[]>([
    {
      id: '1',
      name: 'Exemplo de Produto 1',
      cost: 50,
      categoryId: 'casa_moveis',
      adType: 'classico',
      adsPercent: 5,
      fulfillment: 0,
      taxPercent: 4,
      targetMarginPercent: 20,
      shipping: 0,
      marketplace: 'mercadolivre'
    }
  ]);

  const [globalTax, setGlobalTax] = useState(4);
  const [globalAds, setGlobalAds] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [comparingSku, setComparingSku] = useState<SKUItem | null>(null);
  const [simParams, setSimParams] = useState({
    cost: 100,
    margin: 20,
    adType: 'classico' as AdType,
    shipping: 0
  });

  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar, clique nos três pontinhos do seu navegador (Chrome) ou no botão de Compartilhar (Safari) e escolha "Adicionar à tela de início".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredSkus.length === 0) return;

    const headers = [
      'ID', 
      'Nome', 
      'Custo (R$)', 
      'Marketplace', 
      'Tipo Anúncio', 
      'Imposto (%)', 
      'Ads (%)', 
      'Margem Alvo (%)', 
      'Preço de Venda (R$)', 
      'Lucro Líquido (R$)', 
      'Margem Real (%)',
      'Categoria ID',
      'Fulfillment (R$)',
      'Frete (R$)',
      'Amazon Tier ID'
    ];
    
    const rows = filteredSkus.map(sku => {
      const category = CATEGORIES.find(c => c.id === sku.categoryId) || CATEGORIES[0];
      const result = calculatePrice({ ...sku, category, marketplace: sku.marketplace });
      
      return [
        sku.id,
        sku.name,
        sku.cost.toFixed(2),
        sku.marketplace,
        sku.adType,
        sku.taxPercent,
        sku.adsPercent,
        sku.targetMarginPercent,
        result.salePrice.toFixed(2),
        result.netProfit.toFixed(2),
        result.realMarginPercent.toFixed(1),
        sku.categoryId,
        sku.fulfillment.toFixed(2),
        sku.shipping.toFixed(2),
        sku.amazonTierId || ''
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `precificador_pro_export_${activeTab}_${new Date().toLocaleDateString('pt-BR')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;

        if (typeof text !== 'string') {
          console.error('CSV inválido');
          return;
        }

        const lines = text
          .replace(/\r/g, '')
          .split('\n')
          .filter(line => line.trim() !== '');

        if (lines.length < 2) {
          console.error('CSV vazio');
          return;
        }

        const headers = lines[0]
          .replace('\uFEFF', '')
          .split(';')
          .map(h => h.trim());

        const newSkus: SKUItem[] = [...skus];

        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i];

            if (!line || !line.trim()) continue;

            const values = line.split(';');

            const getVal = (headerName: string): string => {
              const index = headers.findIndex(
                h => h.trim() === headerName
              );

              if (index === -1) return '';

              return values[index]?.trim() || '';
            };

            const parseNum = (val?: string) => {
              if (!val) return 0;

              const parsed = Number(
                val
                  .replace(/\./g, '')
                  .replace(',', '.')
              );

              return isNaN(parsed) ? 0 : parsed;
            };

            const marketplace = (
              getVal('Marketplace') || activeTab
            ) as Marketplace;

            const categoryId =
              getVal('Categoria ID') ||
              (
                marketplace === 'mercadolivre'
                  ? 'casa_moveis'
                  : marketplace === 'amazon'
                  ? 'casa'
                  : 'geral'
              );

            const importedSku: SKUItem = {
              id:
                getVal('ID') ||
                Math.random().toString(36).substr(2, 9),

              name:
                getVal('Nome') || `Importado ${i}`,

              cost: parseNum(getVal('Custo (R$)')),

              marketplace,

              adType: (
                getVal('Tipo Anúncio') || 'classico'
              ) as AdType,

              taxPercent: parseNum(
                getVal('Imposto (%)')
              ),

              adsPercent: parseNum(
                getVal('Ads (%)')
              ),

              targetMarginPercent: parseNum(
                getVal('Margem Alvo (%)')
              ),

              categoryId,

              fulfillment: parseNum(
                getVal('Fulfillment (R$)')
              ),

              shipping: parseNum(
                getVal('Frete (R$)')
              ),

              amazonTierId:
                getVal('Amazon Tier ID') || undefined
            };

            const existingIndex = newSkus.findIndex(
              s => s.id === importedSku.id
            );

            if (existingIndex !== -1) {
              newSkus[existingIndex] = importedSku;
            } else {
              newSkus.push(importedSku);
            }
          } catch (lineError) {
            console.error(
              `Erro ao processar linha ${i + 1}`,
              lineError
            );
          }
        }

        setSkus(newSkus);

        if (event.target) {
          event.target.value = '';
        }
      } catch (error) {
        console.error('Erro ao processar CSV:', error);
      }
    };

    reader.onerror = () => {
      console.error('Erro ao ler arquivo CSV');
    };

    reader.readAsText(file, 'UTF-8');
  } catch (error) {
    console.error('Erro geral CSV:', error);
  }
};

  const handleBatchUpdateMargin = (newMargin: number) => {
    const updatedSkus = skus.map(s => {
      if (s.marketplace === activeTab && s.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return { ...s, targetMarginPercent: newMargin };
      }
      return s;
    });
    setSkus(updatedSkus);
    setIsBatchEditOpen(false);
  };

  const addSKU = () => {
    const newSku: SKUItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Novo SKU ${skus.length + 1}`,
      cost: simParams.cost,
      categoryId: activeTab === 'mercadolivre' ? 'casa_moveis' : (activeTab === 'amazon' ? 'casa' : 'geral'),
      adType: simParams.adType,
      adsPercent: globalAds,
      fulfillment: activeTab === 'amazon' && simParams.adType === 'premium' ? AMAZON_FBA_TIERS[0].cost : 0,
      amazonTierId: activeTab === 'amazon' && simParams.adType === 'premium' ? AMAZON_FBA_TIERS[0].id : undefined,
      taxPercent: globalTax,
      targetMarginPercent: simParams.margin,
      shipping: simParams.shipping,
      marketplace: activeTab
    };
    setSkus([...skus, newSku]);
  };

  const removeSKU = (id: string) => {
    setSkus(skus.filter(s => s.id !== id));
  };

  const updateSKU = (id: string, updates: Partial<SKUItem>) => {
    setSkus(skus.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const filteredSkus = useMemo(() => {
    return skus.filter(s => 
      s.marketplace === activeTab && 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skus, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const marketplaceSkus = skus.filter(s => s.marketplace === activeTab);
    const calculated = marketplaceSkus.map(s => {
      const category = CATEGORIES.find(c => c.id === s.categoryId) || CATEGORIES[0];
      return calculatePrice({
        ...s,
        category,
        marketplace: activeTab
      });
    });

    const totalRevenue = calculated.reduce((acc, curr) => acc + curr.salePrice, 0);
    const totalProfit = calculated.reduce((acc, curr) => acc + curr.netProfit, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalProfit, avgMargin };
  }, [skus, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-x-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 md:h-16 bg-slate-900 text-white flex items-center justify-between px-3 md:px-6 shrink-0 z-50">
        <div className="flex items-center gap-2 md:gap-8 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xl transition-colors duration-500 shrink-0 ${
              activeTab === 'mercadolivre' ? 'bg-yellow-400 text-black' : 
              activeTab === 'shopee' ? 'bg-orange-500' : 
              'bg-yellow-500 text-black'
            }`}>P</div>
            <span className="text-sm md:text-xl font-bold tracking-tight uppercase truncate">Precificador<span className={`${
              activeTab === 'mercadolivre' ? 'text-yellow-400' : 
              activeTab === 'shopee' ? 'text-orange-400' : 
              'text-yellow-500'
            }`}>Pro</span></span>
          </div>
          <div className="hidden xl:flex gap-6 text-sm font-medium text-slate-300">
            <Link to="/" className={`pb-5 pt-5 transition-colors ${
              currentPath === '/' ? 'text-white border-b-2 ' + (
                activeTab === 'mercadolivre' ? 'border-yellow-400' : 
                activeTab === 'shopee' ? 'border-orange-500' : 
                'border-yellow-500'
              ) : 'opacity-60 hover:text-white'
            }`}>Dashboard</Link>
            <Link to="/manager" className={`pb-5 pt-5 transition-colors ${
              currentPath === '/manager' ? 'text-white border-b-2 ' + (
                activeTab === 'mercadolivre' ? 'border-yellow-400' : 
                activeTab === 'shopee' ? 'border-orange-500' : 
                'border-yellow-500'
              ) : 'opacity-60 hover:text-white'
            }`}>Manager</Link>
            <Link to="/settings" className={`pb-5 pt-5 transition-colors ${
              currentPath === '/settings' ? 'text-white border-b-2 ' + (
                activeTab === 'mercadolivre' ? 'border-yellow-400' : 
                activeTab === 'shopee' ? 'border-orange-500' : 
                'border-yellow-500'
              ) : 'opacity-60 hover:text-white'
            }`}>Settings</Link>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 overflow-x-auto no-scrollbar max-w-[150px] sm:max-w-none">
            <button 
              onClick={() => setActiveTab('mercadolivre')}
              className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-2 shrink-0 ${activeTab === 'mercadolivre' ? 'bg-yellow-400 text-black shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white'}`}
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black"></div>
              <span className="hidden xs:inline">Mercado Livre</span>
              <span className="xs:hidden">ML</span>
            </button>
            <button 
              onClick={() => setActiveTab('shopee')}
              className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-2 shrink-0 ${activeTab === 'shopee' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></div>
              <span className="hidden xs:inline">Shopee</span>
              <span className="xs:hidden">SH</span>
            </button>
            <button 
              onClick={() => setActiveTab('amazon')}
              className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-2 shrink-0 ${activeTab === 'amazon' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black"></div>
              <span className="hidden xs:inline">Amazon</span>
              <span className="xs:hidden">AZ</span>
            </button>
          </div>
          <div className="text-right hidden lg:block">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Workspace</p>
            <p className="text-sm font-semibold text-white">
              {activeTab === 'mercadolivre' ? 'Mercado Livre v2025' : 
               activeTab === 'shopee' ? 'Shopee Maio 2026' : 'Amazon Brasil Full'}
            </p>
          </div>
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-2 rounded-lg text-[10px] font-black transition-all shadow-lg active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Instalar App</span>
          </button>
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-black shadow-inner transition-colors duration-500 shrink-0 ${
            activeTab === 'mercadolivre' ? 'bg-yellow-400 border-yellow-600 text-black' : 
            activeTab === 'shopee' ? 'bg-orange-950 border-orange-800 text-orange-400' :
            'bg-yellow-500 border-yellow-600 text-black'
          }`}>
            {activeTab === 'mercadolivre' ? 'ML' : activeTab === 'shopee' ? 'SH' : 'AM'}
          </div>
        </div>
      </nav>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 md:p-4 overflow-y-auto lg:overflow-hidden lg:h-[calc(100vh-64px)] custom-scrollbar">
        <Routes>
          <Route path="/" element={
            <>
              {/* Sidebar / Configuration */}
              <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Global Performance Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm shrink-0">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Global Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.avgMargin.toFixed(1)}%</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Média Margem</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-green-600 tracking-tight">R$ {stats.totalProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Lucro Est.</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Engine / Global Controls */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Vantagem Competitiva</h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'mercadolivre' ? 'bg-yellow-100 text-yellow-800' : activeTab === 'shopee' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-50 text-yellow-700'}`}>LIVE API</span>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Busca Rápida</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                        <input 
                          type="text" 
                          placeholder="Filtrar SKUs..."
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none transition-all shadow-sm ${
                            activeTab === 'mercadolivre' ? 'focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400' : 
                            activeTab === 'shopee' ? 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500' : 
                            'focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500'
                          }`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Imp. Global (%)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          className={`w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none transition-all shadow-sm ${
                            activeTab === 'mercadolivre' ? 'focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400' : 
                            activeTab === 'shopee' ? 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500' : 
                            'focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500'
                          }`}
                          value={globalTax}
                          onChange={(e) => setGlobalTax(Math.max(0, Math.min(100, Number(e.target.value))))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ads Global (%)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          className={`w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none transition-all shadow-sm ${
                            activeTab === 'mercadolivre' ? 'focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400' : 
                            activeTab === 'shopee' ? 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500' : 
                            'focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500'
                          }`}
                          value={globalAds}
                          onChange={(e) => setGlobalAds(Math.max(0, Math.min(100, Number(e.target.value))))}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={addSKU}
                      className={`w-full py-3.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                        activeTab === 'mercadolivre' ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/10' : 
                        activeTab === 'shopee' ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/20' : 
                        'bg-yellow-600 hover:bg-yellow-700 text-black shadow-yellow-600/20'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Novo SKU Manager
                    </button>
                  </div>
                </div>

                {/* Quick Pricing Simulator */}
                <div className={`rounded-xl p-6 text-white shadow-xl transition-colors duration-500 ${
                  activeTab === 'mercadolivre' ? 'bg-yellow-500 text-black shadow-yellow-200' : 
                  activeTab === 'shopee' ? 'bg-orange-600 shadow-orange-200' :
                  'bg-zinc-900 border border-yellow-500/30'
                }`}>
                  <div className="flex items-center gap-3 mb-5 border-b border-white/20 pb-4">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Simulador Comparativo</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/70 mb-2">Nome do Produto</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Teclado Mecânico RGB"
                        className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                        id="sim-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/70 mb-2">Custo SKU (R$)</label>
                        <input 
                          type="number" 
                          value={simParams.cost}
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
                          onChange={(e) => setSimParams({ ...simParams, cost: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/70 mb-2">Margem (%)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          value={simParams.margin}
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
                          onChange={(e) => setSimParams({ ...simParams, margin: Math.max(0, Math.min(100, Number(e.target.value))) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-white/70 mb-2">Tipo de Anúncio</label>
                          <select 
                            value={simParams.adType}
                            onChange={(e) => setSimParams({ ...simParams, adType: e.target.value as AdType })}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none"
                          >
                            <option value="classico" className="text-slate-900">Standard / Clássico</option>
                            <option value="premium" className="text-slate-900">Premium / FBA / Full</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-white/70 mb-2">Custo Envio (R$)</label>
                          <input 
                            type="number"
                            value={simParams.shipping}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
                            onChange={(e) => setSimParams({ ...simParams, shipping: Number(e.target.value) })}
                          />
                      </div>
                    </div>

                    {/* Comparison Result Preview */}
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                      <p className="text-[8px] font-black uppercase text-white/40 mb-1">Lucro Estimado por Unidade:</p>
                      <SimulationPreview 
                        cost={simParams.cost} 
                        margin={simParams.margin} 
                        adType={simParams.adType}
                        shipping={simParams.shipping}
                        globalTax={globalTax} 
                        globalAds={globalAds} 
                      />
                    </div>

                    <button 
                      onClick={() => {
                        const nameInput = document.getElementById('sim-name') as HTMLInputElement;
                        const name = nameInput.value || `Novo SKU ${skus.length + 1}`;
                        
                        const newSku: SKUItem = {
                          id: Math.random().toString(36).substr(2, 9),
                          name: name,
                          cost: simParams.cost,
                          categoryId: activeTab === 'mercadolivre' ? 'casa_moveis' : (activeTab === 'amazon' ? 'casa' : 'geral'),
                          adType: simParams.adType,
                          adsPercent: globalAds,
                          fulfillment: activeTab === 'amazon' && simParams.adType === 'premium' ? AMAZON_FBA_TIERS[0].cost : 0,
                          amazonTierId: activeTab === 'amazon' && simParams.adType === 'premium' ? AMAZON_FBA_TIERS[0].id : undefined,
                          taxPercent: globalTax,
                          targetMarginPercent: simParams.margin,
                          shipping: simParams.shipping,
                          marketplace: activeTab
                        };
                        setSkus([...skus, newSku]);
                        nameInput.value = '';
                      }}
                      className={`w-full py-3 bg-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors shadow-lg ${
                        activeTab === 'mercadolivre' ? 'text-black hover:bg-yellow-100' : 
                        activeTab === 'shopee' ? 'text-orange-600 hover:bg-orange-50' :
                        'text-zinc-900 hover:bg-yellow-50'
                      }`}
                    >
                      Adicionar ao {activeTab === 'mercadolivre' ? 'ML' : activeTab === 'shopee' ? 'Shopee' : 'Amazon'}
                    </button>
                  </div>
                </div>
              </aside>

              {/* Main Dashboard Area */}
              <main className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0 pb-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
                  <SummaryCard 
                    label="Faturamento Estimado" 
                    value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subValue="Baseado em 1 unidade/SKU"
                    accent={activeTab === 'mercadolivre' ? 'black' : activeTab === 'shopee' ? 'orange' : 'yellow'}
                  />
                  <SummaryCard 
                    label="Lucro Líquido Total" 
                    value={`R$ ${stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subValue="Receita total - Despesas"
                    accent="green"
                  />
                  <SummaryCard 
                    label="Margem Média Geral" 
                    value={`${stats.avgMargin.toFixed(2)}%`}
                    subValue="Eficiência do catálogo"
                    accent="slate"
                  />
                  <SummaryCard 
                    label="Total de SKUs" 
                    value={`${skus.filter(s => s.marketplace === activeTab).length}`}
                    subValue="Produtos em análise"
                    accent="slate"
                  />
                </div>

                {/* Table Content */}
                <section className="bg-white col-span-1 lg:col-span-9 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[500px] lg:overflow-hidden h-full">
                  <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10 shrink-0">
                    <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 shrink-0">
                      <LayoutDashboard className={`w-4 h-4 mr-1 ${activeTab === 'mercadolivre' ? 'text-black font-black' : 'text-orange-600'}`} />
                      <span className="truncate">Lista de SKU {activeTab === 'mercadolivre' ? 'Mercado Livre' : activeTab === 'shopee' ? 'Shopee' : 'Amazon'}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-1.5 bg-green-500/10 px-2 md:px-3 py-1.5 rounded-full border border-green-500/20 shrink-0">
                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[8px] md:text-[10px] font-black text-green-700 uppercase tracking-widest whitespace-nowrap">Cálculos Auditados 2026</span>
                      </div>
                      <div className="flex gap-2 flex-1 sm:flex-none">
                        <button 
                          onClick={() => document.getElementById('csv-import')?.click()}
                          className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-[8px] md:text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors uppercase tracking-wider whitespace-nowrap"
                        >
                          Carregar CSV
                        </button>
                        <input 
                          type="file" 
                          id="csv-import" 
                          accept=".csv" 
                          className="hidden" 
                          onChange={handleImportCSV} 
                        />
                        <button 
                          onClick={handleExportCSV}
                          className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-[8px] md:text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors uppercase tracking-wider whitespace-nowrap"
                        >
                          Exportar CSV
                        </button>
                        <button 
                          onClick={() => setIsBatchEditOpen(true)}
                          className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-[8px] md:text-[10px] font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors uppercase tracking-wider shadow-sm whitespace-nowrap"
                        >
                          Editar Lote
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1100px] border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 shadow-sm">
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-4 border-b border-slate-100">SKU Detail</th>
                          <th className="px-5 py-4 border-b border-slate-100 text-center">Custo Produto</th>
                          <th className="px-5 py-4 border-b border-slate-100 text-center uppercase">
                            {activeTab === 'mercadolivre' ? 'Tipo Anúncio' : 'Comissão'}
                          </th>
                          <th className="px-5 py-4 border-b border-slate-100 text-center">
                            {activeTab === 'mercadolivre' ? 'Frete (Pago por você)' : 'Custos Envio (Vendedor)'}
                          </th>
                          <th className="px-5 py-4 border-b border-slate-100 text-center uppercase">Ads & Imp. %</th>
                          <th className={`px-5 py-4 border-b border-slate-100 text-center ${activeTab === 'mercadolivre' ? 'bg-yellow-400/10' : 'bg-orange-50/50'}`}>Margem Alvo</th>
                          <th className={`px-5 py-4 border-b border-slate-100 text-center ${activeTab === 'mercadolivre' ? 'bg-yellow-400/20 text-black' : 'bg-orange-600/5 text-orange-600'}`}>Preço Venda</th>
                          <th className="px-5 py-4 border-b border-slate-100 text-right">Real Margin %</th>
                          <th className="px-6 py-4 border-b border-slate-100 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <AnimatePresence mode="popLayout">
                          {filteredSkus.map((sku) => (
                            <ProfessionallyPolishedRow 
                              key={sku.id} 
                              sku={sku} 
                              onUpdate={updateSKU} 
                              onRemove={removeSKU} 
                              onCompare={setComparingSku}
                            />
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </section>
              </main>
            </>
          } />
          <Route path="/manager" element={
            <div className="col-span-12 flex items-center justify-center bg-white rounded-2xl border border-slate-200 p-20 shadow-sm h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Stock Manager</h2>
                <p className="text-slate-500 max-w-md mx-auto mt-4 font-medium">Esta funcionalidade permitirá que você gerencie seu estoque diretamente de forma integrada com o precificador. Em breve.</p>
                <Link to="/" className={`inline-block mt-8 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg ${activeTab === 'mercadolivre' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white'}`}>Voltar ao Dashboard</Link>
              </div>
            </div>
          } />
          <Route path="/settings" element={
            <div className="col-span-12 flex flex-col gap-6 h-full overflow-y-auto pb-10">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Table className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tabelas de Referência</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase">Taxas e Regras de Precificação 2025/2026</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Mercado Livre Rules */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-yellow-600 uppercase border-b border-yellow-100 pb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      Mercado Livre (ME2/Full)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Limite Frete Grátis</span>
                        <span className="font-black text-slate-900">R$ 79,00</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Taxa Fixa (&lt; R$ 79)</span>
                        <span className="font-black text-slate-900">R$ 6,00</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Comissão (Clássico)</span>
                        <span className="font-black text-slate-900">10% - 13%</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Comissão (Premium)</span>
                        <span className="font-black text-slate-900">15% - 18%</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Desc. Frete (Verde)</span>
                        <span className="font-black text-green-600">40% OFF</span>
                      </div>
                    </div>
                  </div>

                  {/* Shopee Rules */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-orange-600 uppercase border-b border-orange-100 pb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      Shopee Brasil
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Taxa de Serviço Base</span>
                        <span className="font-black text-slate-900">14%</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Programa Frete Grátis</span>
                        <span className="font-black text-slate-900">+ 6% (Total 20%)</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Taxa Fixa Transação</span>
                        <span className="font-black text-slate-900">R$ 3,00 por item</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Cap de Comissão</span>
                        <span className="font-black text-slate-900">R$ 103,00 máx.</span>
                      </div>
                    </div>
                  </div>

                  {/* Amazon Rules */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-yellow-700 uppercase border-b border-yellow-200 pb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                      Amazon Brasil
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Comissão de Indicação</span>
                        <span className="font-black text-slate-900">8% - 15%</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Tarifa Mínima</span>
                        <span className="font-black text-slate-900">R$ 1,00</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-600">Fulfillment (FBA)</span>
                        <span className="font-black text-slate-900">Por dimensões</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
                  <Link to="/" className={`px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${activeTab === 'mercadolivre' ? 'bg-yellow-400 text-black shadow-yellow-200' : 'bg-slate-900 text-white shadow-slate-200'}`}>
                    Confirmar e Voltar ao Dashboard
                  </Link>
                </div>
              </div>
            </div>
          } />
          <Route path="*" element={<div className="p-10 font-bold text-slate-400">Página não encontrada. Verifique a URL.</div>} />
        </Routes>
      </div>

      <AnimatePresence>
        {comparingSku && (
          <ComparisonModal 
            sku={comparingSku} 
            onClose={() => setComparingSku(null)} 
          />
        )}
        {isBatchEditOpen && (
          <BatchEditModal 
            onClose={() => setIsBatchEditOpen(false)}
            onConfirm={handleBatchUpdateMargin}
            itemCount={filteredSkus.length}
            marketplace={activeTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value, subValue, accent }: { label: string, value: string, subValue: string, accent: 'blue' | 'green' | 'slate' | 'orange' | 'yellow' | 'black' }) {
  const accentClasses = {
    blue: 'text-blue-600 bg-blue-600',
    green: 'text-green-600 bg-green-600',
    slate: 'text-slate-700 bg-slate-700',
    orange: 'text-orange-600 bg-orange-600',
    yellow: 'text-yellow-600 bg-yellow-600',
    black: 'text-black bg-yellow-400',
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={`w-1.5 h-1.5 rounded-full ${accentClasses[accent].split(' ')[1]} animate-pulse opacity-50`}></div>
      </div>
      <p className={`text-xl font-black tracking-tight ${accentClasses[accent].split(' ')[0]} group-hover:scale-105 transition-transform origin-left`}>
        {value}
      </p>
      <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase opacity-60 tracking-tight">{subValue}</p>
    </div>
  );
}

function BreakdownItem({ label, value, percent, color, rateLabel }: { label: string, value: number, percent: number, color: string, rateLabel?: string }) {
  return (
    <div className="flex justify-between items-center group/item border-b border-slate-50 last:border-0 pb-1.5 pt-0.5">
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{label}</span>
          {rateLabel && <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1 rounded-xs">{rateLabel}</span>}
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
          <div className={`h-full bg-${color}-500 opacity-60 rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, percent)}%` }}></div>
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="text-[10px] font-black text-slate-800">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        <div className="text-[8px] font-bold text-slate-400">{percent.toFixed(1)}% do total</div>
      </div>
    </div>
  );
}

function ProfessionallyPolishedRow({ sku, onUpdate, onRemove, onCompare }: { 
  sku: SKUItem, 
  onUpdate: (id: string, updates: Partial<SKUItem>) => void, 
  onRemove: (id: string) => void,
  onCompare: (sku: SKUItem | null) => void,
  key?: string | number
}) {
  const category = useMemo(() => CATEGORIES.find(c => c.id === sku.categoryId) || CATEGORIES[0] || { id: 'default', name: 'Geral', classicoRate: 0.13, premiumRate: 0.18 }, [sku.categoryId]);
  const amazonCategory = useMemo(() => AMAZON_CATEGORIES.find(c => c.id === sku.categoryId) || AMAZON_CATEGORIES[0] || { id: 'default', name: 'Geral', rate: 0.15 }, [sku.categoryId]);
  const result = useMemo(() => calculatePrice({ ...sku, category, marketplace: sku.marketplace }), [sku, category]);
  const isProfitable = result.netProfit > 0;
  const isML = sku.marketplace === 'mercadolivre';
  const isAmazon = sku.marketplace === 'amazon';
  const themeColor = isML ? 'blue' : (sku.marketplace === 'shopee' ? 'orange' : 'yellow');

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="hover:bg-slate-50/80 transition-colors group/row"
    >
      <td className="px-6 py-4">
        <input 
          type="text" 
          value={sku.name} 
          onChange={(e) => onUpdate(sku.id, { name: e.target.value })}
          className={`w-full font-black text-slate-800 text-sm bg-transparent outline-none border-b-2 border-transparent hover:border-slate-200 transition-all py-0.5 ${
            isML ? 'focus:border-black' : isAmazon ? 'focus:border-yellow-500' : 'focus:border-orange-500'
          }`}
        />
        <div className="flex items-center gap-2 mt-1.5">
          {isML && (
            <select 
              value={sku.categoryId} 
              onChange={(e) => onUpdate(sku.id, { categoryId: e.target.value })}
              className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer hover:text-yellow-600 bg-transparent outline-none"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id} className="text-sm font-sans">{c.name}</option>)}
            </select>
          )}
          {isAmazon && (
            <select 
              value={sku.categoryId} 
              onChange={(e) => onUpdate(sku.id, { categoryId: e.target.value })}
              className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer hover:text-yellow-600 bg-transparent outline-none"
            >
              {AMAZON_CATEGORIES.map(c => <option key={c.id} value={c.id} className="text-sm font-sans">{c.name}</option>)}
            </select>
          )}
          {!isML && !isAmazon && <span className="text-[9px] font-bold text-slate-400 uppercase">Geral Shopee</span>}
          <span className="text-[9px] text-slate-300 font-bold">•</span>
          <span className={`text-[9px] font-black uppercase ${
            isML ? 'text-yellow-600' : isAmazon ? 'text-yellow-600' : 'text-orange-500'
          }`}>
            {isML ? `Comissão ${((sku.adType === 'classico' ? (category?.classicoRate || 0) : (category?.premiumRate || 0)) * 100).toFixed(1)}%` : 
             isAmazon ? `Referral ${((amazonCategory?.rate || 0) * 100).toFixed(0)}%` : 
             `Padrão Shop.`}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className={`group/input relative flex items-center bg-slate-50 border rounded-lg px-2 py-1.5 transition-all shadow-inner-sm ${
          isML ? 'focus-within:border-yellow-400 border-slate-200' : 
          isAmazon ? 'focus-within:border-yellow-500 border-slate-200' :
          'focus-within:border-orange-500 border-slate-200'
        }`}>
          <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">R$</span>
          <input 
            type="number" 
            value={sku.cost} 
            onChange={(e) => onUpdate(sku.id, { cost: Math.max(0, Number(e.target.value)) })}
            className="w-full text-right bg-transparent text-sm font-black text-slate-800 outline-none"
          />
        </div>
      </td>

      <td className="px-5 py-4 text-center">
        <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button 
            onClick={() => onUpdate(sku.id, { adType: 'classico' })}
            className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${sku.adType === 'classico' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {isML ? 'Clássico' : isAmazon ? 'FBM' : 'Padrão'}
          </button>
          <button 
            onClick={() => onUpdate(sku.id, { adType: 'premium' })}
            className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${sku.adType === 'premium' ? (isML ? 'bg-yellow-400 text-black font-black' : isAmazon ? 'bg-yellow-500 text-black' : 'bg-orange-600 text-white') + ' shadow-sm border border-transparent' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {isML ? 'Premium' : isAmazon ? 'FBA' : 'Frete Gr.'}
          </button>
        </div>
      </td>

      <td className="px-5 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="relative group/shipping w-full">
            <button className={`w-full flex items-center justify-between text-xs font-bold bg-slate-50 border rounded-lg px-3 py-2 transition-all shadow-sm ${isML ? 'border-slate-200 hover:border-yellow-400' : 'border-slate-200 hover:border-orange-300'}`}>
              <span className="text-slate-400 uppercase text-[9px]">{isML ? 'Base' : 'Envio'}</span>
              <span className="text-slate-800">R$ {sku.shipping.toFixed(2)}</span>
            </button>
            <div className="absolute top-full left-0 mt-2 hidden group-hover/shipping:block z-[100] bg-white border border-slate-200 shadow-2xl rounded-xl p-3 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-3 border-b border-slate-100 pb-2">
                {isML ? 'Tabela ME2 (Valor Cheio)' : isAmazon ? 'Logística Amazon' : 'Custo de Envio (Vendedor)'}
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1 text-left">
                {isML ? (
                  SHIPPING_RATES.map((rate) => (
                    <button 
                      key={rate.weight}
                      onClick={() => onUpdate(sku.id, { shipping: rate.cost })}
                      className="w-full text-left p-2.5 text-[11px] hover:bg-yellow-400 hover:text-black transition-colors flex justify-between rounded-lg font-semibold"
                    >
                      <span>{rate.weight}</span>
                      <span className="font-mono text-xs">R$ {rate.cost.toFixed(2)}</span>
                    </button>
                  ))
                ) : isAmazon ? (
                  <div className="p-2 space-y-2">
                    <p className="text-[9px] text-slate-500 leading-tight">Escolha o nível de tamanho Amazon FBA:</p>
                    <div className="space-y-1">
                      {AMAZON_FBA_TIERS.map((tier) => (
                        <button 
                          key={tier.id}
                          onClick={() => onUpdate(sku.id, { amazonTierId: tier.id, fulfillment: tier.cost, adType: 'premium', shipping: 0 })}
                          className={`w-full text-left p-2 text-[10px] transition-colors flex justify-between rounded-lg font-semibold border ${
                            sku.amazonTierId === tier.id ? 'bg-yellow-100 border-yellow-300 text-yellow-900' : 'bg-slate-50 border-slate-200 hover:bg-yellow-50'
                          }`}
                        >
                          <span>{tier.name}</span>
                          <span className="font-mono text-[10px]">R$ {tier.cost.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-[8px] font-black text-slate-400 uppercase">Custo Manual (Fora FBA)</label>
                      <input 
                        type="number" 
                        value={sku.shipping}
                        onChange={(e) => onUpdate(sku.id, { shipping: Number(e.target.value), fulfillment: 0, amazonTierId: undefined, adType: 'classico' })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    <p className="text-[9px] text-slate-500 leading-tight">No Shopee, insira o valor do frete que você paga por venda (ex: subsídio ou frete fixo).</p>
                    <input 
                      type="number" 
                      value={sku.shipping}
                      onChange={(e) => onUpdate(sku.id, { shipping: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </div>
              {isML && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <p className="text-[8px] font-black text-green-600 uppercase flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5" />
                    Divisão de Frete (Verde Claro)
                  </p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Você paga apenas 60% do valor da tabela acima.</p>
                </div>
              )}
            </div>
          </div>
          {isML && (
            <div className="flex items-center gap-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-[10px] font-bold text-slate-500">
              <span className="text-[8px] uppercase opacity-60">Full</span>
              <input 
                type="number" 
                value={sku.fulfillment} 
                onChange={(e) => onUpdate(sku.id, { fulfillment: Math.max(0, Number(e.target.value)) })}
                className="w-full text-right bg-transparent outline-none"
              />
            </div>
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <div className={`flex items-center bg-slate-50 border rounded-lg px-2 py-1 transition-all ${isML ? 'border-slate-200 focus-within:border-yellow-400' : 'border-slate-200 focus-within:border-orange-500'}`}>
            <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">Ads</span>
            <input 
              type="number" 
              min="0"
              max="100"
              value={sku.adsPercent} 
              onChange={(e) => onUpdate(sku.id, { adsPercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
              className="w-full text-right bg-transparent text-[11px] font-black text-slate-800 outline-none"
            />
            <span className="text-[9px] font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <div className={`flex items-center bg-slate-50 border rounded-lg px-2 py-1 transition-all ${isML ? 'border-slate-200 focus-within:border-yellow-400' : 'border-slate-200 focus-within:border-orange-500'}`}>
            <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">Imp</span>
            <input 
              type="number" 
              min="0"
              max="100"
              value={sku.taxPercent} 
              onChange={(e) => onUpdate(sku.id, { taxPercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
              className="w-full text-right bg-transparent text-[11px] font-black text-slate-800 outline-none"
            />
            <span className="text-[9px] font-bold text-slate-400 ml-0.5">%</span>
          </div>
        </div>
      </td>

      <td className={`px-5 py-4 ${isML ? 'bg-yellow-50/30' : 'bg-orange-50/30'}`}>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center bg-white border rounded-lg px-3 py-1.5 w-full shadow-sm ${isML ? 'border-yellow-200' : 'border-orange-200'}`}>
            <input 
              type="number" 
              min="0"
              max="100"
              value={sku.targetMarginPercent} 
              onChange={(e) => onUpdate(sku.id, { targetMarginPercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
              className={`w-full text-right bg-transparent text-sm font-black outline-none ${isML ? 'text-black' : 'text-orange-600'}`}
            />
            <span className={`text-[10px] font-bold ml-1 ${isML ? 'text-slate-400' : 'text-orange-300'}`}>%</span>
          </div>
          <p className={`text-[9px] font-black uppercase tracking-wider ${isML ? 'text-slate-400' : 'text-orange-400/60'}`}>Breakeven: R$ {result.breakEvenPrice.toFixed(2)}</p>
        </div>
      </td>

      <td className={`px-5 py-4 ${isML ? 'bg-yellow-400/5' : isAmazon ? 'bg-yellow-600/5' : 'bg-orange-600/5'}`}>
        <div className="text-right">
          <p className={`text-lg font-black tracking-tight leading-none ${isML ? 'text-black' : isAmazon ? 'text-yellow-600' : 'text-orange-600'}`}>
            R$ {result.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
              isML ? (result.salePrice >= 79 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700') : 
              isAmazon ? (result.commission === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') :
              'bg-orange-100 text-orange-700'
            }`}>
              {isML ? (result.salePrice >= 79 ? 'Frete Grátis' : 'Taxa Fixa R$6') : 
               isAmazon ? (result.commission === 1 ? 'Comissão Mínima' : 'Venda Amazon') :
               (result.fixedFee > 0 ? `Taxa R$${result.fixedFee}` : 'Sem Taxa Fixa')}
            </span>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 text-right">
         <div className="flex flex-col items-end">
            <div className="relative group/breakdown cursor-help">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight flex items-center gap-1.5 transition-colors ${
                !isProfitable ? 'bg-red-100 text-red-700 shadow-sm shadow-red-200' : 
                result.realMarginPercent < 5 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                'bg-green-100 text-green-700'
              }`}>
                {result.realMarginPercent >= 0 ? '+' : ''}{result.realMarginPercent.toFixed(1)}%
                {result.realMarginPercent < 5 && isProfitable && <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />}
                <Info className="w-3 h-3 opacity-40" />
              </span>
              
              {/* Detailed Breakdown Popover */}
              <div className="absolute right-0 top-full mt-2 hidden group-hover/breakdown:block z-[110] bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500">Detalhamento Unitário</h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isML ? 'text-black bg-yellow-400' : isAmazon ? 'text-yellow-600 bg-yellow-50' : 'text-orange-600 bg-orange-50' }`}>PV: R$ {result.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="space-y-3">
                  <BreakdownItem label="Custo do SKU" value={result.components.productCost} percent={(result.components.productCost / result.salePrice) * 100} color="slate" />
                  <BreakdownItem 
                    label={isML ? "Comissão ML" : isAmazon ? "Referral Amazon" : "Comissão Shopee"} 
                    value={result.components.commissionAbs} 
                    percent={(result.components.commissionAbs / result.salePrice) * 100} 
                    color="orange" 
                    rateLabel={isML ? `${((sku.adType === 'classico' ? (category?.classicoRate || 0) : (category?.premiumRate || 0)) * 100).toFixed(1)}% + R$${result.fixedFee}` : isAmazon ? `${((amazonCategory?.rate || 0) * 100).toFixed(0)}%` : `${sku.adType === 'premium' ? '20%' : '14%'} + R$4`}
                  />
                  <BreakdownItem 
                    label={isAmazon ? "FBA / Envio" : "Frete (Líquido)"} 
                    value={result.components.shippingTotal + result.components.fulfillmentAbs} 
                    percent={((result.components.shippingTotal + result.components.fulfillmentAbs) / result.salePrice) * 100} 
                    color="blue" 
                    rateLabel={isML ? "60% Desc." : isAmazon ? "Fulfillment" : "Valor Fixo"}
                  />
                  <BreakdownItem 
                    label={isML ? "Ads (Publicidade)" : isAmazon ? "Amazon Ads" : "Shopee Ads"} 
                    value={result.components.adsAbs} 
                    percent={(result.components.adsAbs / result.salePrice) * 100} 
                    color="purple" 
                    rateLabel={`${sku.adsPercent}%`}
                  />
                  <BreakdownItem 
                    label="Impostos Est." 
                    value={result.components.taxesAbs} 
                    percent={(result.components.taxesAbs / result.salePrice) * 100} 
                    color="yellow" 
                    rateLabel={`${sku.taxPercent}%`}
                  />
                  {isML && result.components.fulfillmentAbs > 0 && (
                    <BreakdownItem label="Taxa Full" value={result.components.fulfillmentAbs} percent={(result.components.fulfillmentAbs / result.salePrice) * 100} color="cyan" />
                  )}
                  
                  <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-800 uppercase">Sobrou para você</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Após todas as deduções</span>
                    </div>
                    <span className={`text-sm font-black p-1.5 rounded-lg ${isProfitable ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50' }`}>
                      R$ {result.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Lucro: R$ {result.netProfit.toFixed(2)}</p>
         </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onCompare(sku)}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              isML ? 'hover:bg-yellow-100 text-slate-400 hover:text-black' : 
              isAmazon ? 'hover:bg-yellow-50 text-yellow-600/30 hover:text-yellow-600' :
              'hover:bg-orange-50 text-orange-300 hover:text-orange-500'
            }`}
            title="Comparar Marketplaces"
          >
            <Scale className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onRemove(sku.id)}
            className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all active:scale-90"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

function SimulationPreview({ cost, margin, adType, shipping, globalTax, globalAds }: { 
  cost: number, 
  margin: number, 
  adType: AdType,
  shipping: number,
  globalTax: number, 
  globalAds: number 
}) {
  const mlResult = calculatePrice({
    cost,
    categoryId: 'casa_moveis',
    adType: adType,
    adsPercent: globalAds,
    fulfillment: 0,
    taxPercent: globalTax,
    targetMarginPercent: margin,
    shipping: shipping || (cost > 79 ? 0 : 6),
    marketplace: 'mercadolivre'
  });

  const shopeeResult = calculatePrice({
    cost,
    categoryId: 'geral',
    adType: adType,
    adsPercent: globalAds,
    fulfillment: 0,
    taxPercent: globalTax,
    targetMarginPercent: margin,
    shipping: shipping || 4,
    marketplace: 'shopee'
  });

  const amazonResult = calculatePrice({
    cost,
    categoryId: 'casa',
    amazonTierId: adType === 'premium' ? 'pequeno' : undefined,
    adType: adType,
    adsPercent: globalAds,
    fulfillment: adType === 'premium' ? AMAZON_FBA_TIERS[0].cost : 0,
    taxPercent: globalTax,
    targetMarginPercent: margin,
    shipping: adType === 'premium' ? 0 : shipping,
    marketplace: 'amazon'
  });

  return (
    <div className="space-y-2">
      <SimulationPreviewItem 
        label="Mercado Livre" 
        profit={mlResult.netProfit} 
        margin={mlResult.realMarginPercent}
        price={mlResult.salePrice}
        color="blue"
      />
      <SimulationPreviewItem 
        label="Shopee" 
        profit={shopeeResult.netProfit} 
        margin={shopeeResult.realMarginPercent}
        price={shopeeResult.salePrice}
        color="orange"
      />
      <SimulationPreviewItem 
        label="Amazon" 
        profit={amazonResult.netProfit} 
        margin={amazonResult.realMarginPercent}
        price={amazonResult.salePrice}
        color="yellow"
      />
    </div>
  );
}

function SimulationPreviewItem({ label, profit, margin, price, color }: { label: string, profit: number, margin: number, price: number, color: 'blue' | 'orange' | 'yellow' }) {
  const isProfitable = profit > 0;
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
    yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100',
  };

  return (
    <div className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${colorClasses[color]}`}>
      <div>
        <p className="text-[9px] font-black uppercase opacity-60">{label}</p>
        <p className="text-xs font-black text-white">R$ {price.toFixed(2)} <span className="opacity-40 text-[9px]">Venda</span></p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-black ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
          R$ {profit.toFixed(2)}
        </p>
        <p className="text-[9px] font-bold opacity-60 text-white/50">{margin.toFixed(1)}% margem</p>
      </div>
    </div>
  );
}

function ComparisonModal({ sku, onClose }: { sku: SKUItem, onClose: () => void }) {
  const calculations = useMemo(() => {
    const ml = calculatePrice({
      ...sku,
      marketplace: 'mercadolivre',
      categoryId: 'casa_moveis'
    });

    const shopee = calculatePrice({
      ...sku,
      marketplace: 'shopee',
      categoryId: 'geral'
    });

    const amazon = calculatePrice({
      ...sku,
      marketplace: 'amazon',
      categoryId: 'casa',
      amazonTierId: sku.amazonTierId || 'pequeno'
    });

    return { ml, shopee, amazon };
  }, [sku]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight truncate">Comparativo de Canais</h3>
            <p className="text-[9px] md:text-xs text-slate-500 font-bold uppercase truncate">{sku.name} • R$ {sku.cost.toFixed(2)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-y-auto custom-scrollbar flex-1">
          <ComparisonCard 
            title="Mercado Livre" 
            result={calculations.ml} 
            color="black"
            icon={<div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center text-black text-[10px] font-black">M</div>}
          />
          <ComparisonCard 
            title="Shopee" 
            result={calculations.shopee} 
            color="orange"
            icon={<div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-[10px] font-bold">S</div>}
          />
          <ComparisonCard 
            title="Amazon BR" 
            result={calculations.amazon} 
            color="yellow"
            icon={<div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-black text-[10px] font-bold">A</div>}
          />
        </div>

        <div className="px-5 md:px-6 py-3 md:py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">Análise baseada em margem alvo de {sku.targetMarginPercent}%</p>
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ComparisonCard({ title, result, color, icon }: { title: string, result: PricingResult, color: 'blue' | 'orange' | 'yellow' | 'black', icon: ReactNode }) {
  const colors = {
    blue: 'border-blue-100 bg-blue-50/30 text-blue-600',
    orange: 'border-orange-100 bg-orange-50/30 text-orange-600',
    yellow: 'border-yellow-100 bg-yellow-50/30 text-yellow-700',
    black: 'border-yellow-400 bg-yellow-50/30 text-black',
  };

  return (
    <div className={`rounded-xl border p-4 md:p-5 flex flex-col gap-3 md:gap-4 ${colors[color].split(' ').slice(0, 2).join(' ')}`}>
      <div className="flex items-center gap-3">
        {icon}
        <h4 className={`text-xs md:text-sm font-black uppercase tracking-tight ${colors[color].split(' ')[2]}`}>{title}</h4>
      </div>

      <div className="space-y-2 md:space-y-3">
        <div>
          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase">Preço p/ Margem Alvo</p>
          <p className="text-xl md:text-2xl font-black tracking-tight text-slate-900">R$ {result.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/60 p-2 rounded-lg border border-white">
            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">Lucro Líquido</p>
            <p className={`text-[10px] md:text-xs font-black ${result.netProfit > 0 ? 'text-green-600' : 'text-red-500'}`}>R$ {result.netProfit.toFixed(2)}</p>
          </div>
          <div className="bg-white/60 p-2 rounded-lg border border-white">
            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">Margem Real</p>
            <p className={`text-[10px] md:text-xs font-black ${result.realMarginPercent > 0 ? 'text-green-600' : 'text-red-500'}`}>{result.realMarginPercent.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-100/50">
          <DetailRow label="Taxas Marketplace" value={result.components.commissionAbs + (result.fixedFee || 0)} />
          <DetailRow label="Frete/Envio" value={result.components.shippingTotal + (result.components.fulfillmentAbs || 0)} />
          <DetailRow label="Ads + Impostos" value={result.components.adsAbs + result.components.taxesAbs} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
      <span className="text-[10px] font-black text-slate-700">R$ {value.toFixed(2)}</span>
    </div>
  );
}

function BatchEditModal({ onClose, onConfirm, itemCount, marketplace }: { onClose: () => void, onConfirm: (margin: number) => void, itemCount: number, marketplace: Marketplace }) {
  const [newMargin, setNewMargin] = useState(20);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Edição em Lote</h3>
            <p className="text-xs text-slate-500 font-bold uppercase">{itemCount} Itens Selecionados no {marketplace}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 font-medium">Esta ação atualizará a <strong>Margem Alvo</strong> de todos os produtos atualmente visíveis na lista.</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nova Margem Alvo (%)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="50" 
                step="1"
                value={newMargin}
                onChange={(e) => setNewMargin(Number(e.target.value))}
                className="flex-1 accent-slate-900"
              />
              <span className="w-16 text-center py-2 bg-slate-100 rounded-lg text-lg font-black text-slate-800">{newMargin}%</span>
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[9px] font-bold text-slate-400">0%</span>
              <span className="text-[9px] font-bold text-slate-400">25%</span>
              <span className="text-[9px] font-bold text-slate-400">50%</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(newMargin)}
            className="flex-1 px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-black/10"
          >
            Aplicar em {itemCount} SKUs
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
