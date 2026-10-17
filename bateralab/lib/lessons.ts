/** Aulas de leitura de partitura, na ordem do curso. */
export const LESSONS = [
  { slug: "pauta-e-clave", title: "A pauta e a clave de percussão", summary: "Onde fica cada peça da bateria na partitura." },
  { slug: "cabecas-e-vozes", title: "Cabeças de nota, pratos e pés", summary: "Bolinha ou x, chimbal aberto, hastes para cima e para baixo." },
  { slug: "figuras", title: "Figuras: quanto dura cada nota", summary: "Semibreve, mínima, semínima, colcheia, semicolcheia e fusa." },
  { slug: "pausas", title: "Pausas: o silêncio também se lê", summary: "As pausas de cada figura e como contá-las." },
  { slug: "compasso-e-contagem", title: "Compasso e contagem", summary: "Barras de compasso, fórmula (4/4, 3/4, 6/8) e como contar." },
  { slug: "colchetes-e-ponto", title: "Colchetes e ponto de aumento", summary: "Como as notas se agrupam e o que o ponto faz." },
  { slug: "acentos-fantasmas-maos", title: "Acentos, notas fantasma e mãos", summary: "Os sinais de intensidade e de qual mão usar." },
  { slug: "lendo-um-groove", title: "Lendo um groove passo a passo", summary: "Juntando tudo: o método para ler qualquer ritmo." },
  { slug: "teste", title: "Teste: o que você aprendeu", summary: "Reconheça peças e figuras na partitura." },
] as const;

export type LessonSlug = (typeof LESSONS)[number]["slug"];
