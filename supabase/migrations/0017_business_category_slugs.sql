-- ---------------------------------------------------------------------------
-- 0017 — business_category passa a guardar o SLUG, e não o rótulo
--
-- `businesses.business_category` guardava "Padaria"; `searched_regions`
-- guardava "padaria"; e a lista de ramos do código — a mesma que enche o
-- seletor do ecrã de procurar e o funil do filtro — também usa "padaria".
-- Três sítios, duas grafias.
--
-- O efeito visível: o funil "Ramo" do painel oferecia "Padaria" (o rótulo, que
-- é o que estava na coluna), mas a validação do endereço comparava com os
-- slugs. A escolha era descartada em silêncio e a lista não mudava. Filtrar
-- não fazia nada, e nada no ecrã dizia porquê.
--
-- Esta migração converte o que já está gravado. O código deixou de escrever
-- rótulos ao mesmo tempo (ver `normalize.ts`), portanto isto corre uma vez.
--
-- Um rótulo que não esteja nesta lista fica como está: é melhor ter uma linha
-- com um valor estranho e visível do que apagá-la por não a reconhecer.
-- ---------------------------------------------------------------------------

update public.businesses
set business_category = case business_category
  when 'Restaurante'              then 'restaurante'
  when 'Padaria'                  then 'padaria'
  when 'Cabeleireiro'             then 'cabeleireiro'
  when 'Barbearia'                then 'barbearia'
  when 'Salão de beleza'          then 'salao-beleza'
  when 'Ginásio'                  then 'ginasio'
  when 'Estúdio de pilates/yoga'  then 'pilates-yoga'
  when 'Oficina mecânica'         then 'oficina'
  when 'Pet shop'                 then 'pet-shop'
  when 'Clínica dentária'         then 'clinica-dentaria'
  when 'Clínica de fisioterapia'  then 'fisioterapia'
  when 'Escritório de advogados'  then 'advogados'
  when 'Contabilidade'            then 'contabilidade'
  when 'Loja de roupa'            then 'loja-roupa'
  else business_category
end
where business_category <> lower(business_category);
