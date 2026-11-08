-- Allergens per menu item, from the item's `allergen-has_<code>` classes, in page order,
-- stored without the `has_` prefix. Codes are UNC's: egg, soy, wheat, milk, fish,
-- shellfish, peanut, tree_nuts, sesame, gluten. Unknown future codes are stored as-is;
-- the web app maps codes to labels.

alter table menu_item add column allergens text[] not null default '{}';

create index menu_item_allergens_idx on menu_item using gin (allergens);
