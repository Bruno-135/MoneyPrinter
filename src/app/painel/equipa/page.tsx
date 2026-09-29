import { createClient } from '@/lib/supabase/server';
import { exigirSerDono } from '@/lib/equipa/quem-sou';
import { membros } from '@/lib/equipa/repository';
import { nomeDaArea, TODAS_AS_AREAS } from '@/lib/equipa/permissoes';
import { getServerEnv } from '@/lib/env';
import { CaixasDeAcesso, CriarPessoa } from './formulario';
import { guardarAcessos, suspenderPessoa, tirarPessoa } from './actions';

/**
 * Equipa e permissões.
 *
 * O DONO NÃO ESTÁ NA TABELA e é por isso que aparece aqui em cima, à parte,
 * com tudo. Quem não é membro de ninguém é dono do seu próprio espaço, e isso
 * sai de graça da conta que a base faz — não há uma linha "dono" que alguém
 * possa apagar por engano e ficar com uma conta sem dono.
 */

export const dynamic = 'force-dynamic';

export default async function EquipaPage() {
  const dono = await exigirSerDono();
  const db = await createClient();
  const equipa = await membros(db);
  const { data: auth } = await db.auth.getUser();

  const temChave = Boolean(getServerEnv().SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="flex flex-col gap-4">
      {/* O dono. */}
      <div className="border-marca bg-surf flex flex-wrap items-center gap-3 rounded-2xl border p-4">
        <span className="bg-marca flex size-9 shrink-0 items-center justify-center rounded-xl font-mono text-[12px] font-bold text-[#141210]">
          {(auth.user?.email ?? '?').slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">Tu — dono da conta</span>
          <span className="text-ink3 block font-mono text-[11px]">{auth.user?.email}</span>
        </span>
        <span className="text-marca border-marca rounded-full border px-3 py-1 font-mono text-[11px] font-bold">
          TODOS OS ACESSOS
        </span>
      </div>

      <p className="text-ink2 text-[13px] leading-relaxed">
        Quem criares aqui entra no <strong>mesmo painel que tu</strong> — os mesmos leads, os mesmos
        sites, os mesmos clientes — e vê só as áreas que lhe marcares. As áreas que mexem em
        dinheiro estão assinaladas.
      </p>

      {!temChave && (
        <div
          className="rounded-2xl border p-4 text-[13px] leading-relaxed"
          style={{
            borderColor: 'var(--warm)',
            background: 'color-mix(in oklch, var(--warm) 10%, transparent)',
          }}
        >
          <strong>Falta uma chave para poderes criar contas.</strong> Tudo o resto desta página já
          funciona, mas o botão de criar vai recusar enquanto a{' '}
          <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> não estiver nas variáveis do
          Vercel. Vais buscá-la a Supabase → Project Settings → API Keys → <em>service_role</em>, e
          colas em Vercel → Settings → Environment Variables, para Production e Preview. Não ma
          mandes a mim.
        </div>
      )}

      <CriarPessoa />

      {equipa.length === 0 ? (
        <div className="border-line rounded-2xl border border-dashed px-6 py-10 text-center">
          <p className="text-[15px] font-bold">Por enquanto és só tu.</p>
          <p className="text-ink2 mx-auto mt-1 max-w-md text-[13px]">
            Quem juntares aqui recebe um email e uma senha para entrar em{' '}
            <span className="font-mono">/entrar</span>.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {equipa.map((m) => (
            <li key={m.id} className="border-line bg-surf2 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-[15px] font-bold">{m.nome}</h2>
                <span className="text-ink3 font-mono text-[12px]">{m.email}</span>
                {!m.ativo && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{
                      background: 'color-mix(in oklch, var(--bad) 14%, transparent)',
                      color: 'var(--bad)',
                    }}
                  >
                    suspenso
                  </span>
                )}
              </div>

              <p className="text-ink2 mt-1 text-[12px]">
                {m.permissoes.length === 0
                  ? 'Sem acesso a nenhuma área — entra mas não vê nada.'
                  : m.permissoes.map(nomeDaArea).join(' · ')}
              </p>

              <details className="mt-3">
                <summary className="border-line inline-flex h-9 cursor-pointer list-none items-center rounded-lg border px-3 text-[12px] font-semibold">
                  Mudar acessos
                </summary>
                <form action={guardarAcessos} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="id" value={m.id} />
                  <CaixasDeAcesso marcadas={m.permissoes} />
                  <button
                    type="submit"
                    className="bg-marca h-9 self-start rounded-lg px-4 text-[12px] font-bold text-[#141210]"
                  >
                    Guardar acessos
                  </button>
                </form>
              </details>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <form action={suspenderPessoa}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="ativo" value={m.ativo ? 'nao' : 'sim'} />
                  <button
                    type="submit"
                    className="border-line h-9 rounded-lg border px-3 text-[12px] font-semibold"
                  >
                    {m.ativo ? 'Suspender' : 'Voltar a dar acesso'}
                  </button>
                </form>

                {/* Em dois passos, como o excluir dos e-mails: o aviso fica
                    escrito no ecrã e dá para desistir. */}
                <details className="group ml-auto flex flex-wrap items-center justify-end gap-2">
                  <summary className="text-ink3 hover:text-bad flex h-9 cursor-pointer list-none items-center rounded-lg px-3 text-[12px] font-semibold">
                    <span className="group-open:hidden">Tirar da equipa</span>
                    <span className="hidden group-open:inline">Cancelar</span>
                  </summary>
                  <form
                    action={tirarPessoa}
                    className="flex flex-wrap items-center justify-end gap-2"
                  >
                    <input type="hidden" name="id" value={m.id} />
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--bad)' }}>
                      Perde o acesso já. A conta de entrada continua a existir.
                    </span>
                    <button
                      type="submit"
                      className="h-9 rounded-lg px-3 text-[12px] font-semibold text-white"
                      style={{ background: 'var(--bad)' }}
                    >
                      Sim, tirar
                    </button>
                  </form>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink3 border-line border-t pt-4 text-[12px] leading-relaxed">
        São {TODAS_AS_AREAS.length} áreas ao todo. Suspender fecha a porta no instante seguinte e
        guarda a pessoa na lista; tirar da equipa só lhe tira o acesso a este painel — a conta de
        entrada dela continua a existir. Tu, como dono ({dono.userId.slice(0, 8)}), não podes ser
        suspenso nem tirado por ninguém.
      </p>
    </div>
  );
}
