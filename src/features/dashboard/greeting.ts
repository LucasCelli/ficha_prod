import { getBusinessHour, getBusinessTodayInput } from "@/lib/dates";

type GreetingPeriod = "morning" | "afternoon" | "evening" | "lateNight";

type GreetingTemplate = {
  lead: string;
  prompt: string;
};

export type DashboardGreeting = {
  lead: string;
  prompt: string;
};

const GREETINGS: Record<GreetingPeriod, GreetingTemplate[]> = {
  morning: [
    { lead: "Bom dia, {user}!", prompt: "Qual é a prioridade de hoje?" },
    { lead: "Bom dia, {user}!", prompt: "Vamos fazer acontecer?" },
    { lead: "Tudo pronto, {user}.", prompt: "Vamos começar?" },
    { lead: "Novo dia, {user}.", prompt: "Qual é o primeiro passo?" },
    { lead: "Hora de começar, {user}.", prompt: "O que vem primeiro?" },
    { lead: "Bom dia, {user}!", prompt: "Vamos nessa?" },
  ],
  afternoon: [
    { lead: "Boa tarde, {user}!", prompt: "Qual é o próximo passo?" },
    { lead: "Seguimos juntos, {user}.", prompt: "O que vem agora?" },
    { lead: "Boa tarde, {user}!", prompt: "Hora de avançar." },
    { lead: "A bola está com você, {user}.", prompt: "Qual é o plano?" },
    { lead: "Vamos nessa, {user}.", prompt: "Qual é a prioridade?" },
    { lead: "Tudo pronto por aqui, {user}.", prompt: "E agora?" },
  ],
  evening: [
    { lead: "Boa noite, {user}!", prompt: "Vamos fechar bem o dia?" },
    { lead: "Boa noite, {user}!", prompt: "Qual é o próximo passo?" },
    { lead: "Seguimos por aqui, {user}.", prompt: "O que vem agora?" },
    { lead: "Pronto para a próxima etapa, {user}?", prompt: "Vamos nessa." },
    { lead: "Ainda tem energia, {user}?", prompt: "Vamos avançar." },
    { lead: "Reta final, {user}.", prompt: "O que falta hoje?" },
  ],
  lateNight: [
    { lead: "Ainda por aqui, {user}?", prompt: "Vamos adiantar." },
    { lead: "Noite produtiva, {user}.", prompt: "Qual é o próximo passo?" },
    { lead: "Boa noite, {user}.", prompt: "Vamos resolver mais uma?" },
    { lead: "Reta final, {user}.", prompt: "O que vem agora?" },
    { lead: "Tudo pronto por aqui, {user}.", prompt: "Manda ver." },
    { lead: "Vamos fechar essa etapa, {user}?", prompt: "Estamos juntos." },
  ],
};

export function getDashboardGreeting(userName: string, date = new Date()): DashboardGreeting {
  const normalizedName = userName.trim() || "você";
  const period = getGreetingPeriod(getBusinessHour(date));
  const templates = GREETINGS[period];
  const seed = `${getBusinessTodayInput(date)}:${period}:${normalizedName.toLocaleLowerCase("pt-BR")}`;
  const template = templates[hashString(seed) % templates.length] ?? templates[0];

  return {
    lead: interpolateUser(template.lead, normalizedName),
    prompt: interpolateUser(template.prompt, normalizedName),
  };
}

function getGreetingPeriod(hour: number): GreetingPeriod {
  if (hour < 5 || hour >= 22) return "lateNight";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function interpolateUser(template: string, userName: string) {
  return template.replaceAll("{user}", userName);
}
