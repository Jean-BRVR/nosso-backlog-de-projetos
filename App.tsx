import React, { useState, useEffect } from 'react';
import { ProjectWizard } from './components/ProjectWizard';
import { ProjectBoard } from './components/ProjectBoard';
import { Project } from './types';
import { PlusIcon, FolderIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'wizard' | 'project'>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('visionScrum_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('visionScrum_projects', JSON.stringify(newProjects));
  };

  const handleCreateProject = (project: Project) => {
    const updatedProjects = [...projects, project];
    saveProjects(updatedProjects);
    setCurrentView('dashboard');
  };

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentView('project');
  };

  const handleUpdateProject = (updated: Project) => {
    const updatedProjects = projects.map(p => p.id === updated.id ? updated : p);
    saveProjects(updatedProjects);
  };

  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
           <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Nosso backlog de projetos</h1>
           <p className="text-slate-500 mt-2">Gira os seus projetos Ágeis criados a partir de visão computacional.</p>
        </div>
        <button 
          onClick={() => setCurrentView('wizard')}
          className="bg-primary text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-600 hover:shadow-xl transition-all flex items-center gap-2 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
           <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <FolderIcon className="w-10 h-10 text-slate-300" />
           </div>
           <h3 className="text-xl font-semibold text-slate-800">Nenhum projeto encontrado</h3>
           <p className="text-slate-500 mt-2 max-w-md mx-auto">
             Comece por fazer upload de uma imagem do seu quadro branco, rascunho ou documento de requisitos.
           </p>
           <button 
              onClick={() => setCurrentView('wizard')}
              className="mt-6 text-primary font-medium hover:underline"
           >
             Criar o meu primeiro projeto &rarr;
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div 
              key={project.id} 
              onClick={() => handleOpenProject(project.id)}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-primary group-hover:bg-blue-100 transition-colors">
                   <FolderIcon className="w-6 h-6" />
                </div>
                <div className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">
                   {new Date(project.createdAt).toLocaleDateString('pt-PT')}
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 truncate">{project.name}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">{project.description}</p>
              
              <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100">
                 <div className="flex items-center gap-1">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>{project.sprints.length} Sprints</span>
                 </div>
                 {project.totalHours && (
                     <div className="flex items-center gap-1" title="Orçamento de horas">
                        <ClockIcon className="w-4 h-4" />
                        <span>{project.totalHours}h</span>
                     </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas font-sans">
      {currentView === 'dashboard' && renderDashboard()}
      
      {currentView === 'wizard' && (
        <ProjectWizard 
          onSave={handleCreateProject}
          onCancel={() => setCurrentView('dashboard')}
        />
      )}
      
      {currentView === 'project' && activeProjectId && (
        <ProjectBoard 
          project={projects.find(p => p.id === activeProjectId)!}
          onUpdateProject={handleUpdateProject}
          onBack={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}