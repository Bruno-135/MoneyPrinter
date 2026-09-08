'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';

/**
 * Os filtros da lista de prospetos.
 *
 * Eram três fileiras de botões — uma por procura feita, uma por estado da
 * negociação, uma por tipo de presença online. Com duas ou três procuras já
 * eram vinte botões antes de se chegar à lista, e a lista é o que se veio cá
 * ver. Passam a três caixas de seleção, como a do ramo no ecrã de procurar.
 *
 * Cada opção já traz o endereço completo lá dentro, calculado no servidor: mudar
 * uma coisa não pode apagar as outras, e essa era a maneira mais fácil de o
 * fazer sem dar por isso.
 *
 * São caixas nativas do sistema e não listas desenhadas por nós. No telemóvel
 * isso vale muito: a do comércio pode ter centenas de nomes, e o seletor do
 * telefone abre-a em ecrã inteiro, com rolagem a sério e com a escrita rápida
 * do teclado a saltar para a letra certa. Uma lista feita à mão em HTML teria
 * de reimplementar tudo isso, pior.
 */

export interface FilterOption {
  value: string;
  label: string;
  href: Route;
}

export interface FilterGroup {
  /** Nome curto, mostrado por cima da caixa. */
  label: string;
  /** Valor atualmente escolhido, para a caixa o mostrar. */
  current: string;
  options: FilterOption[];
}

export function FilterBar({ groups }: { groups: FilterGroup[] }) {
  const router = useRouter();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <label key={group.label} className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide opacity-45">{group.label}</span>
          <select
            value={group.current}
            onChange={(event) => {
              const chosen = group.options.find((option) => option.value === event.target.value);
              if (chosen) router.push(chosen.href);
            }}
            className="w-full rounded-md border border-black/15 bg-white/60 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
          >
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
