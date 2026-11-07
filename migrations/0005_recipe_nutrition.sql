-- Nutrition per UNC recipe id, parsed from recipe.php. Shared by every menu_item
-- with that recipe_id (no foreign key: menu items come and go, nutrition stays).
-- Refetched by the scraper when fetched_at is more than 30 days old.
-- Amounts are null when the label leaves them blank.

create table recipe_nutrition (
    recipe_id            integer primary key,
    name                 text,             -- the label's title, e.g. 'Chicken Breast'
    serving_size         text,             -- as printed, e.g. '4 oz', '1 pancakes'
    calories             numeric,
    total_fat_g          numeric,
    saturated_fat_g      numeric,
    trans_fat_g          numeric,
    cholesterol_mg       numeric,
    sodium_mg            numeric,
    total_carbohydrate_g numeric,
    dietary_fiber_g      numeric,
    sugars_g             numeric,
    added_sugar_g        numeric,
    protein_g            numeric,
    -- In label order: [{"name": "Calcium", "amount": 33, "unit": "mg"}, ...]
    micronutrients       jsonb not null default '[]',
    ingredients          text,
    fetched_at           timestamptz not null
);
