-- Dietary tags per menu item, from the item's `prop-<code>` classes, in page order.
-- Codes are UNC's: vegan, vegetarian, halal, smart_choice, local, organic,
-- sustainable_seafood, made_without_gluten, cool_foods. Unknown future codes are
-- stored as-is; the web app maps codes to labels.

alter table menu_item add column dietary_tags text[] not null default '{}';

create index menu_item_dietary_tags_idx on menu_item using gin (dietary_tags);
