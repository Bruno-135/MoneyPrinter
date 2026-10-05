-- Fora o envio de e-mails: só fica a extração.
--
-- A 0041 criou o que um compositor de e-mails precisava: uma tabela de
-- campanhas e duas funções que um visitante anónimo podia chamar (cancelar a
-- subscrição, registar o aviso do Resend). Decidiu-se não ter envio. Funções
-- chamáveis por anónimos que não servem a nada são superfície a mais, por isso
-- saem. `emails_enviados` e `nao_contactar` ficam: a vista do estado de
-- contacto lê-as.

drop function if exists public.cancelar_subscricao(uuid);
drop function if exists public.registar_evento_email(text, text);
drop table if exists public.campanhas_email;
