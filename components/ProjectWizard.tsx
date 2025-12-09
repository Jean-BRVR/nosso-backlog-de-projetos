import React, { useState } from 'react';
import { analyzeProjectImage, ImageInput } from '../services/geminiService';
import { AIProjectResponse, Project } from '../types';
import { ArrowPathIcon, PhotoIcon, CheckCircleIcon, XCircleIcon, ClockIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface ProjectWizardProps {
  onSave: (project: Project) => void;
  onCancel: () => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ onSave, onCancel }) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [images, setImages] = useState<string[]>([]); // Array of base64 strings
  const [aiData, setAiData] = useState<AIProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectHours, setProjectHours] = useState<number>(40); // Default 40h

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array
    const fileList = Array.from(files);
    
    // Process all files using Promises to ensure sequential/reliable loading
    const promises = fileList.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                resolve('');
            }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file as Blob);
      });
    });

    try {
        const results = await Promise.all(promises);
        const validResults = results.filter(r => r.length > 0);
        setImages(prev => [...prev, ...validResults]);
    } catch (err) {
        console.error("Erro ao ler ficheiros", err);
        setError("Ocorreu um erro ao processar as imagens.");
    }

    // Reset the input value to allow selecting the same file again immediately if needed
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    
    setStep('analyzing');
    setError(null);

    try {
      const imageInputs: ImageInput[] = images.map(imgStr => {
        const [mimePrefix, base64Data] = imgStr.split(';base64,');
        const mimeType = mimePrefix.split(':')[1];
        return { base64: base64Data, mimeType };
      });

      const data = await analyzeProjectImage(imageInputs);
      setAiData(data);
      setStep('review');
    } catch (err) {
      setError("Falha ao analisar as imagens. Por favor, tente novamente.");
      setStep('upload');
    }
  };

  // Funções de Edição durante a Revisão
  const updateBacklogCard = (index: number, field: string, value: any) => {
    if (!aiData) return;
    const updatedBacklog = [...aiData.backlogCards];
    updatedBacklog[index] = { ...updatedBacklog[index], [field]: value };
    setAiData({ ...aiData, backlogCards: updatedBacklog });
  };

  const removeBacklogCard = (index: number) => {
    if (!aiData) return;
    const updatedBacklog = aiData.backlogCards.filter((_, i) => i !== index);
    setAiData({ ...aiData, backlogCards: updatedBacklog });
  };

  const updateSprintCard = (sprintIndex: number, cardIndex: number, field: string, value: any) => {
    if (!aiData) return;
    const updatedSprints = [...aiData.sprints];
    updatedSprints[sprintIndex].cards[cardIndex] = { 
      ...updatedSprints[sprintIndex].cards[cardIndex], 
      [field]: value 
    };
    setAiData({ ...aiData, sprints: updatedSprints });
  };

  const removeSprintCard = (sprintIndex: number, cardIndex: number) => {
    if (!aiData) return;
    const updatedSprints = [...aiData.sprints];
    updatedSprints[sprintIndex].cards = updatedSprints[sprintIndex].cards.filter((_, i) => i !== cardIndex);
    setAiData({ ...aiData, sprints: updatedSprints });
  };

  const handleConfirm = () => {
    if (!aiData) return;

    const now = new Date();
    
    const newProject: Project = {
      id: generateId(),
      name: aiData.projectName,
      description: aiData.projectDescription,
      createdAt: now.toISOString(),
      totalHours: projectHours,
      backlog: aiData.backlogCards.map(c => ({
        id: generateId(),
        title: c.title,
        description: c.description,
        storyPoints: Number(c.storyPoints),
        status: 'todo',
        tags: c.tags || [],
        tasks: c.tasks.map(t => ({ id: generateId(), content: t, completed: false, assignees: [] }))
      })),
      sprints: aiData.sprints.map((s, index) => {
        const sprintStart = new Date(now);
        sprintStart.setDate(now.getDate() + (index * 15));
        const sprintEnd = new Date(sprintStart);
        sprintEnd.setDate(sprintStart.getDate() + 15);

        return {
          id: generateId(),
          name: s.name,
          startDate: sprintStart.toISOString(),
          endDate: sprintEnd.toISOString(),
          isCompleted: false,
          cards: s.cards.map(c => ({
            id: generateId(),
            title: c.title,
            description: c.description,
            storyPoints: Number(c.storyPoints),
            status: 'todo',
            tags: c.tags || [],
            tasks: c.tasks.map(t => ({ id: generateId(), content: t, completed: false, assignees: [] }))
          }))
        };
      })
    };

    onSave(newProject);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg my-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Novo Projeto via IA</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <XCircleIcon className="w-8 h-8" />
        </button>
      </div>

      {step === 'upload' && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 bg-slate-50">
          
          {/* Image Grid */}
          {images.length > 0 ? (
            <div className="w-full mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((imgStr, idx) => (
                        <div key={idx} className="relative group aspect-square">
                            <img src={imgStr} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded-lg shadow-md border border-slate-200" />
                            <button 
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100"
                            >
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    
                    {/* Add More Button */}
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors aspect-square">
                        <PlusIcon className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500">Adicionar</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                    </label>
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">{images.length} imagem(ns) selecionada(s)</p>
            </div>
          ) : (
            <div className="text-center mb-6 py-10">
              <PhotoIcon className="w-16 h-16 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">Faça upload de imagens do seu backlog, quadro ou rascunhos.</p>
              <p className="text-xs text-slate-400 mt-1">Pode carregar múltiplas fotos.</p>
            </div>
          )}
          
          <input 
            type="file" 
            accept="image/*" 
            multiple
            onChange={handleFileChange} 
            className="hidden" 
            id="image-upload-init"
          />
          
          <div className="w-full max-w-xs space-y-4">
             {images.length === 0 && (
                <label 
                  htmlFor="image-upload-init" 
                  className="block w-full text-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Selecionar Imagens
                </label>
             )}

             <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                   <ClockIcon className="w-4 h-4" />
                   Horas Disponíveis para o Projeto
                </label>
                <div className="flex items-center gap-2">
                   <input 
                      type="number" 
                      min="1"
                      value={projectHours}
                      onChange={(e) => setProjectHours(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-white text-black font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                   />
                   <span className="text-xs text-slate-500 whitespace-nowrap">
                      ~{(projectHours / 8).toFixed(1)} dias
                   </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Considerando 8h por dia de trabalho.</p>
             </div>

             {error && <p className="text-red-500 text-sm text-center">{error}</p>}

             {images.length > 0 && (
                <button 
                  onClick={handleAnalyze}
                  className="w-full bg-primary text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Analisar e Gerar
                </button>
             )}
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mb-6"></div>
          <h3 className="text-xl font-semibold text-slate-700">A IA está a ler as suas imagens...</h3>
          <p className="text-slate-500 mt-2">A identificar cartões, a criar sprints e a organizar tarefas.</p>
        </div>
      )}

      {step === 'review' && aiData && (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-blue-900 mb-1">Revisão Sugerida</h3>
                <p className="text-blue-700 text-sm">
                  A IA gerou a estrutura abaixo. Edite os títulos e pontos antes de confirmar.
                </p>
             </div>
             <div className="text-right bg-white/50 p-2 rounded border border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase">Orçamento</p>
                <p className="text-sm font-bold text-blue-900">{projectHours} Horas</p>
                <p className="text-xs text-blue-600">~{(projectHours/8).toFixed(1)} dias de trabalho</p>
             </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome do Projeto</label>
              <input 
                type="text" 
                value={aiData.projectName} 
                onChange={(e) => setAiData({...aiData, projectName: e.target.value})}
                className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-primary focus:ring focus:ring-primary/50 sm:text-sm p-2 border"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BACKLOG REVIEW */}
              <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                <h4 className="font-semibold text-slate-700 mb-2 sticky top-0 bg-slate-50 pb-2 border-b flex justify-between items-center">
                  <span>Backlog ({aiData.backlogCards.length})</span>
                </h4>
                <div className="space-y-2">
                  {aiData.backlogCards.map((card, idx) => (
                    <div key={idx} className="bg-white p-3 rounded shadow-sm border border-slate-200 group">
                      <div className="flex gap-2 mb-2">
                         <input 
                            className="flex-1 font-medium text-sm text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none bg-transparent"
                            value={card.title}
                            onChange={(e) => updateBacklogCard(idx, 'title', e.target.value)}
                         />
                         <button onClick={() => removeBacklogCard(idx)} className="text-slate-300 hover:text-red-500">
                            <TrashIcon className="w-4 h-4" />
                         </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{card.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <span className="text-xs text-slate-500">Pts:</span>
                            <input 
                                type="number" 
                                className="w-10 bg-white text-black border border-slate-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                value={card.storyPoints}
                                onChange={(e) => updateBacklogCard(idx, 'storyPoints', e.target.value)}
                            />
                         </div>
                         <span className="text-xs text-slate-400">{card.tasks.length} tarefas</span>
                      </div>
                    </div>
                  ))}
                  {aiData.backlogCards.length === 0 && <p className="text-sm text-slate-400 italic">Backlog vazio.</p>}
                </div>
              </div>

              {/* SPRINTS REVIEW */}
              <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                <h4 className="font-semibold text-slate-700 mb-2 sticky top-0 bg-slate-50 pb-2 border-b">
                  Sprints ({aiData.sprints.length})
                </h4>
                <div className="space-y-4">
                  {aiData.sprints.map((sprint, sIdx) => (
                    <div key={sIdx} className="bg-white bg-opacity-50 p-3 rounded-lg border border-slate-200">
                      <h5 className="font-bold text-sm text-primary mb-2">{sprint.name}</h5>
                      <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                         {sprint.cards.map((card, cIdx) => (
                            <div key={cIdx} className="bg-white p-2 rounded shadow-sm border border-slate-100">
                              <div className="flex gap-2">
                                <input 
                                    className="flex-1 text-sm font-medium text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none bg-transparent"
                                    value={card.title}
                                    onChange={(e) => updateSprintCard(sIdx, cIdx, 'title', e.target.value)}
                                />
                                <button onClick={() => removeSprintCard(sIdx, cIdx)} className="text-slate-300 hover:text-red-500">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-slate-400">Pontos:</span>
                                 <input 
                                    type="number" 
                                    className="w-12 bg-white text-black border border-slate-300 rounded px-1 text-xs text-center focus:outline-none h-6 focus:ring-1 focus:ring-primary"
                                    value={card.storyPoints}
                                    onChange={(e) => updateSprintCard(sIdx, cIdx, 'storyPoints', e.target.value)}
                                 />
                              </div>
                            </div>
                         ))}
                         {sprint.cards.length === 0 && <p className="text-xs text-slate-400 italic">Sem tarefas no sprint.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Voltar
            </button>
            <button 
              onClick={handleConfirm}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 shadow-md flex items-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Criar Projeto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};