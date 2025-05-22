import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, File, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SearchResult } from '../../types';
import useDebounce from '../../hooks/useDebounce';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);
  
  // Cargar búsquedas recientes del localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, []);
  
  // Cerrar el modal al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Control de teclas para navegación
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent<Document>) => {
      if (!isOpen) return;
      
      // Cerrar con Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      
      // Navegación con flechas
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length + recentSearches.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length + recentSearches.length - 1
        );
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        
        // Determinar si es un resultado o una búsqueda reciente
        if (selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        } else {
          const recentIndex = selectedIndex - results.length;
          if (recentIndex >= 0 && recentIndex < recentSearches.length) {
            setQuery(recentSearches[recentIndex].query);
            searchDocuments(recentSearches[recentIndex].query);
          }
        }
      }
    };
    
    // TypeScript no permite establecer el tipo correcto en el evento, así que usamos un cast
    document.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    return () => {
      document.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
    };
  }, [isOpen, results, recentSearches, selectedIndex]);
  
  // Enfocar el input al abrir el modal
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Búsqueda de documentos
  const searchDocuments = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Llamar a la función de búsqueda de Supabase
      const { data, error } = await supabase.rpc('search_documents', {
        search_term: searchTerm,
        limit_param: 10,
        offset_param: 0
      });
      
      if (error) throw error;
      
      setResults(data || []);
      
      // Guardar en búsquedas recientes
      if (searchTerm.trim().length > 0) {
        const newSearch: RecentSearch = { 
          id: Date.now().toString(),
          query: searchTerm, 
          timestamp: new Date().toISOString() 
        };
        
        const updatedSearches = [
          newSearch,
          ...recentSearches.filter(s => s.query !== searchTerm).slice(0, 4)
        ];
        
        setRecentSearches(updatedSearches);
        localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      }
    } catch (err) {
      console.error('Error searching documents:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Efecto para buscar cuando cambia la consulta
  useEffect(() => {
    if (isOpen && debouncedQuery) {
      searchDocuments(debouncedQuery);
    }
  }, [debouncedQuery, isOpen]);
  
  // Manejar la selección de un resultado
  const handleSelectResult = (result: SearchResult) => {
    navigate(`/projects/${result.project_id}/documents/${result.id}`);
    setIsOpen(false);
    setQuery('');
  };
  
  // Limpiar búsquedas recientes
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  
  // Manejar apertura con atajo de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Abrir con Ctrl+K o Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress as unknown as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyPress as unknown as EventListener);
    };
  }, []);
  
  return (
    <>
      {/* Botón de búsqueda */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md"
      >
        <Search size={16} className="mr-2" />
        Buscar...
        <kbd className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
      
      {/* Modal de búsqueda */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 p-4 z-50">
          <div 
            ref={searchRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col"
          >
            {/* Barra de búsqueda */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <Search size={18} className="text-gray-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en la documentación..."
                className="flex-grow bg-transparent border-none outline-none text-gray-800 dark:text-white placeholder-gray-400"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* Resultados de búsqueda */}
            <div className="overflow-y-auto flex-grow">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Buscando...
                </div>
              ) : query && results.length > 0 ? (
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Resultados
                  </h3>
                  <ul>
                    {results.map((result, index) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleSelectResult(result)}
                          className={`w-full text-left px-3 py-2 rounded-md flex items-start ${
                            selectedIndex === index 
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          <File size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-800 dark:text-white">
                              {result.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {result.project_name} &rsaquo; {result.category_name}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  {/* Búsquedas recientes */}
                  {recentSearches.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-2 flex justify-between items-center">
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Búsquedas recientes
                        </h3>
                        <button 
                          onClick={clearRecentSearches}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Limpiar
                        </button>
                      </div>
                      <ul>
                        {recentSearches.map((item, index) => (
                          <li key={item.id}>
                            <button
                              onClick={() => {
                                setQuery(item.query);
                                searchDocuments(item.query);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                                selectedIndex === results.length + index 
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/40'
                              }`}
                            >
                              <Clock size={14} className="mr-2 text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.query}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {query && !loading && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron resultados para "{query}"
                    </div>
                  )}
                  
                  {!query && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      Comienza a escribir para buscar en la documentación
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Pie del modal con atajos de teclado */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-center space-x-4">
              <div className="flex items-center">
                <span className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 mr-1.5">↑</span>
                <span className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 mr-1.5">↓</span>
                para navegar
              </div>
              <div className="flex items-center">
                <span className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 mr-1.5">Enter</span>
                para seleccionar
              </div>
              <div className="flex items-center">
                <span className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 mr-1.5">Esc</span>
                para cerrar
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;