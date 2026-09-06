/**
 * Carrega o `.env.local` antes de qualquer outro módulo.
 *
 * Tem de ser um ficheiro à parte por causa da ordem de avaliação: os imports de
 * um módulo são executados todos antes do corpo dele, portanto chamar
 * `dotenv.config()` dentro do script chegava tarde — o `src/lib/env.ts` já
 * tinha corrido a validação e rebentado por falta de variáveis.
 *
 * Importando este módulo em primeiro lugar, o ambiente fica carregado antes de
 * o resto sequer ser avaliado.
 */
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

const ENV_FILE = '.env.local';

if (!existsSync(ENV_FILE)) {
  process.stderr.write(
    `\n  Falta o ficheiro ${ENV_FILE} na raiz do projeto.\n` +
      `  Copia o .env.local.example e preenche as chaves.\n\n`,
  );
  process.exit(1);
}

config({ path: ENV_FILE, quiet: true });
