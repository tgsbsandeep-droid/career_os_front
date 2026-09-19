import { apiRequest } from "./api";

export interface CareerAdviceRequest {
  name: string;
  skills: string[];
  experience: string[];
  targetRole?: string;
}

export async function getCareerAdvice(
  profile: CareerAdviceRequest
) {
  const data = await apiRequest<{ result?: string }>(
    "/api/ai/career-advice",
    {
      method: "POST",
      body: JSON.stringify(profile),
    },
  );

  if (!data.result) throw new Error("AI returned no career advice");
  return data.result;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAssistant(payload: {
  message: string;
  history?: AssistantTurn[];
  profile?: {
    name?: string;
    skills?: string[];
    experience?: string[];
    targetRole?: string;
  };
}) {
  const data = await apiRequest<{ result?: string }>("/api/ai/assistant", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data.result) throw new Error("AI returned no reply");
  return data.result;
}
