-- Lot 1 : tagline en trois mots par recette (affichée en serif sur la carte). À coller dans SQL Editor → Run.
alter table public.recipes add column if not exists tagline text;
update public.recipes set tagline = 'Doré. Fondant. Épicé.' where id = 'r03-curry-de-poulet-coco-epinards';
