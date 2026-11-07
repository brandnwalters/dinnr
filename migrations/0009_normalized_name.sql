-- Normalized item name: lowercased, trimmed, whitespace collapsed. Favorites match
-- a dish by this name, so "Grilled Chicken Breast" counts at any station or hall
-- whatever its recipe id. The scraper computes it (`menu_parser.normalize_name`);
-- existing rows are backfilled the same way.

alter table menu_item add column normalized_name text;

update menu_item set normalized_name = lower(regexp_replace(btrim(name), '\s+', ' ', 'g'));

alter table menu_item alter column normalized_name set not null;

create index menu_item_normalized_name_idx on menu_item (normalized_name);
