import { useState, useEffect, type FC } from 'react';
import { Folder, Plus, Edit, Trash2, ChevronDown, ChevronRight, Move, ArrowLeft, ArrowRight } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import type { Category } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CategoryManagerProps {
    projectId: string;
    onCategorySelect?: (categoryId: string) => void;
    onCategoryCreate?: (category: Category) => void;
}

const CategoryManager: FC<CategoryManagerProps> = ({
    projectId,
    onCategorySelect,
    onCategoryCreate
}) => {
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Category[]>([]);
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [childrenMap, setChildrenMap] = useState<Record<string, Category[]>>({});

    // Para el formulario de nueva categoría
    const [showNewCategoryForm, setShowNewCategoryForm] = useState<boolean>(false);
    const [newCategoryName, setNewCategoryName] = useState<string>('');
    const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
    const [creatingCategory, setCreatingCategory] = useState<boolean>(false);

    // Cargar categorías
    useEffect(() => {
        fetchCategories();
    }, [projectId]);

    // Calcular mapa de hijos cuando cambian las categorías
    useEffect(() => {
        // Construir un mapa de categorías hijas por ID de padre
        const newChildrenMap: Record<string, Category[]> = {};

        categories.forEach(category => {
            if (category.parent_id) {
                if (!newChildrenMap[category.parent_id]) {
                    newChildrenMap[category.parent_id] = [];
                }
                newChildrenMap[category.parent_id].push(category);
            }
        });

        setChildrenMap(newChildrenMap);
    }, [categories]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await categoryService.getCategories(projectId);

            if (error) throw error;

            setCategories(data || []);

            // Expandir todas las categorías de primer nivel por defecto
            const expanded: Record<string, boolean> = {};
            data?.forEach(category => {
                if (!category.parent_id) {
                    expanded[category.id] = true;
                }
            });
            setExpandedCategories(expanded);
        } catch (err: any) {
            console.error('Error loading categories:', err);
            setError(`Error al cargar categorías: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Organizar categorías en estructura jerárquica
    const getCategoryTree = () => {
        // Si estamos dentro de una categoría, solo mostramos sus hijos
        const categoriesToShow = currentCategory
            ? categories.filter(category => category.parent_id === currentCategory.id)
            : categories.filter(category => !category.parent_id);

        // Función recursiva para renderizar la jerarquía
        const renderCategory = (category: Category) => {
            const hasChildren = childrenMap[category.id] && childrenMap[category.id].length > 0;
            const isExpanded = expandedCategories[category.id];

            return (
                <div key={category.id} className="mb-1">
                    <div
                        className={`flex items-center p-2 rounded-md cursor-pointer ${onCategorySelect ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                            }`}
                    >
                        <button
                            onClick={() => toggleCategory(category.id)}
                            className="p-1 mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                        >
                            {hasChildren && isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        <div
                            className="flex-grow flex items-center"
                            onClick={() => onCategorySelect && onCategorySelect(category.id)}
                        >
                            <Folder size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-800 dark:text-gray-200">
                                {category.name}
                            </span>
                            {category.document_count && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                    {category.document_count.count || 0}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => enterCategory(category)}
                                className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 focus:outline-none"
                                title="Entrar en esta categoría"
                            >
                                <ArrowRight size={14} />
                            </button>
                            <button
                                onClick={() => handleEditCategory(category)}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                                title="Editar categoría"
                            >
                                <Edit size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 focus:outline-none"
                                title="Eliminar categoría"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                                title="Mover categoría"
                            >
                                <Move size={14} />
                            </button>
                        </div>
                    </div>

                    {hasChildren && isExpanded && !currentCategory && (
                        <div className="pl-2 border-l border-gray-200 dark:border-gray-700 ml-3 mt-1">
                            {childrenMap[category.id].map(child => renderCategory(child))}
                        </div>
                    )}
                </div>
            );
        };

        return categoriesToShow.map(category => renderCategory(category));
    };

    // Función para entrar en una categoría
    const enterCategory = (category: Category) => {
        setCurrentCategory(category);

        // Actualizar breadcrumbs
        const newBreadcrumbs = [...breadcrumbs, category];
        setBreadcrumbs(newBreadcrumbs);

        // Al entrar en una categoría, establecemos automáticamente que las nuevas
        // categorías se crearán como hijas de esta
        setNewCategoryParentId(category.id);
    };

    // Función para regresar al nivel anterior
    const goBack = () => {
        if (breadcrumbs.length <= 1) {
            // Volver a la raíz
            setCurrentCategory(null);
            setBreadcrumbs([]);
            setNewCategoryParentId(null);
        } else {
            // Volver a la categoría padre
            const newBreadcrumbs = [...breadcrumbs];
            newBreadcrumbs.pop(); // Quitar la última categoría
            const parentCategory = newBreadcrumbs[newBreadcrumbs.length - 1];

            setCurrentCategory(parentCategory);
            setBreadcrumbs(newBreadcrumbs);
            setNewCategoryParentId(parentCategory.id);
        }
    };

    // Función para ir directamente a una categoría en el breadcrumb
    const goToCategory = (index: number) => {
        if (index === -1) {
            // Ir a la raíz
            setCurrentCategory(null);
            setBreadcrumbs([]);
            setNewCategoryParentId(null);
        } else {
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            const category = newBreadcrumbs[index];

            setCurrentCategory(category);
            setBreadcrumbs(newBreadcrumbs);
            setNewCategoryParentId(category.id);
        }
    };

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim() || !user) {
            return;
        }

        try {
            setCreatingCategory(true);

            const slug = newCategoryName
                .normalize('NFD') // Normaliza los caracteres Unicode
                .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (tildes)
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '-');

            const newCategory = {
                project_id: projectId,
                name: newCategoryName.trim(),
                slug,
                parent_id: newCategoryParentId || undefined,
                created_by: user.id,
                order_index: 0 // El servicio asignará el índice correcto
            };

            const { data, error } = await categoryService.createCategory(newCategory);

            if (error) throw error;

            // Actualizar lista de categorías
            await fetchCategories();

            // Notificar al componente padre si es necesario
            if (onCategoryCreate && data) {
                onCategoryCreate(data);
            }

            // Resetear formulario
            setNewCategoryName('');
            setShowNewCategoryForm(false);

            // Expandir automáticamente la categoría padre si existe
            if (data?.parent_id) {
                setExpandedCategories(prev => ({
                    ...prev,
                    [data.parent_id as string]: true
                }));
            }

            // Mostrar notificación de éxito
            if (window.toast) {
                window.toast.success('Categoría creada con éxito');
            }
        } catch (err: any) {
            console.error('Error creating category:', err);
            setError(`Error al crear categoría: ${err.message}`);

            if (window.toast) {
                window.toast.error(`Error al crear categoría: ${err.message}`);
            }
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleEditCategory = (category: Category) => {
        // Implementación de edición (podría ser un modal o formulario inline)
        console.log('Editar categoría:', category);
        // Por ahora mostramos un prompt simple, pero en producción debería ser un componente más elaborado
        const newName = window.prompt('Nuevo nombre para la categoría:', category.name);

        if (newName && newName !== category.name) {
            updateCategory(category.id, { name: newName });
        }
    };

    const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
        try {
            const { error } = await categoryService.updateCategory(categoryId, updates);

            if (error) throw error;

            // Actualizar lista de categorías
            await fetchCategories();

            if (window.toast) {
                window.toast.success('Categoría actualizada con éxito');
            }
        } catch (err: any) {
            console.error('Error updating category:', err);

            if (window.toast) {
                window.toast.error(`Error al actualizar categoría: ${err.message}`);
            }
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!window.confirm('¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const { error } = await categoryService.deleteCategory(categoryId);

            if (error) throw error;

            // Actualizar lista de categorías
            await fetchCategories();

            if (window.toast) {
                window.toast.success('Categoría eliminada con éxito');
            }
        } catch (err: any) {
            console.error('Error deleting category:', err);

            if (window.toast) {
                window.toast.error(`Error al eliminar categoría: ${err.message}`);
            }
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Categorías
                </h3>

                <button
                    onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                    <Plus size={16} className="mr-1" />
                    Nueva categoría
                </button>
            </div>

            {/* Breadcrumbs y navegación */}
            {(currentCategory || breadcrumbs.length > 0) && (
                <div className="mb-4">
                    <div className="flex items-center text-sm mb-2">
                        <button
                            onClick={() => goToCategory(-1)}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Inicio
                        </button>

                        {breadcrumbs.map((category, index) => (
                            <div key={category.id} className="flex items-center">
                                <span className="mx-1 text-gray-500">/</span>
                                <button
                                    onClick={() => goToCategory(index)}
                                    className={`hover:underline ${index === breadcrumbs.length - 1 ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-blue-600 dark:text-blue-400'}`}
                                >
                                    {category.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={goBack}
                        className="inline-flex items-center px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        <ArrowLeft size={14} className="mr-1" />
                        Volver
                    </button>
                </div>
            )}

            {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Formulario para nueva categoría */}
            {showNewCategoryForm && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                    <div className="mb-3">
                        <label htmlFor="categoryName" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre de la categoría
                        </label>
                        <input
                            id="categoryName"
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Nombre de la categoría"
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="parentCategory" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Categoría padre (opcional)
                        </label>
                        <select
                            id="parentCategory"
                            value={newCategoryParentId || ''}
                            onChange={(e) => setNewCategoryParentId(e.target.value || null)}
                            className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            disabled={currentCategory !== null} // Deshabilitar si estamos dentro de una categoría
                        >
                            <option value="">Ninguna (categoría principal)</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        {currentCategory && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                La nueva categoría se creará dentro de: {currentCategory.name}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => setShowNewCategoryForm(false)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim() || creatingCategory}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creatingCategory ? 'Creando...' : 'Crear categoría'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de categorías */}
            <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        Cargando categorías...
                    </div>
                ) : categories.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No hay categorías. Crea una para organizar tu documentación.
                    </div>
                ) : currentCategory && (!childrenMap[currentCategory.id] || childrenMap[currentCategory.id]?.length === 0) ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        Esta categoría no tiene subcategorías. Crea una nueva subcategoría.
                    </div>
                ) : (
                    <div className="space-y-1">{getCategoryTree()}</div>
                )}
            </div>
        </div>
    );
};

export default CategoryManager;