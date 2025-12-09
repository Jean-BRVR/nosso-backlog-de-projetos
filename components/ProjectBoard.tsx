import React, { useState, useMemo, useEffect } from 'react';
import { Project, Sprint, Card, Task } from '../types';
import { 
  CalendarIcon, 
  ClipboardDocumentListIcon, 
  CheckIcon, 
  PlusIcon, 
  UserPlusIcon, 
  PencilIcon, 
  ChartBarIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface ProjectBoardProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onBack: () => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ project, onUpdateProject, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'backlog' | string>('overview');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [newAssigneeInput, setNewAssigneeInput] = useState<{taskId: string, name: string} | null>(null);
  const [newTaskInput, setNewTaskInput] = useState<string>("");
  
  // Project Editing State
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState(project.name);
  const [editedProjectDesc, setEditedProjectDesc] = useState(project.description);

  useEffect(() => {
    setEditedProjectName(project.name);
    setEditedProjectDesc(project.description);
  }, [project]);

  // Calculate Progress
  const stats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalPoints = 0;
    let completedPoints = 0;
    const assigneeDistribution: Record<string, number> = {};

    const processCards = (cards: Card[]) => {
      cards.forEach(card => {
        const cardCompletedTasks = card.tasks.filter(t => t.completed).length;
        const cardTotalTasks = card.tasks.length;
        
        totalTasks += cardTotalTasks;
        completedTasks += cardCompletedTasks;
        totalPoints += card.storyPoints || 0;
        
        if (card.status === 'done') {
            completedPoints += card.storyPoints || 0;
        }

        card.tasks.forEach(task => {
            task.assignees.forEach(assignee => {
                assigneeDistribution[assignee] = (assigneeDistribution[assignee] || 0) + 1;
            });
        });
      });
    };

    processCards(project.backlog);
    project.sprints.forEach(s => processCards(s.cards));

    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    return { totalTasks, completedTasks, percentage, totalPoints, completedPoints, assigneeDistribution };
  }, [project]);

  const updateProject = (newProject: Project) => {
    onUpdateProject(newProject);
  };

  const saveProjectDetails = () => {
      updateProject({
          ...project,
          name: editedProjectName,
          description: editedProjectDesc
      });
      setIsEditingProject(false);
  };

  // --- LOGIC FOR DELETING CARDS (Global Search) ---
  const deleteCard = (e: React.MouseEvent | null, cardId: string) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (!window.confirm("Tem a certeza que deseja eliminar este cartão e todas as suas tarefas?")) return;

    const updatedProject = { ...project };
    
    // 1. Try to remove from Backlog
    const initialBacklogCount = updatedProject.backlog.length;
    updatedProject.backlog = updatedProject.backlog.filter(c => c.id !== cardId);
    
    // 2. If not found in backlog (count didn't change), check all sprints
    if (updatedProject.backlog.length === initialBacklogCount) {
        updatedProject.sprints = updatedProject.sprints.map(s => ({
            ...s,
            cards: s.cards.filter(c => c.id !== cardId)
        }));
    }

    onUpdateProject(updatedProject);
    
    // Close modal if the deleted card was open
    if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(null);
    }
  };

  // --- LOGIC FOR TASKS (Sub-items) ---
  
  const deleteSubTask = (e: React.MouseEvent, cardId: string, taskId: string) => {
    e.stopPropagation(); // Prevent toggling the task or other clicks
    if (!window.confirm("Eliminar esta sub-tarefa?")) return;

    const updatedProject = { ...project };
    
    // Helper to remove task from a specific card list
    const removeTaskFromList = (cards: Card[]) => {
        const cardIndex = cards.findIndex(c => c.id === cardId);
        if (cardIndex !== -1) {
            cards[cardIndex] = {
                ...cards[cardIndex],
                tasks: cards[cardIndex].tasks.filter(t => t.id !== taskId)
            };
        }
    };

    removeTaskFromList(updatedProject.backlog);
    updatedProject.sprints.forEach(s => removeTaskFromList(s.cards));
    
    updateProject(updatedProject);
    
    // Update local state if modal is open
    if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(prev => prev ? {
            ...prev,
            tasks: prev.tasks.filter(t => t.id !== taskId)
        } : null);
    }
  };

  const addSubTask = (cardId: string) => {
      if (!newTaskInput.trim()) return;

      const newTask: Task = {
          id: Math.random().toString(36).substring(2, 9),
          content: newTaskInput,
          completed: false,
          assignees: []
      };

      const updatedProject = { ...project };
      
      const addTaskToList = (cards: Card[]) => {
          const idx = cards.findIndex(c => c.id === cardId);
          if (idx !== -1) {
              cards[idx] = {
                  ...cards[idx],
                  tasks: [...cards[idx].tasks, newTask]
              };
          }
      };

      addTaskToList(updatedProject.backlog);
      updatedProject.sprints.forEach(s => addTaskToList(s.cards));

      updateProject(updatedProject);
      
      if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard(prev => prev ? {
              ...prev,
              tasks: [...prev.tasks, newTask]
          } : null);
      }
      setNewTaskInput("");
  };

  const toggleTask = (cardId: string, taskId: string) => {
    const updatedProject = { ...project };
    
    const findAndToggle = (cards: Card[]) => {
      const card = cards.find(c => c.id === cardId);
      if (card) {
        const task = card.tasks.find(t => t.id === taskId);
        if (task) task.completed = !task.completed;
      }
    };

    findAndToggle(updatedProject.backlog);
    updatedProject.sprints.forEach(s => findAndToggle(s.cards));

    updateProject(updatedProject);
    
    if (selectedCard && selectedCard.id === cardId) {
        // Refresh local state from updated project logic simulation
        setSelectedCard(prev => {
            if(!prev) return null;
            return {
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
            };
        });
    }
  };

  const addAssignee = (cardId: string, taskId: string, name: string) => {
    if (!name.trim()) return;
    const updatedProject = { ...project };
    
    const findAndAdd = (cards: Card[]) => {
      const card = cards.find(c => c.id === cardId);
      if (card) {
        const task = card.tasks.find(t => t.id === taskId);
        if (task && !task.assignees.includes(name)) {
            task.assignees.push(name);
        }
      }
    };

    findAndAdd(updatedProject.backlog);
    updatedProject.sprints.forEach(s => findAndAdd(s.cards));
    updateProject(updatedProject);

    if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(prev => {
            if(!prev) return null;
            return {
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId && !t.assignees.includes(name) 
                    ? { ...t, assignees: [...t.assignees, name] } 
                    : t)
            };
        });
    }
    setNewAssigneeInput(null);
  };

  const updateCardDetails = (cardId: string, updates: Partial<Card>) => {
    const updatedProject = { ...project };
    
    const updateInList = (cards: Card[]) => {
      const idx = cards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        cards[idx] = { ...cards[idx], ...updates };
      }
    };

    updateInList(updatedProject.backlog);
    updatedProject.sprints.forEach(s => updateInList(s.cards));

    updateProject(updatedProject);
    
    if (selectedCard && selectedCard.id === cardId) {
       setSelectedCard(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addNewCardToBacklog = () => {
    const newCard: Card = {
      id: "card-" + Math.random().toString(36).substring(2, 9),
      title: "Nova Tarefa",
      description: "Descrição da tarefa...",
      storyPoints: 1,
      status: 'todo',
      tasks: [],
      tags: []
    };
    const updatedProject = {
      ...project,
      backlog: [newCard, ...project.backlog]
    };
    updateProject(updatedProject);
    // Immediately open for editing
    setSelectedCard(newCard);
    setIsEditingCard(true);
  };

  const renderCard = (card: Card, sprintId?: string) => (
    <div 
      key={card.id} 
      onClick={() => { setSelectedCard(card); setIsEditingCard(false); }}
      className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-800 text-sm leading-tight flex-1 pr-2">{card.title}</h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
             <span className="bg-white border border-slate-200 text-black text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                {card.storyPoints} pts
             </span>
             {/* Delete button available everywhere now */}
             <button 
                onClick={(e) => deleteCard(e, card.id)}
                className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all z-10 opacity-0 group-hover:opacity-100"
                title="Apagar cartão"
             >
                <TrashIcon className="w-4 h-4" />
             </button>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
        {card.description}
      </p>

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
         <div className="flex flex-wrap gap-1 mb-3">
             {card.tags.slice(0, 3).map((tag, idx) => (
                 <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                     idx % 3 === 0 ? 'bg-blue-50 text-blue-700' :
                     idx % 3 === 1 ? 'bg-purple-50 text-purple-700' :
                     'bg-orange-50 text-orange-700'
                 }`}>
                     {tag}
                 </span>
             ))}
         </div>
      )}

      {/* Bullet points preview (up to 2) */}
      {card.tasks.length > 0 && (
          <ul className="mb-4 space-y-1">
              {card.tasks.slice(0, 2).map(task => (
                  <li key={task.id} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className={`w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0 ${task.completed ? 'bg-green-400' : ''}`} />
                      <span className={`truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.content}</span>
                  </li>
              ))}
              {card.tasks.length > 2 && (
                  <li className="text-[10px] text-slate-400 pl-2.5">
                      + {card.tasks.length - 2} tarefas...
                  </li>
              )}
          </ul>
      )}
      
      <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
         <div className="flex items-center gap-1.5 text-slate-400">
             <ClipboardDocumentListIcon className="w-4 h-4" />
             <span className="font-medium">{card.tasks.filter(t => t.completed).length}/{card.tasks.length}</span>
         </div>

         <div className="flex items-center gap-2">
            {/* Avatars */}
            <div className="flex -space-x-1.5">
                 {Array.from(new Set(card.tasks.flatMap(t => t.assignees))).slice(0, 3).map((assignee, idx) => (
                     <div key={idx} title={assignee} className="h-5 w-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white">
                         {assignee.charAt(0).toUpperCase()}
                     </div>
                 ))}
            </div>

            {/* Status Selector (Only in Sprint) */}
            {sprintId && (
                <div 
                  className={`w-2 h-2 rounded-full ${
                    card.status === 'done' ? 'bg-green-500' :
                    card.status === 'in-progress' ? 'bg-yellow-400' :
                    'bg-slate-300'
                  }`}
                  title={card.status === 'done' ? 'Concluído' : card.status === 'in-progress' ? 'Em Curso' : 'A Fazer'}
                />
            )}
         </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pb-0">
          <div className="flex flex-col md:flex-row md:items-start justify-between px-6 py-4 gap-4">
            <div className="flex-1">
              <button onClick={onBack} className="text-sm text-slate-500 hover:underline mb-1">
                &larr; Voltar aos Projetos
              </button>
              
              {isEditingProject ? (
                <div className="mt-2 space-y-3 max-w-xl">
                    <input 
                        type="text" 
                        value={editedProjectName}
                        onChange={(e) => setEditedProjectName(e.target.value)}
                        className="w-full text-2xl font-bold border-b border-blue-500 focus:outline-none bg-slate-50 px-2 py-1"
                        placeholder="Nome do Projeto"
                    />
                    <textarea 
                        value={editedProjectDesc}
                        onChange={(e) => setEditedProjectDesc(e.target.value)}
                        className="w-full text-sm text-slate-600 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        rows={2}
                        placeholder="Descrição do projeto..."
                    />
                    <div className="flex gap-2">
                        <button onClick={saveProjectDetails} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Guardar</button>
                        <button onClick={() => { setIsEditingProject(false); setEditedProjectName(project.name); setEditedProjectDesc(project.description); }} className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs hover:bg-slate-300">Cancelar</button>
                    </div>
                </div>
              ) : (
                <div className="group relative">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            {project.name}
                            <button 
                                onClick={() => setIsEditingProject(true)} 
                                className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                title="Editar nome e descrição do projeto"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                        </h1>
                        {project.totalHours && (
                           <div className="hidden sm:flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100" title="Orçamento estimado">
                               <ClockIcon className="w-3.5 h-3.5" />
                               {project.totalHours}h (~{(project.totalHours / 8).toFixed(1)} dias)
                           </div>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm truncate max-w-xl mt-1">{project.description}</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end min-w-[200px]">
               <div className="text-sm font-semibold text-slate-700 mb-1">
                 Progresso Global
               </div>
               <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.percentage}%` }}
                  ></div>
               </div>
               <div className="text-xs text-slate-500">
                  {stats.percentage}% Concluído ({stats.completedTasks}/{stats.totalTasks} tarefas)
               </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-6 border-t border-slate-100 bg-slate-50 overflow-x-auto space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium text-sm transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
                activeTab === 'overview' 
                  ? 'border-primary text-primary bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ChartBarIcon className="w-4 h-4" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('backlog')}
              className={`px-4 py-3 font-medium text-sm transition-colors whitespace-nowrap border-b-2 ${
                activeTab === 'backlog' 
                  ? 'border-primary text-primary bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              Backlog do Produto
            </button>
            {project.sprints.map((sprint) => (
              <button
                key={sprint.id}
                onClick={() => setActiveTab(sprint.id)}
                className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap flex flex-col items-start border-b-2 ${
                  activeTab === sprint.id 
                    ? 'border-primary text-primary bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{sprint.name}</span>
                <span className="text-[10px] font-normal opacity-70">
                  {new Date(sprint.startDate).toLocaleDateString('pt-PT')}
                </span>
              </button>
            ))}
          </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-canvas">
        {activeTab === 'overview' && (
             <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Métricas do Projeto</h2>
                        {project.totalHours && (
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Orçamento de Tempo</p>
                                <p className="text-lg font-bold text-indigo-600">{project.totalHours} Horas <span className="text-sm font-normal text-slate-400">({(project.totalHours/8).toFixed(1)} dias)</span></p>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="text-blue-600 text-sm font-semibold uppercase">Total de Tarefas</h3>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalTasks}</p>
                            <p className="text-xs text-slate-500 mt-1">{stats.completedTasks} concluídas</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h3 className="text-purple-600 text-sm font-semibold uppercase">Pontos (Story Points)</h3>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalPoints}</p>
                            <p className="text-xs text-slate-500 mt-1">{stats.completedPoints} pontos entregues</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <h3 className="text-green-600 text-sm font-semibold uppercase">Conclusão</h3>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.percentage}%</p>
                            <div className="w-full bg-green-200 rounded-full h-1.5 mt-2">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.percentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {Object.keys(stats.assigneeDistribution).length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Distribuição por Equipa</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {Object.entries(stats.assigneeDistribution).map(([name, count]) => (
                                <div key={name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 truncate max-w-[100px]">{name}</p>
                                        <p className="text-xs text-slate-500">{count} tarefas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
        )}

        {activeTab === 'backlog' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5" />
                Itens do Backlog ({project.backlog.length})
                </h2>
                <button 
                  onClick={addNewCardToBacklog}
                  className="text-sm flex items-center gap-1 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 text-black transition-colors shadow-sm"
                >
                    <PlusIcon className="w-4 h-4" />
                    Adicionar Cartão
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.backlog.map(card => renderCard(card))}
              {project.backlog.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                  O Backlog está vazio. Adicione um novo cartão.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab !== 'backlog' && activeTab !== 'overview' && (
          (() => {
            const sprint = project.sprints.find(s => s.id === activeTab);
            if (!sprint) return null;
            
            const todo = sprint.cards.filter(c => c.status === 'todo');
            const inProgress = sprint.cards.filter(c => c.status === 'in-progress');
            const done = sprint.cards.filter(c => c.status === 'done');

            return (
              <div className="flex gap-6 h-full overflow-x-auto pb-4">
                {[
                    { title: 'A Fazer', items: todo, color: 'bg-slate-100', border: 'border-slate-200' },
                    { title: 'Em Curso', items: inProgress, color: 'bg-blue-50', border: 'border-blue-100' },
                    { title: 'Concluído', items: done, color: 'bg-green-50', border: 'border-green-100' }
                ].map((col, idx) => (
                    <div key={idx} className={`flex-1 min-w-[300px] flex flex-col rounded-xl ${col.color} border ${col.border} h-full shadow-sm`}>
                        <div className="p-3 border-b border-black/5 font-semibold text-slate-700 flex justify-between">
                            {col.title}
                            <span className="bg-white/50 px-2 rounded text-sm text-slate-500">{col.items.length}</span>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                            {col.items.map(card => renderCard(card, sprint.id))}
                        </div>
                    </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedCard(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                      {isEditingCard ? (
                          <input 
                            className="w-full text-xl font-bold text-slate-800 border-b border-slate-300 focus:border-primary outline-none pb-1 bg-transparent"
                            value={selectedCard.title}
                            onChange={(e) => updateCardDetails(selectedCard.id, { title: e.target.value })}
                            autoFocus
                            placeholder="Título do cartão"
                          />
                      ) : (
                          <h3 
                            className="text-xl font-bold text-slate-800 cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                            onClick={() => setIsEditingCard(true)}
                            title="Clique para editar o título"
                          >
                              {selectedCard.title}
                              <PencilIcon className="w-4 h-4 text-slate-300" />
                          </h3>
                      )}
                  </div>
                  <button onClick={() => setSelectedCard(null)} className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-1">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
              </div>
              <div className="mt-2">
                  {isEditingCard ? (
                      <textarea
                        className="w-full text-black bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-primary outline-none mt-1"
                        rows={3}
                        value={selectedCard.description}
                        onChange={(e) => updateCardDetails(selectedCard.id, { description: e.target.value })}
                        placeholder="Descrição detalhada..."
                      />
                  ) : (
                      <p 
                        className="text-black bg-white cursor-pointer hover:bg-slate-50 p-2 rounded border border-transparent hover:border-slate-200 text-sm leading-relaxed"
                        onClick={() => setIsEditingCard(true)}
                        title="Clique para editar a descrição"
                      >
                          {selectedCard.description || "Sem descrição. Clique para adicionar."}
                      </p>
                  )}
              </div>
              
              <div className="mt-4 flex gap-3 items-center">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-bold">
                    {selectedCard.storyPoints} Pontos
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-md font-bold capitalize ${
                      selectedCard.status === 'done' ? 'bg-green-100 text-green-700' :
                      selectedCard.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedCard.status === 'todo' ? 'A Fazer' : selectedCard.status === 'in-progress' ? 'Em Curso' : 'Concluído'}
                  </span>
                  {isEditingCard && (
                      <button 
                        onClick={() => setIsEditingCard(false)}
                        className="text-xs bg-primary text-white px-3 py-1 rounded ml-auto hover:bg-blue-600 shadow-sm"
                      >
                          Concluir Edição
                      </button>
                  )}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Checklist & Responsáveis</h4>
              </div>
              
              <div className="space-y-3">
                {selectedCard.tasks.map(task => (
                  <div key={task.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                      <div className="flex items-start gap-3 w-full">
                        <div 
                            onClick={() => toggleTask(selectedCard.id, task.id)}
                            className={`mt-0.5 min-w-[1.25rem] h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white hover:border-primary'
                            }`}>
                        {task.completed && <CheckIcon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1">
                            <span className={`text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {task.content}
                            </span>
                        </div>
                        <button 
                            onClick={(e) => deleteSubTask(e, selectedCard.id, task.id)}
                            className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Remover sub-tarefa"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Assignee Section */}
                      <div className="ml-8 mt-3 flex flex-wrap gap-2 items-center">
                          {task.assignees.map((assignee, idx) => (
                              <div key={idx} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 shadow-sm">
                                  <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold">
                                      {assignee.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-slate-700 font-medium">{assignee}</span>
                              </div>
                          ))}
                          
                          {newAssigneeInput?.taskId === task.id ? (
                             <div className="flex items-center gap-1 animate-fadeIn">
                                 <input 
                                   autoFocus
                                   type="text"
                                   className="text-xs border border-blue-400 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                   placeholder="Nome do responsável..."
                                   onKeyDown={(e) => {
                                       if(e.key === 'Enter') addAssignee(selectedCard.id, task.id, e.currentTarget.value);
                                       if(e.key === 'Escape') setNewAssigneeInput(null);
                                   }}
                                   onBlur={(e) => {
                                        if (e.target.value) addAssignee(selectedCard.id, task.id, e.target.value);
                                        else setNewAssigneeInput(null);
                                   }}
                                 />
                             </div>
                          ) : (
                             <button 
                                onClick={() => setNewAssigneeInput({taskId: task.id, name: ''})}
                                className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-slate-300 hover:border-primary hover:bg-blue-50 transition-colors"
                             >
                                 <UserPlusIcon className="w-3 h-3" />
                                 <span>Atribuir</span>
                             </button>
                          )}
                      </div>
                  </div>
                ))}

                {/* ADD NEW TASK INPUT */}
                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                    <PlusIcon className="w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder="Adicionar nova sub-tarefa..."
                        className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') addSubTask(selectedCard.id);
                        }}
                    />
                    <button 
                        onClick={() => addSubTask(selectedCard.id)}
                        disabled={!newTaskInput.trim()}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded disabled:opacity-50"
                    >
                        Adicionar
                    </button>
                </div>
                
                {selectedCard.tasks.length === 0 && !newTaskInput && (
                    <p className="text-slate-400 text-sm italic text-center py-4">Nenhuma tarefa definida.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
                <button 
                    onClick={(e) => deleteCard(e, selectedCard.id)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors text-sm font-medium"
                >
                    <TrashIcon className="w-4 h-4" />
                    Apagar Cartão
                </button>
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium shadow-sm"
                >
                    Fechar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};