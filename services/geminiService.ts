// services/geminiService.ts

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIProjectResponse } from "../types";
import { supabase } from "../supabaseClient"; // <-- NOVO: Importa o cliente Supabase (caminho ajustado à sua estrutura)

const SYSTEM_INSTRUCTION = `
You are an expert Agile Project Manager and Scrum Master. 
Your goal is to analyze images of project sketches, whiteboards, or documents and convert them into a structured software project.

Rules:
1. Extract the project name and a brief description.
2. Identify features and break them down into a "Backlog".
3. Plan initial Sprints. Each Sprint represents a 15-day work cycle. 
4. Distribute work logically across sprints.
5. Each "Card" (User Story) must have a list of smaller actionable sub-tasks (checklist).
6. Estimate story points (Fibonacci: 1, 2, 3, 5, 8) for each card based on complexity inferred.
7. Identify "tags" for each card (e.g., 'frontend', 'backend', 'database', 'ui/ux', 'auth').
8. Return strictly valid JSON matching the schema provided.
9. **IMPORTANT: All generated text (titles, descriptions, tasks) MUST BE in Portuguese (Portugal).**
10. **IMPORTANT: Analyze ALL provided images as parts of the SAME project.**
`;

const projectSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING, description: "O nome do projeto detetado" },
    projectDescription: { type: Type.STRING, description: "Um resumo do que é o projeto" },
    backlogCards: {
      type: Type.ARRAY,
      description: "Itens que estão no backlog mas ainda não atribuídos a um sprint",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          storyPoints: { type: Type.INTEGER },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ex: Frontend, API, Mobile" },
          tasks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Lista de sub-tarefas para completar este cartão"
          }
        },
        required: ["title", "description", "tasks", "storyPoints"]
      }
    },
    sprints: {
      type: Type.ARRAY,
      description: "Sprints propostos (15 dias cada)",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "ex: Sprint 1, Sprint 2" },
          cards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                storyPoints: { type: Type.INTEGER },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                tasks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "description", "tasks", "storyPoints"]
            }
          }
        },
        required: ["name", "cards"]
      }
    }
  },
  required: ["projectName", "projectDescription", "backlogCards", "sprints"]
};

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export const analyzeProjectImage = async (images: ImageInput[]): Promise<AIProjectResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Prepare parts: one inlineData for each image, followed by the text prompt
    const parts: any[] = images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64
      }
    }));

    parts.push({
      text: "Analisa estas imagens (que pertencem ao mesmo projeto) e cria uma estrutura de projeto com backlog e sprints de 15 dias em Português de Portugal. Gera tags relevantes para cada cartão."
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: projectSchema,
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do Gemini");

    const projectData = JSON.parse(text) as AIProjectResponse;

    // NOVO BLOCO: Inserir a resposta completa do Gemini no Supabase
    const { data, error } = await supabase
        .from('projects') // O nome 'projects' foi escolhido como padrão (ajuste se usou outro nome)
        .insert([
            { data: projectData } // 'data' é o nome da coluna JSONB
        ])
        .select();

    if (error) {
        console.error("Erro ao guardar dados no Supabase:", error);
        // Em um ambiente de produção, aqui você lidaria melhor com o erro.
    } else {
        console.log("Projeto guardado com sucesso no Supabase! ID:", data[0].id);
    }

    return projectData;

  } catch (error) {
    console.error("Erro na Análise Gemini:", error);
    throw error;
  }
};