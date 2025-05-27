import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, File, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PageSearchResult } from '../../types';
import useDebounce from '../../hooks/useDebounce';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<PageSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage on component mount
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

  // Close the modal when clicking outside
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

  // Keyboard controls for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent<Document>) => {
      if (!isOpen) return;

      // Close with Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      // Navigation with arrow keys
      const totalItems = results.length + recentSearches.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < totalItems - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : totalItems - 1
        );
      } else if (e.key === 'Enter' && selectedIndex >= 0 && totalItems > 0) {
        e.preventDefault();

        // Determine if it's a search result or a recent search
        if (selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        } else {
          const recentIndex = selectedIndex - results.length;
          if (recentIndex >= 0 && recentIndex < recentSearches.length) {
            setQuery(recentSearches[recentIndex].query);
            searchPages(recentSearches[recentIndex].query);
            setIsOpen(false); // Close after selecting a recent search to re-run query
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    return () => {
      document.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
    };
  }, [isOpen, results, recentSearches, selectedIndex, navigate]); // Added navigate to dependencies

  // Focus the input when the modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(0); // Reset selection when opening
    }
  }, [isOpen]);

  // Document search function
  const searchPages = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      setLoading(false); // Ensure loading is false if query is too short
      return;
    }

    try {
      setLoading(true);

      // Call Supabase search function
      const { data, error } = await supabase.rpc('search_pages', {
        search_term: searchTerm,
        limit_param: 10,
        offset_param: 0
      });

      if (error) throw error;

      setResults(data || []);

      // Save to recent searches
      if (searchTerm.trim().length > 0) {
        const newSearch: RecentSearch = {
          id: Date.now().toString(),
          query: searchTerm,
          timestamp: new Date().toISOString()
        };

        const updatedSearches = [
          newSearch,
          ...recentSearches.filter(s => s.query.toLowerCase() !== searchTerm.toLowerCase()).slice(0, 4)
        ];

        setRecentSearches(updatedSearches);
        localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      }
    } catch (err) {
      console.error('Error searching documents:', err);
      // Optionally set an error state for the user
    } finally {
      setLoading(false);
    }
  };

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    if (isOpen && debouncedQuery) {
      searchPages(debouncedQuery);
    } else if (!debouncedQuery && isOpen) {
      setResults([]); // Clear results if query is empty
    }
  }, [debouncedQuery, isOpen]);

  // Handle selecting a search result
  const handleSelectResult = (result: PageSearchResult) => {
    navigate(`/projects/${result.project_id}/documents/${result.id}`);
    setIsOpen(false);
    setQuery('');
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Handle opening with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open with Ctrl+K or Cmd+K
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
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 bg-secondary rounded-md shadow-sm transition-colors duration-200"
      >
        <Search size={16} className="mr-2 text-secondary-foreground" />
        <span className="hidden sm:inline">Buscar documentación...</span>
        <span className="sm:hidden">Buscar...</span>
        <kbd className="ml-3 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-overlay flex items-start justify-center pt-16 sm:pt-20 p-4 z-45 animate-fade-in">
          <div
            ref={searchRef}
            className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-border animate-scale-in"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-border flex items-center">
              <Search size={18} className="text-muted-foreground mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }} // Reset index on query change
                placeholder="Busca en la documentación..."
                className="flex-grow bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-lg"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Search Results / Recent Searches */}
            <div className="overflow-y-auto flex-grow custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center p-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Buscando...</span>
                </div>
              ) : query && results.length > 0 ? (
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resultados
                  </h3>
                  <ul>
                    {results.map((result, index) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleSelectResult(result)}
                          className={`w-full text-left p-3 rounded-md flex items-start group transition-colors duration-200
                            ${selectedIndex === index
                              ? 'bg-primary/10 text-primary-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                          <File size={18} className="mt-0.5 mr-3 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                          <div>
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                              {result.title}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">{result.project_name}</span> &rsaquo; {result.category_name}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && !query && ( // Only show recent searches if query is empty
                    <div className="p-2">
                      <div className="px-3 py-2 flex justify-between items-center border-b border-border-light mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Búsquedas recientes
                        </h3>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-link hover:text-link-hover transition-colors duration-200"
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
                                searchPages(item.query);
                                setIsOpen(false); // Close after selecting
                              }}
                              className={`w-full text-left p-3 rounded-md flex items-center group transition-colors duration-200
                                ${selectedIndex === results.length + index
                                  ? 'bg-primary/10 text-primary-foreground'
                                  : 'hover:bg-accent hover:text-accent-foreground'
                                }`}
                            >
                              <Clock size={16} className="mr-3 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                              <span className="text-foreground group-hover:text-primary transition-colors duration-200">
                                {item.query}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {query && !loading && results.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">
                        No se encontraron resultados para "<span className="text-foreground font-semibold">{query}</span>"
                      </p>
                      <p>Intenta con otra palabra clave o verifica la ortografía.</p>
                    </div>
                  )}

                  {!query && recentSearches.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">
                        ¿Qué estás buscando?
                      </p>
                      <p>
                        Comienza a escribir para buscar en toda tu documentación.
                      </p>
                      <p className="mt-4 text-sm">
                        Consejo: Usa <kbd className="kbd">⌘K</kbd> o <kbd className="kbd">Ctrl+K</kbd> para abrir la búsqueda en cualquier momento.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer with Keyboard Shortcuts */}
            <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-center space-x-4 sm:space-x-6 bg-secondary/20">
              <div className="flex items-center">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                <span className="ml-2">para navegar</span>
              </div>
              <div className="flex items-center">
                <kbd className="kbd">Enter</kbd>
                <span className="ml-2">para seleccionar</span>
              </div>
              <div className="flex items-center">
                <kbd className="kbd">Esc</kbd>
                <span className="ml-2">para cerrar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;