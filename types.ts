export interface Task {
  id: string;
  content: string;
  completed: boolean;
  assignees: string[]; // Lista de nomes das pessoas atribuídas
}

export interface Card {
  id: string;
  title: string;
  description: string;
  storyPoints?: number;
  tasks: Task[];
  status: 'todo' | 'in-progress' | 'done';
  tags?: string[]; // Tags para categorização (ex: frontend, backend, design)
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string; // ISO Date
  endDate: string;   // ISO Date
  cards: Card[];
  isCompleted: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  backlog: Card[];
  sprints: Sprint[];
  createdAt: string;
  totalHours?: number; // Total de horas orçamentadas para o projeto
}

// AI Response structure
export interface AIProjectResponse {
  projectName: string;
  projectDescription: string;
  backlogCards: {
    title: string;
    description: string;
    tasks: string[];
    storyPoints: number;
    tags?: string[];
  }[];
  sprints: {
    name: string;
    cards: {
      title: string;
      description: string;
      tasks: string[];
      storyPoints: number;
      tags?: string[];
    }[];
  }[];
}